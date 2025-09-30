/**
 * 🔧 Viem Client Utilities
 * Centralized public client for blockchain interactions
 */

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Multiple RPC endpoints for better reliability
const getRpcTransport = () => {
  const rpcUrls: string[] = [];

  // Add custom RPC URL if provided
  if (process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL) {
    rpcUrls.push(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL);
  }

  // Add Alchemy URL only if API key is provided
  if (process.env.ALCHEMY_API_KEY) {
    rpcUrls.push('https://base-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY);
  }

  // Add Infura URL only if project ID is provided
  if (process.env.INFURA_PROJECT_ID) {
    rpcUrls.push('https://base-sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID);
  }

  // Always add public RPC endpoints as fallbacks
  rpcUrls.push(
    'https://sepolia.base.org',
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-sepolia.blockpi.network/v1/rpc/public'
  );

  // Use the first available URL
  const selectedUrl = rpcUrls[0];
  console.log(`🔗 Using RPC endpoint: ${selectedUrl}`);
  return http(selectedUrl);
};

/**
 * Public client for Base Sepolia network
 * Used for reading from the blockchain, getting transaction receipts, etc.
 */
export const publicClient = createPublicClient({
  transport: getRpcTransport(),
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