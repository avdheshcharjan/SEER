import { base, baseSepolia } from 'wagmi/chains';
import { encodeFunctionData, parseEther, Address, parseUnits } from 'viem';

// Real deployed contract addresses on Base Sepolia
export const USDC_CONTRACT_ADDRESS = '0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2' as Address;
export const MARKET_FACTORY_ADDRESS = '0xAa84401Ef34C0334D4B85259955DE1fa99495B96' as Address;
export const DEMO_MARKET_ADDRESS = '0xC1f3f3528AD71348AC4683CAde6e5988019735D8' as Address;

// MockUSDC ABI - includes faucet function for getting test tokens
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
        name: 'allowance',
        type: 'function',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
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
    },
    {
        name: 'canUseFaucet',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: 'available', type: 'bool' }],
        stateMutability: 'view'
    },
    {
        name: 'getFaucetCooldown',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: 'timeRemaining', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'lastFaucetRequest',
        type: 'function',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'toHumanAmount',
        type: 'function',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [{ name: 'humanAmount', type: 'uint256' }],
        stateMutability: 'pure'
    },
    {
        name: 'fromHumanAmount',
        type: 'function',
        inputs: [{ name: 'humanAmount', type: 'uint256' }],
        outputs: [{ name: 'weiAmount', type: 'uint256' }],
        stateMutability: 'pure'
    },
    {
        name: 'mint',
        type: 'function',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'FaucetUsed',
        type: 'event',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false }
        ]
    },
    {
        name: 'FaucetCooldownActive',
        type: 'error',
        inputs: [{ name: 'timeRemaining', type: 'uint256' }]
    },
    {
        name: 'InvalidAmount',
        type: 'error',
        inputs: []
    }
] as const;

// SimplePredictionMarket ABI - for buying/selling shares
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
        name: 'calculateSharesOut',
        type: 'function',
        inputs: [
            { name: 'usdcIn', type: 'uint256' },
            { name: 'side', type: 'bool' }
        ],
        outputs: [{ name: 'shares', type: 'uint256' }],
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
    },
    {
        name: 'outcome',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
    },
    {
        name: 'claimRewards',
        type: 'function',
        inputs: [],
        outputs: [{ name: 'payout', type: 'uint256' }],
        stateMutability: 'nonpayable'
    }
] as const;

// MarketFactory ABI - for creating new markets
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
        name: 'markets',
        type: 'function',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
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
        name: 'getCreatorMarkets',
        type: 'function',
        inputs: [{ name: 'creator', type: 'address' }],
        outputs: [{ name: '', type: 'address[]' }],
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

    // Convert amount to USDC format (6 decimals)
    const amountWei = parseUnits(amount.toString(), 6);

    // Encode the function call
    const encodedData = encodeFunctionData({
        abi: PREDICTION_MARKET_ABI,
        functionName: 'buyShares',
        args: [prediction === 'yes', amountWei]
    });

    return {
        to: marketAddress,
        data: encodedData,
        value: BigInt(0), // No ETH value, using USDC
    };
}

/**
 * Generate transaction data for USDC approval
 */
export function generateUSDCApprovalTransaction(amount: number, spender: Address) {
    // Convert amount to USDC format (6 decimals)
    const amountWei = parseUnits(amount.toString(), 6);

    const encodedData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'approve',
        args: [spender, amountWei]
    });

    return {
        to: USDC_CONTRACT_ADDRESS,
        data: encodedData,
        value: BigInt(0),
    };
}

/**
 * Generate transaction data for getting test USDC from faucet
 */
export function generateFaucetTransaction() {
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
 * Generate transaction data for creating a new market
 */
export function generateCreateMarketTransaction(
    question: string,
    endTime: number,
    resolver: Address = '0x0000000000000000000000000000000000000000'
) {
    const encodedData = encodeFunctionData({
        abi: MARKET_FACTORY_ABI,
        functionName: 'createMarket',
        args: [question, BigInt(endTime), resolver]
    });

    return {
        to: MARKET_FACTORY_ADDRESS,
        data: encodedData,
        value: BigInt(0),
    };
}

/**
 * Generate transaction data for USDC transfer
 */
export function generateUSDCTransferTransaction(to: Address, amount: number) {
    // Convert amount to USDC format (6 decimals)
    const amountWei = parseUnits(amount.toString(), 6);

    const encodedData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [to, amountWei]
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
