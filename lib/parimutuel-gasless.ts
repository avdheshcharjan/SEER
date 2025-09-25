/**
 * 🎰 Parimutuel Gasless Transaction Handler for OnchainKit
 * Handles betting transactions for the parimutuel betting system
 * Supports fixed bet amounts: 1, 5, or 10 USDC
 */

import { Address, encodeFunctionData, parseUnits } from 'viem';
import {
  PARIMUTUEL_FACTORY_ADDRESS,
  PARIMUTUEL_MARKET_ABI,
  PARIMUTUEL_FACTORY_ABI,
  USDC_CONTRACT_ADDRESS,
  validateBetAmount,
  formatBetAmount,
  type ParimutuelBetAmount,
  type ParimutuelBetSide
} from './parimutuel-blockchain';

// ERC20 ABI for USDC approval
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

/**
 * Generate transaction calls for placing parimutuel bets
 * Includes USDC approval if needed
 */
export function generateParimutuelBetCalls(
  marketAddress: Address,
  betSide: ParimutuelBetSide,
  betAmount: ParimutuelBetAmount,
  needsApproval: boolean = true
): Array<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  const calls: Array<{
    to: Address;
    data: `0x${string}`;
    value: bigint;
  }> = [];

  const amountWei = validateBetAmount(betAmount);

  // Add USDC approval if needed
  if (needsApproval) {
    const approvalData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [marketAddress, amountWei],
    });

    calls.push({
      to: USDC_CONTRACT_ADDRESS,
      data: approvalData,
      value: 0n,
    });
  }

  // Add betting call
  const betFunctionName = betSide === 'yes' ? 'betYes' : 'betNo';
  const betData = encodeFunctionData({
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: betFunctionName,
    args: [amountWei],
  });

  calls.push({
    to: marketAddress,
    data: betData,
    value: 0n,
  });

  return calls;
}

/**
 * Generate batch calls for multiple parimutuel bets
 * Optimizes USDC approvals for efficiency
 */
export function generateParimutuelBatchCalls(
  bets: Array<{
    marketAddress: Address;
    betSide: ParimutuelBetSide;
    betAmount: ParimutuelBetAmount;
  }>,
  needsApproval: boolean = true
): {
  calls: Array<{
    to: Address;
    data: `0x${string}`;
    value: bigint;
  }>;
  totalAmount: bigint;
  betCount: number;
} {
  const calls: Array<{
    to: Address;
    data: `0x${string}`;
    value: bigint;
  }> = [];

  // Calculate total amount needed for all bets
  let totalAmount = 0n;
  for (const bet of bets) {
    totalAmount += validateBetAmount(bet.betAmount);
  }

  // Group approvals by market to minimize transactions
  const marketApprovals = new Map<Address, bigint>();

  for (const bet of bets) {
    const amount = validateBetAmount(bet.betAmount);
    const currentApproval = marketApprovals.get(bet.marketAddress) || 0n;
    marketApprovals.set(bet.marketAddress, currentApproval + amount);
  }

  // Add approval calls for each market
  if (needsApproval) {
    for (const [marketAddress, approvalAmount] of marketApprovals) {
      const approvalData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [marketAddress, approvalAmount],
      });

      calls.push({
        to: USDC_CONTRACT_ADDRESS,
        data: approvalData,
        value: 0n,
      });
    }
  }

  // Add betting calls
  for (const bet of bets) {
    const betFunctionName = bet.betSide === 'yes' ? 'betYes' : 'betNo';
    const amountWei = validateBetAmount(bet.betAmount);

    const betData = encodeFunctionData({
      abi: PARIMUTUEL_MARKET_ABI,
      functionName: betFunctionName,
      args: [amountWei],
    });

    calls.push({
      to: bet.marketAddress,
      data: betData,
      value: 0n,
    });
  }

  return {
    calls,
    totalAmount,
    betCount: bets.length,
  };
}

/**
 * Generate claim rewards call for a resolved market
 */
export function generateClaimRewardsCall(marketAddress: Address): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const claimData = encodeFunctionData({
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'claimRewards',
    args: [],
  });

  return {
    to: marketAddress,
    data: claimData,
    value: 0n,
  };
}

/**
 * Generate batch claim calls for multiple resolved markets
 */
export function generateBatchClaimCalls(
  marketAddresses: Address[]
): Array<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  return marketAddresses.map(marketAddress => generateClaimRewardsCall(marketAddress));
}

/**
 * Validate paymaster configuration for parimutuel contracts
 */
