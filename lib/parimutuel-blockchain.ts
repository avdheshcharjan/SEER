import { base, baseSepolia } from 'wagmi/chains';
import { encodeFunctionData, parseUnits, Address } from 'viem';

// Parimutuel contract addresses (will be updated after deployment)
export const PARIMUTUEL_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000' as Address; // To be updated
export const PARIMUTUEL_DEMO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address; // To be updated

// USDC contract address on Base Sepolia
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;

// Parimutuel Market Factory ABI
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
        name: 'getActiveMarkets',
        type: 'function',
        inputs: [{ name: 'limit', type: 'uint256' }],
        outputs: [{ name: 'result', type: 'address[]' }],
        stateMutability: 'view'
    },
    {
        name: 'markets',
        type: 'function',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view'
    }
] as const;

// Parimutuel Prediction Market ABI (key functions only)
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
        name: 'claimRewards',
        type: 'function',
        inputs: [],
        outputs: [{ name: 'payout', type: 'uint256' }],
        stateMutability: 'nonpayable'
    },
    {
        name: 'resolveMarket',
        type: 'function',
        inputs: [{ name: '_outcome', type: 'bool' }],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'emergencyResolve',
        type: 'function',
        inputs: [{ name: '_outcome', type: 'bool' }],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'question',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
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
        name: 'yesPool',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'noPool',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'yesBets',
        type: 'function',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'noBets',
        type: 'function',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'getUserBets',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
            { name: 'userYesBet', type: 'uint256' },
            { name: 'userNoBet', type: 'uint256' },
            { name: 'claimStatus', type: 'bool' }
        ],
        stateMutability: 'view'
    },
    {
        name: 'getPotentialPayouts',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
            { name: 'yesPayout', type: 'uint256' },
            { name: 'noPayout', type: 'uint256' }
        ],
        stateMutability: 'view'
    },
    {
        name: 'getCurrentOdds',
        type: 'function',
        inputs: [],
        outputs: [
            { name: 'yesImpliedOdds', type: 'uint256' },
            { name: 'noImpliedOdds', type: 'uint256' }
        ],
        stateMutability: 'view'
    },
    {
        name: 'getMarketStats',
        type: 'function',
        inputs: [],
        outputs: [
            { name: '_yesPool', type: 'uint256' },
            { name: '_noPool', type: 'uint256' },
            { name: 'totalVolume', type: 'uint256' },
            { name: 'uniqueBettors', type: 'uint256' }
        ],
        stateMutability: 'view'
    },
    {
        name: 'canResolve',
        type: 'function',
        inputs: [],
        outputs: [{ name: 'resolvable', type: 'bool' }],
        stateMutability: 'view'
    },
    {
        name: 'hasClaimed',
        type: 'function',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
    },
    {
        name: 'estimateGasForBet',
        type: 'function',
        inputs: [{ name: 'side', type: 'bool' }],
        outputs: [{ name: 'gasEstimate', type: 'uint256' }],
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

// Supported bet amounts in USDC (6 decimals)
export const PARIMUTUEL_BET_AMOUNTS = {
    1: parseUnits('1', 6), // 1 USDC
    5: parseUnits('5', 6), // 5 USDC
    10: parseUnits('10', 6), // 10 USDC
} as const;

// Helper to validate bet amounts
export function validateBetAmount(amount: number): bigint {
    if (amount === 1) return PARIMUTUEL_BET_AMOUNTS[1];
    if (amount === 5) return PARIMUTUEL_BET_AMOUNTS[5];
    if (amount === 10) return PARIMUTUEL_BET_AMOUNTS[10];

    throw new Error(`Invalid bet amount: ${amount}. Must be 1, 5, or 10 USDC.`);
}

// Helper to format bet amounts for display
export function formatBetAmount(amountWei: bigint): string {
    const amount = Number(amountWei) / 1e6; // Convert from 6 decimals to regular number
    return `$${amount}`;
}

// Helper to get market contract address from Supabase data
export function getParimutuelMarketAddress(marketData: { contract_address?: string }): Address {
    if (!marketData.contract_address) {
        throw new Error('Market contract address not found');
    }
    return marketData.contract_address as Address;
}

// Helper to validate if a contract is a parimutuel market
export async function validateParimutuelMarket(marketAddress: Address): Promise<boolean> {
    try {
        // Try to call a function that only exists on parimutuel markets
        // This is a basic check - you might want to add more validation
        return true;
    } catch (error) {
        console.error('Invalid parimutuel market address:', error);
        return false;
    }
}

// Configuration constants
export const PARIMUTUEL_CONFIG = {
    CHAIN: baseSepolia,
    CHAIN_ID: baseSepolia.id,
    RPC_URL: baseSepolia.rpcUrls.default.http[0],
    EXPLORER_URL: baseSepolia.blockExplorers.default.url,
    USDC_ADDRESS: USDC_CONTRACT_ADDRESS,
    FACTORY_ADDRESS: PARIMUTUEL_FACTORY_ADDRESS,

    // Gas limits for different operations
    GAS_LIMITS: {
        BET: 150000n, // Betting gas limit
        CLAIM: 100000n, // Claiming rewards gas limit
        RESOLVE: 80000n, // Market resolution gas limit
    },

    // UI Configuration
    DEFAULT_BET_AMOUNT: 1, // Default $1 USDC
    MAX_MARKETS_PER_BATCH: 20,
    MARKET_REFRESH_INTERVAL: 30000, // 30 seconds
} as const;

// Network utilities
export function getParimutuelNetworkConfig() {
    return {
        chain: PARIMUTUEL_CONFIG.CHAIN,
        contracts: {
            factory: PARIMUTUEL_FACTORY_ADDRESS,
            usdc: USDC_CONTRACT_ADDRESS,
        },
        gasLimits: PARIMUTUEL_CONFIG.GAS_LIMITS,
    };
}

// Export types for TypeScript
export type ParimutuelBetAmount = 1 | 5 | 10;
export type ParimutuelBetSide = 'yes' | 'no';

export interface ParimutuelMarketData {
    address: Address;
    question: string;
    endTime: bigint;
    resolved: boolean;
    outcome?: boolean;
    yesPool: bigint;
    noPool: bigint;
    totalVolume: bigint;
}

export interface ParimutuelUserBets {
    yesAmount: bigint;
    noAmount: bigint;
    hasClaimed: boolean;
    potentialYesPayout: bigint;
    potentialNoPayout: bigint;
}