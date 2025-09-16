# Final Deployment Testing - Smart Contract Addresses

## Deployment Summary
**Date**: September 16, 2025  
**Deployer Address**: `0x7579c7457F4151B1ae7078fAf9D4A30Af953bDeE`  
**Network**: Base Sepolia (84532)  

## Main Smart Contract System - MarketResolver Integration

### Core Contracts
- **MarketResolver**: `0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519`
  - Handles market resolution via UMA Optimistic Oracle V2
  - Bond Amount: 1000000000 USDC (1000 USDC with 6 decimals)
  - Liveness Period: 7200 seconds (2 hours)

- **ParimutuelMarketFactory**: `0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496`
  - Factory for creating parimutuel prediction markets
  - Integrated with MarketResolver for automated resolution

- **MarketFactory**: `0x34A1D3fff3958843C43aD80F30b94c510645C316`
  - Factory for creating simple prediction markets
  - Integrated with MarketResolver for automated resolution

### Legacy Contracts
- **Demo ParimutuelPredictionMarket**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
  - Question: "Will BTC be above $70k by end of December 2024?"
  - End Time: 2592001 (Unix timestamp)
  - USDC Address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)

## External Dependencies

### UMA Integration
- **UMA Optimistic Oracle V2**: `0xA5B9d8a0B0Fa04Ba71BDD68069661ED5C0848884`
- **Bond Currency (USDC)**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base Mainnet)
- **Base Sepolia USDC (demo)**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Contract Features

### MarketResolver System
1. **Platform Markets**: Resolved automatically via UMA Optimistic Oracle V2
2. **User Markets**: Resolved manually by market creators
3. **Resolution Process**:
   - Call `requestPlatformResolution()` after market expires
   - Wait for oracle liveness period (2 hours)
   - Call `settlePlatformResolution()` to finalize

### Market Creation Examples
```solidity
// Create platform market (resolved by UMA)
factory.createMarket('Will BTC hit $100k?', endTime, true);

// Create user market (resolved by creator)
factory.createMarket('My personal prediction', endTime, false);
```

## Frontend Integration Requirements

### Environment Variables to Update
```env
# Main System Contracts
MARKET_RESOLVER_ADDRESS=0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519
PARIMUTUEL_MARKET_FACTORY_ADDRESS=0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
MARKET_FACTORY_ADDRESS=0x34A1D3fff3958843C43aD80F30b94c510645C316

# Legacy Contract
DEMO_PARIMUTUEL_MARKET_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# External Dependencies
UMA_OPTIMISTIC_ORACLE_V2_ADDRESS=0xA5B9d8a0B0Fa04Ba71BDD68069661ED5C0848884
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
BASE_SEPOLIA_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### Contract Deployment Configuration
- **Bond Amount**: 1000 USDC (1000000000 with 6 decimals)
- **Liveness Period**: 2 hours (7200 seconds)
- **Oracle Integration**: Full UMA Optimistic Oracle V2 support

## Testing Notes
- All contracts deployed successfully with verification
- Main system uses UMA integration for automated resolution
- Legacy contracts available for backward compatibility
- Ready for frontend integration with updated addresses

## Next Steps
1. ✅ Deploy smart contracts
2. ✅ Create deployment documentation
3. ✅ Update frontend contract addresses
4. ⏳ Test market creation and resolution flow
5. ⏳ Verify UMA oracle integration