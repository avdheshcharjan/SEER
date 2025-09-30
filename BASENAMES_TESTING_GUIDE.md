# 🧪 Basenames Testing Guide

## How to Test Without Having a Basename

Don't have a Basename yet? No problem! Here are 5 ways to test the integration:

---

## Method 1: Visual Test Page (Easiest) ⭐

We've created a dedicated test page with sample addresses.

### Steps:

```bash
# 1. Start dev server
npm run dev

# 2. Visit the test page
open http://localhost:3000/test-basenames
```

**What you'll see:**
- Multiple test addresses displayed in different component styles
- Some addresses may resolve to Basenames (like vitalik.eth)
- Others will show as shortened addresses (0x1234...5678)
- Compare the different visual presentations

### Add Your Own Address:

1. Open `/app/test-basenames/page.tsx`
2. Replace one of the test addresses with yours:
   ```tsx
   const TEST_ADDRESSES = [
     '0xYourAddressHere', // Your wallet
     '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
     // ... other test addresses
   ];
   ```
3. Refresh the page
4. See how your address displays!

---

## Method 2: Seed Test Data (Recommended) ⭐⭐

Populate your database with test users to see Basenames in real contexts.

### Steps:

```bash
# Install tsx if not already installed
npm install -D tsx

# Run the seed script
npm run seed:test-basenames

# Start dev server
npm run dev

# Visit leaderboard or profile pages
```

**What gets seeded:**
- 5 test users with various stats
- Mix of addresses (some may have Basenames)
- Realistic leaderboard data

**Where to see results:**
- Leaderboard page
- Profile pages
- Market creator popovers

---

## Method 3: Test with Known Addresses

Use addresses that are known to have Basenames on Base:

### Well-Known Base Addresses:

```tsx
// Add these to your test data
const KNOWN_BASENAME_ADDRESSES = [
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
  '0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263', // Example Base user
  // More can be found at base.org/names
];
```

### Manual Test:

1. Go to [base.org/names](https://www.base.org/names)
2. Search for registered Basenames
3. Copy their addresses
4. Use them in your test data

---

## Method 4: Register Your Own Basename (Most Authentic)

Get a real Basename for thorough testing!

### On Base Mainnet:

1. Visit: https://www.base.org/names
2. Connect your wallet
3. Search for available names (e.g., `yourname.base.eth`)
4. Register (costs ~$5-15 in ETH)
5. Wait a few minutes for resolution
6. Test in your app!

### On Base Sepolia (Testnet):

**Note:** Basename registration may not be available on testnet, but ENS subdomains might work.

```bash
# Check if Base Sepolia ENS is available
# You may need to use a faucet and interact with contracts directly
```

---

## Method 5: Mock the Data (For Development)

Temporarily mock the Basename resolution for UI testing.

### Create a mock hook:

```tsx
// lib/hooks/useBasename.mock.ts
export function useBasename(address: Address | undefined) {
  // Mock data for specific addresses
  const MOCK_BASENAMES: Record<string, string> = {
    '0xYourAddress': 'yourname.base.eth',
    '0xAnotherAddress': 'testuser.base.eth',
  };

  const basename = address ? MOCK_BASENAMES[address] : null;

  return {
    basename,
    avatar: basename ? '/mock-avatar.png' : null,
    displayName: basename || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'),
    hasBasename: !!basename,
    loading: false,
  };
}
```

**Remember:** This is just for UI testing - replace with real hook in production!

---

## Testing Checklist

### ✅ Visual Tests

- [ ] Test page loads without errors
- [ ] Addresses display correctly (Basename or shortened)
- [ ] Avatars load for addresses with ENS
- [ ] Verification badges appear correctly
- [ ] Components render in all variants (full, compact, avatar, name)

### ✅ Functional Tests

- [ ] Profile page shows identity correctly
- [ ] Leaderboard displays all users with proper identities
- [ ] Market cards show creator information
- [ ] Influencer attribution works
- [ ] No console errors
- [ ] Loading states work properly

### ✅ Edge Cases

- [ ] Invalid addresses handle gracefully
- [ ] Undefined/null addresses don't crash
- [ ] Addresses without Basenames show fallback
- [ ] Long Basenames truncate properly
- [ ] Mobile responsive layout works

### ✅ Network Tests

- [ ] Works on Base Sepolia (testnet)
- [ ] Will work on Base Mainnet (when deployed)
- [ ] OnchainKit API key is valid
- [ ] No rate limiting issues

---

## Troubleshooting

### "Basenames not resolving"

**Check:**
```bash
# 1. Verify API key is set
echo $NEXT_PUBLIC_ONCHAINKIT_API_KEY

# 2. Check environment
echo $NEXT_PUBLIC_ENVIRONMENT

# 3. Restart dev server
npm run dev
```

### "Components not displaying"

**Check:**
```tsx
// 1. Import is correct
import { BasenameIdentity } from '@/app/components/BasenameIdentity';

// 2. Address is proper format
const address: Address = '0x...' as Address;

// 3. Chain is configured
// Should auto-detect from environment
```

### "No avatars showing"

**Possible reasons:**
- Address doesn't have ENS avatar set
- CORS/image loading issue
- OnchainKit API not responding

**Test with known address:**
```tsx
// This should definitely have an avatar
<BasenameAvatar address="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" />
```

---

## Quick Testing Commands

```bash
# Full test workflow
npm run seed:test-basenames  # Seed test data
npm run dev                  # Start server

# Then visit:
# http://localhost:3000/test-basenames     - Visual test page
# http://localhost:3000                    - Main app with test data
```

---

## What Success Looks Like

### ✅ With Basename:
- Shows "alice.base.eth" instead of "0x1234...5678"
- Avatar image displays
- Blue verification badge (if Coinbase-verified)
- Smooth, professional appearance

### ✅ Without Basename:
- Shows shortened address "0x1234...5678"
- Default/no avatar (depends on component)
- Still fully functional
- No errors or crashes

---

## Getting Your Own Basename

Want to test with a real Basename?

### Quick Steps:

1. **Visit:** https://www.base.org/names
2. **Connect:** Your wallet (with ETH on Base)
3. **Search:** For available name (e.g., `yourname`)
4. **Register:** Pay ~$5-15 in ETH
5. **Wait:** 5-10 minutes for resolution
6. **Test:** See your Basename in Tomo!

### Tips:
- Short names are more expensive
- Names are permanent (no renewal needed)
- Works across all Base apps
- Great for building your onchain identity

---

## Next Steps After Testing

Once you've verified Basenames work:

1. ✅ **Test on testnet** - Use test-basenames page
2. ✅ **Seed real users** - Remove test data
3. ✅ **Deploy to staging** - Test with real users
4. ✅ **Switch to mainnet** - Update env to production
5. ✅ **Monitor resolution** - Check that names resolve
6. ✅ **User feedback** - See how users interact

---

## Resources

- 📖 [Basenames Docs](https://docs.base.org/base-account/basenames)
- 🏗️ [OnchainKit Docs](https://onchainkit.xyz)
- 🌐 [Get Basename](https://www.base.org/names)
- 💬 [Base Discord](https://discord.gg/base)

---

**Happy Testing!** 🎉

If you encounter issues, check `BASENAMES_INTEGRATION.md` for detailed troubleshooting.