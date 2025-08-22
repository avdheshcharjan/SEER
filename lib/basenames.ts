import {
  Address,
  createPublicClient,
  http,
  keccak256,
} from 'viem';
import { namehash } from 'viem/ens';
import { baseSepolia } from 'viem/chains';
import L2ResolverAbi from '@/abis/L2ResolverAbi';

// Constants - Updated for Base Sepolia
// Basename resolver contract address on Base Sepolia
// TODO: Update this address with the actual deployed Basename resolver contract address on Base Sepolia
// This should be the L2 resolver contract that handles basename resolution
const BASENAME_L2_RESOLVER_ADDRESS = '0x0000000000000000000000000000000000000000';

// Create public client for Base Sepolia network
const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Types
export type BaseName = string;
export type Avatar = string;

export enum BasenameTextRecordKeys {
  Description = 'description',
  Twitter = 'com.twitter',
  GitHub = 'com.github',
  Website = 'url',
  Email = 'email',
}

// Function to convert address to reverse node bytes
function convertReverseNodeToBytes(address: Address): `0x${string}` {
  const reverseNode = `${address.slice(2)}.addr.reverse`;
  return keccak256(namehash(reverseNode));
}

// Function to resolve a Basename
export async function getBasename(address: Address): Promise<BaseName | null> {
  try {
    // Check if the resolver contract exists and is accessible
    if (BASENAME_L2_RESOLVER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.error('Basename resolver contract address not configured. Please update BASENAME_L2_RESOLVER_ADDRESS with the actual contract address on Base Sepolia.');
      return null;
    }

    const addressReverseNode = convertReverseNodeToBytes(address);
    const basename = await baseSepoliaClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: 'name',
      args: [addressReverseNode],
    });

    if (basename && basename !== '') {
      return basename as BaseName;
    }
    return null;
  } catch (error) {
    console.error('Error resolving Basename:', error);
    return null;
  }
}

// Function to get Basename avatar
export async function getBasenameAvatar(basename: BaseName): Promise<Avatar | null> {
  try {
    // Check if the resolver contract exists and is accessible
    if (BASENAME_L2_RESOLVER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.error('Basename resolver contract address not configured. Please update BASENAME_L2_RESOLVER_ADDRESS with the actual contract address on Base Sepolia.');
      return null;
    }

    const node = namehash(basename);
    const avatar = await baseSepoliaClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: 'text',
      args: [node, 'avatar'],
    });

    if (avatar && avatar !== '') {
      return avatar as Avatar;
    }
    return null;
  } catch (error) {
    console.error('Error getting Basename avatar:', error);
    return null;
  }
}

// Function to get Basename text record
export async function getBasenameTextRecord(
  basename: BaseName,
  key: BasenameTextRecordKeys
): Promise<string | null> {
  try {
    // Check if the resolver contract exists and is accessible
    if (BASENAME_L2_RESOLVER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.error('Basename resolver contract address not configured. Please update BASENAME_L2_RESOLVER_ADDRESS with the actual contract address on Base Sepolia.');
      return null;
    }

    const node = namehash(basename);
    const value = await baseSepoliaClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: 'text',
      args: [node, key],
    });

    if (value && value !== '') {
      return value as string;
    }
    return null;
  } catch (error) {
    console.error(`Error getting Basename text record for ${key}:`, error);
    return null;
  }
}

// Function to check if an address has a Basename
export async function hasBasename(address: Address): Promise<boolean> {
  try {
    const basename = await getBasename(address);
    return basename !== null;
  } catch (error) {
    console.error('Error checking if address has Basename:', error);
    return false;
  }
}

// Function to get all Basename metadata in one call
export async function getBasenameMetadata(address: Address): Promise<{
  basename: string | null;
  avatar: string | null;
  description: string | null;
  twitter: string | null;
  github: string | null;
  website: string | null;
  email: string | null;
}> {
  try {
    const basename = await getBasename(address);

    if (!basename) {
      return {
        basename: null,
        avatar: null,
        description: null,
        twitter: null,
        github: null,
        website: null,
        email: null,
      };
    }

    const [avatar, description, twitter, github, website, email] = await Promise.all([
      getBasenameAvatar(basename),
      getBasenameTextRecord(basename, BasenameTextRecordKeys.Description),
      getBasenameTextRecord(basename, BasenameTextRecordKeys.Twitter),
      getBasenameTextRecord(basename, BasenameTextRecordKeys.GitHub),
      getBasenameTextRecord(basename, BasenameTextRecordKeys.Website),
      getBasenameTextRecord(basename, BasenameTextRecordKeys.Email),
    ]);

    return {
      basename,
      avatar,
      description,
      twitter,
      github,
      website,
      email,
    };
  } catch (error) {
    console.error('Error getting Basename metadata:', error);
    return {
      basename: null,
      avatar: null,
      description: null,
      twitter: null,
      github: null,
      website: null,
      email: null,
    };
  }
}
