import { createPublicClient, http, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { toast } from 'react-hot-toast';

// Entry point address constant for EIP-4337
const ENTRYPOINT_ADDRESS_V07 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const;

// Environment configuration - Project-specific endpoints
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL;
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL;

if (!PAYMASTER_URL || !BUNDLER_URL) {
  console.warn('Missing environment variables: NEXT_PUBLIC_PAYMASTER_URL and NEXT_PUBLIC_BUNDLER_URL. Gasless transactions will not work.');
}

// Create clients for Account Abstraction
export const publicClient = createPublicClient({
  transport: http('https://sepolia.base.org'),
  chain: baseSepolia,
});

// Type definitions for the client
interface CoinbaseClient {
  request(method: string, params: unknown[]): Promise<unknown>;
}

interface TransactionReceipt {
  receipt: {
    transactionHash: string;
  };
}

interface GaslessTransactionResult {
  success: boolean;
  userOpHash: unknown;
  transactionHash: string;
  receipt: TransactionReceipt;
  error?: string;
}

// Simple HTTP client for Coinbase Paymaster/Bundler
function createCoinbaseClient(url: string): CoinbaseClient {
  return {
    async request(method: string, params: unknown[]) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      return data.result;
    }
  };
}

// Lazy-initialize clients
let paymasterClient: CoinbaseClient | null = null;
let bundlerClient: CoinbaseClient | null = null;

function getPaymasterClient() {
  if (!paymasterClient && PAYMASTER_URL) {
    paymasterClient = createCoinbaseClient(PAYMASTER_URL);
  }
  return paymasterClient;
}

function getBundlerClient() {
  if (!bundlerClient && BUNDLER_URL) {
    bundlerClient = createCoinbaseClient(BUNDLER_URL);
  }
  return bundlerClient;
}

/**
 * Execute a gasless transaction using existing Base smart account
 * No smart account creation needed - leverages user's existing Base account
 */
