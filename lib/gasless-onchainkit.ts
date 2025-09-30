/**
 * 🚀 Gasless Transaction Handler for OnchainKit
 * Uses OnchainKit's built-in Transaction component with isSponsored prop
 * This is the recommended approach for Coinbase Paymaster integration
 */

import { Address, encodeFunctionData, parseUnits, EstimateGasParameters } from 'viem';
import {
  FACTORY_CONTRACT_ADDRESS as MARKET_FACTORY_ADDRESS,
  PREDICTION_MARKET_ABI,
  MARKET_FACTORY_ABI,
  getMarketContractAddress,
  isValidAddress
} from './blockchain';
import {
  generateOptimizedApprovalCalls,
  checkUSDCAllowance,
  calculateBatchRequirement,
  USDC_CONFIG
} from './usdc-allowance';
import {
  enhancedBatchOptimizer,
  EnhancedBatchOptimizer,
  BatchCall,
  BatchEstimation,
  BatchExecutionResult,
  ENHANCED_BATCH_CONFIG
} from './batch-optimizer';
import { publicClient } from './viem-client';

// USDC contract address on Base Sepolia (must match blockchain.ts)
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;

// ERC20 ABI for approve function
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;


// Enhanced Types for Smart Batching
export interface EnhancedBatchConfig {
  maxBatchSize: number;
  autoExecuteSwipeCount: number;
  autoExecuteTimeoutMs: number;
  gasEstimationBuffer: number;
  defaultGasLimit: bigint;
}

export interface SmartBatchResult {
  success: boolean;
  batches: BatchCall[][];
  estimations: BatchEstimation[];
  totalGas: bigint;
  totalCalls: number;
  optimizationSummary: {
    originalCalls: number;
    optimizedCalls: number;
    gasSavingsPercent: number;
    usdcApprovalOptimization: boolean;
  };
  error?: string;
}

/**
 * 🎯 USDC Preauthorization Bundling with Transactions
 * Bundles USDC approval preauthorization directly with transaction execution
 * for maximum efficiency and reduced gas costs
 */
