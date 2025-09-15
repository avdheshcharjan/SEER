# Utils Directory - Utility Scripts and Helpers

## Overview
This directory contains utility scripts, helper functions, and development tools that support the TOMO prediction platform. These utilities facilitate development, deployment, and maintenance of the pari-mutuel betting system.

## Development Utilities

### Configuration Management
- **Environment Helpers**: Environment variable validation and setup
- **Network Configuration**: Blockchain network switching and management
- **Contract Configuration**: Dynamic contract address resolution
- **API Configuration**: External service integration setup

### Data Processing
- **Market Data Parsers**: Process market data from various sources
- **User Analytics**: Calculate user statistics and performance metrics
- **Leaderboard Calculators**: Ranking and scoring algorithms
- **Historical Data**: Archive and process historical prediction data

## Scripts Directory (`/scripts`)

### Deployment Scripts
- **Contract Deployment**: Automated smart contract deployment
- **Database Setup**: Supabase schema and seed data setup
- **Environment Setup**: Development environment configuration
- **Production Deployment**: Production deployment automation

### Data Migration
- **Schema Updates**: Database schema migration scripts
- **Data Transformation**: Convert data between different formats
- **Backup and Restore**: Database backup and restoration utilities
- **Testing Data**: Generate test data for development

### Monitoring and Analytics
- **Performance Monitoring**: Application performance tracking
- **Error Tracking**: Error logging and alerting
- **Usage Analytics**: User behavior and engagement tracking
- **Market Analytics**: Prediction market performance analysis

## Helper Functions

### Blockchain Utilities
```typescript
// Address and transaction utilities
function isValidAddress(address: string): boolean
function formatTransactionHash(hash: string): string
function calculateGasEstimate(operation: UserOperation): bigint

// Contract interaction helpers
function encodeContractCall(method: string, params: any[]): string
function decodeContractEvent(log: Log): DecodedEvent
function validateContractResponse(response: any): boolean
```

### Data Formatting
```typescript
// Currency and number formatting
function formatUSDC(amount: bigint): string
function formatPercentage(value: number): string
function formatTimeRemaining(endTime: Date): string

// Date and time utilities
function formatRelativeTime(date: Date): string
function isMarketActive(endTime: Date): boolean
function calculateTimeToResolution(endTime: Date): number
```

### Validation Utilities
```typescript
// Input validation
function validateMarketQuestion(question: string): ValidationResult
function validateBetAmount(amount: number): ValidationResult
function validateUserProfile(profile: UserProfile): ValidationResult

// Data sanitization
function sanitizeUserInput(input: string): string
function normalizeMarketCategory(category: string): MarketCategory
function validateImageUrl(url: string): boolean
```

## Testing Utilities

### Mock Data Generation
- **Mock Markets**: Generate test prediction markets
- **Mock Users**: Create test user profiles and data
- **Mock Transactions**: Simulate blockchain transactions
- **Mock Analytics**: Generate test analytics data

### Test Fixtures
- **Database Fixtures**: Predefined database states for testing
- **Contract Fixtures**: Mock contract responses and events
- **UI Fixtures**: Test data for component testing
- **Integration Fixtures**: Cross-service test scenarios

## Performance Utilities

### Optimization Tools
- **Bundle Analyzer**: Analyze JavaScript bundle size and composition
- **Performance Profiler**: Measure component render times
- **Memory Profiler**: Track memory usage and leaks
- **Network Monitor**: Analyze API call performance

### Caching Utilities
```typescript
// Memory caching
class MemoryCache<T> {
  set(key: string, value: T, ttl?: number): void
  get(key: string): T | undefined
  clear(): void
}

// Persistent caching
function cacheToLocalStorage(key: string, data: any): void
function getCachedData(key: string): any | null
function clearCache(): void
```

## Development Tools

### Code Generation
- **Component Generator**: Generate React component boilerplate
- **Type Generator**: Generate TypeScript types from schemas
- **API Generator**: Generate API route boilerplate
- **Test Generator**: Generate test files for components

### Development Helpers
```typescript
// Development logging
function devLog(message: string, data?: any): void
function measurePerformance<T>(fn: () => T): { result: T; time: number }
function debugState(state: any): void

// Development configuration
function isDevelopment(): boolean
function isProduction(): boolean
function getEnvironment(): 'development' | 'staging' | 'production'
```

## Security Utilities

### Input Sanitization
- **XSS Prevention**: Sanitize user-generated content
- **SQL Injection Prevention**: Parameterized query helpers
- **CSRF Protection**: Cross-site request forgery prevention
- **Rate Limiting**: Request throttling utilities

### Authentication Helpers
```typescript
// Wallet authentication
function verifyWalletSignature(signature: string, message: string, address: string): boolean
function generateAuthMessage(nonce: string): string
function validateAuthToken(token: string): boolean

// Session management
function createUserSession(address: string): string
function validateSession(sessionId: string): boolean
function clearUserSession(sessionId: string): void
```

## Integration Utilities

### External Services
- **CoinGecko Integration**: Cryptocurrency price data utilities
- **Social Media**: Twitter and Farcaster integration helpers
- **Notification Services**: Push notification utilities
- **Analytics Services**: Third-party analytics integration

### API Helpers
```typescript
// HTTP utilities
function makeAuthenticatedRequest(url: string, options: RequestInit): Promise<Response>
function retryRequest(request: () => Promise<Response>, maxRetries: number): Promise<Response>
function parseAPIResponse<T>(response: Response): Promise<T>

// WebSocket utilities
function createWebSocketConnection(url: string): WebSocket
function handleWebSocketMessage(message: MessageEvent): void
function reconnectWebSocket(connection: WebSocket): void
```

## Documentation and Logging

### Logging Utilities
```typescript
// Structured logging
interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  context?: any;
}

function log(entry: LogEntry): void
function logError(error: Error, context?: any): void
function logPerformance(operation: string, duration: number): void
```

### Documentation Helpers
- **API Documentation**: Generate API documentation from code
- **Type Documentation**: Generate type documentation
- **Component Documentation**: Generate component usage guides
- **Deployment Documentation**: Generate deployment guides

## Future Enhancements

### Planned Utilities
- **Machine Learning**: Prediction accuracy analysis tools
- **Advanced Analytics**: User behavior analysis utilities
- **Automated Testing**: Enhanced test generation and execution
- **Performance Optimization**: Advanced profiling and optimization tools

### Integration Improvements
- **Webhook Management**: Advanced webhook processing utilities
- **Event Streaming**: Real-time event processing tools
- **Data Pipeline**: ETL utilities for data processing
- **Monitoring**: Enhanced application monitoring and alerting