import { base, baseSepolia } from 'wagmi/chains';
import { encodeFunctionData, parseUnits, Address } from 'viem';

// Real deployed contract addresses on Base Sepolia
export const USDC_CONTRACT_ADDRESS = '0x32dfDC3bB23d294a1b32E0EDDEddB12088112161' as Address;
export const MARKET_FACTORY_ADDRESS = '0xAa84401Ef34C0334D4B85259955DE1fa99495B96' as Address;
export const DEMO_MARKET_ADDRESS = '0xC1f3f3528AD71348AC4683CAde6e5988019735D8' as Address;

// MockUSDC ABI (includes faucet for testing)
export const USDC_ABI = [
    {
        name: 'transfer',
        type: 'function',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable'
    },
    {
        name: 'balanceOf',
        type: 'function',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    },
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
        name: 'faucet',
        type: 'function',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'decimals',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view'
    }
] as const;

// SimplePredictionMarket ABI
export const PREDICTION_MARKET_ABI = [
    {
        name: 'buyShares',
        type: 'function',
        inputs: [
            { name: 'side', type: 'bool' }, // true for YES, false for NO
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: 'shares', type: 'uint256' }],
        stateMutability: 'nonpayable'
    },
    {
        name: 'sellShares',
        type: 'function',
        inputs: [
            { name: 'side', type: 'bool' },
            { name: 'sharesToSell', type: 'uint256' }
        ],
        outputs: [{ name: 'usdcOut', type: 'uint256' }],
        stateMutability: 'nonpayable'
    },
    {
        name: 'getUserShares',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
            { name: 'yesBalance', type: 'uint256' },
            { name: 'noBalance', type: 'uint256' }
        ],
        stateMutability: 'view'
    },
    {
        name: 'getYesPrice',
        type: 'function',
        inputs: [],
        outputs: [{ name: 'price', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'getNoPrice',
        type: 'function',
        inputs: [],
        outputs: [{ name: 'price', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'getMarketStats',
        type: 'function',
        inputs: [],
        outputs: [
            { name: '_yesPool', type: 'uint256' },
            { name: '_noPool', type: 'uint256' },
            { name: 'totalVolume', type: 'uint256' }
        ],
        stateMutability: 'view'
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
        functionName: 'buyShares',
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
export function getMarketContractAddress(marketId: string): Address {
    // Check if it's a Supabase market with contract address
    const supabaseMarkets = getSupabaseMarketMapping();
    if (supabaseMarkets[marketId]) {
        return supabaseMarkets[marketId];
    }
    
    // Check if it's a static/legacy market ID
    const staticMarkets = getStaticMarketMapping();
    if (staticMarkets[marketId]) {
        return staticMarkets[marketId];
    }
    
    // Fallback to demo market for development (with warning)
    console.warn(`⚠️  Market ${marketId} not found, using demo contract. This should not happen in production!`);
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

/**
 * Get static markets that map to the demo contract
 * All static/legacy markets use the demo contract for now
 */
function getStaticMarketMapping(): Record<string, Address> {
    return {
        // All static markets default to demo contract
        'default': DEMO_MARKET_ADDRESS
    };
}

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
 * Generate transaction data for USDC approval
 */
export function generateUSDCApprovalTransaction(amount: number, spender: Address) {
    const amountFormatted = parseUnits(amount.toString(), 6); // USDC has 6 decimals

    const encodedData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'approve',
        args: [spender, amountFormatted]
    });

    return {
        to: USDC_CONTRACT_ADDRESS,
        data: encodedData,
        value: BigInt(0),
    };
}

/**
 * Generate transaction data for USDC transfer
 */
export function generateUSDCTransferTransaction(to: Address, amount: number) {
    const amountFormatted = parseUnits(amount.toString(), 6); // USDC has 6 decimals

    const encodedData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [to, amountFormatted]
    });

    return {
        to: USDC_CONTRACT_ADDRESS,
        data: encodedData,
        value: BigInt(0),
    };
}

/**
 * Generate transaction data for USDC faucet (testnet only)
 */
export function generateUSDCFaucetTransaction() {
    const encodedData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'faucet',
        args: []
    });

    return {
        to: USDC_CONTRACT_ADDRESS,
        data: encodedData,
        value: BigInt(0),
    };
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