export async function executeGaslessTransaction(
  transaction: {
    to: Address;
    data: `0x${string}`;
    value: bigint;
  },
  userAddress: Address
): Promise<GaslessTransactionResult> {
  if (!PAYMASTER_URL || !BUNDLER_URL) {
    throw new Error('Gasless transactions not configured. Please set PAYMASTER_URL and BUNDLER_URL environment variables.');
  }

  const paymaster = getPaymasterClient();
  const bundler = getBundlerClient();
  
  if (!paymaster || !bundler) {
    throw new Error('Failed to initialize paymaster or bundler client');
  }

  try {
    console.log('Executing gasless transaction via existing Base smart account:', transaction);

    // Get the current nonce for the user's account
    console.log('Getting nonce for account:', userAddress);
    let nonce;
    try {
      nonce = await bundler.request('eth_getTransactionCount', [userAddress, 'latest']);
      console.log('Retrieved nonce:', nonce);
    } catch (nonceError) {
      console.warn('Failed to get nonce, using default:', nonceError);
      nonce = '0x0';
    }

    // First, create a base user operation for gas estimation
    const userOperation = {
      sender: userAddress,
      nonce: nonce, // Retrieved from bundler
      initCode: '0x', // No init code needed for existing accounts
      callData: transaction.data,
      callGasLimit: '0x0', // Will be estimated
      verificationGasLimit: '0x0', // Will be estimated
      preVerificationGas: '0x0', // Will be estimated
      maxFeePerGas: '0x3B9ACA00', // 1 gwei
      maxPriorityFeePerGas: '0x3B9ACA00', // 1 gwei
      paymasterAndData: '0x', // Will be populated by paymaster
      signature: '0x', // Will be populated by bundler
    };

    // Estimate gas for the user operation
    console.log('Estimating gas for user operation...');
    try {
      const gasEstimate = await bundler.request('eth_estimateUserOperationGas', [
        userOperation,
        ENTRYPOINT_ADDRESS_V07
      ]) as {
        callGasLimit: string;
        verificationGasLimit: string;
        preVerificationGas: string;
      };
      
      console.log('Gas estimate received:', gasEstimate);
      
      // Update user operation with estimated gas values
      // Add 20% buffer to gas estimates to ensure success
      userOperation.callGasLimit = gasEstimate.callGasLimit ? 
        '0x' + (BigInt(gasEstimate.callGasLimit) * BigInt(120) / BigInt(100)).toString(16) : 
        '0x30D40';
      userOperation.verificationGasLimit = gasEstimate.verificationGasLimit ? 
        '0x' + (BigInt(gasEstimate.verificationGasLimit) * BigInt(120) / BigInt(100)).toString(16) : 
        '0x30D40';
      userOperation.preVerificationGas = gasEstimate.preVerificationGas ? 
        '0x' + (BigInt(gasEstimate.preVerificationGas) * BigInt(120) / BigInt(100)).toString(16) : 
        '0x5DC0';
        
    } catch (estimateError) {
      console.warn('Gas estimation failed, using default values:', estimateError);
      // Fall back to conservative defaults if estimation fails
      userOperation.callGasLimit = '0x4C4B40'; // 5000000 - very high for safety
      userOperation.verificationGasLimit = '0x4C4B40'; // 5000000 - very high for safety
      userOperation.preVerificationGas = '0x186A0'; // 100000 - high for safety
    }

    console.log('Final user operation:', userOperation);

    // Request sponsorship from paymaster
    console.log('Requesting sponsorship from paymaster...');
    try {
      const sponsorshipResponse = await paymaster.request('pm_sponsorUserOperation', [
        userOperation,
        ENTRYPOINT_ADDRESS_V07
      ]) as {
        paymasterAndData: string;
        signature?: string;
      };
      
      console.log('Sponsorship response:', sponsorshipResponse);
      
      // Update the user operation with the paymaster data
      if (sponsorshipResponse && sponsorshipResponse.paymasterAndData) {
        userOperation.paymasterAndData = sponsorshipResponse.paymasterAndData;
        
        // Some paymasters may also provide a signature
        if (sponsorshipResponse.signature) {
          userOperation.signature = sponsorshipResponse.signature;
        }
      } else {
        throw new Error('Paymaster did not provide valid sponsorship data');
      }
    } catch (sponsorError) {
      console.error('Paymaster sponsorship failed:', sponsorError);
      throw new Error('Transaction not eligible for sponsorship. Please try again or contact support.');
    }
    
    console.log('Sending sponsored user operation:', userOperation);
    
    const userOpHash = await bundler.request('eth_sendUserOperation', [
      userOperation,
      ENTRYPOINT_ADDRESS_V07
    ]);

    console.log('UserOperation hash:', userOpHash);

    // Wait for the transaction to be mined
    const receipt = await bundler.request('eth_getUserOperationReceipt', [userOpHash]) as TransactionReceipt;

    console.log('Transaction receipt:', receipt);

    return {
      success: true,
      userOpHash,
      transactionHash: receipt.receipt.transactionHash,
      receipt,
    };
  } catch (error) {
    console.error('Gasless transaction failed:', error);
    throw error;
  }
}


/**
 * Check if the paymaster will sponsor a transaction
 */
