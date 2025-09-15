# Lib Directory - Core Libraries and Utilities

## Overview
This directory contains core utility libraries, services, and configurations that power the TOMO prediction platform. These libraries support the **pari-mutuel betting system** and implement the Phase 2+ features outlined in the project roadmap.

## Core Libraries

### Blockchain Integration

#### `blockchain-parimutuel.ts`
Core blockchain interaction utilities for pari-mutuel contracts:
- **Contract Address Resolution**: Dynamic contract address management
- **Contract Validation**: Verify contract deployment and configuration
- **Network Switching**: Handle different networks (Base Sepolia, Mainnet)
- **ABI Management**: Contract interface definitions and type safety

#### `gasless-parimutuel.ts`
ERC-4337 and gasless transaction management:
- **Transaction Batching**: Combine multiple bets into single UserOperation
- **Paymaster Integration**: Coinbase Developer Paymaster configuration
- **Gas Estimation**: Accurate gas limits for UserOperations
- **Transaction Status**: Monitor and handle transaction lifecycle

**Key Functions:**
```typescript
generateBetCalls(): // Create batched transaction calls
validatePaymasterConfig(): // Verify paymaster setup
handleTransactionStatus(): // Process transaction results
```

### Database Services

#### `supabase-parimutuel.ts`
Specialized Supabase service for pari-mutuel system:
- **Market Management**: CRUD operations for prediction markets
- **User Predictions**: Track and analyze user betting history
- **Leaderboard Updates**: Real-time ranking calculations
- **Social Features**: User profiles and social interactions

**Key Services:**
```typescript
class ParimutuelSupabaseService {
  static async getMarketsWithInfluencers()
  static async recordPrediction()
  static async updateUserStats()
  static async getLeaderboard()
}
```

#### `supabase.ts`
General Supabase configuration and utilities:
- **Client Configuration**: Supabase client setup and authentication
- **Real-time Subscriptions**: Live data updates for UI components
- **Schema Definitions**: TypeScript types for database schemas
- **Error Handling**: Standardized error handling for database operations

### Type Definitions

#### `types.ts`
Core type definitions and data structures:
- **UnifiedMarket**: Standardized market interface for both AMM and pari-mutuel
- **SchemaTransformer**: Convert between different data schemas
- **User Types**: Profile, statistics, and social data structures
- **Transaction Types**: Blockchain transaction and batch operation types

**Key Interfaces:**
```typescript
interface UnifiedMarket {
  id: string;
  question: string;
  endTime: Date;
  category: MarketCategory;
  // ... unified interface for all market types
}

class SchemaTransformer {
  static marketWithInfluencerToUnified(): UnifiedMarket
  static ammMarketToUnified(): UnifiedMarket
  // ... other transformation utilities
}
```

### State Management

#### `store.ts`
Zustand-based global state management:
- **User State**: Authentication, profile, and preferences
- **Market State**: Current markets, filters, and selections
- **Transaction State**: Pending transactions, batch management
- **UI State**: Navigation, modals, and interaction states

**Store Structure:**
```typescript
interface AppStore {
  // User Management
  user: User | null;
  setUser: (user: User) => void;

  // Market Management
  selectedCategory: MarketCategory;
  setSelectedCategory: (category: MarketCategory) => void;

  // Transaction Batching
  pendingBets: PendingBet[];
  addPendingBet: (bet: PendingBet) => void;
  clearPendingBets: () => void;

  // UI State
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}
```

### Configuration

#### Network and Contract Configuration
- **Contract Addresses**: Environment-specific contract deployments
- **RPC Endpoints**: Blockchain network configuration
- **API Keys**: External service integration keys
- **Feature Flags**: Environment-specific feature toggles

#### Environment Management
```typescript
interface EnvironmentConfig {
  NEXT_PUBLIC_ENVIRONMENT: 'development' | 'staging' | 'production';
  NEXT_PUBLIC_CHAIN_ID: number;
  NEXT_PUBLIC_PARIMUTUEL_FACTORY_ADDRESS: string;
  NEXT_PUBLIC_USDC_ADDRESS: string;
  // ... other configuration variables
}
```

## Utility Functions

### Data Processing
- **Market Filtering**: Category and status-based market filtering
- **Statistical Calculations**: Win rates, profit/loss, streak tracking
- **Data Validation**: Input validation and sanitization
- **Format Conversion**: Date, currency, and display formatting

### Blockchain Utilities
- **Address Validation**: Ethereum address format checking
- **Transaction Parsing**: Extract data from blockchain transactions
- **Event Monitoring**: Contract event listening and processing
- **Error Handling**: Blockchain-specific error interpretation

### UI Helpers
- **Animation Utilities**: Framer Motion configuration and presets
- **Theme Management**: Dark/light mode and color scheme utilities
- **Responsive Helpers**: Screen size and device detection
- **Accessibility**: Screen reader and keyboard navigation support

## Integration Patterns

### Service Layer Architecture
```typescript
// Database Layer
Database ← SupabaseService ← ParimutuelSupabaseService

// Blockchain Layer
Blockchain ← BlockchainService ← ParimutuelBlockchainService

// Application Layer
Components ← Store ← Services
```

### Error Handling Strategy
- **Typed Errors**: Specific error types for different failure modes
- **Error Boundaries**: React error boundary integration
- **Retry Logic**: Automatic retry for transient failures
- **User Feedback**: Clear error messages and recovery options

### Performance Optimization
- **Lazy Loading**: Dynamic imports for heavy libraries
- **Memoization**: Expensive calculation caching
- **Debouncing**: Rate limiting for user input
- **Bundle Splitting**: Code splitting for optimal loading

## Testing Utilities

### Mock Services
- **Mock Supabase**: Test database operations without real DB
- **Mock Blockchain**: Local blockchain simulation for testing
- **Mock User Data**: Standardized test user profiles and data

### Test Helpers
- **Component Testing**: React component test utilities
- **Integration Testing**: Cross-service integration test helpers
- **E2E Testing**: End-to-end testing utilities and fixtures

## Documentation

### Code Documentation
- **JSDoc Comments**: Comprehensive function and class documentation
- **Type Annotations**: Full TypeScript type coverage
- **Usage Examples**: Code examples for common patterns
- **API Documentation**: Auto-generated API documentation

### Development Guidelines
- **Coding Standards**: ESLint and Prettier configuration
- **Architecture Patterns**: Recommended design patterns
- **Performance Guidelines**: Best practices for optimization
- **Security Considerations**: Security-focused development practices

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Machine learning integration for prediction insights
- **Cross-chain Support**: Multi-chain blockchain utilities
- **Enhanced Caching**: Redis integration for performance
- **Real-time Features**: WebSocket utilities for live data

### Optimization Areas
- **Bundle Size**: Tree shaking and dead code elimination
- **Memory Usage**: Efficient data structure usage
- **Network Efficiency**: Request batching and caching strategies
- **Database Performance**: Query optimization and indexing strategies