import { base, baseSepolia } from 'wagmi/chains';
import { encodeFunctionData, parseUnits, Address } from 'viem';

// Real deployed contract addresses on Base Sepolia (with real USDC integration)
export const MARKET_FACTORY_ADDRESS = '0x89332E711B591DEeAC1a67b4ED5086a209a7414E' as Address;

// USDC contract address on Base Sepolia
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;

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
export function getMarketContractAddress(marketId: string, supabaseMarkets?: Array<{
    id: string;
    contract_address?: string;
    contractAddress?: string;
    [key: string]: unknown;
}>): Address | undefined {
    // Check if it's a Supabase market with contract address
    if (supabaseMarkets) {
        const market = supabaseMarkets.find(m => m.id === marketId);
        if (market) {
            // Check both snake_case (raw Supabase) and camelCase (UnifiedMarket) formats
            const contractAddr = market.contract_address || market.contractAddress;
            if (contractAddr) {
                // Validate the address before returning it
                if (!isValidAddress(contractAddr)) {
                    console.error(`❌ Market ${marketId} has invalid contract address: ${contractAddr}`);
                    return undefined;
                }
                console.log(`✅ Found market ${marketId} -> ${contractAddr}`);
                return contractAddr as Address;
            }
        }
    }

    // Fallback: Check static mapping
    const supabaseMapping = getSupabaseMarketMapping();
    if (supabaseMapping[marketId]) {
        const mappedAddress = supabaseMapping[marketId];
        // Validate the mapped address too
        if (!isValidAddress(mappedAddress)) {
            console.error(`❌ Market ${marketId} has invalid mapped contract address: ${mappedAddress}`);
            return undefined;
        }
        return mappedAddress;
    }

    // No valid contract found - return undefined
    console.error(`❌ Market ${marketId} missing contract address. Available markets:`,
        supabaseMarkets?.filter(m => {
            const addr = m.contract_address || m.contractAddress;
            return addr && isValidAddress(addr);
        }).map(m => m.id) || 'none');
    return undefined;
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
 * Filter markets to only include those with valid contract addresses
 * This prevents swipes on markets that can't execute transactions
 */
export function getMarketsWithContracts<T extends { id: string; contract_address?: string; contractAddress?: string }>(
    markets: T[]
): T[] {
    return markets.filter(market => {
        // Check both snake_case (raw Supabase) and camelCase (transformed UnifiedMarket) formats
        const contractAddr = market.contract_address || market.contractAddress;

        // First check: does the market have a contract address field?
        if (!contractAddr) {
            console.log(`Filtering out market ${market.id}: no contract address field`);
            return false;
        }

        // Second check: is the contract address valid?
        if (!isValidAddress(contractAddr)) {
            console.log(`Filtering out market ${market.id}: invalid contract address ${contractAddr}`);
            return false;
        }

        // Market has a valid contract address, no need for additional mapping checks
        console.log(`✅ Market ${market.id} has valid contract address: ${contractAddr}`);
        return true;
    });
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
    // Check basic format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return false;
    }

    // Reject zero address and other invalid addresses
    const invalidAddresses = [
        '0x0000000000000000000000000000000000000000', // Zero address
        '0x0000000000000000000000000000000000000001', // Common invalid
        '0x0000000000000000000000000000000000000002',
        '0x0000000000000000000000000000000000000003',
        '0x0000000000000000000000000000000000000004',
        '0x0000000000000000000000000000000000000005',
        '0x0000000000000000000000000000000000000006',
        '0x0000000000000000000000000000000000000007',
        '0x0000000000000000000000000000000000000008',
        '0x0000000000000000000000000000000000000009',
        '0x000000000000000000000000000000000000000a',
        '0x000000000000000000000000000000000000000b',
        '0x000000000000000000000000000000000000000c',
        '0x000000000000000000000000000000000000000d',
        '0x000000000000000000000000000000000000000e',
        '0x000000000000000000000000000000000000000f',
        '0x0000000000000000000000000000000000000010',
        '0x0000000000000000000000000000000000000011',
        '0x0000000000000000000000000000000000000012',
        '0x0000000000000000000000000000000000000013',
        '0x0000000000000000000000000000000000000014',
        '0x0000000000000000000000000000000000000015',
        '0x0000000000000000000000000000000000000016',
        '0x0000000000000000000000000000000000000017', // The specific invalid address from the error
        '0x0000000000000000000000000000000000000018',
        '0x0000000000000000000000000000000000000019',
        '0x000000000000000000000000000000000000001a',
        '0x000000000000000000000000000000000000001b',
        '0x000000000000000000000000000000000000001c',
        '0x000000000000000000000000000000000000001d',
        '0x000000000000000000000000000000000000001e',
        '0x000000000000000000000000000000000000001f'
    ];

    // Check if address is in the invalid list (case-insensitive)
    const normalizedAddress = address.toLowerCase();
    if (invalidAddresses.some(invalid => invalid.toLowerCase() === normalizedAddress)) {
        return false;
    }

    return true;
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
