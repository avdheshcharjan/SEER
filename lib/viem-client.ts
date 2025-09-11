/**
 * 🔧 Viem Client Utilities
 * Centralized public client for blockchain interactions
 */

import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Use environment to determine network and RPC URL
const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production';
const chain = isProduction ? base : baseSepolia;
const rpcUrl = isProduction 
  ? process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org'
  : process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

/**
 * Public client for Base network (mainnet or sepolia based on environment)
 * Used for reading from the blockchain, getting transaction receipts, etc.
 */
export const publicClient = createPublicClient({
  transport: http(rpcUrl),
  chain,
});

/**
 * Helper function to get transaction receipt
 */
export async function getTransactionReceipt(hash: `0x${string}`) {
  return await publicClient.getTransactionReceipt({ hash });
}

/**
 * Helper function to get balance
 */
export async function getBalance(address: `0x${string}`) {
  return await publicClient.getBalance({ address });
}

/**
 * Helper function to wait for transaction receipt
 */
export async function waitForTransactionReceipt(hash: `0x${string}`) {
  return await publicClient.waitForTransactionReceipt({ hash });
}