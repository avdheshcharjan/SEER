# Components Directory - TOMO UI Components

## Overview
This directory contains all React components for the TOMO prediction platform. Components are organized around the **pari-mutuel betting system** and focus on the swipe-based user experience outlined in Phase 2+ of the project roadmap.

## Core Components

### Prediction Interface
- **`ParimutuelPredictionMarket.tsx`**: Main prediction interface implementing pari-mutuel betting
  - Manages swipe-to-predict workflow
  - Handles transaction batching (20 swipes or 30s timeout)
  - Integrates with gasless ERC-4337 transactions
  - Connects to Supabase for real-time data

- **`SwipeStack.tsx`**: TikTok-style swipeable card component
  - Implements smooth swipe animations with Framer Motion
  - Handles left/right swipe gestures for YES/NO predictions
  - Provides visual feedback for bet placement
  - Responsive touch and mouse interaction support

### Navigation & Layout
- **`Home.tsx`**: Landing page and main navigation hub
  - Entry point for all app features
  - Quick access to predict, profile, leaderboard, create market
  - Display of user stats and recent activity

### User Features
- **`Profile.tsx`**: User dashboard and statistics
  - Win rate and profit/loss tracking
  - Prediction history with outcomes
  - Social profile integration (Farcaster, Twitter)
  - Achievement and badge display

- **`Leaderboard.tsx`**: Community rankings and competition
  - Multiple ranking categories (winnings, win rate, streaks)
  - Real-time updates via Supabase subscriptions
  - User search and filtering
  - Social sharing of achievements

### Market Creation
- **`CreateMarketEnhanced.tsx`**: Advanced market creation interface
  - Form validation and question templates
  - Category selection and tagging
  - End time configuration
  - Integration with ParimutuelMarketFactory contract

- **`CreateMarketOnchainKit.tsx`**: OnchainKit-based market creation (backup)
  - Alternative implementation using OnchainKit transaction components
  - Simplified UI for quick market creation

### Analytics & Data
- **`BettingPoolAnalytics.tsx`**: Market statistics and pool analysis
  - Real-time betting pool sizes (YES vs NO)
  - Potential payout calculations
  - Historical betting trends
  - Visual charts and graphs

### Social Features
- **`ShareButton.tsx`**: Social sharing functionality
  - Generate shareable links for markets
  - Open Graph image integration
  - Platform-specific sharing (Twitter, Farcaster, etc.)
  - Copy link functionality

- **`InfluencerAttribution.tsx`**: Influencer and creator attribution
  - Display market creators and influencers
  - Attribution tracking for social features
  - Creator profile linking

### Legacy/Backup
- **`PredictionMarket.tsx`**: Original prediction market component
  - General-purpose prediction interface
  - Supports both AMM and pari-mutuel backends

- **`PredictionMarket-AMM.tsx.backup`**: Original AMM-based implementation
  - Kept for reference and potential rollback
  - Complex share-based betting system
  - Dynamic pricing mechanisms

## Subdirectories

### `/cards`
Contains specialized card components for different types of predictions:
- Market prediction cards
- User profile cards
- Achievement cards
- Statistical display cards

### `/charts`
Analytics and visualization components:
- Betting pool distribution charts
- User performance charts
- Market trend visualizations
- Real-time data displays

## Key Integration Points

### Blockchain Integration
- **Contracts**: Components integrate with `ParimutuelPredictionMarket` and `ParimutuelMarketFactory`
- **Gasless Transactions**: ERC-4337 integration via OnchainKit Transaction components
- **Batching**: Multiple predictions batched into single transactions for gas efficiency

### Database Integration
- **Supabase**: Real-time subscriptions for live data updates
- **User Profiles**: Persistent user statistics and history
- **Market Data**: Off-chain market metadata and outcomes

### State Management
- **Zustand Store**: Global app state for user data, pending transactions, and UI state
- **Local State**: Component-level state for animations and interactions

## Design Patterns

### Responsive Design
- Mobile-first approach for swipe interactions
- Touch-optimized UI elements
- Progressive Web App (PWA) features

### Real-time Updates
- Supabase real-time subscriptions
- Optimistic UI updates
- Error handling and retry logic

### Transaction Management
- Pending state management
- Transaction status tracking
- Error recovery and user feedback

## Development Guidelines

### Component Structure
```typescript
interface ComponentProps {
  // Always include onBack for navigation
  onBack?: () => void;
  // Include any required data
  marketId?: string;
  userId?: string;
}
```

### Error Handling
- Components implement error boundaries
- Graceful fallbacks for network issues
- User-friendly error messages

### Performance
- Lazy loading for heavy components
- Memoization for expensive calculations
- Optimized re-renders with React.memo

## Future Enhancements

### Planned Components
- Advanced market analytics dashboard
- Social trading features
- Enhanced mobile gestures
- AR/VR prediction interfaces
- Cross-platform sharing widgets

### Optimization Areas
- Bundle size reduction
- Animation performance
- Real-time data efficiency
- Offline functionality support