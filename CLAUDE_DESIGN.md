# CLAUDE_DESIGN.md

## 🎯 BASED - Swipe-Based Prediction Market Design Document

### 1. Overview

**BASED** is a Tinder-style prediction market miniapp integrated within The Base App (TBA) ecosystem, enabling users to create and participate in binary prediction markets through intuitive swipe gestures. The application leverages Farcaster's social graph for discovery and Base network for on-chain settlement.

**Problem Statement:** Current prediction markets lack social integration and have high friction for casual users. BASED solves this by embedding market creation directly in social feeds and using familiar swipe mechanics for participation.

**Target Audience:** 
- Primary: Farcaster users seeking to monetize predictions
- Secondary: Crypto-native users looking for simplified prediction markets
- Tertiary: Social media users new to prediction markets

**Key Goals:**
- Frictionless market creation from social context
- Sub-5 second participation flow
- Real economic incentives with USDC settlement
- Social virality through Farcaster integration

### 2. Architecture

```
based-prediction-market/
├── contracts/               # Smart contracts
│   ├── PredictionMarket.sol # Core market logic
│   ├── MarketFactory.sol    # Factory for market creation
│   ├── PriceOracle.sol      # Oracle integration
│   └── ShareToken.sol       # ERC-20 share implementation
├── app/                     # Next.js application
│   ├── api/                 # API routes
│   │   ├── markets/         # Market CRUD operations
│   │   ├── predictions/     # User predictions
│   │   ├── oracle/          # Price feed integration
│   │   └── farcaster/       # Frame handlers
│   ├── components/          # React components
│   │   ├── SwipeStack/      # Core swipe interface
│   │   ├── MarketCreator/   # Market creation flow
│   │   ├── Portfolio/       # User positions
│   │   └── ShareTrading/    # Buy/sell interface
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities
│   │   ├── contracts/       # Contract ABIs & addresses
│   │   ├── pricing/         # AMM pricing logic
│   │   └── oracle/          # Oracle integrations
│   └── store/               # State management
├── frame-server/            # Farcaster frame server
├── oracle/                  # Price oracle service
└── indexer/                 # Event indexer service
```

#### Design Rationale

**Microservices Architecture**: Separating oracle, indexer, and frame services allows independent scaling and failure isolation.

**Smart Contract Modularity**: Factory pattern enables upgradeability while preserving existing markets. Separate share tokens allow composability.

**Event-Driven Updates**: WebSocket connections for real-time price updates reduce latency and improve UX.

**Edge Caching**: Leveraging Vercel Edge Functions for frame metadata reduces load and improves response times.

### 3. Components and Interfaces

#### Component: MarketFactory (contracts/MarketFactory.sol)
**Purpose:** Deploy and manage individual prediction markets with standardized parameters.

**Key Methods:**
- `createMarket()`: Deploy new prediction market contract
- `resolveMarket()`: Trigger market resolution via oracle
- `emergencyPause()`: Circuit breaker for risk management

**Interface:**
```solidity
interface IMarketFactory {
    function createMarket(
        string memory question,
        uint256 resolutionTime,
        address oracle,
        address resolver
    ) external returns (address);
    
    function resolveMarket(
        address market,
        bool outcome
    ) external;
    
    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        uint256 resolutionTime
    );
}
```

#### Component: SwipeEngine (app/lib/swipeEngine.ts)
**Purpose:** Handle swipe gesture recognition and transaction building.

**Key Methods:**
- `processSwipe()`: Convert gesture to market action
- `buildTransaction()`: Prepare on-chain transaction
- `optimisticUpdate()`: Update UI before confirmation

**Interface:**
```typescript
interface SwipeEngine {
  processSwipe(
    direction: 'left' | 'right' | 'up',
    marketId: string,
    amount: BigNumber
  ): Promise<TransactionRequest>;
  
  subscribeToMarket(
    marketId: string,
    callback: (update: MarketUpdate) => void
  ): () => void;
}
```

#### Component: PricingAMM (app/lib/pricing/amm.ts)
**Purpose:** Calculate dynamic share prices based on constant product formula.

**Key Methods:**
- `calculatePrice()`: Get current share price
- `calculateSlippage()`: Estimate price impact
- `getSharesOut()`: Calculate shares received for USDC input

