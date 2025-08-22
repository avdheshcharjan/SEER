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
// Note: The actual Basename resolver contract might not be deployed on Base Sepolia yet
// For now, we'll use mock data and provide a fallback mechanism
// TODO: Update this address when the actual Basename resolver is deployed on Base Sepolia
const BASENAME_L2_RESOLVER_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder address

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
      console.log('Basename resolver contract not deployed on Base Sepolia, using mock data');
      // Fall back to mock data immediately
      const mockBasenames: Record<string, string> = {
        '0x1234567890123456789012345678901234567890': 'alice.basename',
        '0x0987654321098765432109876543210987654321': 'bob.basename',
      };

      const mockBasename = mockBasenames[address.toLowerCase()];
      if (mockBasename) {
        console.log('Using mock Basename for testing:', mockBasename);
        return mockBasename;
      }
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
    // Fallback to mock data for testing purposes
    // In production, you'd want to handle this differently
    const mockBasenames: Record<string, string> = {
      '0x1234567890123456789012345678901234567890': 'alice.basename',
      '0x0987654321098765432109876543210987654321': 'bob.basename',
    };

    const mockBasename = mockBasenames[address.toLowerCase()];
    if (mockBasename) {
      console.log('Using mock Basename for testing:', mockBasename);
      return mockBasename;
    }

    return null;
  }
}

// Function to get Basename avatar
export async function getBasenameAvatar(basename: BaseName): Promise<Avatar | null> {
  try {
    // Check if the resolver contract exists and is accessible
    if (BASENAME_L2_RESOLVER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.log('Basename resolver contract not deployed on Base Sepolia, using mock data');
      // Fall back to mock data immediately
      const mockAvatars: Record<string, string> = {
        'alice.basename': 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        'bob.basename': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      };

      const mockAvatar = mockAvatars[basename];
      if (mockAvatar) {
        console.log('Using mock avatar for testing:', mockAvatar);
        return mockAvatar;
      }
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
    // Fallback to mock data for testing purposes
    const mockAvatars: Record<string, string> = {
      'alice.basename': 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      'bob.basename': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    };

    const mockAvatar = mockAvatars[basename];
    if (mockAvatar) {
      console.log('Using mock avatar for testing:', mockAvatar);
      return mockAvatar;
    }

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
      console.log('Basename resolver contract not deployed on Base Sepolia, using mock data');
      // Fall back to mock data immediately
      const mockTextRecords: Record<string, Record<string, string>> = {
        'alice.basename': {
          'description': 'Crypto enthusiast and prediction market expert',
          'com.twitter': '@alice_crypto',
          'com.github': 'alice-dev',
          'url': 'https://alice.dev',
          'email': 'alice@example.com',
        },
        'bob.basename': {
          'description': 'DeFi developer and market maker',
          'com.twitter': '@bob_defi',
          'com.github': 'bob-coder',
          'url': 'https://bob.defi',
          'email': 'bob@example.com',
        },
      };

      const mockRecord = mockTextRecords[basename]?.[key];
      if (mockRecord) {
        console.log(`Using mock text record for ${key}:`, mockRecord);
        return mockRecord;
      }
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
    // Fallback to mock data for testing purposes
    const mockTextRecords: Record<string, Record<string, string>> = {
      'alice.basename': {
        'description': 'Crypto enthusiast and prediction market expert',
        'com.twitter': '@alice_crypto',
        'com.github': 'alice-dev',
        'url': 'https://alice.dev',
        'email': 'alice@example.com',
      },
      'bob.basename': {
        'description': 'DeFi developer and market maker',
        'com.twitter': '@bob_defi',
        'com.github': 'bob-coder',
        'url': 'https://bob.defi',
        'email': 'bob@example.com',
      },
    };

    const mockRecord = mockTextRecords[basename]?.[key];
    if (mockRecord) {
      console.log(`Using mock text record for ${key}:`, mockRecord);
      return mockRecord;
    }

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
