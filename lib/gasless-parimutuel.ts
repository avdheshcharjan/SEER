/**
 * 🚀 Gasless Transaction Handler for Pari-mutuel Markets
 * Uses OnchainKit's built-in Transaction component with isSponsored prop
 * Updated for the simplified pari-mutuel betting system
 */

import { Address, encodeFunctionData, parseUnits } from 'viem';

// Deployed pari-mutuel factory address on Base Sepolia
export const PARIMUTUEL_FACTORY_ADDRESS = '0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496' as Address;

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

// Pari-mutuel Market ABI
export const PARIMUTUEL_MARKET_ABI = [
  {
    name: 'betYes',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'betNo',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'placeBet',
    type: 'function',
    inputs: [
      { name: 'side', type: 'bool' }, // true for YES, false for NO
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getUserBets',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'yesBet', type: 'uint256' },
      { name: 'noBet', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'getMarketStats',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'totalYesBets', type: 'uint256' },
      { name: 'totalNoBets', type: 'uint256' },
      { name: 'totalVolume', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'getCurrentOdds',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'yesOdds', type: 'uint256' },
      { name: 'noOdds', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'calculatePotentialPayout',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'potentialPayout', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'claimRewards',
    type: 'function',
    inputs: [],
    outputs: [{ name: 'payout', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'resolved',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'outcome',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'endTime',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'question',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view'
  },
  // Events
  {
    name: 'BetPlaced',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'bettor', type: 'address', indexed: true },
      { name: 'side', type: 'bool', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'MarketResolved',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'outcome', type: 'bool', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'RewardsClaimed',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  }
] as const;

// Pari-mutuel Factory ABI
export const PARIMUTUEL_FACTORY_ABI = [
  {
    name: 'createMarket',
    type: 'function',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'resolver', type: 'address' }
    ],
    outputs: [{ name: 'market', type: 'address' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getMarketCount',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'MarketCreated',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'market', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'question', type: 'string', indexed: false },
      { name: 'endTime', type: 'uint256', indexed: false },
      { name: 'marketIndex', type: 'uint256', indexed: false }
    ]
  }
] as const;

/**
 * Generate transaction calls for placing a bet in a pari-mutuel market
 * Includes USDC approval if needed
 */
export function generateBetCalls(
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

  // Add bet call using the generic placeBet function
  const placeBetData = encodeFunctionData({
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'placeBet',
    args: [prediction === 'yes', amount]
  });

  calls.push({
    to: marketAddress,
    data: placeBetData as `0x${string}`,
    value: BigInt(0)
  });

  return calls;
}

/**
 * Generate transaction calls for creating a new pari-mutuel market
 */
export function generateCreateParimutuelMarketCalls(
  question: string,
  endTime: bigint,
  resolver: Address = '0x0000000000000000000000000000000000000000'
) {
  const data = encodeFunctionData({
    abi: PARIMUTUEL_FACTORY_ABI,
    functionName: 'createMarket',
    args: [question, endTime, resolver]
  });

  const calls = [{
    to: PARIMUTUEL_FACTORY_ADDRESS,
    data: data as `0x${string}`,
    value: BigInt(0)
  }];

  console.log('🏭 Generated pari-mutuel market creation call:', {
    to: PARIMUTUEL_FACTORY_ADDRESS,
    data: data,
    question,
    endTime: endTime.toString(),
    resolver
  });

  return calls;
}

/**
 * Generate transaction calls for claiming rewards from a resolved market
 */
export function generateClaimRewardsCalls(marketAddress: Address) {
  const data = encodeFunctionData({
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'claimRewards',
    args: []
  });

  return [{
    to: marketAddress,
    data: data as `0x${string}`,
    value: BigInt(0)
  }];
}

/**
 * Generate approval call for maximum USDC spending
 * This allows multiple bets without repeated approvals
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
        address: PARIMUTUEL_FACTORY_ADDRESS,
        functions: ['createMarket']
      },
      // Individual market contracts need to be added dynamically
      {
        address: 'DYNAMIC_PARIMUTUEL_MARKET_ADDRESSES',
        functions: ['placeBet', 'betYes', 'betNo', 'claimRewards']
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
  console.log('Pari-mutuel transaction status:', status.statusName);

  switch (status.statusName) {
    case 'success':
      const receipts = status.statusData.transactionReceipts;
      if (receipts && receipts.length > 0) {
        const txHash = receipts[0].transactionHash;
        console.log('✅ Pari-mutuel transaction successful:', txHash);
        onSuccess?.(txHash);
      }
      break;

    case 'error':
      const errorMessage = status.statusData.message;
      console.error('❌ Pari-mutuel transaction failed:', errorMessage);
      onError?.(errorMessage);
      break;

    case 'transactionPending':
      console.log('⏳ Pari-mutuel transaction pending...');
      break;

    case 'buildingTransaction':
      console.log('🔨 Building pari-mutuel transaction...');
      break;

    default:
      console.log(`Pari-mutuel status: ${status.statusName}`);
  }
}

const gaslessParimutuel = {
  generateBetCalls,
  generateCreateParimutuelMarketCalls,
  generateClaimRewardsCalls,
  generateUSDCApprovalCalls,
  validatePaymasterConfig,
  getRequiredAllowlist,
  handleTransactionStatus,
  USDC_CONTRACT_ADDRESS,
  PARIMUTUEL_FACTORY_ADDRESS,
  PARIMUTUEL_MARKET_ABI,
  PARIMUTUEL_FACTORY_ABI
};

export default gaslessParimutuel;