export async function checkSponsorshipEligibility(
  transaction: {
    to: Address;
    data: `0x${string}`;
    value: bigint;
  },
  userAddress: Address
) {
  const paymaster = getPaymasterClient();
  const bundler = getBundlerClient();
  
  if (!paymaster) {
    return {
      eligible: false,
      error: 'Paymaster client not available',
    };
  }

  if (!bundler) {
    return {
      eligible: false,
      error: 'Bundler client not available',
    };
  }

  try {
    // Get the current nonce for the user's account
    let nonce;
    try {
      nonce = await bundler.request('eth_getTransactionCount', [userAddress, 'latest']);
    } catch (nonceError) {
      console.warn('Failed to get nonce for eligibility check, using default:', nonceError);
      nonce = '0x0';
    }

    // Check if paymaster will sponsor this operation for the existing Base smart account
    const userOperation = {
      sender: userAddress,
      nonce: nonce,
      initCode: '0x',
      callData: transaction.data,
      callGasLimit: '0x30D40', // 200000 - increased for complex operations
      verificationGasLimit: '0x30D40', // 200000 - increased for verification
      preVerificationGas: '0x5DC0', // 24000 - increased to meet minimum requirements
      maxFeePerGas: '0x3B9ACA00',
      maxPriorityFeePerGas: '0x3B9ACA00',
      paymasterAndData: '0x',
      signature: '0x',
    };

    const sponsorship = await paymaster.request('pm_sponsorUserOperation', [
      userOperation,
      ENTRYPOINT_ADDRESS_V07
    ]);

    return {
      eligible: true,
      sponsorship,
    };
  } catch (error) {
    console.error('Sponsorship check failed:', error);
    return {
      eligible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate that gasless transactions are properly configured
 */
export function validateGaslessConfig(): boolean {
  if (!PAYMASTER_URL || !BUNDLER_URL) {
    toast.error('Gasless transactions not configured. Please contact support.');
    return false;
  }
  return true;
}

/**
 * Estimate gas for a user operation
 */
export async function estimateUserOperationGas(
  transaction: {
    to: Address;
    data: `0x${string}`;
    value: bigint;
  },
  userAddress: Address
) {
  const bundler = getBundlerClient();
  
  if (!bundler) {
    throw new Error('Bundler client not available');
  }

  try {
    const userOperation = {
      sender: userAddress,
      nonce: '0x0',
      initCode: '0x',
      callData: transaction.data,
      callGasLimit: '0x0', // Will be estimated
      verificationGasLimit: '0x0', // Will be estimated
      preVerificationGas: '0x0', // Will be estimated
      maxFeePerGas: '0x3B9ACA00',
      maxPriorityFeePerGas: '0x3B9ACA00',
      paymasterAndData: '0x',
      signature: '0x',
    };

    const gasEstimate = await bundler.request('eth_estimateUserOperationGas', [
      userOperation,
      ENTRYPOINT_ADDRESS_V07
    ]);

    return gasEstimate;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw error;
  }
}

/**
 * Check if user has sufficient balance for the operation (if not sponsored)
 */
export async function checkUserBalance(userAddress: Address): Promise<{
  balance: bigint;
  hasMinimumBalance: boolean;
}> {
  try {
    const balance = await publicClient.getBalance({
      address: userAddress,
    });

    // Check if user has at least 0.001 ETH for potential gas
    const minimumBalance = BigInt('1000000000000000'); // 0.001 ETH

    return {
      balance,
      hasMinimumBalance: balance >= minimumBalance,
    };
  } catch (error) {
    console.error('Balance check failed:', error);
    return {
      balance: BigInt(0),
      hasMinimumBalance: false,
    };
  }
}

// USDC approval function removed as part of ERC-4337 migration
// This functionality is now handled directly by the smart account

/**
 * Execute buy shares transaction with gasless support
 */
export async function executeGaslessBuyShares(
  marketAddress: Address,
  prediction: 'yes' | 'no',
  amount: number,
  userAddress: Address
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  if (!validateGaslessConfig()) {
    return { success: false, error: 'Gasless configuration invalid' };
  }

  try {
    // Import the transaction generation function
    const { generateBuySharesTransaction } = await import('./blockchain');
    
    // Generate the buy shares transaction
    const buySharesTx = generateBuySharesTransaction({
      marketAddress,
      prediction,
      amount,
      userAddress,
    });
    
    // Execute via gasless transaction
    const result = await executeGaslessTransaction(buySharesTx, userAddress);
    
    return { 
      success: true, 
      transactionHash: result.transactionHash 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}