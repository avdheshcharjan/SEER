/**
 * 🔧 Viem Client Utilities
 * Centralized public client for blockchain interactions
 */

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Multiple RPC endpoints for better reliability
const getRpcTransport = () => {
  const rpcUrls = [
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    'https://base-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
    'https://base-sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
    'https://sepolia.base.org',
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-sepolia.blockpi.network/v1/rpc/public'
  ].filter(Boolean);

  // Use the first available URL, fallback to default
  return http(rpcUrls[0] || 'https://sepolia.base.org');
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