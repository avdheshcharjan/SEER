/**
 * 🚀 Gasless Transaction Handler for OnchainKit
 * Uses OnchainKit's built-in Transaction component with isSponsored prop
 * This is the recommended approach for Coinbase Paymaster integration
 */

import { Address, encodeFunctionData, parseUnits } from 'viem';
import { 
  MARKET_FACTORY_ADDRESS,
  PREDICTION_MARKET_ABI,
  MARKET_FACTORY_ABI
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
 * Generate transaction calls for buying shares in a prediction market
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