# Basenames Integration Guide

This document explains how Basenames are integrated into the Tomo app using OnchainKit.

## What are Basenames?

Basenames are human-readable names for wallet addresses on Base L2, powered by ENS (Ethereum Name Service). They make wallet addresses like `0x1234...5678` display as friendly names like `john.base.eth`.

## Integration Components

### 1. BasenameIdentity Component

**Location:** `/app/components/BasenameIdentity.tsx`

Reusable React components for displaying user identity with Basenames.

#### Available Components:

```tsx
// Full-featured identity with avatar, name, address, and badge
<BasenameIdentity
  address="0x..."
  showAvatar={true}
  showName={true}
  showAddress={true}
  showBadge={true}
  avatarSize={40}
/>

// Compact variant for leaderboards/lists
<BasenameIdentityCompact address="0x..." />

// Full variant for profiles
<BasenameIdentityFull address="0x..." />

// Avatar only
<BasenameAvatar address="0x..." size={32} />

// Name only with optional badge
<BasenameName address="0x..." showBadge={true} />
```

### 2. useBasename Hook

**Location:** `/lib/hooks/useBasename.ts`

Custom React hook for fetching Basename data.

```tsx
import { useBasename } from '@/lib/hooks/useBasename';

function MyComponent() {
  const { basename, avatar, displayName, hasBasename, loading } = useBasename(address);

  return <div>{displayName}</div>; // Shows "john.base.eth" or "0x1234...5678"
}
```

**Available hooks:**
- `useBasename(address)` - Full Basename data
- `useDisplayName(address)` - Just the display name
- `useHasBasename(address)` - Check if address has Basename

## Configuration

### Schema ID

The Coinbase Verifications schema ID is used for attestation badges:

```tsx
const schemaId = "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
```

This is automatically applied in all Basename components.

### Chain Configuration

Basenames work on both Base mainnet and Base Sepolia:

```tsx
// Environment-based selection (from providers.tsx)
const chain = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? base : baseSepolia;
```

### OnchainKit Provider Setup

**Location:** `/app/providers.tsx`

```tsx
<OnchainKitProvider
  apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
  chain={chain}
  config={{
    appearance: {
      mode: 'dark'
    }
  }}
>
  {children}
</OnchainKitProvider>
```

## Where Basenames are Used

### 1. Profile Component ✅
Shows full identity with avatar, Basename, address, and verification badge.

```tsx
<BasenameIdentityFull address={address} chain={base} />
```

### 2. Leaderboard Component ✅
Displays compact identity for each leaderboard entry (top 3 + full list).

```tsx
<BasenameIdentityCompact address={user.address as Address} />
```

### 3. Market Cards ✅
Shows creator Basename in verification popover.

```tsx
<BasenameAvatar address={market.creatorAddress} size={32} />
<BasenameName address={market.creatorAddress} className="text-white text-sm" />
```

### 4. Influencer Attribution ✅
Displays influencer identity with Basename if wallet address exists.

```tsx
<BasenameAvatar address={influencer.walletAddress} size={32} />
<BasenameName
  address={influencer.walletAddress}
  showBadge={influencer.verifiedStatus}
/>
```

## How Resolution Works

1. **ENS Resolution**: OnchainKit automatically resolves ENS names on Base L2
2. **Avatar Fetching**: Retrieves avatar from ENS metadata
3. **Verification Badge**: Shows blue checkmark for Coinbase-verified addresses
4. **Fallback**: Shows shortened address (0x1234...5678) if no Basename exists

## Styling

All Basename components inherit your app's Tailwind styling and support custom className props:

```tsx
<BasenameName
  address="0x..."
  className="text-white text-lg font-bold"
  showBadge={true}
/>
```

## Testing

### Testnet (Base Sepolia)
- Set `NEXT_PUBLIC_ENVIRONMENT=development`
- Test with Base Sepolia addresses that have ENS names

### Mainnet (Base)
- Set `NEXT_PUBLIC_ENVIRONMENT=production`
- Real Basenames will resolve automatically

## Environment Variables

Required in `.env`:

```bash
# OnchainKit API Key (for Basenames resolution)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key

# Environment (determines chain)
NEXT_PUBLIC_ENVIRONMENT=development # or 'production'
```

Get your OnchainKit API key from: https://portal.cdp.coinbase.com/

## API Reference

### BasenameIdentity Props

```typescript
interface BasenameIdentityProps {
  address: Address;                    // Wallet address (required)
  showAvatar?: boolean;                // Show avatar (default: true)
  showName?: boolean;                  // Show name (default: true)
  showAddress?: boolean;               // Show address (default: false)
  showBadge?: boolean;                 // Show verification badge (default: true)
  avatarSize?: number;                 // Avatar size in pixels (default: 40)
  className?: string;                  // Custom CSS classes
  chain?: typeof base | typeof baseSepolia; // Chain (default: env-based)
  hasCopyAddressOnClick?: boolean;     // Enable click-to-copy (default: false)
}
```

### useBasename Return Value

```typescript
{
  basename: string | null;            // ENS name (e.g., "john.base.eth")
  avatar: string | null;              // Avatar URL
  displayName: string;                // Basename or shortened address
  hasBasename: boolean;               // True if ENS name exists
  loading: boolean;                   // Loading state
}
```

## Troubleshooting

### Basenames not resolving
- Check `NEXT_PUBLIC_ONCHAINKIT_API_KEY` is set
- Verify you're on the correct network (mainnet vs testnet)
- Ensure OnchainKitProvider is wrapping your app

### Verification badges not showing
- Verify `schemaId` is correctly set (should be automatic)
- Check address is actually Coinbase-verified

### Avatars not loading
- Ensure ENS avatar is properly set in ENS metadata
- Check CORS/image loading policies

## Resources

- [OnchainKit Documentation](https://onchainkit.xyz)
- [Basenames Tutorial](https://docs.base.org/base-account/basenames/basenames-onchainkit-tutorial)
- [Base Documentation](https://docs.base.org)
- [ENS Documentation](https://docs.ens.domains)

## Future Enhancements

Potential improvements:
- [ ] Basename registration flow
- [ ] Basename search/directory
- [ ] Social graph based on Basenames
- [ ] Basename verification system
- [ ] Custom badge/attestation display
- [ ] Farcaster integration via Basenames