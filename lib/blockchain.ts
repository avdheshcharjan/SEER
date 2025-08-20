import { base, baseSepolia } from 'wagmi/chains';
import { encodeFunctionData, parseEther, Address } from 'viem';

// Mock USDC contract address on Base Sepolia (for demo purposes)
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;

// Mock Prediction Market contract address (for demo purposes)
export const PREDICTION_MARKET_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as Address;

// USDC ABI (simplified for demo)
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
    }
] as const;

// Prediction Market ABI (simplified for demo)
export const PREDICTION_MARKET_ABI = [
    {
        name: 'makePrediction',
        type: 'function',
        inputs: [
            { name: 'marketId', type: 'bytes32' },
            { name: 'prediction', type: 'bool' }, // true for YES, false for NO
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: 'predictionId', type: 'uint256' }],
        stateMutability: 'nonpayable'
    },
    {
        name: 'getPrediction',
        type: 'function',
        inputs: [{ name: 'predictionId', type: 'uint256' }],
        outputs: [
            { name: 'user', type: 'address' },
            { name: 'marketId', type: 'bytes32' },
            { name: 'prediction', type: 'bool' },
            { name: 'amount', type: 'uint256' },
            { name: 'timestamp', type: 'uint256' },
            { name: 'resolved', type: 'bool' },
            { name: 'correct', type: 'bool' }
        ],
        stateMutability: 'view'
    },
    {
        name: 'getUserPredictions',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: 'predictionIds', type: 'uint256[]' }],
        stateMutability: 'view'
    }
] as const;

export interface PredictionTransaction {
    marketId: string;
    prediction: 'yes' | 'no';
    amount: number; // in USDC
    userAddress: Address;
}

/**
 * Generate transaction data for making a prediction
 */
export function generatePredictionTransaction(data: PredictionTransaction) {
    const { marketId, prediction, amount } = data;

    // Convert marketId string to bytes32
    const marketIdBytes32 = `0x${marketId.padEnd(64, '0')}` as `0x${string}`;

    // Convert amount to Wei (USDC has 6 decimals, but for demo we'll use 18)
    const amountWei = parseEther(amount.toString());

    // Encode the function call
    const encodedData = encodeFunctionData({
        abi: PREDICTION_MARKET_ABI,
        functionName: 'makePrediction',
        args: [marketIdBytes32, prediction === 'yes', amountWei]
    });

    return {
        to: PREDICTION_MARKET_CONTRACT_ADDRESS,
        data: encodedData,
        value: BigInt(0), // No ETH value, using USDC
    };
}

/**
 * Generate transaction data for USDC approval
 */
export function generateUSDCApprovalTransaction(amount: number, spender: Address) {
    const amountWei = parseEther(amount.toString());

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
 * Generate transaction data for USDC transfer
 */
export function generateUSDCTransferTransaction(to: Address, amount: number) {
    const amountWei = parseEther(amount.toString());

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
