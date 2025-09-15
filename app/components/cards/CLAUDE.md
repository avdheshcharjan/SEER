# Cards Directory - UI Card Components

## Overview
This directory contains specialized card components used throughout the TOMO prediction platform. These cards are designed for the swipe-based interface and various display contexts in the pari-mutuel betting system.

## Component Types

### Prediction Cards
Card components optimized for swipe interactions and betting interface:
- **Market Cards**: Display prediction questions with betting options
- **Swipe Cards**: Interactive cards with gesture support for YES/NO predictions
- **Result Cards**: Show market outcomes and winnings

### Profile Cards
User-focused card components:
- **User Profile Cards**: Display user statistics and achievements
- **Achievement Cards**: Showcase badges and milestones
- **History Cards**: Show prediction history and results

### Analytics Cards
Data visualization cards:
- **Stats Cards**: Compact statistical displays
- **Trend Cards**: Market and user performance trends
- **Pool Cards**: Betting pool size and distribution

## Design System

### Card Structure
```typescript
interface CardProps {
  variant?: 'default' | 'compact' | 'detailed';
  interactive?: boolean;
  swipeable?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}
```

### Styling Conventions
- Consistent border radius and shadows
- Responsive spacing and typography
- Theme-aware color schemes
- Smooth hover and interaction states

### Animation Support
- Framer Motion integration for smooth transitions
- Swipe gesture animations
- Loading and success state animations
- Micro-interactions for user feedback

## Integration Points

### Swipe System
Cards integrate with the main SwipeStack component for gesture handling

### Data Sources
- Real-time market data from Supabase
- User statistics from app store
- Blockchain data for betting states

### Navigation
Cards support deep linking and navigation between app views

## Future Enhancements
- Enhanced accessibility features
- Advanced animation patterns
- Customizable themes
- Offline data display support