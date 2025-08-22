🔮 Prediction Market Mini-App called BASED
A Tinder-like swipe-based prediction market built for Farcaster and Base as a mini-app, featuring frictionless social login and embedded crypto wallets.

🎯 Features Built
✅ Core Functionality
Swipe-based UI: Tinder-like interface for making predictions
👉 Swipe Right = YES prediction
👈 Swipe Left = NO prediction
👆 Swipe Up = SKIP market
Profile Page: User can see their prediction history and the total amount of USDC they have spent on the prediction market.
Leaderboard: User can see the leaderboard of the prediction market and their onchain history of correct and incorrect predictions.

Real-time animations using Framer Motion and React Spring
Toast notifications for user feedback
State management with Zustand store
✅ Integration Features
OnchainKit Integration: Embedded wallet with Base blockchain
MiniKit Support: Native Farcaster mini-app functionality
Frictionless Auth: Uses existing Farcaster identity
Redis Storage: Persistent data for markets and predictions
✅ UI/UX Components
PredictionCard: Beautiful gradient cards with market info
SwipeStack: Gesture-based card stack with smooth animations
PredictionMarket: Main prediction interface component
Responsive design optimized for mobile
✅ API Infrastructure
/api/markets: CRUD operations for prediction markets
/api/predictions: User prediction management
Redis-based data persistence
RESTful API design
🎮 How to Use
Connect Wallet: Use the built-in OnchainKit wallet connection
Start Predicting: Click "Start Predicting" from the home screen
Swipe to Predict:
Swipe right for YES predictions
Swipe left for NO predictions
Swipe up to skip markets

Every swipe should be recorded on the BASE blockchain using the OnchainKit as a transaction on the BASE Sepolia testnet and the user should be able to see the prediction history when they click on their profile. Each swipe is worth of $1 USDC. 

Get Feedback: Toast notifications confirm your predictions
🏗️ Architecture
📱 Prediction Market Mini-App
├── 🎴 Swipe Interface (Tinder-like UX)
├── 🔐 Frictionless Auth (Farcaster + OnchainKit)
├── 💰 Embedded Wallet (Base blockchain)
├── 📊 Prediction Markets (Mock data + Redis)
├── 🏆 Real-time Feedback (Toast notifications)
└── 🔔 State Management (Zustand store)
🚀 Tech Stack
Frontend: Next.js 15, TypeScript, Tailwind CSS
Animations: Framer Motion, React Spring, @use-gesture/react
Blockchain: OnchainKit, MiniKit, Base, Wagmi, Viem
State: Zustand, React Query
Storage: Upstash Redis
Notifications: React Hot Toast
📝 Sample Markets
The app includes 4 sample prediction market but create atleast 100 markets for the prediction market. The prediction market should be based on the current events and latest news. Few of the folllowing are the sample cards:

"Will ETH reach $4,000 by end of 2024?" (Crypto)
"Will Farcaster reach 1M daily active users?" (Social)
"Will Base TVL exceed $10B in 2024?" (DeFi)
"Will Bitcoin reach new ATH in 2024?" (Crypto)

There should 5 categories of prediction markets:
1. Crypto
2. Tech
3. Celebrities