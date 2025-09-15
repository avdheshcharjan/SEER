# App Directory - TOMO (BASED)

## Overview
This is the main Next.js application directory for **TOMO**, a swipe-based micro prediction platform built on Base. The app implements **Phase 2+ features** from the project roadmap, transitioning from the original AMM-based system to a **pari-mutuel betting system** for simplicity and better user experience.

## Architecture
- **Framework**: Next.js 14+ with App Router
- **UI Library**: Coinbase OnchainKit for wallet integration
- **Styling**: Tailwind CSS with custom theme
- **State Management**: Zustand store (`@/lib/store`)
- **Blockchain**: Base network with ERC-4337 (Account Abstraction) for gasless transactions
- **Database**: Supabase for off-chain data and social features

## Key Features Implemented

### Core Functionality (Phase 2+)
1. **Pari-mutuel Prediction Markets**: Simplified betting system where winners split losers' pools
2. **Swipe-to-Predict UX**: TikTok-style card swiping interface
3. **Gasless Transactions**: ERC-4337 integration with Coinbase Paymaster
4. **Transaction Batching**: Groups multiple swipes into single blockchain transactions
5. **Social Features**: Leaderboards, user profiles, sharing capabilities

### Views Available
- `home`: Landing page and navigation hub
- `predict`: Main swipe-based prediction interface (ParimutuelPredictionMarket component)
- `profile`: User profile with statistics and history
- `leaderboard`: Community rankings and competitive features
- `create`: Market creation interface for users

## Main Files

### Core App Files
- `layout.tsx`: Root layout with metadata, PWA setup, and Coinbase OnchainKit providers
- `page.tsx`: Main app component handling view routing and wallet connection
- `providers.tsx`: Blockchain and state providers setup
- `globals.css`: Global styles and CSS variables
- `theme.css`: OnchainKit theme customization

### Key Components
- `ParimutuelPredictionMarket.tsx`: Main prediction interface with pari-mutuel betting
- `SwipeStack.tsx`: Swipeable card interface component
- `Home.tsx`: Landing page with navigation options
- `Profile.tsx`: User dashboard and statistics
- `Leaderboard.tsx`: Community rankings
- `CreateMarketEnhanced.tsx`: Market creation interface

## Contract Integration

The app integrates with **pari-mutuel smart contracts** deployed on Base:

### Contract Addresses (Base Sepolia)
- **ParimutuelMarketFactory**: Creates new prediction markets
- **ParimutuelPredictionMarket**: Individual market contracts for betting

### Betting Flow
1. Users swipe YES/NO on prediction cards
2. Swipes are batched (default: 20 swipes or 30-second timeout)
3. Batched calls are sent as single ERC-4337 transaction
4. Winners split the losing pool proportionally after 24h resolution

## Social Features

### Leaderboards
- **Total Winnings**: Raw profit/loss tracking
- **Win Rate**: Accuracy percentage
- **Streak Tracking**: Consecutive correct predictions
- **Real-time Updates**: Supabase subscriptions for live data

### User Profiles
- **Statistics Dashboard**: Win rate, total predictions, profit/loss
- **Prediction History**: Past bets and outcomes
- **Social Integration**: Farcaster and Twitter linking
- **Achievement System**: Badges and milestone tracking

## API Routes (app/api/)

The app includes several API endpoints for data processing:

- `api/markets/`: Market data and CRUD operations
- `api/predictions/`: User prediction tracking
- `api/leaderboard/`: Ranking calculations
- `api/og/`: Open Graph image generation for sharing
- `api/webhook/`: External integrations (Supabase, etc.)

## Development Notes

### Environment Variables Required
- `NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME`: App name
- `NEXT_PUBLIC_URL`: App URL for metadata
- Supabase connection variables
- Contract addresses for different networks

### Key Libraries
- `@coinbase/onchainkit`: Wallet, transactions, identity
- `framer-motion`: Animations for swipe interactions
- `react-hot-toast`: User notifications
- `wagmi`: Ethereum React hooks
- `viem`: Ethereum client library

## Phase 2+ Implementation Status

✅ **Completed:**
- Pari-mutuel contract system (simplified from AMM)
- Gasless transaction batching
- Swipe-based prediction interface
- Social features (leaderboards, profiles)
- Market creation and resolution
- Real-time data synchronization

🔄 **In Progress:**
- Advanced analytics and charts
- Enhanced sharing features
- Mobile app optimization
- Performance improvements

📋 **Future Phases:**
- Advanced gamification features
- Community-driven market creation
- Cross-platform sharing integration
- Advanced market analytics