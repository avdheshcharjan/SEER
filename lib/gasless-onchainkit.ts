/**
 * 🚀 Gasless Transaction Handler for OnchainKit
 * Uses OnchainKit's built-in Transaction component with isSponsored prop
 * This is the recommended approach for Coinbase Paymaster integration
 */

import { Address, encodeFunctionData } from 'viem';
import { 
  MARKET_FACTORY_ADDRESS,
  PREDICTION_MARKET_ABI,
  MARKET_FACTORY_ABI
} from './blockchain';


/**
 * Generate transaction calls for buying shares in a prediction market
 */
export function generateBuySharesCalls(
  marketAddress: Address,
  prediction: 'yes' | 'no',
  amount: bigint
) {
  const data = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: 'buyShares',
    args: [prediction === 'yes', amount]
  });

  return [{
    to: marketAddress,
    data: data as `0x${string}`,
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
  validatePaymasterConfig,
  getRequiredAllowlist,
  handleTransactionStatus
};

export default gaslessOnchainKit;