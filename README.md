# BASED - Mobile-Optimized Prediction Markets

A swipe-based prediction market application built on the Base network with mobile-first design, especially optimized for iPhones and mobile devices.

## 🚀 Features

- **Mobile-First Design**: Optimized for mobile devices with responsive layouts
- **iPhone Optimizations**: Safe area handling, iOS-specific improvements
- **Touch-Friendly Interface**: Optimized touch targets and swipe interactions
- **Swipe-Based Predictions**: Tinder-like interface for making predictions
- **Gasless Transactions**: Powered by OnchainKit for seamless UX
- **Multiple Categories**: Crypto, Tech, Celebrity, Sports, and Politics
- **Real-time Updates**: Live market data and prediction tracking
- **PWA Support**: Installable as a mobile app

## 📱 Mobile Optimizations

### iPhone-Specific Features
- Safe area insets for notch and home indicator
- iOS momentum scrolling
- Touch-friendly button sizes (44px minimum)
- Optimized typography for mobile screens
- Landscape mode support

### Mobile-First Design
- Responsive breakpoints starting from mobile
- Touch-optimized interactions
- Mobile-optimized card layouts
- Swipe gestures for navigation
- Mobile-friendly navigation patterns

### Performance Optimizations
- Optimized bundle splitting
- Mobile-first CSS architecture
- Touch event optimizations
- Reduced motion support
- High contrast mode support

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Mobile**: Progressive Web App (PWA), Mobile-first CSS
- **Blockchain**: Base Network, OnchainKit
- **Styling**: Tailwind CSS with custom mobile utilities
- **Animations**: Framer Motion with mobile optimizations
- **State Management**: Zustand with mobile-friendly patterns

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Base Sepolia testnet wallet

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/based-prediction-markets.git
cd based-prediction-markets
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Fill in your environment variables:
```env
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=BASED
NEXT_PUBLIC_APP_HERO_IMAGE=http://localhost:3000/hero.png
NEXT_PUBLIC_SPLASH_IMAGE=http://localhost:3000/splash.png
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=#0f172a
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
```

5. **Open in your browser**
```
http://localhost:3000
```

## 📱 Mobile Development

### Mobile-First Approach
The application is built with a mobile-first approach, ensuring optimal performance and user experience on mobile devices.

### Responsive Breakpoints
- `xs`: 475px+ (Mobile landscape)
- `sm`: 640px+ (Large mobile)
- `md`: 768px+ (Tablet)
- `lg`: 1024px+ (Desktop)
- `xl`: 1280px+ (Large desktop)

### Mobile Utilities
The app includes custom mobile utility classes:
- `.mobile-container`: Responsive container
- `.mobile-text-*`: Typography scale
- `.mobile-spacing-*`: Spacing utilities
- `.ios-button`: iOS-optimized buttons
- `.safe-area-padding`: Safe area handling

## 🎨 Customization

### Mobile Theme
Customize mobile appearance in `app/theme.css`:
```css
/* Mobile-specific variables */
:root {
  --mobile-primary: #3b82f6;
  --mobile-secondary: #64748b;
  --mobile-background: #0f172a;
}
```

### Tailwind Configuration
Extend mobile utilities in `tailwind.config.ts`:
```typescript
theme: {
  extend: {
    screens: {
      'xs': '475px',
      // ... more breakpoints
    },
    minHeight: {
      '44': '11rem', // Touch target size
    }
  }
}
```

## 📱 PWA Features

### Installation
Users can install the app on their mobile devices:
- **iOS**: Use Safari's "Add to Home Screen"
- **Android**: Use Chrome's "Install App"

### Offline Support
- Service worker for offline functionality
- Cached assets for better performance
- Offline fallback pages

## 🧪 Testing

### Mobile Testing
```bash
# Test mobile responsiveness
npm run build
npm run start
```

### Device Testing
- Test on actual mobile devices
- Use browser dev tools mobile emulation
- Test different screen sizes and orientations

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Other Platforms
```bash
npm run build
# Deploy the 'out' directory
```

## 📱 Mobile Performance

### Lighthouse Scores
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

### Mobile Optimizations
- Optimized images and assets
- Efficient bundle splitting
- Touch event optimizations
- Reduced motion support
- High contrast mode

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with mobile-first approach
4. Test on mobile devices
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Base Network for blockchain infrastructure
- OnchainKit for gasless transactions
- Tailwind CSS for mobile-first styling
- Framer Motion for mobile animations

## 📞 Support

For mobile-specific issues or questions:
- Create an issue with "mobile" label
- Test on actual mobile devices
- Include device and browser information

---

**Built with ❤️ for mobile-first prediction markets**
