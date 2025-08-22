# BASED - Prediction Market Platform

A swipe-based prediction market platform built on Base, featuring gasless transactions and instant predictions. Users can create markets and make predictions with simple swipe gestures.

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [MiniKit](https://docs.base.org/builderkits/minikit/overview) - Base wallet integration
- [OnchainKit](https://www.base.org/builders/onchainkit) - Base blockchain utilities
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Supabase](https://supabase.com) - Database and real-time subscriptions
- [Foundry](https://getfoundry.sh) - Smart contract development

## Getting Started

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. Set up environment variables:

```bash
# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=BASED
NEXT_PUBLIC_URL=your-deployment-url
NEXT_PUBLIC_ICON_URL=your-icon-url
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your-api-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Paymaster & Gasless Transactions (Coinbase Developer Platform)
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/your-project-id
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/your-project-id

# Optional: Redis for notifications
REDIS_URL=your-redis-url
REDIS_TOKEN=your-redis-token
```

3. Start the development server:
```bash
npm run dev
```

## Key Features

### Swipe-Based Predictions
- Intuitive swipe gestures for Yes/No predictions
- Real-time market cards with live data
- Support for multiple market categories (Crypto, Sports, Politics, Tech, Celebrity)

### Gasless Transactions
- Powered by Coinbase Paymaster for sponsored transactions
- Users can predict without holding ETH for gas
- Seamless UX with automatic transaction batching

### Market Creation
- Create custom prediction markets with OnchainKit
- Set custom end dates and categories
- Automatic smart contract deployment

### Real-time Features
- Live leaderboard with user rankings
- Real-time position updates via Supabase
- Instant transaction confirmations

### Smart Contract Integration
- Built on Base network for low fees
- Custom MarketFactory contract for market creation
- USDC-based predictions with proper decimals handling

## Architecture

### Frontend Components
- **Home.tsx** - Main swipe interface with market cards
- **SwipeStack.tsx** - Handles swipe gestures and animations
- **PredictionMarket.tsx** - Individual market prediction interface
- **CreateMarketOnchainKit.tsx** - Market creation with OnchainKit
- **Leaderboard.tsx** - User rankings and statistics

### Backend Integration
- **Supabase** - Real-time database for predictions and positions
- **Smart Contracts** - MarketFactory and SimplePredictionMarket on Base
- **Gasless Transactions** - Coinbase Paymaster integration
- **Market Data** - Category-based market generation system

## Development

### Database Setup
1. Set up Supabase project and get your URL/keys
2. Run the database schema from `supabase-schema.sql`
3. Configure RLS policies for secure access

### Smart Contract Deployment
Contracts are deployed on Base Sepolia testnet:
- **MarketFactory**: `0xAa84401Ef34C0334D4B85259955DE1fa99495B96`
- **USDC (Test)**: `0x32dfDC3bB23d294a1b32E0EDDEddB12088112161`

### Testing
For local testing, use the reset script to clear test data:
```sql
-- Execute scripts/reset-test-data.sql in Supabase SQL editor
-- Clears test predictions and positions to avoid duplicates
```

### Database Schema
- **user_predictions** - Individual swipe predictions with transaction hashes
- **user_positions** - Aggregated user positions per market  
- **markets** - Prediction market metadata and contract addresses

## Deployment

### Production Setup
1. Deploy to Vercel or your preferred platform
2. Set up production Supabase instance
3. Configure Coinbase Developer Platform for gasless transactions
4. Deploy smart contracts to Base mainnet (if needed)

### Environment Configuration
- Ensure all environment variables are set in production
- Configure CORS settings for your domain
- Set up proper RLS policies in Supabase

## Learn More

- [Base Documentation](https://docs.base.org)
- [OnchainKit Documentation](https://docs.base.org/builderkits/onchainkit/getting-started)
- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [Supabase Documentation](https://supabase.com/docs)
- [Foundry Documentation](https://book.getfoundry.sh)
