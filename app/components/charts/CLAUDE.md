# Charts Directory - Data Visualization Components

## Overview
This directory contains chart and data visualization components for the TOMO prediction platform. These components provide visual insights into betting patterns, user performance, and market analytics supporting the pari-mutuel betting system.

## Chart Types

### Market Analytics
- **Pool Distribution Charts**: Visualize YES vs NO betting pools
- **Betting Timeline Charts**: Show betting activity over time
- **Odds Movement Charts**: Track implied probability changes
- **Volume Charts**: Display total betting volume and trends

### User Performance
- **Win Rate Charts**: User accuracy over time
- **Profit/Loss Charts**: Financial performance tracking
- **Streak Charts**: Consecutive wins/losses visualization
- **Activity Charts**: User engagement patterns

### Leaderboard Visualizations
- **Ranking Charts**: Top user performance comparisons
- **Category Breakdown**: Performance by prediction category
- **Trend Analysis**: Movement in rankings over time

## Technical Implementation

### Libraries Used
- **Chart.js / Recharts**: Primary charting library
- **D3.js**: Custom visualizations and complex interactions
- **Framer Motion**: Animation and transitions
- **React**: Component-based architecture

### Data Sources
- **Real-time Data**: Supabase subscriptions for live updates
- **Historical Data**: Aggregated statistics and trends
- **Blockchain Data**: On-chain transaction and outcome data

### Responsive Design
- Mobile-optimized chart layouts
- Touch-friendly interactions
- Adaptive sizing for different screen sizes
- Progressive enhancement for complex features

## Chart Components

### Core Visualization Components
```typescript
interface ChartProps {
  data: ChartData[];
  type: 'line' | 'bar' | 'pie' | 'area';
  realTime?: boolean;
  interactive?: boolean;
  theme?: 'light' | 'dark';
}
```

### Specialized Components
- **BettingPoolChart**: Real-time pool distribution
- **UserPerformanceChart**: Individual user analytics
- **MarketTrendChart**: Market behavior over time
- **LeaderboardChart**: Competitive rankings display

## Features

### Real-time Updates
- Live data streaming from Supabase
- Smooth transitions for data changes
- Optimized rendering for performance
- WebSocket integration for minimal latency

### Interactivity
- Hover tooltips with detailed information
- Click-through navigation to detailed views
- Zoom and pan capabilities for time series
- Export functionality for sharing

### Accessibility
- Screen reader compatible
- Keyboard navigation support
- High contrast mode support
- Alternative text descriptions

## Performance Considerations

### Optimization Strategies
- Data virtualization for large datasets
- Lazy loading for complex visualizations
- Memoization for expensive calculations
- Progressive rendering for smooth UX

### Memory Management
- Efficient data structures
- Cleanup of subscriptions and timers
- Optimized re-rendering patterns
- Resource cleanup on component unmount

## Integration Points

### App State
Charts integrate with Zustand store for global state management

### Database
Real-time subscriptions to Supabase for live data updates

### Blockchain
Direct integration with contract events for transaction data

## Future Enhancements

### Advanced Features
- Machine learning trend predictions
- Advanced statistical analysis
- Custom chart builder interface
- Export to external analytics tools

### User Experience
- Personalized chart configurations
- Saved chart templates
- Social sharing of insights
- Collaborative analytics features