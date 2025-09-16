import { base, baseSepolia } from 'wagmi/chains';
import { encodeFunctionData, parseUnits, Address } from 'viem';

// Pari-mutuel contract addresses on Base Sepolia (replacing AMM system)
// Updated with latest deployment from DeployUMAContracts.s.sol
export const MARKET_FACTORY_ADDRESS = '0x50ACC2590E8BB702C9A74327D208dE9a9EeF4c9a' as Address;
export const DEMO_MARKET_ADDRESS = '0xf538f10A2c073ee90e77C648C325a11e6B9Dc527' as Address;

// Legacy AMM addresses (for reference)
export const AMM_FACTORY_ADDRESS = '0xB788385cf679A69C43CfD9cB35045BBd4c2843f2' as Address;
export const DEMO_AMM_MARKET_ADDRESS = '0x86F3108947dA0a88170A7AE8E967dAE8ce0a41F9' as Address;

// USDC contract address on Base Sepolia (unchanged)
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;

// Market Resolver contract address (new deployment)
export const MARKET_RESOLVER_ADDRESS = '0x9dd909cD9F79B1618d9C797dC1b63DA9c9D77cBd' as Address;

// UMA Parimutuel Factory contract address (new deployment)
export const UMA_PARIMUTUEL_FACTORY_ADDRESS = '0x317A5FAd4F52C147545E0A4A3240dcB560F486c4' as Address;

// UMA Sample Market address (for testing)
export const UMA_SAMPLE_MARKET_ADDRESS = '0xD5Fc3f213Fe89dF79740676beAaE872ee4bceF05' as Address;

// Legacy addresses (replaced with new deployment)
// OLD: Factory: 0xfE7440a0C61aE1156E9B759Bb6C7E8BEFa0BCC3C (used MockUSDC)
// OLD: Demo: 0x688B4b38b8f73878Cd19ef7250FA63D6b36361d1


// MarketFactory ABI for creating markets
export const MARKET_FACTORY_ABI = [
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

// ParimutuelPredictionMarket ABI (replacing AMM functions)
export const PREDICTION_MARKET_ABI = [
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
    }
] as const;

export interface PredictionTransaction {
    marketAddress: Address;
    prediction: 'yes' | 'no';
    amount: number; // in USDC
    userAddress: Address;
}

/**
 * Generate transaction data for buying shares in a prediction market
 */
export function generateBuySharesTransaction(data: PredictionTransaction) {
    const { marketAddress, prediction, amount } = data;

    // Convert amount to 6 decimals (USDC format)
    const amountFormatted = parseUnits(amount.toString(), 6);

    // Encode the function call
    const encodedData = encodeFunctionData({
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [prediction === 'yes', amountFormatted]
    });

    return {
        to: marketAddress,
        data: encodedData,
        value: BigInt(0), // No ETH value, using USDC
    };
}

/**
 * Get market contract address from market ID
 * Maps Supabase market IDs to deployed contract addresses
 */
export function getMarketContractAddress(marketId: string, supabaseMarkets?: Array<{
    id: string;
    contract_address?: string;
    [key: string]: unknown;
}>): Address {
    // Check if it's a Supabase market with contract address
    if (supabaseMarkets) {
        const market = supabaseMarkets.find(m => m.id === marketId);
        if (market && market.contract_address) {
            console.log(`✅ Found Supabase market ${marketId} -> ${market.contract_address}`);
            return market.contract_address as Address;
        }
    }

    // Fallback: Check static mapping
    const supabaseMapping = getSupabaseMarketMapping();
    if (supabaseMapping[marketId]) {
        return supabaseMapping[marketId];
    }

    // Fallback to demo market for development (with warning)
    console.warn(`⚠️  Market ${marketId} not found in Supabase, using demo contract. This should not happen in production!`);
    return DEMO_MARKET_ADDRESS;
}

/**
 * Get Supabase markets that have deployed contracts
 * This would be populated from your database
 */
function getSupabaseMarketMapping(): Record<string, Address> {
    // TODO: Fetch this from Supabase or cache
    // For now, return demo mapping
    return {
        // 'supabase-market-id': '0xContractAddress'
    };
}

// Static market mappings removed - now using only Supabase markets with contract addresses

/**
 * Validate that a market address is a legitimate prediction market contract
 */
export async function validateMarketContract(marketAddress: Address): Promise<boolean> {
    try {
        // Basic validation - check if it has the required functions
        // In a full implementation, you'd verify it was deployed by your factory
        return isValidAddress(marketAddress);
    } catch (error) {
        console.error('Market contract validation failed:', error);
        return false;
    }
}


/**
 * Get the appropriate chain configuration
 */
export function getChainConfig(testnet: boolean = true) {
    return testnet ? baseSepolia : base;
}

/**
 * Format transaction hash for display
 */
export function formatTransactionHash(hash: string): string {
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

/**
 * Generate block explorer URL
 */
export function getBlockExplorerUrl(hash: string, testnet: boolean = true): string {
    const baseUrl = testnet
        ? 'https://sepolia.basescan.org'
        : 'https://basescan.org';
    return `${baseUrl}/tx/${hash}`;
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Convert prediction string to boolean for smart contract
 */
export function predictionToBoolean(prediction: 'yes' | 'no'): boolean {
    return prediction === 'yes';
}

/**
 * Convert boolean from smart contract to prediction string
 */
export function booleanToPrediction(value: boolean): 'yes' | 'no' {
    return value ? 'yes' : 'no';
}
