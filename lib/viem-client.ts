/**
 * 🔧 Viem Client Utilities
 * Centralized public client for blockchain interactions
 */

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

/**
 * Public client for Base Sepolia network
 * Used for reading from the blockchain, getting transaction receipts, etc.
 */
export const publicClient = createPublicClient({
  transport: http('https://sepolia.base.org'),
  chain: baseSepolia,
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