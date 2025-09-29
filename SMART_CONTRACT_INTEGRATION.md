# Smart Contract Markets Integration

This document outlines the complete integration of smart contract prediction markets with the SEER frontend and database.

## Overview

The integration automatically syncs the 50 smart contract markets created by `CreateMarkets.s.sol` to the Supabase database and displays them as swipeable cards in the UI with real USDC betting capabilities.

## Architecture

```
Smart Contracts (Base Sepolia) → Contract Sync Service → Supabase → Frontend UI
```

### Components

1. **Contract Sync Service** (`lib/contract-sync.ts`)
   - Monitors ParimutuelMarketFactory for MarketCreated events
   - Syncs new markets to Supabase database
   - Updates real-time market data from contracts

2. **Backend Sync Script** (`scripts/sync-contract-markets.ts`)
   - Batch processes all deployed markets
   - One-time sync for historical markets
   - Manual trigger for specific markets

3. **Enhanced Database Schema** (`supabase-schema.sql`)
   - Contract integration fields
   - Factory address tracking
   - Script-generated market flags

4. **Frontend Integration** (`app/components/PredictionMarket.tsx`)
   - Loads and prioritizes deployed markets
   - Real-time contract data display
   - Live contract indicators

## Contract Addresses

- **Factory**: `0x89332E711B591DEeAC1a67b4ED5086a209a7414E`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Network**: Base Sepolia (Chain ID: 84532)

## Setup Instructions

### 1. Database Schema Updates

Run the enhanced schema in your Supabase SQL editor:

```sql
-- Add new fields to markets table
ALTER TABLE markets ADD COLUMN transaction_hash TEXT;
ALTER TABLE markets ADD COLUMN factory_contract_address TEXT DEFAULT '0x89332E711B591DEeAC1a67b4ED5086a209a7414E';
ALTER TABLE markets ADD COLUMN deployment_batch_id TEXT;
ALTER TABLE markets ADD COLUMN script_generated BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_markets_contract_address ON markets(contract_address);
CREATE INDEX IF NOT EXISTS idx_markets_script_generated ON markets(script_generated);
CREATE INDEX IF NOT EXISTS idx_markets_factory_address ON markets(factory_contract_address);
```

### 2. Sync Deployed Markets

After running `CreateMarkets.s.sol`, sync the markets to the database:

```bash
# Run the sync script
npm run sync-markets

# Or run directly with tsx
npx tsx scripts/sync-contract-markets.ts
```

### 3. Start Real-time Monitoring

The contract sync service automatically starts when markets are loaded in the UI. For manual monitoring:

```typescript
import { ContractSyncService } from './lib/contract-sync';

// Start event listener
await ContractSyncService.syncAllMarkets();

// Sync specific market
await ContractSyncService.syncMarketByAddress('0xMarketAddress');
```

## Market Categories

The integration supports 5 categories with specialized card components:

1. **Crypto** (`CryptoCard.tsx`) - 12 markets
2. **Current Affairs** (`CurrentAffairsCard.tsx`) - 10 markets
3. **Politics** (`PoliticsCard.tsx`) - 8 markets
4. **Technology** (`TechCard.tsx`) - 10 markets
5. **Sports** (`SportsCard.tsx`) - 10 markets

## UI Features

### Live Contract Indicators

Deployed markets display special indicators:

- ✅ **"Live Contract"** badge
- 💰 **Real USDC betting** enabled
- 📊 **Real-time pool data** from contracts
- ⚡ **Gasless transactions** with OnchainKit

### Market Prioritization

1. **Deployed contract markets** appear first
2. **Regular markets** appear after
3. Markets are shuffled within each group

### Category Filtering

Users can filter by category in the swipe interface:
- All, Crypto, Current Affairs, Technology, Sports, Politics

## API Endpoints

New Supabase service methods:

```typescript
// Get only deployed contract markets
await SupabaseService.getDeployedMarkets();

// Get script-generated markets
await SupabaseService.getScriptGeneratedMarkets();

// Get markets by factory address
await SupabaseService.getMarketsByFactory(factoryAddress);
```

## Testing

### Integration Test

Run the comprehensive integration test:

```bash
npm run test-integration

# Or run directly with tsx
npx tsx scripts/test-integration.ts
```

### Manual Testing Checklist

1. ✅ Deploy markets via `CreateMarkets.s.sol`
2. ✅ Run sync script to populate database
3. ✅ Start frontend and connect wallet
4. ✅ Verify deployed markets appear with "Live Contract" badges
5. ✅ Test real USDC betting on contract markets
6. ✅ Verify category filtering works
7. ✅ Check real-time pool updates

## Real-time Features

### Contract Event Monitoring

- **MarketCreated**: Automatically syncs new markets
- **BetPlaced**: Updates pool sizes and user positions
- **MarketResolved**: Updates resolution status

### Database Sync

- **Real-time pool updates** from contract state
- **User position tracking** across markets
- **Transaction history** with Base Sepolia links

## Security Features

- ✅ **Contract validation** before betting
- ✅ **Market existence verification** in database
- ✅ **Duplicate transaction prevention**
- ✅ **Error handling** and recovery
- ✅ **No demo fallbacks** - all markets must be real

## Troubleshooting

### Common Issues

1. **No markets showing**
   - Run sync script: `npm run tsx scripts/sync-contract-markets.ts`
   - Check Supabase connection
   - Verify contract addresses

2. **"Market not found" errors**
   - Ensure market exists in database with contract_address
   - Check that sync script completed successfully

3. **Transaction failures**
   - Verify wallet connected to Base Sepolia
   - Check USDC balance and allowance
   - Ensure paymaster is configured for gasless

### Debug Commands

```bash
# Check deployed markets
npx tsx -e "
import { SupabaseService } from './lib/supabase';
console.log(await SupabaseService.getDeployedMarkets());
"

# Test contract connection
npm run test-integration
```

## Performance Optimizations

- **Batch transaction processing** for multiple predictions
- **Market data caching** with real-time updates
- **Prioritized loading** of deployed markets
- **Efficient contract calls** with multicall patterns

## Future Enhancements

1. **WebSocket integration** for real-time updates
2. **Market resolution automation** via oracle integration
3. **Advanced analytics** for contract market performance
4. **Cross-chain support** for multiple networks

---

## Quick Start Summary

1. **Deploy contracts** using `CreateMarkets.s.sol`
2. **Run sync script**: `npm run sync-markets`
3. **Start frontend**: `npm run dev`
4. **Connect wallet** and start swiping on live contract markets! 🎉

The integration provides a seamless bridge between deployed smart contracts and the SEER swipe-to-predict interface, enabling real decentralized prediction markets with a polished user experience.