# Smart Contract Integration Codebase Research

## Executive Summary

This research documents the existing smart contract integration patterns, market management system, database schema, and UI components in the SEER prediction markets application. The codebase demonstrates a sophisticated integration between Ethereum smart contracts (on Base network), a Supabase database, and a Next.js frontend with comprehensive swipe-based betting interfaces.

## Table of Contents

1. [Smart Contract Architecture](#smart-contract-architecture)
2. [Database Schema & Management](#database-schema--management)
3. [Market Creation & Factory Patterns](#market-creation--factory-patterns)
4. [Blockchain Integration Layer](#blockchain-integration-layer)
5. [UI Components & Swipe Interface](#ui-components--swipe-interface)
6. [Event Monitoring & Sync Systems](#event-monitoring--sync-systems)
7. [Batch Processing & Optimization](#batch-processing--optimization)
8. [Key Files Reference](#key-files-reference)
9. [Architecture Patterns & Decisions](#architecture-patterns--decisions)
10. [Implementation Recommendations](#implementation-recommendations)

---

## Smart Contract Architecture

### Core Contracts

**ParimutuelMarketFactory.sol** (`contracts/src/ParimutuelMarketFactory.sol`)
- **Address**: `0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C` (mentioned in requirements)
- **Purpose**: Factory pattern for creating individual prediction markets
- **Key Features**:
  - Batch market creation (`createMarkets()` - up to 20 markets per batch)
  - ERC-4337 Account Abstraction support
  - Emergency controls (pause/unpause)
  - Event emission for market tracking
  - USDC-based betting system

**ParimutuelPredictionMarket.sol** (`contracts/src/ParimutuelPredictionMarket.sol`)
- **Purpose**: Individual prediction market contract
- **Betting Model**: Parimutuel system (winners split losers' stakes)
- **Key Features**:
  - Fixed USDC bet amounts (1, 5, or 10 USDC)
  - Binary outcomes (YES/NO)
  - One bet per side per user
  - Emergency resolution capabilities
  - Automatic payout calculations

### Contract Deployment & Management

**CreateMarkets.s.sol** (`contracts/script/CreateMarkets.s.sol`)
- Foundry script for deploying multiple markets
- Generates 10 diverse prediction markets
- Batch creation for gas efficiency
- Categories: crypto, current affairs, politics, technology

### Network Configuration
- **Primary Network**: Base Sepolia (testnet)
- **USDC Contract**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Factory Contract**: `0x89332E711B591DEeAC1a67b4ED5086a209a7414E`

---

## Database Schema & Management

### Core Tables

**markets** (`supabase-schema.sql`)
```sql
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  creator_address TEXT,
  contract_address TEXT,  -- Critical for smart contract integration
  yes_pool DECIMAL DEFAULT 0,
  no_pool DECIMAL DEFAULT 0,
  total_yes_shares DECIMAL DEFAULT 0,
  total_no_shares DECIMAL DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  outcome BOOLEAN,
  resolution_time TIMESTAMPTZ
);
```

**user_predictions**
```sql
CREATE TABLE user_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES markets(id),
  user_id TEXT NOT NULL, -- Wallet address
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  amount DECIMAL NOT NULL,
  shares_received DECIMAL DEFAULT 0,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**user_positions**
```sql
CREATE TABLE user_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Wallet address
  market_id UUID NOT NULL REFERENCES markets(id),
  yes_shares DECIMAL DEFAULT 0,
  no_shares DECIMAL DEFAULT 0,
  total_invested DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, market_id)
);
```

### Database Service Layer

**SupabaseService** (`lib/supabase.ts`)
- Comprehensive CRUD operations for all tables
- Market filtering by deployment status (`getDeployedMarkets()`)
- Contract address validation
- Influencer integration support
- Real-time statistics and analytics

---

## Market Creation & Factory Patterns

### Factory Contract Integration

**Key Functions**:
- `createMarket(string question, address resolver)` - Single market
- `createMarkets(string[] questions, address[] resolvers)` - Batch creation
- `getMarketCount()` - Total markets created
- `getMarkets(uint256 start, uint256 limit)` - Paginated retrieval

### Market Creation Flow

1. **Frontend Form** (`app/components/CreateMarketOnchainKit.tsx`)
   - User inputs: ticker, target price, direction, end date
   - Real-time token data from CoinGecko API
   - Form validation and preview

2. **Transaction Generation** (`lib/gasless-onchainkit.ts`)
   - Gasless transactions via OnchainKit
   - ERC-4337 Account Abstraction
   - Sponsored transaction support

3. **Contract Deployment**
   - Factory creates new market contract
   - Emits `MarketCreated` event with contract address
   - Returns deployed contract address

4. **Database Sync** (`lib/market-factory-onchainkit.ts`)
   - Extracts contract address from transaction logs
   - Creates market record in Supabase
   - Links contract address to market ID

### Contract Address Management

**Critical Pattern**: Markets must have valid `contract_address` in database to be available for betting.

**Validation Logic** (`lib/blockchain.ts`):
```typescript
export function getMarketContractAddress(marketId: string, supabaseMarkets?: Array<{
    id: string;
    contract_address?: string;
    contractAddress?: string;
}>): Address | undefined {
    // Check both snake_case (raw Supabase) and camelCase (UnifiedMarket) formats
    const contractAddr = market.contract_address || market.contractAddress;
    if (!contractAddr || !isValidAddress(contractAddr)) {
        return undefined;
    }
    return contractAddr as Address;
}
```

---

## Blockchain Integration Layer

### Core Integration Files

**lib/blockchain.ts** - Primary blockchain interface
- Contract addresses and ABIs
- Transaction generation utilities
- Address validation
- Market contract mapping

**lib/viem-client.ts** - Viem client configuration
- RPC endpoint management
- Chain configuration (Base Sepolia)
- Client instantiation

**lib/parimutuel-blockchain.ts** - Parimutuel-specific logic
- Bet placement transactions
- Pool state management
- Payout calculations

### Transaction Types

**Market Creation**:
```typescript
interface MarketCreationParams {
    question: string;
    endTime: bigint;
    resolver: Address;
}
```

**Bet Placement**:
```typescript
interface PredictionTransaction {
    marketAddress: Address;
    prediction: 'yes' | 'no';
    amount: number; // in USDC
    userAddress: Address;
}
```

### Address Validation System

**Critical for Security**:
```typescript
export function isValidAddress(address: string): boolean {
    // Basic format validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;

    // Reject zero address and other invalid addresses
    const invalidAddresses = ['0x0000...', /* extensive list */];
    return !invalidAddresses.includes(address.toLowerCase());
}
```

---

## UI Components & Swipe Interface

### SwipeStack Component (`app/components/SwipeStack.tsx`)

**Core Functionality**:
- Tinder-like swipe interface for predictions
- Contract address validation before allowing swipes
- Three swipe directions:
  - **Left**: NO prediction
  - **Right**: YES prediction
  - **Up**: Skip market

**Market Filtering**:
```typescript
const validMarkets = React.useMemo(() => {
    console.log(`📊 Filtering ${markets.length} markets for valid contracts...`);
    const filtered = getMarketsWithContracts(markets);
    console.log(`✅ Found ${filtered.length} markets with valid contracts`);
    return filtered;
}, [markets]);
```

**Validation Logic**:
```typescript
function validateMarketForSwipe(market: UnifiedMarket, allMarkets: UnifiedMarket[]): boolean {
    if (!market.contractAddress) return false;

    const contractAddress = getMarketContractAddress(market.id, allMarkets);
    if (!contractAddress) return false;

    return true;
}
```

### Market Cards

**SmartPredictionCard** - Adaptive card component
- Handles both legacy mock data and Supabase markets
- Contract status indicators
- Real-time price data integration
- Category-specific styling

### Market Categories

**Supported Categories**:
- `crypto` - Cryptocurrency predictions
- `tech` - Technology company predictions
- `celebrity` - Celebrity/entertainment predictions
- `sports` - Sports outcomes
- `politics` - Political events

---

## Event Monitoring & Sync Systems

### ContractSyncService (`lib/contract-sync.ts`)

**Primary Functions**:
- **Market Creation Monitoring**: Listens for `MarketCreated` events
- **Bet Tracking**: Monitors `BetPlaced` events
- **Resolution Handling**: Processes `MarketResolved` events

**Event Processing Pipeline**:
```typescript
// 1. Fetch events from blockchain
const marketEvents = await this.getMarketCreatedEvents(startBlock, latestBlock);

// 2. Process each event
for (const event of marketEvents) {
    await this.syncSingleMarket(event);
}

// 3. Update database with contract data
const marketData = {
    question: event.question,
    category: this.categorizeMarket(event.question),
    end_time: new Date(Number(event.endTime) * 1000).toISOString(),
    creator_address: event.creator.toLowerCase(),
    contract_address: event.market.toLowerCase(),
    transaction_hash: event.transactionHash,
    // ... pool data
};
```

### Automated Market Sync Script (`scripts/sync-contract-markets.ts`)

**Purpose**: One-time sync of all deployed markets from factory contract to database

**Key Features**:
- Multiple RPC endpoint fallbacks
- Batch processing for large numbers of markets
- Contract address validation
- Categorization based on question content

**Usage**:
```bash
npm run sync-markets              # Sync all deployed markets
npm run sync-markets --interactive # Interactive mode
```

### Real-time Event Monitoring

**Implementation Pattern**:
```typescript
// Set up periodic polling for market events
setInterval(async () => {
    await this.syncMarketEvents(marketAddress, currentBlock);
}, 30000); // Poll every 30 seconds
```

---

## Batch Processing & Optimization

### Factory Batch Creation

**Gas Optimization**:
```solidity
function createMarkets(
    string[] memory questions,
    address[] memory resolvers
) external returns (address[] memory marketAddresses) {
    require(questions.length <= 20, "Invalid batch size"); // Max 20 markets per batch

    for (uint256 i = 0; i < questions.length; i++) {
        // Create market and emit event
    }
}
```

### Database Batch Operations

**Market Filtering for Performance**:
```typescript
export function getMarketsWithContracts<T extends {
    id: string;
    contract_address?: string;
    contractAddress?: string
}>(markets: T[]): T[] {
    return markets.filter(market => {
        const contractAddr = market.contract_address || market.contractAddress;
        return contractAddr && isValidAddress(contractAddr);
    });
}
```

### Batch Sync Strategy

**CreateMarkets.s.sol Implementation**:
- Creates markets in batches of 5 to stay under gas limits
- Handles gas estimation and optimization
- Provides detailed deployment logging

---

## Key Files Reference

### Smart Contracts
- `contracts/src/ParimutuelMarketFactory.sol` - Factory contract
- `contracts/src/ParimutuelPredictionMarket.sol` - Individual market contract
- `contracts/script/CreateMarkets.s.sol` - Deployment script

### Blockchain Integration
- `lib/blockchain.ts` - Core blockchain utilities
- `lib/contract-sync.ts` - Event monitoring and sync
- `lib/viem-client.ts` - RPC client configuration
- `lib/parimutuel-blockchain.ts` - Market-specific logic

### Database & API
- `lib/supabase.ts` - Database service layer
- `lib/types.ts` - Unified type definitions
- `supabase-schema.sql` - Database schema
- `app/api/markets/route.ts` - Markets API endpoint

### UI Components
- `app/components/SwipeStack.tsx` - Main swipe interface
- `app/components/CreateMarketOnchainKit.tsx` - Market creation form
- `app/components/cards/SmartPredictionCard.tsx` - Market display cards

### Scripts & Utilities
- `scripts/sync-contract-markets.ts` - Market sync script
- `lib/gasless-onchainkit.ts` - Gasless transaction generation
- `lib/market-factory-onchainkit.ts` - Market creation processing

### Configuration
- `supabase-schema.sql` - Database setup
- `foundry.toml` - Foundry configuration
- `.env` example in various files showing required environment variables

---

## Architecture Patterns & Decisions

### 1. Unified Market Interface

**Pattern**: Single `UnifiedMarket` interface handles both legacy mock data and real Supabase markets
**Benefits**:
- Seamless migration from mock to real data
- Type safety across the application
- Consistent API regardless of data source

### 2. Contract Address as Source of Truth

**Pattern**: Markets without valid `contract_address` are filtered out of swipe interface
**Benefits**:
- Prevents betting on non-deployed markets
- Clear separation between demo and live markets
- User safety and transaction validation

### 3. Event-Driven Sync

**Pattern**: Blockchain events drive database updates
**Benefits**:
- Real-time data synchronization
- Reduced API calls to blockchain
- Audit trail through transaction hashes

### 4. Gasless Transactions

**Pattern**: ERC-4337 Account Abstraction with sponsored transactions
**Benefits**:
- Improved user experience (no gas fees)
- Easier onboarding for new users
- Consistent transaction costs

### 5. Batch Operations

**Pattern**: Factory contract supports batch market creation
**Benefits**:
- Gas efficiency for market creation
- Atomic operations for related markets
- Scalable deployment strategies

---

## Implementation Recommendations

### For New Smart Contract Market Creation & Mapping Feature

1. **Leverage Existing Factory Pattern**
   - Extend `ParimutuelMarketFactory.sol` with new market types
   - Use existing batch creation capabilities
   - Maintain compatibility with current sync systems

2. **Database Schema Extensions**
   - Add new market category types as needed
   - Consider adding market metadata tables for complex market types
   - Extend indexing for new query patterns

3. **UI Component Reuse**
   - Extend `CreateMarketOnchainKit.tsx` for new market types
   - Reuse `SwipeStack.tsx` validation logic
   - Create new card types inheriting from `SmartPredictionCard`

4. **Event Monitoring Integration**
   - Extend `ContractSyncService` for new event types
   - Add new categorization logic for automatic market categorization
   - Implement real-time updates for new market states

5. **Admin Interface Development**
   - Build on existing Supabase admin patterns
   - Extend market management capabilities
   - Add batch operations for administrative tasks

### Security Considerations

1. **Address Validation**: Always use `isValidAddress()` function
2. **Contract Verification**: Validate markets are deployed by trusted factory
3. **Input Sanitization**: Validate all user inputs before blockchain submission
4. **Rate Limiting**: Implement appropriate rate limits for market creation
5. **Access Controls**: Use proper role-based access for admin functions

### Performance Optimizations

1. **Market Filtering**: Pre-filter markets at database level when possible
2. **Batch Processing**: Use factory batch operations for multiple markets
3. **Event Indexing**: Optimize database indexes for common query patterns
4. **Caching**: Implement appropriate caching for frequently accessed data
5. **Connection Pooling**: Use connection pooling for database and RPC endpoints

This research provides a comprehensive foundation for implementing the new smart contract market creation and mapping feature while maintaining compatibility with existing systems and following established patterns.