export async function validateParimutuelPaymasterConfig(): Promise<{
  isValid: boolean;
  missingAddresses: string[];
  recommendations: string[];
}> {
  const missingAddresses: string[] = [];
  const recommendations: string[] = [];

  // Check if factory is properly configured
  if (PARIMUTUEL_FACTORY_ADDRESS === '0x0000000000000000000000000000000000000000') {
    missingAddresses.push('Parimutuel Factory');
    recommendations.push('Deploy the ParimutuelMarketFactory contract and update PARIMUTUEL_FACTORY_ADDRESS');
  }

  // Add recommendations for paymaster setup
  if (missingAddresses.length === 0) {
    recommendations.push(`Add ${PARIMUTUEL_FACTORY_ADDRESS} to paymaster allowlist`);
    recommendations.push(`Ensure USDC token (${USDC_CONTRACT_ADDRESS}) is allowed`);
    recommendations.push('Test gasless transactions with small amounts first');
  }

  return {
    isValid: missingAddresses.length === 0,
    missingAddresses,
    recommendations,
  };
}

/**
 * Helper to estimate gas for parimutuel betting transactions
 */
export function estimateParimutuelGas(
  betCount: number,
  includeApprovals: boolean = true
): {
  estimatedGas: bigint;
  breakdown: {
    approvals: bigint;
    bets: bigint;
    overhead: bigint;
  };
} {
  const gasPerApproval = 50000n; // USDC approval
  const gasPerBet = 80000n; // Parimutuel bet (simpler than AMM)
  const batchOverhead = 30000n; // ERC-4337 batch overhead

  const approvalGas = includeApprovals ? gasPerApproval * BigInt(betCount) : 0n;
  const betGas = gasPerBet * BigInt(betCount);
  const totalGas = approvalGas + betGas + batchOverhead;

  return {
    estimatedGas: totalGas,
    breakdown: {
      approvals: approvalGas,
      bets: betGas,
      overhead: batchOverhead,
    },
  };
}

/**
 * Helper to format bet summary for UI display
 */
export function formatBetSummary(bets: Array<{
  marketAddress: Address;
  betSide: ParimutuelBetSide;
  betAmount: ParimutuelBetAmount;
  question?: string;
}>): {
  totalAmount: string;
  betCount: number;
  breakdown: {
    yesCount: number;
    noCount: number;
    amount1: number;
    amount5: number;
    amount10: number;
  };
  summary: string;
} {
  let totalAmountWei = 0n;
  let yesCount = 0;
  let noCount = 0;
  let amount1 = 0;
  let amount5 = 0;
  let amount10 = 0;

  for (const bet of bets) {
    totalAmountWei += validateBetAmount(bet.betAmount);

    if (bet.betSide === 'yes') yesCount++;
    else noCount++;

    if (bet.betAmount === 1) amount1++;
    else if (bet.betAmount === 5) amount5++;
    else if (bet.betAmount === 10) amount10++;
  }

  const totalAmount = formatBetAmount(totalAmountWei);
  const betCount = bets.length;

  let summary = `${betCount} prediction${betCount !== 1 ? 's' : ''} totaling ${totalAmount}`;

  if (yesCount > 0 && noCount > 0) {
    summary += ` (${yesCount} YES, ${noCount} NO)`;
  } else if (yesCount > 0) {
    summary += ` (all YES)`;
  } else {
    summary += ` (all NO)`;
  }

  return {
    totalAmount,
    betCount,
    breakdown: {
      yesCount,
      noCount,
      amount1,
      amount5,
      amount10,
    },
    summary,
  };
}

/**
 * Helper to check if user has sufficient USDC balance
 */
export async function checkUSDCBalance(
  userAddress: Address,
  requiredAmount: bigint
): Promise<{
  hasSufficient: boolean;
  balance: bigint;
  shortfall: bigint;
  balanceFormatted: string;
  shortfallFormatted: string;
}> {
  // This would need to be implemented with actual blockchain calls
  // For now, return a placeholder structure
  const balance = 0n; // Would be fetched from blockchain
  const hasSufficient = balance >= requiredAmount;
  const shortfall = hasSufficient ? 0n : requiredAmount - balance;

  return {
    hasSufficient,
    balance,
    shortfall,
    balanceFormatted: formatBetAmount(balance),
    shortfallFormatted: formatBetAmount(shortfall),
  };
}

// Export utility functions and types
export {
  formatBetAmount,
  validateBetAmount,
  type ParimutuelBetAmount,
  type ParimutuelBetSide,
};