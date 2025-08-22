# Basename Integration for BASED Prediction Markets

This document explains how Basenames are integrated into the BASED prediction markets application.

## What are Basenames?

Basenames are human-readable names for wallet addresses on the Base network, similar to ENS (Ethereum Name Service) but specifically for Base. They allow users to have memorable, readable identities instead of long hexadecimal addresses.

## Features

- **Automatic Resolution**: When a user connects their wallet, the app automatically checks if they have a Basename
- **Fallback Display**: If no Basename is found, the app displays a formatted wallet address (e.g., `0x1234...5678`)
- **Rich Metadata**: Basenames can include avatars, descriptions, and social media links
- **Visual Indicators**: Clear visual feedback when resolving Basenames and when they're found

## How It Works

### 1. Basename Resolution
The app uses the L2Resolver contract on Base to resolve Basenames:

```typescript
import { getBasename } from '@/lib/basenames';

const basename = await getBasename(address);
```

### 2. Fallback Handling
If Basename resolution fails or no Basename is found, the app gracefully falls back to displaying formatted addresses:

```typescript
const displayName = basename || formatAddress(address);
```

### 3. Metadata Resolution
For users with Basenames, the app can resolve additional metadata:

- **Avatar**: Profile picture URL
- **Description**: User bio or description
- **Social Links**: Twitter, GitHub, website, email

## Implementation Details

### Files
- `lib/basenames.ts` - Core Basename resolution functions (configured for Base Sepolia)
- `lib/hooks/useBasename.ts` - React hook for Basename data
- `abis/L2ResolverAbi.ts` - Contract ABI for L2Resolver
- `app/components/Profile.tsx` - UI component displaying Basename information

### Network Configuration
- **Base Sepolia**: Primary network for development and testing
- **Fallback Mode**: Currently using mock data since Basename resolver contract is not yet deployed on Base Sepolia
- **Production Ready**: Will automatically switch to real contract when deployed

### Key Functions

#### `getBasename(address: Address)`
Resolves a Basename for a given wallet address.

#### `getBasenameAvatar(basename: string)`
Gets the avatar URL for a Basename.

#### `getBasenameTextRecord(basename: string, key: string)`
Gets text records (description, social links, etc.) for a Basename.

#### `useBasename(address: Address)`
React hook that provides Basename data with loading states.

## Current Deployment Status

### Base Sepolia (Testnet)
- **Status**: Basename resolver contract not yet deployed
- **Current Mode**: Mock data fallback for testing
- **Contract Address**: `0x0000000000000000000000000000000000000000` (placeholder)

### Base Mainnet
- **Status**: Basename resolver contract deployed
- **Contract Address**: `0x8c8F1a1e1bFdb15E7ed562efc84e5A588E68aD73`
- **Note**: Not currently configured for this deployment

## Testing

The integration includes mock data for testing purposes. To test with mock Basenames, use these addresses:

- `0x1234567890123456789012345678901234567890` → `alice.basename`
- `0x0987654321098765432109876543210987654321` → `bob.basename`

## Production Setup

### For Base Sepolia Deployment
1. **Wait for Basename resolver contract deployment** on Base Sepolia
2. **Update contract address** in `lib/basenames.ts` when available
3. **Test with real contract** before removing mock data
4. **Monitor contract interactions** for any issues

### For Base Mainnet Deployment
1. **Update network configuration** to use Base mainnet
2. **Update contract address** to mainnet resolver
3. **Remove mock data** from the basename resolution functions
4. **Add error monitoring** for failed Basename resolutions
5. **Implement caching** for frequently accessed Basenames

### Contract Address Updates
When the Basename resolver is deployed on Base Sepolia, update this line in `lib/basenames.ts`:

```typescript
const BASENAME_L2_RESOLVER_ADDRESS = '0x...'; // New contract address
```

## User Experience

### Loading State
- Shows a spinner with "Resolving Basename..." text
- Provides clear feedback that the app is working

### Basename Found
- Displays the Basename with a ✨ emoji indicator
- Shows additional metadata if available
- Maintains the wallet address as a fallback

### No Basename
- Gracefully falls back to formatted wallet address
- No error messages or broken UI

## Future Enhancements

- **Basename Registration**: Allow users to register new Basenames
- **Custom Avatars**: Support for NFT-based profile pictures
- **Social Integration**: Better integration with social media platforms
- **Caching Layer**: Improve performance with Basename caching
- **Batch Resolution**: Resolve multiple Basenames at once

## Troubleshooting

### Common Issues

1. **Basename not resolving**: Check if the L2Resolver contract is accessible
2. **Slow resolution**: Consider implementing caching
3. **Metadata missing**: Verify text records are set on the Basename

### Debug Mode

Enable console logging to see Basename resolution details:

```typescript
// Check browser console for resolution logs
console.log('Basename resolution:', basename);
```

## Resources

- [Base Documentation](https://docs.base.org/)
- [Basenames Overview](https://docs.base.org/base-account/basenames/basenames-onchainkit-tutorial)
- [L2Resolver Contract](https://basescan.org/address/0x8c8F1a1e1bFdb15E7ed562efc84e5A588E68aD73)
