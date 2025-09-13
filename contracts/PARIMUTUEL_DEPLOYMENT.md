# 🚀 Pari-mutuel Prediction Market - Deployment Guide

## Quick Deployment Steps

### 1. Setup Environment
```bash
cd contracts
cp .env.example .env
# Edit .env and add your PRIVATE_KEY (without 0x prefix)
```

### 2. Deploy to Base Sepolia
```bash
# Deploy pari-mutuel system
forge script script/DeployParimutuel.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify -vvvv

# Or with explicit RPC URL
forge script script/DeployParimutuel.s.sol --rpc-url https://sepolia.base.org --broadcast --verify -vvvv
```

### 3. Alternative: Manual Deployment with Private Key
```bash
# Set private key in environment
export PRIVATE_KEY=your_private_key_here

# Deploy using environment variable
forge script script/DeployParimutuel.s.sol --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY --broadcast --verify -vvvv
```

## Expected Deployment Output

After successful deployment, you should see:
```
== Logs ==
Deploying pari-mutuel system with deployer: 0x[your_address]
USDC address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
ParimutuelMarketFactory deployed at: 0x[new_factory_address]
Demo ParimutuelPredictionMarket deployed at: 0x[new_market_address]
Question: Will BTC be above $70k by end of December 2024?
End time: [timestamp]

=== UPDATE THESE ADDRESSES IN YOUR FRONTEND ===
PARIMUTUEL_FACTORY_ADDRESS: 0x[new_factory_address]
DEMO_PARIMUTUEL_MARKET_ADDRESS: 0x[new_market_address]
===============================================
```

## Frontend Configuration Update

After deployment, update the following files:

### 1. Update `/lib/gasless-parimutuel.ts`
```typescript
// Replace this line:
export const PARIMUTUEL_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

// With your deployed address:
export const PARIMUTUEL_FACTORY_ADDRESS = '0x[your_deployed_factory_address]' as Address;
```

### 2. Create new blockchain config file `/lib/blockchain-parimutuel.ts`
```typescript
import { Address } from 'viem';

// Deployed pari-mutuel contract addresses on Base Sepolia
export const PARIMUTUEL_FACTORY_ADDRESS = '0x[your_deployed_factory_address]' as Address;
export const DEMO_PARIMUTUEL_MARKET_ADDRESS = '0x[your_deployed_market_address]' as Address;

// USDC contract address on Base Sepolia (unchanged)
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;
```

### 3. Update Coinbase Paymaster Allowlist

Add the new contract addresses to your Coinbase Developer Platform project:

**Contracts to Allowlist:**
- Factory Address: `0x[your_deployed_factory_address]`
  - Methods: `createMarket`
- Market Address: `0x[your_deployed_market_address]` (and any future markets)
  - Methods: `placeBet`, `betYes`, `betNo`, `claimRewards`

## Contract Verification

The deployment script includes `--verify` flag which will automatically verify contracts on Basescan. If verification fails, you can manually verify:

```bash
# Verify Factory
forge verify-contract 0x[factory_address] src/ParimutuelMarketFactory.sol:ParimutuelMarketFactory --chain-id 84532 --etherscan-api-key $BASESCAN_API_KEY --constructor-args $(cast abi-encode "constructor(address,address)" 0x036CbD53842c5426634e7929541eC2318f3dCF7e 0x[deployer_address])

# Verify Demo Market  
forge verify-contract 0x[market_address] src/ParimutuelPredictionMarket.sol:ParimutuelPredictionMarket --chain-id 84532 --etherscan-api-key $BASESCAN_API_KEY --constructor-args $(cast abi-encode "constructor(address,string,uint256,address)" 0x036CbD53842c5426634e7929541eC2318f3dCF7e "Will BTC be above $70k by end of December 2024?" [timestamp] 0x[resolver_address])
```

## Testing the Deployment

### 1. Verify Factory Functions
```bash
# Check factory address
cast call 0x[factory_address] "usdc()" --rpc-url https://sepolia.base.org

# Get market count
cast call 0x[factory_address] "getMarketCount()" --rpc-url https://sepolia.base.org
```

### 2. Verify Demo Market Functions
```bash
# Check market question
cast call 0x[market_address] "question()" --rpc-url https://sepolia.base.org

# Check market stats
cast call 0x[market_address] "getMarketStats()" --rpc-url https://sepolia.base.org

# Check current odds
cast call 0x[market_address] "getCurrentOdds()" --rpc-url https://sepolia.base.org
```

## Troubleshooting

### Common Issues:

1. **"insufficient funds for gas"**: Make sure you have Base Sepolia ETH
2. **"nonce too low"**: Reset your wallet nonce or wait
3. **"execution reverted"**: Check constructor parameters
4. **RPC connection issues**: Try alternative RPC endpoints

### Alternative RPC Endpoints:
- `https://sepolia.base.org` (official)
- `https://base-sepolia.publicnode.com`
- `https://base-sepolia-rpc.publicnode.com`

## Next Steps

After successful deployment:
1. ✅ Update frontend configuration with new addresses
2. ✅ Add contracts to Coinbase Paymaster allowlist  
3. ✅ Test the pari-mutuel betting functionality
4. ✅ Create sample markets for testing
5. ✅ Update database schema to use pari-mutuel fields

## Support

If you encounter issues:
1. Check gas fees and account balance
2. Verify RPC endpoint connectivity
3. Ensure private key format (no 0x prefix)
4. Check Base Sepolia network status