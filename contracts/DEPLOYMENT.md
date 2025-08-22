# BASED Prediction Market - Deployment Guide

## Overview
This guide covers deploying the BASED prediction market contracts to Base Sepolia testnet.

## Prerequisites

1. **Foundry installed**: https://book.getfoundry.sh/getting-started/installation
2. **Base Sepolia ETH**: Get from https://bridge.base.org/deposit or https://www.alchemy.com/faucets/base-sepolia
3. **Wallet with private key**: MetaMask or similar

## Quick Deploy (5 minutes)

### 1. Clone and Setup
```bash
cd contracts
cp .env.example .env
# Edit .env with your private key
```

### 2. Deploy Contracts
```bash
# Deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --verify

# Or if you have RPC URL in .env:
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

### 3. Get Contract Addresses
After deployment, check `deployments/base-sepolia.json` for contract addresses.

## Manual Steps

### 1. Build Contracts
```bash
forge build
```

### 2. Run Tests
```bash
forge test -vv
```

### 3. Deploy with Private Key
```bash
# Set your private key
export PRIVATE_KEY=your_private_key_here

# Deploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify
```

### 4. Create Sample Markets (Optional)
```bash
# After deployment, update .env with contract addresses:
export FACTORY_ADDRESS=0x...
export USDC_ADDRESS=0x...

# Create 10 sample markets
forge script script/CreateSampleMarkets.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast
```

## Contract Addresses (After Deployment)

Update these after deployment:

```typescript
// Base Sepolia
const contracts = {
  mockUSDC: "0x...", // MockUSDC token for testing
  factory: "0x...",  // MarketFactory for creating markets
  demoMarket: "0x..." // First demo market
}
```

## Contract Verification

If automatic verification fails:

```bash
# Verify MockUSDC
forge verify-contract \
  --chain base-sepolia \
  --compiler-version v0.8.19 \
  0xYourMockUSDCAddress \
  src/MockUSDC.sol:MockUSDC

# Verify MarketFactory  
forge verify-contract \
  --chain base-sepolia \
  --compiler-version v0.8.19 \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0xUSDCAddress 0xResolverAddress) \
  0xYourFactoryAddress \
  src/MarketFactory.sol:MarketFactory
```

## Testing Deployment

### 1. Get Test USDC
```bash
# Using cast
cast send 0xYourMockUSDCAddress "faucet()" --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY
```

### 2. Create a Market
```bash
# Create market via factory
cast send 0xYourFactoryAddress \
  "createMarket(string,uint256,address)" \
  "Will ETH hit $5000?" \
  $(($(date +%s) + 86400 * 30)) \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

### 3. Buy Shares
```bash
# Approve USDC spending first
cast send 0xYourMockUSDCAddress \
  "approve(address,uint256)" \
  0xYourMarketAddress \
  100000000 \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY

# Buy YES shares
cast send 0xYourMarketAddress \
  "buyShares(bool,uint256)" \
  true \
  10000000 \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

## Frontend Integration

After deployment, update your frontend config:

```typescript
// lib/contracts/addresses.ts
export const CONTRACTS = {
  BASE_SEPOLIA: {
    USDC: "0x...",
    FACTORY: "0x...",
    chainId: 84532,
  }
}
```

## Troubleshooting

### Common Issues:

1. **Insufficient funds**: Ensure you have Base Sepolia ETH
2. **Private key format**: Remove '0x' prefix if present
3. **RPC errors**: Try alternative RPC: `https://base-sepolia.blastapi.io/<api-key>`
4. **Verification fails**: Check constructor args and solc version

### Get Help:
- Base Discord: https://discord.gg/buildonbase
- Foundry Book: https://book.getfoundry.sh
- Base Docs: https://docs.base.org

## Security Notes

- ⚠️ **NEVER** commit private keys to version control
- ⚠️ Use `.env` files and keep them in `.gitignore`
- ⚠️ This is testnet only - not production ready
- ⚠️ Contracts are NOT audited - use at own risk

## Next Steps

After deployment:
1. Update frontend with contract addresses
2. Test market creation and trading
3. Verify all transactions on Basescan
4. Set up monitoring/alerts for the demo