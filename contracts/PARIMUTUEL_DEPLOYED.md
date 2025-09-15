# 🚀 Pari-mutuel Prediction Market - Deployed Contracts

## ✅ Base Sepolia Deployment - September 13, 2025

### 📋 Contract Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| **ParimutuelMarketFactory** | `0xd0a6e763691fe2041aA5eA04deb67AcF888A40dD` | Factory for creating pari-mutuel markets |
| **Demo Market** | `0x0Ee1Eaa29418e64b20d53794B26c7C7D1aD02687` | "Will BTC be above $70k by end of December 2024?" |
| **USDC Contract** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Base Sepolia USDC (same as AMM version) |

### 🔗 Basescan Links

- **ParimutuelMarketFactory**: https://sepolia.basescan.org/address/0xd0a6e763691fe2041aA5eA04deb67AcF888A40dD
- **Demo Market**: https://sepolia.basescan.org/address/0x0Ee1Eaa29418e64b20d53794B26c7C7D1aD02687
- **USDC**: https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e

### 📊 Deployment Details

- **Network**: Base Sepolia (Chain ID: 84532)
- **Deployer**: `0xe12A473bdEeF6f1402606a1D852aC18C2c5a1D8f`
- **Block**: Latest
- **Gas Used**: ~8.4M gas total
- **Deployment Date**: September 13, 2025

### 🧪 Demo Market Info

- **Question**: "Will BTC be above $70k by end of December 2024?"
- **End Time**: 1760289458 (Unix timestamp)
- **Resolver**: Factory deployer
- **Type**: Pari-mutuel betting (winners split losers' pool)

### 🔧 Contract Verification Status

- **ParimutuelMarketFactory**: ✅ Verified on Basescan
- **Demo Market**: ✅ Verified on Basescan

### 🏗️ Frontend Integration Status

- ✅ `/lib/gasless-parimutuel.ts` - Updated with factory address
- ✅ `/lib/blockchain-parimutuel.ts` - Updated with both addresses
- ⏳ **TODO**: Add addresses to Coinbase Paymaster allowlist
- ⏳ **TODO**: Test pari-mutuel betting functionality

### 🆚 Comparison to AMM System

| Feature | AMM System | Pari-mutuel System |
|---------|------------|-------------------|
| **Pricing** | Dynamic share prices | Fixed bet amounts |
| **Payouts** | Based on share value | Winners split losing pool |
| **Complexity** | High (AMM math) | Low (simple pool splitting) |
| **User UX** | Can lose money when right | Always profitable when right |
| **Gas Cost** | Higher | Lower |

### 🎯 Next Steps

1. **Add to Coinbase Paymaster Allowlist**:
   - Factory: `0xd0a6e763691fe2041aA5eA04deb67AcF888A40dD`
     - Methods: `createMarket`
   - Market: `0x0Ee1Eaa29418e64b20d53794B26c7C7D1aD02687` (and future markets)
     - Methods: `placeBet`, `betYes`, `betNo`, `claimRewards`

2. **Test the System**:
   - Use ParimutuelPredictionMarket component
   - Place test bets on the demo market
   - Verify gasless transactions work
   - Test reward claiming after resolution

3. **Database Migration**:
   - Update existing markets to use pari-mutuel schema
   - Use ParimutuelSupabaseService for new functionality

4. **Production Deployment**:
   - Deploy to Base Mainnet when ready
   - Update addresses for production

### 🚀 Ready to Use!

The pari-mutuel prediction market system is now live on Base Sepolia and ready for testing. The simpler betting logic should provide a much better user experience compared to the AMM system.