**Interface:**
```typescript
interface PricingAMM {
  calculatePrice(
    yesPool: bigint,
    noPool: bigint,
    side: 'yes' | 'no'
  ): number;
  
  getSharesOut(
    amountIn: bigint,
    yesPool: bigint,
    noPool: bigint,
    side: 'yes' | 'no'
  ): bigint;
}
```

### 4. Data Models

#### Core Data Structures

```typescript
// Market entity
interface Market {
  id: string;
  contractAddress: string;
  question: string;
  creator: string;
  category: 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics';
  resolutionTime: Date;
  oracleSource: string;
  status: 'active' | 'resolved' | 'disputed';
  outcome?: boolean;
  metadata: {
    ticker?: string;
    targetPrice?: number;
    imageUrl?: string;
  };
}

// Position tracking
interface Position {
  id: string;
  userId: string;
  marketId: string;
  side: 'yes' | 'no';
  shares: bigint;
  avgPrice: number;
  currentValue: bigint;
  pnl: bigint;
  transactions: Transaction[];
}

// Market state
interface MarketState {
  marketId: string;
  yesPool: bigint;
  noPool: bigint;
  yesPrice: number;
  noPrice: number;
  volume24h: bigint;
  liquidity: bigint;
  participantCount: number;
  lastUpdate: Date;
}
```

#### Database Schema (PostgreSQL + TimescaleDB for time-series)

```sql
-- Markets table
CREATE TABLE markets (
  id UUID PRIMARY KEY,
  contract_address VARCHAR(42) UNIQUE NOT NULL,
  question TEXT NOT NULL,
  creator_address VARCHAR(42) NOT NULL,
  category VARCHAR(20) NOT NULL,
  resolution_time TIMESTAMPTZ NOT NULL,
  oracle_source VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  outcome BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions table with hypertable for time-series
CREATE TABLE positions (
  time TIMESTAMPTZ NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  market_id UUID REFERENCES markets(id),
  side VARCHAR(3) NOT NULL,
  shares NUMERIC(78, 0) NOT NULL,
  price NUMERIC(10, 6) NOT NULL,
  value_usd NUMERIC(20, 6),
  tx_hash VARCHAR(66) UNIQUE
);

SELECT create_hypertable('positions', 'time');
```

### 5. Error Handling

#### Error Categories

**Smart Contract Errors**: 
- Revert with descriptive messages
- Emit error events for monitoring
- Fallback to emergency pause mechanism

**Oracle Failures**:
- Implement 3-tier oracle fallback (Primary → Secondary → Manual)
- 24-hour dispute window for manual resolution
- Automatic refunds if unresolvable

**Network Congestion**:
- Queue transactions with exponential backoff
- Optimistic UI updates with rollback capability
- User notification of pending states

#### Error Handling Strategy

**Circuit Breaker Pattern**: Automatic pause when error rate exceeds threshold
**Graceful Degradation**: Read-only mode during write failures
**Comprehensive Logging**: Structured logs with Datadog integration
**User Communication**: Clear, actionable error messages with recovery steps

### 6. Testing Strategy

#### Testing Approach

**Unit Testing**: 
- Smart contracts: 100% coverage with Foundry
- Frontend: Component testing with React Testing Library
- API: Jest with supertest for endpoints

**Integration Testing**:
- End-to-end market lifecycle on testnet
- Frame interaction testing with mock Farcaster client
- Oracle integration with multiple price sources

**Load Testing**:
- Simulate 10,000 concurrent swipes
- Market creation stress test (100 markets/minute)
- WebSocket connection limits

#### Test Coverage Areas

- AMM pricing accuracy across edge cases
- Gas optimization for batch transactions
- Oracle failure recovery mechanisms
- Slippage protection boundaries
- Frame metadata generation

### 7. Security Considerations

#### Smart Contract Security

**Audit Requirements**:
- Formal verification of AMM math
- Reentrancy guards on all external calls
- Overflow protection (using OpenZeppelin SafeMath)
- Time manipulation resistance

**Access Control**:
- Role-based permissions (Owner, Resolver, Pauser)
- Multi-sig for admin functions
- Timelock for critical updates

