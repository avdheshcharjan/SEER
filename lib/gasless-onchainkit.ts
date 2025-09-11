/**
 * 🚀 Gasless Transaction Handler for OnchainKit
 * Uses OnchainKit's built-in Transaction component with isSponsored prop
 * This is the recommended approach for Coinbase Paymaster integration
 */

import { Address, encodeFunctionData, parseUnits } from 'viem';
import { 
  MARKET_FACTORY_ADDRESS,
  PREDICTION_MARKET_ABI,
  MARKET_FACTORY_ABI,
  CONDITIONAL_TOKENS_ADDRESS,
  FPMM_FACTORY_ADDRESS,
  CONDITIONAL_TOKENS_ABI,
  FPMM_ABI,
  createBuyTx,
  createSellTx,
  createPrepareConditionTx,
  createFPMMTx
} from './blockchain';

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


/**
 * Generate transaction calls for buying shares in a Gnosis prediction market
 * Includes USDC approval if needed
 */
export function generateBuySharesCalls(
  marketAddress: Address,
  prediction: 'yes' | 'no',
  amount: bigint,
  needsApproval: boolean = true
) {
  const calls: Array<{
    to: Address;
    data: `0x${string}`;
    value: bigint;
  }> = [];

  // Add approval call if needed (approve FPMM to spend USDC)
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

  // Use Gnosis buy transaction
  const amountInUsdc = Number(amount) / 1e6; // Convert from wei to USDC (6 decimals)
  const outcomeIndex = prediction === 'yes' ? 0 : 1;
  const buyTx = createBuyTx(marketAddress, amountInUsdc, outcomeIndex as 0 | 1);

  calls.push({
    to: buyTx.to,
    data: buyTx.data,
    value: buyTx.value
  });

  return calls;
}

/**
 * Generate transaction calls for creating a new Gnosis market
 * This includes: 1) Prepare condition 2) Create FPMM
 */
export function generateCreateGnosisMarketCalls(
  question: string,
  endTime: bigint,
  oracle: Address,
  initialLiquidity: number = 100 // Initial USDC liquidity
) {
  const calls: Array<{
    to: Address;
    data: `0x${string}`;
    value: bigint;
  }> = [];

  // 1. Prepare condition on ConditionalTokens
  const prepareConditionTx = createPrepareConditionTx(oracle, question);
  calls.push({
    to: prepareConditionTx.to,
    data: prepareConditionTx.data,
    value: prepareConditionTx.value
  });

  // 2. Create FPMM (would need the condition ID, which is deterministic)
  // Note: In practice, you'd compute the condition ID and create FPMM in a separate transaction
  // or use a factory contract that does both steps

  console.log('🏭 Generated Gnosis market creation calls:', {
    question,
    oracle,
    endTime: endTime.toString(),
    callsCount: calls.length
  });

  return calls;
}

/**
 * Generate transaction calls for creating a new market (legacy compatibility)
 */
export function generateCreateMarketCalls(
  question: string,
  endTime: bigint,
  resolver: Address = '0x0000000000000000000000000000000000000000'
) {
  // For backward compatibility, use Gnosis market creation
  return generateCreateGnosisMarketCalls(question, endTime, resolver);
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
        address: CONDITIONAL_TOKENS_ADDRESS,
        functions: ['prepareCondition', 'splitPosition', 'mergePositions', 'redeemPositions']
      },
      {
        address: FPMM_FACTORY_ADDRESS,
        functions: ['createFixedProductMarketMaker']
      },
      {
        address: MARKET_FACTORY_ADDRESS,
        functions: ['createMarket']
      },
      // Individual FPMM contracts need to be added dynamically
      {
        address: 'DYNAMIC_FPMM_ADDRESSES',
        functions: ['buy', 'sell', 'addFunding', 'removeFunding']
      },
      // USDC contract for approvals
      {
        address: USDC_CONTRACT_ADDRESS,
        functions: ['approve', 'transfer']
      }
    ],
    networks: ['base-sepolia', 'base'],
    description: 'These Gnosis Conditional Tokens contracts and functions must be allowlisted in your Coinbase Developer Platform project'
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
 * Example usage with OnchainKit Transaction component:
 * 
 * import { Transaction, TransactionButton, TransactionSponsor } from '@coinbase/onchainkit/transaction';
 * import { generateBuySharesCalls, handleTransactionStatus } from '@/lib/gasless-onchainkit';
 * 
 * function PredictionComponent() {
 *   const calls = generateBuySharesCalls(marketAddress, 'yes', parseUnits('10', 6));
 *   
 *   return (
 *     <Transaction
 *       isSponsored={true}  // This enables gasless transactions
 *       calls={calls}
 *       onStatus={handleTransactionStatus}
 *     >
 *       <TransactionButton />
 *       <TransactionSponsor />
 *     </Transaction>
 *   );
 * }
 */

const gaslessOnchainKit = {
  generateBuySharesCalls,
  generateCreateMarketCalls,
  generateUSDCApprovalCalls,
  validatePaymasterConfig,
  getRequiredAllowlist,
  handleTransactionStatus,
  USDC_CONTRACT_ADDRESS
};

export default gaslessOnchainKit;