export async function generatePreauthorizedTransactionBundle(
  userAddress: Address,
  swipes: Array<{
    marketId: string;
    prediction: 'yes' | 'no';
    amount: bigint;
  }>,
  preauthorizationAmount?: bigint,
  supabaseMarkets?: Array<{ id: string; contract_address?: string }>
): Promise<{
  success: boolean;
  bundledCalls: BatchCall[];
  preauthorizationIncluded: boolean;
  totalApprovals: number;
  totalTransactions: number;
  optimization: {
    standardApproach: number;
    bundledApproach: number;
    savingsPercent: number;
  };
  error?: string;
}> {
  try {
    if (swipes.length === 0) {
      throw new Error('Cannot generate bundle for empty swipes array');
    }

    console.log(`🎯 Generating preauthorized transaction bundle for ${swipes.length} swipes`);

    // Validate and extract market addresses
    const validatedSwipes: Array<{
      marketAddress: Address;
      prediction: 'yes' | 'no';
      amount: bigint;
      marketId: string;
    }> = [];

    for (const swipe of swipes) {
      const contractAddress = getMarketContractAddress(swipe.marketId, supabaseMarkets);
      if (!contractAddress || !isValidAddress(contractAddress)) {
        console.warn(`⚠️ Skipping swipe on market ${swipe.marketId}: invalid contract address`);
        continue;
      }
      validatedSwipes.push({
        marketAddress: contractAddress,
        prediction: swipe.prediction,
        amount: swipe.amount,
        marketId: swipe.marketId
      });
    }

    if (validatedSwipes.length === 0) {
      throw new Error('No valid swipes found - all markets have invalid contract addresses');
    }

    // Calculate total USDC requirement
    const totalUSDCRequired = calculateBatchRequirement(
      validatedSwipes.map(s => ({ amount: s.amount }))
    );

    // Get unique market addresses for optimization
    const uniqueMarkets = Array.from(new Set(validatedSwipes.map(s => s.marketAddress)));

    // Determine preauthorization amount (default to bulk approval amount if not specified)
    const preAuthAmount = preauthorizationAmount || USDC_CONFIG.BATCH_APPROVAL_AMOUNT;

    // Bundle preauthorization with the first market transaction
    const bundledCalls: BatchCall[] = [];
    let preauthorizationIncluded = false;
    let totalApprovals = 0;

    // Check current allowances for all markets
    const allowancePromises = uniqueMarkets.map(market =>
      checkUSDCAllowance(userAddress, market, totalUSDCRequired / BigInt(uniqueMarkets.length))
    );

    const allowanceResults = await Promise.allSettled(allowancePromises);

    // Process each unique market
    for (let i = 0; i < uniqueMarkets.length; i++) {
      const marketAddress = uniqueMarkets[i];
      const allowanceResult = allowanceResults[i];

      // Check if this market needs approval
      const needsApproval = allowanceResult.status === 'rejected' ||
                           (allowanceResult.status === 'fulfilled' && allowanceResult.value.needsApproval);

      if (needsApproval) {
        // Use preauthorization amount for the first approval, regular amount for others
        const approvalAmount = !preauthorizationIncluded ? preAuthAmount : totalUSDCRequired;

        const approvalData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [marketAddress, approvalAmount]
        });

        bundledCalls.push({
          to: USDC_CONTRACT_ADDRESS,
          data: approvalData as `0x${string}`,
          value: BigInt(0)
        });

        totalApprovals++;

        if (!preauthorizationIncluded) {
          preauthorizationIncluded = true;
          console.log(`💳 Preauthorization bundled: ${preAuthAmount.toString()} USDC for ${marketAddress}`);
        }
      }
    }

    // Add all transaction calls
    const transactionCalls: BatchCall[] = validatedSwipes.map(swipe => {
      const buySharesData = encodeFunctionData({
        abi: PREDICTION_MARKET_ABI,
        functionName: 'buyShares',
        args: [swipe.prediction === 'yes', swipe.amount]
      });

      return {
        to: swipe.marketAddress,
        data: buySharesData as `0x${string}`,
        value: BigInt(0)
      };
    });

    bundledCalls.push(...transactionCalls);

    // Calculate optimization metrics
    const standardApproach = validatedSwipes.length * 2; // 1 approval + 1 transaction per swipe
    const bundledApproach = bundledCalls.length;
    const savingsPercent = ((standardApproach - bundledApproach) / standardApproach) * 100;

    console.log(`🎯 Preauthorization bundle: ${totalApprovals} approvals + ${transactionCalls.length} transactions = ${bundledCalls.length} total calls`);
    console.log(`📊 Optimization: ${standardApproach} → ${bundledApproach} calls (${savingsPercent.toFixed(1)}% reduction)`);

    return {
      success: true,
      bundledCalls,
      preauthorizationIncluded,
      totalApprovals,
      totalTransactions: transactionCalls.length,
      optimization: {
        standardApproach,
        bundledApproach,
        savingsPercent
      }
    };

  } catch (error) {
    console.error('❌ Preauthorization bundle generation failed:', error);
    return {
      success: false,
      bundledCalls: [],
      preauthorizationIncluded: false,
      totalApprovals: 0,
      totalTransactions: 0,
      optimization: {
        standardApproach: swipes.length * 2,
        bundledApproach: 0,
        savingsPercent: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Enhanced batch generation with integrated USDC allowance optimization
 * Implements 50% reduction in transaction calls via bulk approval strategy
 */
export async function generateOptimizedBuySharesCalls(
  userAddress: Address,
  swipes: Array<{
    marketId: string;
    prediction: 'yes' | 'no';
    amount: bigint;
  }>,
  supabaseMarkets?: Array<{ id: string; contract_address?: string }>
): Promise<SmartBatchResult> {
  try {
    if (swipes.length === 0) {
      throw new Error('Cannot generate batch for empty swipes array');
    }

    console.log(`🚀 Generating optimized batch for ${swipes.length} swipes`);

    // Validate and extract market addresses
    const validatedSwipes: Array<{
      marketAddress: Address;
      prediction: 'yes' | 'no';
      amount: bigint;
      marketId: string;
    }> = [];

    for (const swipe of swipes) {
      const contractAddress = getMarketContractAddress(swipe.marketId, supabaseMarkets);
      if (!contractAddress || !isValidAddress(contractAddress)) {
        console.warn(`⚠️ Skipping swipe on market ${swipe.marketId}: invalid contract address`);
        continue;
      }
      validatedSwipes.push({
        marketAddress: contractAddress,
        prediction: swipe.prediction,
        amount: swipe.amount,
        marketId: swipe.marketId
      });
    }

    if (validatedSwipes.length === 0) {
      throw new Error('No valid swipes found - all markets have invalid contract addresses');
    }

    // Calculate total USDC requirement
    const totalUSDCRequired = calculateBatchRequirement(
      validatedSwipes.map(s => ({ amount: s.amount }))
    );

    // Get unique market addresses for approval optimization
    const uniqueMarkets = Array.from(new Set(validatedSwipes.map(s => s.marketAddress)));

    // Generate optimized approval calls (bulk approval strategy)
    const approvalCalls = await generateOptimizedApprovalCalls(
      userAddress,
      uniqueMarkets,
      totalUSDCRequired
    );

    // Generate buy shares calls (1 call per bet)
    const buySharesCalls: BatchCall[] = validatedSwipes.map(swipe => {
      const buySharesData = encodeFunctionData({
        abi: PREDICTION_MARKET_ABI,
        functionName: 'buyShares',
        args: [swipe.prediction === 'yes', swipe.amount]
      });

      return {
        to: swipe.marketAddress,
        data: buySharesData as `0x${string}`,
        value: BigInt(0)
      };
    });

    // Combine approval and buy calls
    const allCalls: BatchCall[] = [...approvalCalls, ...buySharesCalls];

    // Calculate optimization statistics
    const originalCalls = validatedSwipes.length * 2; // Old approach: 2 calls per bet
    const optimizedCalls = allCalls.length;
    const gasSavingsPercent = ((originalCalls - optimizedCalls) / originalCalls) * 100;

    console.log(`💰 USDC Approval Optimization: ${approvalCalls.length} approvals for ${uniqueMarkets.length} markets`);
    console.log(`📈 Call Reduction: ${originalCalls} → ${optimizedCalls} calls (${gasSavingsPercent.toFixed(1)}% savings)`);

    // Use enhanced batch optimizer for intelligent splitting
    const batchOptimizer = new EnhancedBatchOptimizer();
    const { batches, estimations } = await batchOptimizer.splitBatches(allCalls, userAddress);

    if (batches.length === 0) {
      throw new Error('Batch splitting resulted in no valid batches');
    }

    // Calculate total gas estimation
    const totalGas = estimations.reduce((sum, est) => sum + est.estimatedGas, BigInt(0));

    console.log(`✅ Generated ${batches.length} optimized batches with ${optimizedCalls} total calls`);
    console.log(`⛽ Total estimated gas: ${totalGas.toString()}`);

    return {
      success: true,
      batches,
      estimations,
      totalGas,
      totalCalls: optimizedCalls,
      optimizationSummary: {
        originalCalls,
        optimizedCalls,
        gasSavingsPercent,
        usdcApprovalOptimization: approvalCalls.length > 0
      }
    };

  } catch (error) {
    console.error('❌ Enhanced batch generation failed:', error);
    return {
      success: false,
      batches: [],
      estimations: [],
      totalGas: BigInt(0),
      totalCalls: 0,
      optimizationSummary: {
        originalCalls: swipes.length * 2,
        optimizedCalls: 0,
        gasSavingsPercent: 0,
        usdcApprovalOptimization: false
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Smart batch splitter with gas limit management
 * Auto-splits batches if they exceed 50 transactions or gas limits
 */
export async function createSmartBatches(
  calls: BatchCall[],
  userAddress: Address,
  config: Partial<EnhancedBatchConfig> = {}
): Promise<{
  batches: BatchCall[][];
  estimations: BatchEstimation[];
  splitReason?: 'transaction_count' | 'gas_limit' | 'optimization';
}> {
  const effectiveConfig: EnhancedBatchConfig = {
    maxBatchSize: config.maxBatchSize || ENHANCED_BATCH_CONFIG.MAX_BATCH_SIZE,
    autoExecuteSwipeCount: config.autoExecuteSwipeCount || ENHANCED_BATCH_CONFIG.AUTO_EXECUTE_SWIPE_COUNT,
    autoExecuteTimeoutMs: config.autoExecuteTimeoutMs || ENHANCED_BATCH_CONFIG.AUTO_EXECUTE_TIMEOUT_MS,
    gasEstimationBuffer: config.gasEstimationBuffer || ENHANCED_BATCH_CONFIG.GAS_ESTIMATION_BUFFER,
    defaultGasLimit: config.defaultGasLimit || ENHANCED_BATCH_CONFIG.DEFAULT_GAS_LIMIT
  };

  if (calls.length === 0) {
    return { batches: [], estimations: [] };
  }

  // Check if single batch is feasible
  if (calls.length <= effectiveConfig.maxBatchSize) {
    try {
      const batchOptimizer = new EnhancedBatchOptimizer();
      const gasEstimation = await batchOptimizer.estimateGas(calls, userAddress);

      if (gasEstimation.estimatedGas <= effectiveConfig.defaultGasLimit) {
        // Single batch is optimal
        return {
          batches: [calls],
          estimations: [gasEstimation]
        };
      }
    } catch (error) {
      console.warn('⚠️ Gas estimation failed, proceeding with batch splitting:', error);
    }
  }

  // Split batches using the enhanced optimizer
  const batchOptimizer = new EnhancedBatchOptimizer();
  const result = await batchOptimizer.splitBatches(calls, userAddress);

  // Determine split reason
  let splitReason: 'transaction_count' | 'gas_limit' | 'optimization' = 'optimization';
  if (calls.length > effectiveConfig.maxBatchSize) {
    splitReason = 'transaction_count';
  } else if (result.estimations.some(est => est.estimatedGas > effectiveConfig.defaultGasLimit)) {
    splitReason = 'gas_limit';
  }

  console.log(`📦 Smart batch splitting: ${calls.length} calls → ${result.batches.length} batches (reason: ${splitReason})`);

  return {
    batches: result.batches,
    estimations: result.estimations,
    splitReason
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateOptimizedBuySharesCalls for enhanced batching
 */
export function generateBuySharesCalls(
  marketAddress: Address,
  prediction: 'yes' | 'no',
  amount: bigint,
  needsApproval: boolean = true
): Array<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  console.warn('⚠️ Using deprecated generateBuySharesCalls. Consider upgrading to generateOptimizedBuySharesCalls for better performance.');

  const calls: Array<{
    to: Address;
    data: `0x${string}`;
    value: bigint;
  }> = [];

  // Add approval call if needed
  if (needsApproval) {
    const approvalData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [marketAddress, amount]
    });

    calls.push({
      to: USDC_CONTRACT_ADDRESS,
      data: approvalData as `0x${string}`,
      value: BigInt(0)
    });
  }

  // Add buy shares call
  const buySharesData = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: 'buyShares',
    args: [prediction === 'yes', amount]
  });

  calls.push({
    to: marketAddress,
    data: buySharesData as `0x${string}`,
    value: BigInt(0)
  });

  return calls;
}

/**
 * Enhanced Gas Estimation with 10% Accuracy Target
 */
export async function estimateBatchGas(
  calls: BatchCall[],
  userAddress: Address
): Promise<BatchEstimation> {
  if (calls.length === 0) {
    return {
      estimatedGas: BigInt(0),
      estimatedCost: BigInt(0),
      callCount: 0,
      accuracy: 100,
      gasPerCall: BigInt(0)
    };
  }

  try {
    console.log(`⛽ Estimating gas for ${calls.length} calls...`);

    // Estimate gas for each call individually and aggregate
    let totalGas = BigInt(0);
    let successfulEstimates = 0;

    for (const call of calls) {
      try {
        const gasEstimate = await publicClient.estimateGas({
          account: userAddress,
          to: call.to,
          data: call.data,
          value: call.value
        } as EstimateGasParameters);

        totalGas += gasEstimate;
        successfulEstimates++;
      } catch (error) {
        console.warn(`⚠️ Failed to estimate gas for individual call, using fallback:`, error);
        // Fallback to conservative estimate
        totalGas += ENHANCED_BATCH_CONFIG.GAS_ESTIMATE_PER_BET;
      }
    }

    // Apply 10% buffer for accuracy target
    const bufferedGas = BigInt(
      Math.floor(Number(totalGas) * ENHANCED_BATCH_CONFIG.GAS_ESTIMATION_BUFFER)
    );

    // Calculate accuracy percentage
    const accuracy = successfulEstimates > 0
      ? (successfulEstimates / calls.length) * 90 + 10
      : 50;

    // Get current gas price for cost estimation
    const gasPrice = await publicClient.getGasPrice();
    const estimatedCost = bufferedGas * gasPrice;
    const gasPerCall = calls.length > 0 ? bufferedGas / BigInt(calls.length) : BigInt(0);

    console.log(`⛽ Gas estimation complete: ${bufferedGas.toString()} gas, ${accuracy.toFixed(1)}% accuracy`);

    return {
      estimatedGas: bufferedGas,
      estimatedCost,
      callCount: calls.length,
      accuracy,
      gasPerCall
    };
  } catch (error) {
    console.error('❌ Gas estimation failed:', error);

    // Conservative fallback estimation
    const fallbackGas = BigInt(calls.length) * ENHANCED_BATCH_CONFIG.GAS_ESTIMATE_PER_BET;
    const fallbackGasPrice = parseUnits('20', 9); // 20 gwei fallback

    return {
      estimatedGas: fallbackGas,
      estimatedCost: fallbackGas * fallbackGasPrice,
      callCount: calls.length,
      accuracy: 50, // Lower accuracy for fallback
      gasPerCall: ENHANCED_BATCH_CONFIG.GAS_ESTIMATE_PER_BET
    };
  }
}

/**
 * Check if batch exceeds gas limits and needs splitting
 */
export async function validateBatchGasLimits(
  calls: BatchCall[],
  userAddress: Address
): Promise<{
  withinLimits: boolean;
  gasEstimation: BatchEstimation;
  recommendedSplit?: number;
  reason?: string;
}> {
  const gasEstimation = await estimateBatchGas(calls, userAddress);

  // Check against ERC-4337 gasless limits
  const userOpGasLimit = ENHANCED_BATCH_CONFIG.USER_OPERATION_GAS_LIMIT;
  const withinLimits = gasEstimation.estimatedGas <= userOpGasLimit;

  if (!withinLimits) {
    // Calculate recommended split size
    const recommendedSplit = Math.ceil(
      (Number(gasEstimation.estimatedGas) / Number(userOpGasLimit)) * calls.length
    );

    return {
      withinLimits: false,
      gasEstimation,
      recommendedSplit,
      reason: `Estimated gas (${gasEstimation.estimatedGas}) exceeds user operation limit (${userOpGasLimit})`
    };
  }

  return {
    withinLimits: true,
    gasEstimation
  };
}

/**
 * Global Smart Batching Manager
 * Handles auto-execution triggers and batch optimization
 */
export class SmartBatchingManager {
  private static instance: SmartBatchingManager;
  private batchOptimizer: EnhancedBatchOptimizer;
  private executionCallback: ((batches: BatchCall[][]) => Promise<void>) | null = null;

  private constructor() {
    this.batchOptimizer = enhancedBatchOptimizer;
  }

  static getInstance(): SmartBatchingManager {
    if (!SmartBatchingManager.instance) {
      SmartBatchingManager.instance = new SmartBatchingManager();
    }
    return SmartBatchingManager.instance;
  }

  /**
   * Configure execution callback for auto-triggered batches
   */
  setExecutionCallback(callback: (batches: BatchCall[][]) => Promise<void>): void {
    this.executionCallback = callback;
    this.batchOptimizer.setExecuteCallback(callback);
  }

  /**
   * Add swipe with auto-execution logic
   * Triggers batch execution at 20 swipes OR 10 seconds timeout
   */
  addSwipe(
    marketId: string,
    prediction: 'yes' | 'no',
    amount: number,
    supabaseMarkets?: Array<{ id: string; contract_address?: string }>
  ): void {
    this.batchOptimizer.addSwipe(marketId, prediction, amount, supabaseMarkets);

    const state = this.batchOptimizer.getBatchState();
    console.log(`📝 Swipe added: ${state.pendingCount} pending swipes`);

    // Auto-execution logic is handled internally by the batch optimizer
  }

  /**
   * Manual batch execution
   */
  async executeCurrentBatch(
    userAddress: Address,
    spenderAddress: Address
  ): Promise<BatchExecutionResult> {
    return await this.batchOptimizer.processSwipes(userAddress, spenderAddress);
  }

  /**
   * Get current batch status
   */
  getBatchStatus(): {
    pendingSwipes: number;
    isProcessing: boolean;
    needsUSDCApproval: boolean;
    autoExecuteTriggers: {
      swipeCountTrigger: boolean;
      timeoutTrigger: boolean;
      timeRemaining?: number;
    };
  } {
    const state = this.batchOptimizer.getBatchState();
    const shouldExecute = {
      shouldExecute: state.pendingCount >= ENHANCED_BATCH_CONFIG.AUTO_EXECUTE_SWIPE_COUNT ||
                     (Date.now() - state.lastActivity >= ENHANCED_BATCH_CONFIG.AUTO_EXECUTE_TIMEOUT_MS),
      reason: state.pendingCount >= ENHANCED_BATCH_CONFIG.AUTO_EXECUTE_SWIPE_COUNT ? 'swipe_count' as const : 'timeout' as const,
      timeRemaining: Math.max(0, ENHANCED_BATCH_CONFIG.AUTO_EXECUTE_TIMEOUT_MS - (Date.now() - state.lastActivity))
    };

    return {
      pendingSwipes: state.pendingCount,
      isProcessing: state.isProcessing,
      needsUSDCApproval: state.needsUSDCApproval,
      autoExecuteTriggers: {
        swipeCountTrigger: shouldExecute.shouldExecute && shouldExecute.reason === 'swipe_count',
        timeoutTrigger: shouldExecute.shouldExecute && shouldExecute.reason === 'timeout',
        timeRemaining: shouldExecute.timeRemaining
      }
    };
  }

  /**
   * Clear all pending swipes
   */
  clearBatch(): void {
    this.batchOptimizer.clearPendingSwipes();
  }

  /**
   * Update USDC allowance status
   */
  updateUSDCAllowance(remaining: bigint): void {
    this.batchOptimizer.updateUSDCAllowance(remaining);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.batchOptimizer.destroy();
  }
}

/**
 * Get the global smart batching manager instance
 */
export const smartBatchingManager = SmartBatchingManager.getInstance();

/**
 * Enhanced USDC bulk approval with optimization
 * Integrates with allowance tracking for minimal approvals
 */
export async function generateEnhancedUSDCApproval(
  userAddress: Address,
  spenderAddresses: Address[],
  totalRequirement: bigint
): Promise<{
  approvalCalls: Array<{
    to: Address;
    data: `0x${string}`;
    value: bigint;
    description: string;
  }>;
  optimizationSummary: {
    totalSpenders: number;
    approvalsNeeded: number;
    bulkApprovalUsed: boolean;
    estimatedSavings: string;
  };
}> {
  try {
    const approvalCalls = await generateOptimizedApprovalCalls(
      userAddress,
      spenderAddresses,
      totalRequirement
    );

    const bulkApprovalUsed = approvalCalls.some(call =>
      call.description.includes('Bulk approval')
    );

    const estimatedSavings = approvalCalls.length > 0
      ? `${((spenderAddresses.length - approvalCalls.length) / spenderAddresses.length * 100).toFixed(1)}%`
      : '0%';

    return {
      approvalCalls,
      optimizationSummary: {
        totalSpenders: spenderAddresses.length,
        approvalsNeeded: approvalCalls.length,
        bulkApprovalUsed,
        estimatedSavings
      }
    };
  } catch (error) {
    console.error('❌ Enhanced USDC approval generation failed:', error);
    throw new Error(`USDC approval optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Legacy bulk USDC approval function (kept for backward compatibility)
 * @deprecated Use generateEnhancedUSDCApproval for better optimization
 */
export function generateBulkUSDCApproval(
  spenderAddress: Address,
  approvalAmount: bigint = parseUnits('100', 6) // Default 100 USDC
): Array<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  console.warn('⚠️ Using deprecated generateBulkUSDCApproval. Consider upgrading to generateEnhancedUSDCApproval.');

  const approvalData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spenderAddress, approvalAmount]
  });

  return [{
    to: USDC_CONTRACT_ADDRESS,
    data: approvalData as `0x${string}`,
    value: BigInt(0)
  }];
}

/**
 * Generate transaction calls for creating a new market
 */
export function generateCreateMarketCalls(
  question: string,
  endTime: bigint,
  resolver: Address = '0x0000000000000000000000000000000000000000'
) {
  const data = encodeFunctionData({
    abi: MARKET_FACTORY_ABI,
    functionName: 'createMarket',
    args: [question, endTime, resolver]
  });

  const calls = [{
    to: MARKET_FACTORY_ADDRESS,
    data: data as `0x${string}`,
    value: BigInt(0)
  }];

  console.log('🏭 Generated market creation call:', {
    to: MARKET_FACTORY_ADDRESS,
    data: data,
    question,
    endTime: endTime.toString(),
    resolver
  });

  return calls;
}

/**
 * Generate approval call for maximum USDC spending
 * This allows multiple predictions without repeated approvals
 */
export function generateUSDCApprovalCalls(
  spenderAddress: Address,
  amount: bigint = parseUnits('1000', 6) // Approve 1000 USDC by default
) {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spenderAddress, amount]
  });

  return [{
    to: USDC_CONTRACT_ADDRESS,
    data: data as `0x${string}`,
    value: BigInt(0)
  }];
}

/**
 * Validate that the paymaster is properly configured
 */
export function validatePaymasterConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!process.env.NEXT_PUBLIC_PAYMASTER_URL) {
    errors.push('NEXT_PUBLIC_PAYMASTER_URL not configured');
  }

  if (!process.env.NEXT_PUBLIC_BUNDLER_URL) {
    errors.push('NEXT_PUBLIC_BUNDLER_URL not configured');
  }

  if (!process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY) {
    errors.push('NEXT_PUBLIC_ONCHAINKIT_API_KEY not configured');
  }

  // Check if URLs are valid Coinbase endpoints
  const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;
  if (paymasterUrl && !paymasterUrl.includes('api.developer.coinbase.com')) {
    errors.push('Invalid Paymaster URL - must be from Coinbase Developer Platform');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper to check if a contract/function is allowlisted on the paymaster
 * This is informational - actual checking happens on Coinbase's side
 */
export function getRequiredAllowlist() {
  return {
    contracts: [
      {
        address: MARKET_FACTORY_ADDRESS,
        functions: ['createMarket']
      },
      // Individual market contracts need to be added dynamically
      {
        address: 'DYNAMIC_MARKET_ADDRESSES',
        functions: ['buyShares', 'sellShares']
      }
    ],
    networks: ['base-sepolia', 'base'],
    description: 'These contracts and functions must be allowlisted in your Coinbase Developer Platform project'
  };
}

/**
 * Transaction status handler for OnchainKit components
 */
export type TransactionStatus =
  | { statusName: 'init'; statusData: null }
  | { statusName: 'error'; statusData: { message: string } }
  | { statusName: 'transactionIdle'; statusData: null }
  | { statusName: 'buildingTransaction'; statusData: null }
  | { statusName: 'transactionPending'; statusData: null }
  | { statusName: 'transactionLegacyExecuted'; statusData: { transactionHashList: string[] } }
  | { statusName: 'success'; statusData: { transactionReceipts: { transactionHash: string }[] } };

/**
 * Handle transaction status updates from OnchainKit
 */
export function handleTransactionStatus(
  status: TransactionStatus,
  onSuccess?: (txHash: string) => void,
  onError?: (error: string) => void
) {
  console.log('Transaction status:', status.statusName);

  switch (status.statusName) {
    case 'success':
      const receipts = status.statusData.transactionReceipts;
      if (receipts && receipts.length > 0) {
        const txHash = receipts[0].transactionHash;
        console.log('✅ Transaction successful:', txHash);
        onSuccess?.(txHash);
      }
      break;

    case 'error':
      const errorMessage = status.statusData.message;
      console.error('❌ Transaction failed:', errorMessage);
      onError?.(errorMessage);
      break;

    case 'transactionPending':
      console.log('⏳ Transaction pending...');
      break;

    case 'buildingTransaction':
      console.log('🔨 Building transaction...');
      break;

    default:
      console.log(`Status: ${status.statusName}`);
  }
}

/**
 * Enhanced Example Usage with Smart Batching:
 *
 * import { Transaction, TransactionButton, TransactionSponsor } from '@coinbase/onchainkit/transaction';
 * import {
 *   smartBatchingManager,
 *   generateOptimizedBuySharesCalls,
 *   handleEnhancedTransactionStatus
 * } from '@/lib/gasless-onchainkit';
 *
 * function EnhancedPredictionComponent() {
 *   const [userAddress] = useAccount();
 *   const [swipes, setSwipes] = useState([]);
 *
 *   // Configure auto-execution callback
 *   useEffect(() => {
 *     smartBatchingManager.setExecutionCallback(async (batches) => {
 *       for (let i = 0; i < batches.length; i++) {
 *         await executeBatch(batches[i], i + 1, batches.length);
 *       }
 *     });
 *   }, []);
 *
 *   // Add swipe with auto-execution
 *   const handleSwipe = (marketId: string, prediction: 'yes' | 'no', amount: number) => {
 *     smartBatchingManager.addSwipe(marketId, prediction, amount, supabaseMarkets);
 *   };
 *
 *   // Execute batch manually or auto-triggered
 *   const executeBatch = async (calls: BatchCall[], batchNumber: number, totalBatches: number) => {
 *     return (
 *       <Transaction
 *         isSponsored={true}  // Gasless with Coinbase Paymaster
 *         calls={calls}
 *         onStatus={(status) => handleEnhancedTransactionStatus(
 *           status,
 *           { batchNumber, totalBatches },
 *           onBatchSuccess,
 *           onBatchError
 *         )}
 *       >
 *         <TransactionButton text={`Execute Batch ${batchNumber}/${totalBatches}`} />
 *         <TransactionSponsor />
 *       </Transaction>
 *     );
 *   };
 *
 *   // Get batch status for UI
 *   const batchStatus = smartBatchingManager.getBatchStatus();
 *
 *   return (
 *     <div>
 *       <SwipeStack onSwipe={handleSwipe} />
 *       <BatchStatus
 *         pendingSwipes={batchStatus.pendingSwipes}
 *         autoExecuteIn={batchStatus.autoExecuteTriggers.timeRemaining}
 *       />
 *     </div>
 *   );
 * }
 */

/**
 * 🚀 Preauthorization Helper for Smart Contracts
 * Automatically determines optimal preauthorization amount and bundles with transactions
 */
export async function createPreauthorizedBatch(
  userAddress: Address,
  swipes: Array<{
    marketId: string;
    prediction: 'yes' | 'no';
    amount: bigint;
  }>,
  options?: {
    preauthorizationMultiplier?: number; // e.g., 2 for 2x current requirement
    maxPreauthorization?: bigint;
    supabaseMarkets?: Array<{ id: string; contract_address?: string }>;
  }
): Promise<{
  bundledCalls: BatchCall[];
  optimizationReport: {
    totalSwipes: number;
    preauthorizationAmount: bigint;
    preauthorizationAmountFormatted: string;
    callsReduced: number;
    savingsPercent: number;
    gasEstimate?: bigint;
  };
  success: boolean;
  error?: string;
}> {
  try {
    // Calculate total requirement
    const totalRequired = calculateBatchRequirement(
      swipes.map(s => ({ amount: s.amount }))
    );

    // Determine optimal preauthorization amount
    const multiplier = options?.preauthorizationMultiplier || 2;
    const defaultPreauth = totalRequired * BigInt(multiplier);
    const maxPreauth = options?.maxPreauthorization || parseUnits('500', 6); // 500 USDC max
    const preauthorizationAmount = defaultPreauth > maxPreauth ? maxPreauth : defaultPreauth;

    console.log(`🚀 Creating preauthorized batch with ${preauthorizationAmount.toString()} USDC preauth`);

    // Generate the bundled transaction
    const result = await generatePreauthorizedTransactionBundle(
      userAddress,
      swipes,
      preauthorizationAmount,
      options?.supabaseMarkets
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate preauthorized bundle');
    }

    // Estimate gas for the bundle
    let gasEstimate: bigint | undefined;
    try {
      const estimation = await estimateBatchGas(result.bundledCalls, userAddress);
      gasEstimate = estimation.estimatedGas;
    } catch (error) {
      console.warn('⚠️ Gas estimation failed for preauthorized batch:', error);
    }

    return {
      bundledCalls: result.bundledCalls,
      optimizationReport: {
        totalSwipes: swipes.length,
        preauthorizationAmount,
        preauthorizationAmountFormatted: `${(Number(preauthorizationAmount) / 10**6).toFixed(2)} USDC`,
        callsReduced: result.optimization.standardApproach - result.optimization.bundledApproach,
        savingsPercent: result.optimization.savingsPercent,
        gasEstimate
      },
      success: true
    };

  } catch (error) {
    console.error('❌ Preauthorized batch creation failed:', error);
    return {
      bundledCalls: [],
      optimizationReport: {
        totalSwipes: swipes.length,
        preauthorizationAmount: BigInt(0),
        preauthorizationAmountFormatted: '0 USDC',
        callsReduced: 0,
        savingsPercent: 0
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Utility functions for batch optimization and display
 */
export const GaslessOptimizationUtils = {
  /**
   * Format gas estimation for user display
   */
  formatGasEstimation(estimation: BatchEstimation): string {
    const gasK = Number(estimation.estimatedGas) / 1000;
    const costETH = Number(estimation.estimatedCost) / 10**18;
    return `${gasK.toFixed(0)}K gas (~$${costETH.toFixed(4)} ETH), ${estimation.accuracy.toFixed(0)}% accuracy`;
  },

  /**
   * Format smart batch result for user display
   */
  formatBatchResult(result: SmartBatchResult): string {
    if (!result.success) {
      return `❌ Batch failed: ${result.error}`;
    }

    const { optimizationSummary } = result;
    const savingsText = optimizationSummary.gasSavingsPercent > 0
      ? ` (${optimizationSummary.gasSavingsPercent.toFixed(1)}% savings)`
      : '';

    return `✅ ${result.batches.length} batches, ${result.totalCalls} calls${savingsText}`;
  },

  /**
   * Calculate transaction fee savings from optimization
   */
  calculateSavings(originalCalls: number, optimizedCalls: number): {
    callReduction: number;
    percentSavings: number;
    description: string;
  } {
    const callReduction = originalCalls - optimizedCalls;
    const percentSavings = originalCalls > 0 ? (callReduction / originalCalls) * 100 : 0;

    return {
      callReduction,
      percentSavings,
      description: `Reduced from ${originalCalls} to ${optimizedCalls} calls (${percentSavings.toFixed(1)}% reduction)`
    };
  },

  /**
   * Validate batch configuration
   */
  validateBatchConfig(config: Partial<EnhancedBatchConfig>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxBatchSize && config.maxBatchSize > 50) {
      errors.push('Max batch size cannot exceed 50 transactions');
    }

    if (config.maxBatchSize && config.maxBatchSize < 1) {
      errors.push('Max batch size must be at least 1');
    }

    if (config.autoExecuteSwipeCount && config.autoExecuteSwipeCount > 50) {
      warnings.push('Auto-execute swipe count is high, consider reducing for better UX');
    }

    if (config.gasEstimationBuffer && config.gasEstimationBuffer < 1.05) {
      warnings.push('Gas estimation buffer is low, may cause transaction failures');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
};

/**
 * Enhanced transaction status handler with batch-specific logic
 */
export function handleEnhancedTransactionStatus(
  status: TransactionStatus,
  batchInfo: { batchNumber?: number; totalBatches?: number },
  onSuccess?: (txHash: string, batchNumber?: number) => void,
  onError?: (error: string, batchNumber?: number) => void
): void {
  const batchPrefix = batchInfo.batchNumber
    ? `[Batch ${batchInfo.batchNumber}/${batchInfo.totalBatches}] `
    : '';

  console.log(`${batchPrefix}Transaction status:`, status.statusName);

  switch (status.statusName) {
    case 'success':
      const receipts = status.statusData.transactionReceipts;
      if (receipts && receipts.length > 0) {
        const txHash = receipts[0].transactionHash;
        console.log(`✅ ${batchPrefix}Transaction successful:`, txHash);
        onSuccess?.(txHash, batchInfo.batchNumber);
      }
      break;

    case 'error':
      const errorMessage = status.statusData.message;
      console.error(`❌ ${batchPrefix}Transaction failed:`, errorMessage);
      onError?.(errorMessage, batchInfo.batchNumber);
      break;

    case 'transactionPending':
      console.log(`⏳ ${batchPrefix}Transaction pending...`);
      break;

    case 'buildingTransaction':
      console.log(`🔨 ${batchPrefix}Building transaction...`);
      break;

    default:
      console.log(`${batchPrefix}Status: ${status.statusName}`);
  }
}

/**
 * Enhanced OnchainKit integration with smart batching
 */
const enhancedGaslessOnchainKit = {
  // Enhanced Functions
  generatePreauthorizedTransactionBundle,
  createPreauthorizedBatch,
  generateOptimizedBuySharesCalls,
  createSmartBatches,
  estimateBatchGas,
  validateBatchGasLimits,
  generateEnhancedUSDCApproval,
  smartBatchingManager,
  handleEnhancedTransactionStatus,
  GaslessOptimizationUtils,

  // Legacy Functions (for backward compatibility)
  generateBuySharesCalls,
  generateBulkUSDCApproval,
  generateCreateMarketCalls,
  generateUSDCApprovalCalls,
  validatePaymasterConfig,
  getRequiredAllowlist,
  handleTransactionStatus,

  // Constants
  USDC_CONTRACT_ADDRESS,
  ENHANCED_BATCH_CONFIG
};

export default enhancedGaslessOnchainKit;