#### Application Security

**Authentication**: 
- SIWE (Sign-In With Ethereum) for wallet auth
- Farcaster FID verification for frame interactions
- Rate limiting per wallet address

**Data Validation**:
- Input sanitization for market questions
- Slippage tolerance enforcement (max 5%)
- Amount bounds checking

### 8. Performance Considerations

#### Optimization Strategies

**Smart Contract Gas Optimization**:
- Pack structs to minimize storage slots
- Use events instead of storage for logs
- Batch operations where possible
- Implement EIP-2930 access lists

**Frontend Performance**:
- Virtual scrolling for market lists
- Lazy loading with React.lazy()
- Image optimization with next/image
- Service Worker for offline caching

**API Performance**:
- Redis caching for market data (5-second TTL)
- Database connection pooling
- GraphQL with DataLoader for batching
- CDN for static frame images

#### Scalability Targets

- Support 100,000 daily active users
- Handle 1,000 transactions per second
- Sub-100ms swipe response time
- 99.9% uptime SLA

### 9. Integration Points

#### External Services

**Price Oracles**:
- Primary: Chainlink Price Feeds
- Secondary: Pyth Network
- Tertiary: Coinbase Price Oracle

**Infrastructure**:
- Base Mainnet / Base Sepolia for contracts
- Upstash Redis for caching
- Vercel for edge deployment
- QuickNode for RPC

**Social Integration**:
- Farcaster Frames for embeds
- Warpcast API for user data
- MiniKit SDK for native integration

### 10. Monetization & Tokenomics

#### Fee Structure

- 2% fee on winning redemptions
- No fees for market creation (subsidized initially)
- 0.3% AMM swap fee retained in pools

#### Liquidity Incentives

- Initial liquidity bootstrap: 100 USDC per market
- Creator rewards: 50% of market fees
- Volume incentives for top traders

### 11. Future Enhancements

#### Phase 2 Features
- Multi-outcome markets (not just binary)
- Conditional markets (if X then Y)
- Market making bots API
- Cross-market arbitrage tools

#### Phase 3 Features
- Governance token for parameter updates
- Decentralized oracle network
- Layer 2 deployment for lower fees
- Mobile native app

### 12. Critical Evaluation of Original Design

#### Strengths
- ✅ Excellent UX with familiar swipe pattern
- ✅ Strong social integration via Farcaster
- ✅ Clear monetization path

#### Weaknesses Addressed
- ❌ **Original: "$1 per swipe" → Fixed pricing ignores market dynamics**
  - ✅ **Solution: Implement proper AMM with dynamic pricing**
  
- ❌ **Original: Mock data + Redis → No real settlement**
  - ✅ **Solution: Full smart contract implementation with USDC**
  
- ❌ **Original: No oracle integration → Cannot resolve markets**
  - ✅ **Solution: Multi-tier oracle system with fallbacks**
  
- ❌ **Original: 5 categories → Limited market variety**
  - ✅ **Solution: Expandable category system with community proposals**

#### Technical Debt Mitigation
- Implement comprehensive error tracking from day 1
- Build with upgradeability patterns
- Document all architectural decisions
- Maintain 80%+ test coverage

### 13. Implementation Timeline (72 Hours)

#### Day 1 (Hours 0-24)
- Smart contract core implementation (8h)
- Basic swipe UI with Framer Motion (8h)
- Farcaster frame integration setup (4h)
- Database schema and API scaffolding (4h)

#### Day 2 (Hours 24-48)
- AMM pricing implementation (6h)
- Transaction building and wallet integration (6h)
- Market creation flow (6h)
- Portfolio and position tracking (6h)

#### Day 3 (Hours 48-72)
- Oracle integration (4h)
- Testing and bug fixes (8h)
- Deployment to Base Sepolia (4h)
- Demo preparation and documentation (8h)

### 14. Success Metrics

#### Launch Metrics (First Week)
- 100+ markets created
- 1,000+ unique participants
- $10,000+ total volume
- <1% error rate

#### Growth Metrics (First Month)
- 50% week-over-week user growth
- 80% user retention (week 1 to week 2)
- Average 5 swipes per session
- 20% share rate on Farcaster