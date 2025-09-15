# API Directory - Backend Routes and Services

## Overview
This directory contains Next.js API routes that handle server-side operations for the TOMO prediction platform. These routes support the pari-mutuel betting system, user management, and social features outlined in Phase 2+ of the project roadmap.

## API Route Structure

### Market Management (`/markets`)
Handles prediction market operations:
- **GET**: Retrieve active markets with filtering and pagination
- **POST**: Create new markets (admin/authorized users)
- **PUT**: Update market metadata and resolution
- **DELETE**: Remove markets (admin only)

**Key Features:**
- Integration with ParimutuelMarketFactory contract
- Real-time market data synchronization
- Category-based filtering (crypto, sports, politics, etc.)
- Market resolution and outcome handling

### Predictions Management (`/predictions`)
User prediction tracking and analytics:
- **GET**: Retrieve user prediction history
- **POST**: Record new predictions (called on transaction confirmation)
- **PUT**: Update prediction status and outcomes

**Key Features:**
- Links on-chain transactions to off-chain user data
- Calculates user statistics (win rate, profit/loss, streaks)
- Handles batch prediction processing
- Real-time leaderboard updates

### Leaderboard System (`/leaderboard`)
Community rankings and competitive features:
- **GET**: Retrieve rankings by various metrics
- **POST**: Update user rankings after market resolution

**Ranking Categories:**
- Total winnings/profit
- Win rate percentage
- Current streak length
- Total predictions made
- Category-specific performance

### Notifications (`/notify`)
User notification and communication:
- **POST**: Send notifications for market outcomes, achievements, etc.
- Integration with external notification services
- Push notification support for PWA

### Open Graph Images (`/og`)
Dynamic image generation for social sharing:
- **`/og/market/[id]`**: Generate market-specific sharing images
- Real-time market data in images
- Branded templates for different market types
- Support for Twitter, Farcaster, and other platforms

### Data Integration (`/coingecko`)
External data source integration:
- **GET**: Fetch cryptocurrency price data
- Market data for crypto-related predictions
- Historical price information for outcome verification

### Webhooks (`/webhook`)
External service integrations:
- **POST**: Handle Supabase database triggers
- **POST**: Process blockchain event notifications
- **POST**: Third-party service callbacks

## Data Flow Architecture

### Database Operations
- **Supabase Integration**: All routes use Supabase for data persistence
- **Real-time Subscriptions**: Live data updates via Supabase realtime
- **Data Validation**: Schema validation for all API inputs/outputs

### Blockchain Integration
- **Contract Interaction**: Routes interact with pari-mutuel contracts
- **Event Listening**: Monitor contract events for state changes
- **Transaction Verification**: Verify on-chain data against off-chain records

### Authentication & Authorization
- **Wallet Authentication**: Verify user identity via wallet signatures
- **Role-based Access**: Different permissions for users, creators, admins
- **Rate Limiting**: Prevent abuse and ensure fair usage

## Security Considerations

### Input Validation
- Strict schema validation for all API inputs
- SQL injection prevention
- XSS protection for user-generated content

### Authentication
- Cryptographic signature verification
- Session management for long-lived operations
- Secure API key management for external services

### Rate Limiting
- Per-user request limits
- IP-based throttling
- DDoS protection mechanisms

## Error Handling

### Standard Error Responses
```typescript
interface APIError {
  error: string;
  message: string;
  code: number;
  details?: any;
}
```

### Error Categories
- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - System error

## Performance Optimization

### Caching Strategy
- Redis caching for frequently accessed data
- CDN integration for static assets
- Database query optimization
- Response compression

### Database Optimization
- Indexed queries for common operations
- Connection pooling for high load
- Read replicas for analytics queries
- Batch operations for bulk updates

## Environment Configuration

### Required Environment Variables
```env
# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Blockchain
NEXT_PUBLIC_RPC_URL=
PRIVATE_KEY=
CONTRACT_ADDRESSES=

# External Services
COINGECKO_API_KEY=
NOTIFICATION_SERVICE_KEY=
```

## API Documentation

### Response Formats
All APIs return JSON with consistent structure:
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

### Authentication Headers
```http
Authorization: Bearer <wallet_signature>
Content-Type: application/json
```

## Monitoring & Analytics

### Metrics Tracked
- API response times
- Error rates by endpoint
- User activity patterns
- Market creation and resolution rates
- Transaction success rates

### Logging
- Structured logging with correlation IDs
- Error tracking and alerting
- Performance monitoring
- Security event logging

## Future Enhancements

### Planned Features
- GraphQL API for complex queries
- Real-time API with WebSocket support
- Advanced analytics endpoints
- Batch processing APIs
- Machine learning prediction APIs

### Scalability Improvements
- Microservice architecture migration
- Event-driven architecture
- Advanced caching strategies
- Load balancing and auto-scaling