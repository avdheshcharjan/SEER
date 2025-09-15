import { Address } from 'viem';

// Deployed pari-mutuel contract addresses on Base Sepolia
export const PARIMUTUEL_FACTORY_ADDRESS = '0xd0a6e763691fe2041aA5eA04deb67AcF888A40dD' as Address;
export const DEMO_PARIMUTUEL_MARKET_ADDRESS = '0x0Ee1Eaa29418e64b20d53794B26c7C7D1aD02687' as Address;

// USDC contract address on Base Sepolia (unchanged)
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;

// Legacy AMM addresses (for reference)
export const AMM_FACTORY_ADDRESS = '0xB788385cf679A69C43CfD9cB35045BBd4c2843f2' as Address;
export const DEMO_AMM_MARKET_ADDRESS = '0x86F3108947dA0a88170A7AE8E967dAE8ce0a41F9' as Address;

// Pari-mutuel Factory ABI for creating markets
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

// Helper function to get contract address for a market ID (updated for pari-mutuel)
export const getParimutuelMarketContractAddress = (
    marketId: string, 
    rawSupabaseMarkets: Array<{ id: string; contract_address?: string; [key: string]: unknown }>
): Address => {
    const market = rawSupabaseMarkets.find(m => m.id === marketId);
    if (!market?.contract_address) {
        console.warn(`Market ${marketId} has no contract address, using demo market`);
        return DEMO_PARIMUTUEL_MARKET_ADDRESS;
    }
    return market.contract_address as Address;
};

// Helper function to validate pari-mutuel market contract
export const validateParimutuelMarketContract = async (contractAddress: Address): Promise<boolean> => {
    // In a real implementation, this would check if the contract exists and has the right interface
    // For now, just validate it's not the zero address
    return contractAddress !== '0x0000000000000000000000000000000000000000';
};

export default {
    PARIMUTUEL_FACTORY_ADDRESS,
    DEMO_PARIMUTUEL_MARKET_ADDRESS,
    USDC_CONTRACT_ADDRESS,
    PARIMUTUEL_FACTORY_ABI,
    PARIMUTUEL_MARKET_ABI,
    getParimutuelMarketContractAddress,
    validateParimutuelMarketContract,
};