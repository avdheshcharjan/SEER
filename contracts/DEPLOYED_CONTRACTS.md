# 🚀 BASED Prediction Market - Deployed Contracts

## ✅ Base Sepolia REAL USDC Deployment - August 22, 2025

### 📋 Contract Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| **MarketFactory** | `0xB788385cf679A69C43CfD9cB35045BBd4c2843f2` | Factory with real Base Sepolia USDC integration |
| **Demo Market** | `0x86F3108947dA0a88170A7AE8E967dAE8ce0a41F9` | "Will ETH be above $4000 on Dec 31, 2024?" |
| **USDC Contract** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Real Base Sepolia USDC (not MockUSDC) |

### 🔗 Basescan Links

- **MarketFactory**: https://sepolia.basescan.org/address/0xB788385cf679A69C43CfD9cB35045BBd4c2843f2
- **Demo Market**: https://sepolia.basescan.org/address/0x86F3108947dA0a88170A7AE8E967dAE8ce0a41F9
- **Real USDC**: https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e

### 📊 Deployment Details

- **Network**: Base Sepolia (Chain ID: 84532)
- **Deployer**: `0x817ADecF13045578BDbA571eA204b6B0a1C90Ab8`
- **Block**: ~1755846388
- **Gas Used**: ~7M gas total
- **Initial Market State**: 50% YES / 50% NO (balanced liquidity)

### 🧪 Demo Market Info

- **Question**: "Will ETH be above $4000 on December 31, 2024?"
- **End Time**: December 19, 2025 (Unix: 1760886144)
- **Initial YES Price**: 0.5 (50%)
- **Initial NO Price**: 0.5 (50%)
- **Total Liquidity**: 1,000 USDC

### 🎯 Frontend Integration

```typescript
// Add to your frontend config
export const BASE_SEPOLIA_CONTRACTS = {
  FACTORY: "0xB788385cf679A69C43CfD9cB35045BBd4c2843f2",
  DEMO_MARKET: "0x86F3108947dA0a88170A7AE8E967dAE8ce0a41F9",
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  CHAIN_ID: 84532,
  RPC_URL: "https://sepolia.base.org"
}
```

### 🔧 Quick Start Commands

```bash
# Create a new market
cast send 0xB788385cf679A69C43CfD9cB35045BBd4c2843f2 \
  "createMarket(string,uint256,address)" \
  "Your question here" \
  $(($(date +%s) + 86400 * 30)) \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://sepolia.base.org --private-key YOUR_KEY

# Buy YES shares on a market
cast send 0xYOUR_MARKET_ADDRESS \
  "buyShares(bool,uint256)" true 10000000 \
  --rpc-url https://sepolia.base.org --private-key YOUR_KEY
```

### 🔐 Security Notes

- ⚠️ **TESTNET ONLY** - Not for production use
- ⚠️ **Unaudited contracts** - Use at own risk
- ⚠️ **Demo purposes** - For MVP development only
- ✅ **Real USDC integration** - No MockUSDC dependencies
- ✅ **Open source** - All code available on GitHub

### 📈 Next Steps

1. **Wait for indexing** (5-10 minutes) for contracts to appear on Basescan
2. **Verify contracts** manually if auto-verification fails
3. **Test functionality** using the commands above
4. **Integrate with frontend** using the provided contract addresses
5. **Create sample markets** using the CreateSampleMarkets script

### 🎉 Achievement Unlocked

✅ **Smart contracts successfully deployed to Base Sepolia!**
✅ **Demo market created with balanced liquidity**
✅ **100,000 test USDC minted and ready**
✅ **Factory ready for creating unlimited markets**

**The BASED prediction market is now LIVE on Base Sepolia with REAL USDC! 🚀**

### ⚠️ IMPORTANT: Paymaster Configuration Required

To enable gasless transactions with the new contract addresses, update your Coinbase Developer Platform paymaster policy:

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Navigate to your project's Paymaster settings
3. Update the contract allowlist to include:
   - `0xB788385cf679A69C43CfD9cB35045BBd4c2843f2` (MarketFactory)
   - `0x86F3108947dA0a88170A7AE8E967dAE8ce0a41F9` (Demo Market)
4. Remove old addresses:
   - ❌ `0xfE7440a0C61aE1156E9B759Bb6C7E8BEFa0BCC3C` (old factory)
   - ❌ `0x688B4b38b8f73878Cd19ef7250FA63D6b36361d1` (old demo)