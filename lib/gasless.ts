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
        // Enhanced error handling for Coinbase Paymaster errors
        const errorCode = data.error.code;
        const errorMessage = data.error.message;

        // Map Coinbase Paymaster error codes to user-friendly messages
        switch (errorCode) {
          case -32004: // GAS_ESTIMATION_ERROR
            throw new Error(`Gas estimation failed: ${errorMessage}. This usually means insufficient gas or invalid paymaster signature.`);
          case -32001: // UNAUTHORIZED_ERROR or DENIED_ERROR
            throw new Error(`Paymaster authorization failed: ${errorMessage}. Check your API key and gas policy configuration.`);
          case -32003: // UNAVAILABLE_ERROR
            throw new Error(`Paymaster service unavailable: ${errorMessage}. Please try again later.`);
          case -32602: // INVALID_ARGUMENT
            throw new Error(`Invalid UserOperation parameters: ${errorMessage}. Check transaction data and gas limits.`);
          default:
            throw new Error(`Paymaster error (${errorCode}): ${errorMessage}`);
        }
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

    // Validate smart account before proceeding to prevent AA23 errors
    const accountValidation = await validateSmartAccount(userAddress);
    if (!accountValidation.isValid) {
      throw new Error(`Smart account validation failed: ${accountValidation.error}`);
    }

    // First, create a base user operation for gas estimation
    let userOperation = {
      sender: userAddress,
      nonce: '0x0', // Will be populated by bundler
      initCode: '0x', // No init code needed for existing accounts
      callData: transaction.data,
      callGasLimit: '0x0', // Will be estimated
      verificationGasLimit: '0x0', // Will be estimated
      preVerificationGas: '0x0', // Will be estimated
      maxFeePerGas: '0x59682F00', // 15 gwei - increased for better success rate
      maxPriorityFeePerGas: '0x59682F00', // 15 gwei - increased for better success rate
      paymasterAndData: '0x', // Will be populated by paymaster
      signature: '0x', // Will be populated by bundler
    };

    // Estimate gas for the user operation
    console.log('Estimating gas for user operation...');
    try {
      const gasEstimate = await bundler.request('eth_estimateUserOperationGas', [
        userOperation,
        ENTRYPOINT_ADDRESS_V07
      ]) as any;

      console.log('Gas estimate received:', gasEstimate);

      // Update user operation with estimated gas values
      // Add 30% buffer to gas estimates to ensure success and prevent AA23 errors
      userOperation.callGasLimit = gasEstimate.callGasLimit ?
        '0x' + (BigInt(gasEstimate.callGasLimit) * BigInt(130) / BigInt(100)).toString(16) :
        '0x30D40'; // 200000 as fallback

      userOperation.verificationGasLimit = gasEstimate.verificationGasLimit ?
        '0x' + (BigInt(gasEstimate.verificationGasLimit) * BigInt(130) / BigInt(100)).toString(16) :
        '0x30D40'; // 200000 as fallback

      userOperation.preVerificationGas = gasEstimate.preVerificationGas ?
        '0x' + (BigInt(gasEstimate.preVerificationGas) * BigInt(130) / BigInt(100)).toString(16) :
        '0x7A120'; // 500000 as fallback - increased to meet minimum requirements

    } catch (gasError) {
      console.warn('Gas estimation failed, using conservative defaults:', gasError);
      // Use conservative gas limits if estimation fails
      userOperation.callGasLimit = '0x30D40'; // 200000
      userOperation.verificationGasLimit = '0x30D40'; // 200000
      userOperation.preVerificationGas = '0x7A120'; // 500000
    }

    // Get sponsorship from paymaster
    console.log('Requesting paymaster sponsorship...');
    const sponsorship = await paymaster.request('pm_sponsorUserOperation', [
      userOperation,
      ENTRYPOINT_ADDRESS_V07
    ]);

    console.log('Paymaster sponsorship received:', sponsorship);

    // Update user operation with paymaster data
    userOperation.paymasterAndData = (sponsorship as any).paymasterAndData || '0x';

    // Get user operation hash
    console.log('Getting user operation hash...');
    const userOpHash = await bundler.request('eth_getUserOperationByHash', [
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

    // Enhanced error handling for specific Coinbase Paymaster errors
    if (error instanceof Error) {
      if (error.message.includes('AA23')) {
        throw new Error('Transaction failed due to insufficient gas or invalid signature. This usually means the smart account needs more ETH for gas or there\'s a configuration issue.');
      } else if (error.message.includes('AA21')) {
        throw new Error('Transaction failed because the account didn\'t pay prefund. Ensure the smart account has sufficient ETH for gas.');
      } else if (error.message.includes('AA20')) {
        throw new Error('Smart account not deployed. Please ensure you have a valid Base smart account.');
      }
    }

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

  if (!paymaster) {
    return {
      eligible: false,
      error: 'Paymaster client not available',
    };
  }

  try {
    // Validate smart account before checking sponsorship to prevent AA23 errors
    const accountValidation = await validateSmartAccount(userAddress);
    if (!accountValidation.isValid) {
      return {
        eligible: false,
        error: `Smart account validation failed: ${accountValidation.error}`,
      };
    }

    // Check if paymaster will sponsor this operation for the existing Base smart account
    // Use higher gas limits to prevent AA23 errors and ensure sponsorship eligibility
    const userOperation = {
      sender: userAddress,
      nonce: '0x0',
      initCode: '0x',
      callData: transaction.data,
      callGasLimit: '0x4C4B40', // 5000000 - increased for complex operations
      verificationGasLimit: '0x4C4B40', // 5000000 - increased for verification
      preVerificationGas: '0x7A120', // 500000 - increased to meet minimum requirements
      maxFeePerGas: '0x59682F00', // 15 gwei - increased for better success rate
      maxPriorityFeePerGas: '0x59682F00', // 15 gwei - increased for better success rate
      paymasterAndData: '0x',
      signature: '0x',
    };

    console.log('Checking sponsorship eligibility with gas limits:', {
      callGasLimit: userOperation.callGasLimit,
      verificationGasLimit: userOperation.verificationGasLimit,
      preVerificationGas: userOperation.preVerificationGas,
      maxFeePerGas: userOperation.maxFeePerGas
    });

    const sponsorship = await paymaster.request('pm_sponsorUserOperation', [
      userOperation,
      ENTRYPOINT_ADDRESS_V07
    ]);

    console.log('Sponsorship eligibility confirmed:', sponsorship);

    return {
      eligible: true,
      sponsorship,
    };
  } catch (error) {
    console.error('Sponsorship check failed:', error);

    // Enhanced error handling for specific Coinbase Paymaster errors
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      if (error.message.includes('AA23')) {
        errorMessage = 'Transaction would fail due to insufficient gas or invalid signature. This usually means the smart account needs more ETH for gas.';
      } else if (error.message.includes('AA21')) {
        errorMessage = 'Transaction would fail because the account didn\'t pay prefund. Ensure the smart account has sufficient ETH for gas.';
      } else if (error.message.includes('AA20')) {
        errorMessage = 'Smart account not deployed. Please ensure you have a valid Base smart account.';
      } else if (error.message.includes('rejected due to max per user op spend limit exceeded')) {
        errorMessage = 'Transaction cost too large for paymaster sponsorship. Contact support to increase your per-operation limit.';
      } else if (error.message.includes('rejected due to max monthly org spend limit')) {
        errorMessage = 'Monthly sponsorship limit reached. Contact support to increase your monthly limit.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      eligible: false,
      error: errorMessage,
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
 * Validate that a smart account is properly deployed and can execute transactions
 * This helps prevent AA23 errors by ensuring the account exists and is valid
 */
export async function validateSmartAccount(
  userAddress: Address
): Promise<{
  isValid: boolean;
  isDeployed: boolean;
  hasCode: boolean;
  error?: string;
}> {
  try {
    console.log('Validating smart account:', userAddress);

    // Check if the account has code (is a smart contract)
    const code = await publicClient.getBytecode({ address: userAddress });
    const hasCode = code !== undefined && code !== '0x';

    if (!hasCode) {
      return {
        isValid: false,
        isDeployed: false,
        hasCode: false,
        error: 'Address is not a smart contract. Please ensure you have a valid Base smart account.',
      };
    }

    // Check if the account has a minimum balance for gas
    const balance = await publicClient.getBalance({ address: userAddress });
    const minimumBalance = BigInt('1000000000000000'); // 0.001 ETH

    if (balance < minimumBalance) {
      console.warn('Smart account has low balance:', balance.toString(), 'wei');
    }

    // Try to get the account nonce to verify it's functional
    try {
      const nonce = await publicClient.getTransactionCount({ address: userAddress });
      console.log('Smart account nonce:', nonce);
    } catch (nonceError) {
      console.warn('Could not get account nonce:', nonceError);
    }

    console.log('Smart account validation successful');
    return {
      isValid: true,
      isDeployed: true,
      hasCode: true,
    };

  } catch (error) {
    console.error('Smart account validation failed:', error);
    return {
      isValid: false,
      isDeployed: false,
      hasCode: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
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

/**
 * Execute USDC approval transaction with gasless support
 */
export async function executeGaslessUSDCApproval(
  amount: number,
  spender: Address,
  userAddress: Address
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  if (!validateGaslessConfig()) {
    return { success: false, error: 'Gasless configuration invalid' };
  }

  try {
    // Import the transaction generation function
    const { generateUSDCApprovalTransaction } = await import('./blockchain');

    // Generate the approval transaction
    const approvalTx = generateUSDCApprovalTransaction(amount, spender);

    // Execute via gasless transaction
    const result = await executeGaslessTransaction(approvalTx, userAddress);

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