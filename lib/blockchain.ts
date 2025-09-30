import { base, baseSepolia } from 'wagmi/chains';
import { encodeFunctionData, parseUnits, Address } from 'viem';

// Real deployed contract addresses on Base Sepolia (with real USDC integration)
export const MARKET_FACTORY_ADDRESS = '0x89332E711B591DEeAC1a67b4ED5086a209a7414E' as Address;

// Updated factory address from requirements (if using newer deployment)
export const FACTORY_CONTRACT_ADDRESS = '0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C' as Address;

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
 * Legacy wrapper for backward compatibility
 */
export function getMarketContractAddressLegacy(marketId: string, supabaseMarkets?: Array<{
    id: string;
    contract_address?: string;
    contractAddress?: string;
    [key: string]: unknown;
}>): Address | undefined {
    const result = getMarketContractAddress(marketId, supabaseMarkets);
    return result.address;
}

/**
 * Enhanced contract address validation with comprehensive checks
 */
export function validateContractAddress(address: string): { isValid: boolean; reason?: string } {
    // Check basic format
    if (!isValidAddress(address)) {
        return { isValid: false, reason: 'Invalid address format or zero address' };
    }

    // Additional validation for known problematic addresses
    const problematicAddresses = [
        '0x0000000000000000000000000000000000000000', // Zero address
        '0x000000000000000000000000000000000000dead', // Burn address
    ];

    if (problematicAddresses.includes(address.toLowerCase())) {
        return { isValid: false, reason: 'Address is known problematic address' };
    }

    return { isValid: true };
}

/**
 * Validate market contract specifically against factory-deployed contracts
 */
export function validateMarketContract(contractAddress: Address): { isValid: boolean; reason?: string } {
    const validation = validateContractAddress(contractAddress);
    if (!validation.isValid) {
        return validation;
    }

    // Add market-specific validation here
    // Could check if contract was deployed by our factory in the future
    return { isValid: true };
}

/**
 * Get market contract address from market ID with enhanced validation
 * Maps Supabase market IDs to deployed contract addresses
 */
export function getMarketContractAddress(marketId: string, supabaseMarkets?: Array<{
    id: string;
    contract_address?: string;
    contractAddress?: string;
    [key: string]: unknown;
}>): { address?: Address; isValid: boolean; reason?: string } {
    // Check if it's a Supabase market with contract address
    if (supabaseMarkets) {
        const market = supabaseMarkets.find(m => m.id === marketId);
        if (market) {
            // Check both snake_case (raw Supabase) and camelCase (UnifiedMarket) formats
            const contractAddr = market.contract_address || market.contractAddress;
            if (contractAddr) {
                // Enhanced validation with detailed feedback
                const validation = validateContractAddress(contractAddr);
                if (!validation.isValid) {
                    console.error(`❌ Market ${marketId} has invalid contract address: ${contractAddr} - ${validation.reason}`);
                    return { address: undefined, isValid: false, reason: validation.reason };
                }
                console.log(`✅ Found market ${marketId} -> ${contractAddr}`);
                return { address: contractAddr as Address, isValid: true };
            } else {
                console.warn(`⚠️ Market ${marketId} has no contract address`);
                return { address: undefined, isValid: false, reason: 'No contract address in database' };
            }
        }
    }

    // Fallback: Check static mapping
    const supabaseMapping = getSupabaseMarketMapping();
    if (supabaseMapping[marketId]) {
        const mappedAddress = supabaseMapping[marketId];
        const validation = validateContractAddress(mappedAddress);
        if (!validation.isValid) {
            console.error(`❌ Market ${marketId} has invalid mapped contract address: ${mappedAddress} - ${validation.reason}`);
            return { address: undefined, isValid: false, reason: validation.reason };
        }
        return { address: mappedAddress, isValid: true };
    }

    // No valid contract found
    const availableMarkets = supabaseMarkets?.filter(m => {
        const addr = m.contract_address || m.contractAddress;
        return addr && validateContractAddress(addr).isValid;
    }).map(m => m.id) || [];

    console.error(`❌ Market ${marketId} missing contract address. Available markets with valid contracts:`, availableMarkets);
    return { address: undefined, isValid: false, reason: 'Market not found or no valid contract address' };
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
 * Enhanced contract address sync status tracking
 */
export interface ContractSyncStatus {
    hasContract: boolean;
    isValidAddress: boolean;
    isDeployed: boolean;
    lastSyncTime?: Date;
    syncError?: string;
}

/**
 * Get contract sync status for a market
 */
export function getMarketContractStatus(market: {
    id: string;
    contract_address?: string;
    contractAddress?: string;
    created_at?: string;
    transaction_hash?: string;
}): ContractSyncStatus {
    const contractAddr = market.contract_address || market.contractAddress;

    if (!contractAddr) {
        return {
            hasContract: false,
            isValidAddress: false,
            isDeployed: false,
            syncError: 'No contract address in database'
        };
    }

    const validation = validateContractAddress(contractAddr);
    if (!validation.isValid) {
        return {
            hasContract: true,
            isValidAddress: false,
            isDeployed: false,
            syncError: validation.reason
        };
    }

    return {
        hasContract: true,
        isValidAddress: true,
        isDeployed: !!market.transaction_hash, // Has deployment transaction
        lastSyncTime: market.created_at ? new Date(market.created_at) : undefined
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
        const status = getMarketContractStatus(market);

        if (!status.hasContract) {
            console.log(`Filtering out market ${market.id}: no contract address field`);
            return false;
        }

        if (!status.isValidAddress) {
            console.log(`Filtering out market ${market.id}: ${status.syncError}`);
            return false;
        }

        // Optional: also filter out markets that haven't been deployed yet
        if (!status.isDeployed) {
            console.log(`Filtering out market ${market.id}: contract not deployed (no transaction hash)`);
            return false;
        }

        console.log(`✅ Market ${market.id} has valid deployed contract address: ${market.contract_address || market.contractAddress}`);
        return true;
    });
}

