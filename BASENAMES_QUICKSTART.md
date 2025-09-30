# Basenames Integration - Quick Start

## ✅ What's Been Integrated

Basenames are now fully integrated across the Tomo app! Here's what you get:

### Components Updated
1. **Leaderboard** - Shows Basenames for all users
2. **Profile** - Full identity with avatar, name, address & badge
3. **Market Cards** - Creator Basenames in verification popovers
4. **Influencer Attribution** - Basenames for influencer profiles

### New Components Created
- `BasenameIdentity.tsx` - Reusable identity components
- `useBasename.ts` - Custom React hooks for Basename data

## 🚀 Usage Examples

### Display User Identity

```tsx
import { BasenameIdentityCompact } from '@/app/components/BasenameIdentity';

// Compact version (leaderboards, lists)
<BasenameIdentityCompact address={userAddress} />

// Full version (profiles)
<BasenameIdentityFull address={userAddress} />

// Just avatar
<BasenameAvatar address={userAddress} size={32} />

// Just name with badge
<BasenameName address={userAddress} showBadge={true} />
```

### Use in Your Code

```tsx
import { useBasename } from '@/lib/hooks/useBasename';

function MyComponent({ address }) {
  const { basename, displayName, hasBasename } = useBasename(address);

  return (
    <div>
      {hasBasename ? `Hello ${basename}!` : `Address: ${displayName}`}
    </div>
  );
}
```

## 📋 Testing Checklist

1. **Check Profile Page**
   - Avatar loads correctly
   - Basename displays (or shortened address)
   - Verification badge shows if verified
   - Address is copyable

2. **Check Leaderboard**
   - All users show identities
   - Basenames resolve correctly
   - Avatars display properly

3. **Check Market Cards**
   - Click verified badge on cards
   - Creator popover shows Basename
   - Avatar renders correctly

4. **Test Both Networks**
   - Base Sepolia (testnet)
   - Base Mainnet (production)

## 🔧 Configuration

Already configured! Just ensure your `.env` has:

```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_key_here
NEXT_PUBLIC_ENVIRONMENT=development # or 'production'
```

## 📖 Full Documentation

See `BASENAMES_INTEGRATION.md` for:
- Complete API reference
- Advanced usage patterns
- Troubleshooting guide
- All component props

## 🎯 What Happens Now

1. **Testnet Testing**: Test on Base Sepolia first
2. **Mainnet Deploy**: Deploy to Base mainnet when ready
3. **User Experience**: Users with Basenames get better UX automatically!

### Automatic Features:
- ✅ ENS name resolution
- ✅ Avatar display
- ✅ Verification badges
- ✅ Fallback to shortened addresses
- ✅ Click-to-copy addresses
- ✅ Dark mode styling

## 🌟 Benefits

**For Users:**
- Human-readable identities
- Professional profile appearance
- Social credibility via verification
- Easier to recognize other users

**For Your App:**
- Better user engagement
- Professional appearance
- Web3 identity standards
- Seamless Base ecosystem integration

## 🔗 Resources

- [OnchainKit Docs](https://onchainkit.xyz)
- [Basenames Tutorial](https://docs.base.org/base-account/basenames/basenames-onchainkit-tutorial)
- [Get Basename](https://www.base.org/names)

---

**That's it!** Basenames are now live in your app. Users with Basenames will automatically see their names instead of addresses throughout the entire application.