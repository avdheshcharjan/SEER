# 🚀 BASED Prediction Market - Deployed Contracts

## ✅ Base Sepolia Deployment - August 20, 2024

### 📋 Contract Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| **MockUSDC** | `0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2` | Test USDC token (6 decimals) - FIXED FAUCET |
| **MarketFactory** | `0xAa84401Ef34C0334D4B85259955DE1fa99495B96` | Factory for creating prediction markets |
| **Demo Market** | `0xC1f3f3528AD71348AC4683CAde6e5988019735D8` | "Will ETH be above $4000 on Dec 31, 2024?" |

### 🔗 Basescan Links

- **MockUSDC**: https://sepolia.basescan.org/address/0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2
- **MarketFactory**: https://sepolia.basescan.org/address/0xAa84401Ef34C0334D4B85259955DE1fa99495B96  
- **Demo Market**: https://sepolia.basescan.org/address/0xC1f3f3528AD71348AC4683CAde6e5988019735D8

### 📊 Deployment Details

- **Network**: Base Sepolia (Chain ID: 84532)
- **Deployer**: `0x817ADecF13045578BDbA571eA204b6B0a1C90Ab8`
- **Block**: ~1755702144
- **Gas Used**: ~7M gas total
- **Initial Market State**: 50% YES / 50% NO (balanced liquidity)

### 🧪 Demo Market Info

- **Question**: "Will ETH be above $4000 on December 31, 2024?"
- **End Time**: December 19, 2025 (Unix: 1760886144)
- **Initial YES Price**: 0.5 (50%)
- **Initial NO Price**: 0.5 (50%)
- **Total Liquidity**: 1,000 USDC

### 💰 Test USDC Features

The MockUSDC contract includes:
- ✅ **Faucet**: Get 1,000 USDC per address (24h cooldown)
- ✅ **Owner Mint**: Unlimited minting for testing
- ✅ **6 Decimals**: Matches real USDC format
- ✅ **1M Initial Supply**: Minted to deployer

### 🎯 Frontend Integration

```typescript
// Add to your frontend config
export const BASE_SEPOLIA_CONTRACTS = {
  USDC: "0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2",
  FACTORY: "0xAa84401Ef34C0334D4B85259955DE1fa99495B96",
  DEMO_MARKET: "0xC1f3f3528AD71348AC4683CAde6e5988019735D8",
  CHAIN_ID: 84532,
  RPC_URL: "https://sepolia.base.org"
}
```

### 🔧 Quick Start Commands

```bash
# Get test USDC (1,000 tokens)
cast send 0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2 "faucet()" \
  --rpc-url https://sepolia.base.org --private-key YOUR_KEY

# Create a new market
cast send 0xAa84401Ef34C0334D4B85259955DE1fa99495B96 \
  "createMarket(string,uint256,address)" \
  "Your question here" \
  $(($(date +%s) + 86400 * 30)) \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://sepolia.base.org --private-key YOUR_KEY

# Buy YES shares (approve first)
cast send 0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2 \
  "approve(address,uint256)" 0xYOUR_MARKET_ADDRESS 100000000 \
  --rpc-url https://sepolia.base.org --private-key YOUR_KEY

cast send 0xYOUR_MARKET_ADDRESS \
  "buyShares(bool,uint256)" true 10000000 \
  --rpc-url https://sepolia.base.org --private-key YOUR_KEY
```

### ✅ Verification Status

**Contract verification on Basescan is in progress.** The contracts were just deployed and may take a few minutes to appear in the explorer.

To manually verify later:
```bash
forge verify-contract --chain base-sepolia \
  --compiler-version v0.8.23 \
  --etherscan-api-key YOUR_KEY \
  0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2 \
  src/MockUSDC.sol:MockUSDC
```

### 🔐 Security Notes

- ⚠️ **TESTNET ONLY** - Not for production use
- ⚠️ **Unaudited contracts** - Use at own risk
- ⚠️ **Demo purposes** - For MVP development only
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

**The BASED prediction market is now LIVE on Base Sepolia! 🚀**