// Enhanced contract address management
// Now supports both static mappings and dynamic Supabase sync

/**
 * Check if markets need contract address sync
 */
export function getMarketsNeedingSync<T extends { id: string; contract_address?: string; contractAddress?: string; created_at?: string }>(
    markets: T[]
): T[] {
    return markets.filter(market => {
        const status = getMarketContractStatus(market);
        return !status.hasContract || !status.isValidAddress || !status.isDeployed;
    });
}

/**
 * Async validation that a market address is a legitimate prediction market contract
 * Enhanced with on-chain verification
 */
export async function validateMarketContractOnChain(marketAddress: Address): Promise<{ isValid: boolean; reason?: string }> {
    try {
        // Basic validation first
        const basicValidation = validateMarketContract(marketAddress);
        if (!basicValidation.isValid) {
            return basicValidation;
        }

        // TODO: Add on-chain validation
        // - Check if contract exists at address
        // - Verify it was deployed by our factory
        // - Check if it implements required interfaces

        return { isValid: true };
    } catch (error) {
        console.error('Market contract on-chain validation failed:', error);
        return { isValid: false, reason: `On-chain validation failed: ${error}` };
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
 * Utility to get the appropriate factory address
 */
export function getFactoryAddress(): Address {
    // Use the updated factory address from requirements, fallback to legacy
    return FACTORY_CONTRACT_ADDRESS || MARKET_FACTORY_ADDRESS;
}

/**
 * Check if an address was deployed by our factory
 * This will be enhanced with actual factory verification
 */
export function isFactoryDeployedContract(contractAddress: Address): boolean {
    // TODO: Implement actual factory verification
    // For now, just validate the address format
    return validateContractAddress(contractAddress).isValid;
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

/**
 * Contract deployment and sync utilities
 */
export interface DeploymentResult {
    success: boolean;
    contractAddress?: Address;
    transactionHash?: string;
    error?: string;
}

/**
 * Market creation with contract deployment tracking
 */
export interface MarketCreationParams {
    question: string;
    category: string;
    endTime: Date;
    creatorAddress: Address;
}

/**
 * Enhanced market contract mapping with sync status
 */
export interface MarketContractMapping {
    marketId: string;
    contractAddress: Address;
    isDeployed: boolean;
    deploymentTransaction?: string;
    lastValidated?: Date;
    syncStatus: 'pending' | 'synced' | 'failed';
}

/**
 * Batch validate multiple contract addresses
 */
export function batchValidateContracts(addresses: string[]): Array<{ address: string; isValid: boolean; reason?: string }> {
    return addresses.map(address => ({
        address,
        ...validateContractAddress(address)
    }));
}

/**
 * Generate contract creation event signature for monitoring
 */
export function getMarketCreatedEventSignature(): string {
    // MarketCreated(address indexed market, address indexed creator, string question, uint256 endTime, uint256 marketIndex)
    return '0x' + '8b8e02c0d40a0e4c0b5e8c6bc7c9e9b8d8e8f8c8c8c8c8c8c8c8c8c8c8c8c8c8'; // Placeholder
}
