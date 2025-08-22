# CLAUDE_TASKS.md

## 🚀 MVP Task Breakdown - 72 Hour Sprint

### Overview
Building the most barebones functional prediction market miniapp that demonstrates core swipe mechanics and basic market functionality. Focus on demo-ability over production readiness.

---

## Phase 1: Smart Contracts (12 hours)
*Deploy on Base Sepolia using Foundry*

### Task 1.1: SimplePredictionMarket.sol (4 hours)
**Priority: CRITICAL**
```solidity
// Minimal implementation - single contract, no factory pattern
contract SimplePredictionMarket {
    mapping(address => uint256) yesShares;
    mapping(address => uint256) noShares;
    uint256 yesPool;
    uint256 noPool;
    string public question;
    uint256 public endTime;
    bool public resolved;
    bool public outcome;
}
```
- [ ] Basic buy/sell functions with hardcoded pricing
- [ ] Manual resolution function (no oracle for MVP)
- [ ] USDC integration on Base Sepolia
- [ ] Deploy script for Base Sepolia

### Task 1.2: Mock USDC Setup (2 hours)
**Priority: HIGH**
- [ ] Deploy mock USDC on Base Sepolia
- [ ] Create faucet function for demo purposes
- [ ] Test transactions with mock USDC

### Task 1.3: Basic Testing & Deployment (6 hours)
**Priority: HIGH**
- [ ] Write 5 critical test cases in Foundry
- [ ] Deploy to Base Sepolia
- [ ] Verify contracts on Basescan
- [ ] Document contract addresses

**Deliverables:**
- Single smart contract deployed on Base Sepolia
- Contract address and ABI for frontend integration
- 1000 mock USDC minted for testing

---

## Phase 2: Core Frontend (24 hours)
*Next.js 14 with TypeScript*

### Task 2.1: Project Setup (2 hours)
**Priority: CRITICAL**
```bash
npx create-next-app@latest based-prediction --typescript --tailwind --app
cd based-prediction
npm install @coinbase/onchainkit wagmi viem framer-motion
```
- [ ] Configure OnchainKit provider
- [ ] Setup Base Sepolia chain config
- [ ] Environment variables (.env.local)

### Task 2.2: Swipe Interface Component (8 hours)
**Priority: CRITICAL**
```typescript
// components/SwipeStack.tsx
// Use framer-motion for gestures
```
- [ ] Basic card stack with 3 hardcoded markets
- [ ] Swipe right = YES (green overlay)
- [ ] Swipe left = NO (red overlay)  
- [ ] Swipe up = SKIP
- [ ] Basic spring animations

### Task 2.3: Wallet Connection (4 hours)
**Priority: CRITICAL**
- [ ] OnchainKit wallet button
- [ ] Connect to Base Sepolia
- [ ] Display user address and balance
- [ ] Auto-switch network if needed

### Task 2.4: Transaction Modal (6 hours)
**Priority: HIGH**
```typescript
// components/BuyModal.tsx
// Fixed amount: 10 USDC per prediction
```
- [ ] Simple modal with YES/NO selection
- [ ] Fixed 10 USDC amount (no input field)
- [ ] Transaction status display
- [ ] Success/error toast notifications

### Task 2.5: Basic Market Display (4 hours)
**Priority: MEDIUM**
- [ ] Card design with question text
- [ ] YES/NO percentage display (mock data)
- [ ] Time remaining countdown
- [ ] Category badge

**Deliverables:**
- Functional swipe interface
- Wallet connection working
- Can send transactions to contract

---

## Phase 3: Market Creation Flow (12 hours)
*Simplified creator experience*

### Task 3.1: Creation Form (6 hours)
**Priority: HIGH**
```typescript
// components/CreateMarket.tsx
// Simple form, no chatbot
```
- [ ] Basic form with 4 fields:
  - Ticker (dropdown: ETH, BTC, BASE)
  - Price (number input)
  - Direction (toggle: above/below)
  - End date (date picker, min 24h)
- [ ] Generate question string
- [ ] Preview card before creation

### Task 3.2: Deploy Market Transaction (4 hours)
**Priority: HIGH**
- [ ] Call contract creation function
- [ ] Handle transaction states
- [ ] Show success with market ID
- [ ] Add to local storage (no backend DB)

### Task 3.3: Creator Dashboard (2 hours)
**Priority: LOW**
- [ ] List created markets from local storage
- [ ] Show basic stats (mock data)
- [ ] Link to share on Farcaster

**Deliverables:**
- Can create new markets
- Markets stored in local storage
- Basic creator view

---

#Phase 4: TBA Creator Studio Integration (8 hours)
MiniKit integration for Base App Creator Studio
Task 4.1: MiniKit Setup & Provider Configuration (2 hours)
Priority: CRITICAL
typescript// app/providers.tsx - MiniKit provider setup
// app/layout.tsx - Mini app metadata configuration

 Install and configure @coinbase/onchainkit with MiniKit
 Setup MiniKitProvider with CDP API key and Base chain
 Configure mini app metadata in layout.tsx with fc:miniapp tags
 Initialize frame SDK and handle setFrameReady() lifecycle

Task 4.2: Farcaster Manifest & Creator Studio Registration (2 hours)
Priority: CRITICAL
typescript// public/.well-known/farcaster.json - Manifest for TBA
// public/manifest.json - PWA manifest

 Create farcaster.json with creatorStudio configuration ### CREATORSTUDIO CONFIGURATION IS NOT DEVELOPER-READY YET ###
 Add tool metadata (name: "Create a prediction", icon, category)
 Configure permissions for composer and wallet access
 Design and add 192x192 icon for Creator Studio display

Task 4.3: Streamlined Creation Flow from Composer (2.5 hours)
Priority: HIGH
typescript// app/create/page.tsx - Entry point from Creator Studio
// components/QuickPredictionForm.tsx - Single-screen form

 Build compact creation form optimized for mobile viewport
 Implement ticker selection (ETH, BTC, BASE) with price input
 Add above/below toggle and date picker (min 24h future)
 Handle market deployment and return embed URL to composer

Task 4.4: Composer Return Flow & Embed Rendering (1 hour)
Priority: HIGH
typescript// lib/composer.ts - Handle return to TBA composer
// app/market/[id]/page.tsx - Embedded vs full market view

 Implement sdk.actions.close() with returnValue for composer
 Create compact embed view for in-feed display (3:2 ratio)
 Add "Place Prediction" button that opens full mini app
 Handle isEmbedded detection for view switching

Task 4.5: Testing & TBA Compatibility Verification (0.5 hours)
Priority: CRITICAL
bash# Deployment and testing checklist

 Deploy to Vercel with public HTTPS URL
 Verify manifest serves at /.well-known/farcaster.json
 Test complete flow: Creator Studio → Create → Return → Embed
 Validate safe area insets and mobile responsiveness

Deliverables:

"Create a prediction" tool appears in TBA Creator Studio
Seamless market creation in <30 seconds
Embedded predictions render in social feed
Full mini app launches when embed is tapped

## Phase 5: Data & State Management (8 hours)
*Simplified data layer*

### Task 5.1: Local Storage Layer (4 hours)
**Priority: HIGH**
```typescript
// lib/storage.ts
// Use localStorage for all data
```
- [ ] Store user predictions
- [ ] Store created markets
- [ ] Cache market states
- [ ] Simple position tracking

### Task 5.2: Mock Data Generator (2 hours)
**Priority: HIGH**
```typescript
// lib/mockData.ts
```
- [ ] Generate 20 sample markets
- [ ] Random prices/volumes
- [ ] Trending topics
- [ ] Recent activity feed

### Task 5.3: Basic State Management (2 hours)
**Priority: MEDIUM**
- [ ] Zustand store for app state
- [ ] Wallet state management
- [ ] Current market in view
- [ ] User positions

**Deliverables:**
- Persistent local data
- 20 demo markets ready
- State management working

---

## Phase 6: Polish & Demo Prep (8 hours)

### Task 6.1: Landing Page (2 hours)
**Priority: MEDIUM**
- [ ] Simple hero section
- [ ] "Start Swiping" CTA
- [ ] 3 feature highlights
- [ ] Link to demo video

### Task 6.2: Mobile Optimization (3 hours)
**Priority: HIGH**
- [ ] Test on mobile browsers
- [ ] Fix touch gestures
- [ ] Responsive breakpoints
- [ ] PWA manifest

### Task 6.3: Demo Flow (3 hours)
**Priority: CRITICAL**
- [ ] Seed data for demo
- [ ] Test wallet with funds
- [ ] 5-minute demo script
- [ ] Backup video recording

**Deliverables:**
- Polished landing page
- Mobile-ready app
- Demo script and assets

---

## 🎯 Critical Path (Must Have for Demo)

### Day 1 (0-24h)
1. ✅ Smart contract deployed
2. ✅ Basic swipe interface working
3. ✅ Wallet connection functional

### Day 2 (24-48h)  
4. ✅ Can buy shares (YES/NO)
5. ✅ Market creation form
6. ✅ 20 demo markets loaded

### Day 3 (48-72h)
7. ✅ Frame sharing works
8. ✅ Mobile responsive
9. ✅ Demo recording ready

---

## 🚫 Out of Scope for MVP

### Smart Contracts
- ❌ Factory pattern
- ❌ Oracle integration  
- ❌ Automated resolution
- ❌ Complex AMM pricing
- ❌ Liquidity pools

### Frontend
- ❌ Real-time price updates
- ❌ WebSocket connections
- ❌ Complex animations
- ❌ User profiles
- ❌ Search/filter
- ❌ Leaderboards

### Backend
- ❌ Database (using localStorage)
- ❌ API server (static only)
- ❌ User authentication
- ❌ Email notifications
- ❌ Analytics

### Advanced Features
- ❌ Multiple categories
- ❌ Market comments
- ❌ Trading history
- ❌ Portfolio analytics
- ❌ Referral system

---

## 📦 Tech Stack (Minimal)

### Smart Contracts
```bash
forge init
forge install OpenZeppelin/openzeppelin-contracts
```

### Frontend
```json
{
  "dependencies": {
    "next": "14.x",
    "@coinbase/onchainkit": "latest",
    "wagmi": "2.x",
    "viem": "2.x",
    "framer-motion": "11.x",
    "zustand": "4.x",
    "react-hot-toast": "2.x"
  }
}
```

### Environment Variables
```env
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MOCK_USDC=0x...
```

---

## 🏃 Quick Start Commands

```bash
# Smart Contracts
cd contracts
forge build
forge test
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast

# Frontend
cd app
npm install
npm run dev

# Deploy to Vercel
vercel --prod
```

---

## 📊 Success Metrics for Demo

### Minimum Viable Demo
- [ ] Create 1 market live
- [ ] Make 3 predictions (swipes)
- [ ] Show 1 frame on Farcaster
- [ ] Complete flow in <2 minutes

### Nice to Have
- [ ] 5+ test users tried it
- [ ] 10+ markets created
- [ ] Mobile demo works
- [ ] No critical bugs during demo

---

## 🚨 Risk Mitigation

### Backup Plans
1. **If contracts fail**: Use mock contracts with hardcoded responses
2. **If swipe breaks**: Add button fallbacks for YES/NO
3. **If wallet fails**: Demo with pre-recorded video
4. **If frame fails**: Share direct links instead

### Demo Insurance
- Record demo video in advance
- Deploy to multiple URLs
- Have local version ready
- Test wallet with funds prepared

---

## 📝 Final Checklist (Hour 71)

- [ ] Contracts verified on Basescan
- [ ] App deployed on Vercel
- [ ] Demo wallet funded
- [ ] Frame link tested
- [ ] Mobile tested
- [ ] Demo script rehearsed
- [ ] Backup video ready
- [ ] Team aligned on talking points

---

## 🎪 Demo Script (5 minutes)

### Minute 1: Problem & Solution
"Current prediction markets are complex. We built Tinder for predictions."

### Minute 2: User Flow
- Open app → Connect wallet → Start swiping
- Swipe right on "ETH >$4000" → Confirm 10 USDC

### Minute 3: Creation Flow  
- Click create → Fill form → Deploy market
- Share to Farcaster → Show frame

### Minute 4: Social Integration
- Click frame → Opens market → Make prediction
- Show portfolio view

### Minute 5: Vision & Ask
- "Expanding to 1000 markets"
- "Adding automated resolution"
- "Ask for feedback"

---

## 💡 Remember

**"Done is better than perfect"**

Focus on:
1. **It works** (doesn't crash)
2. **It's simple** (grandma can use it)
3. **It's fun** (people want to try)

Ship fast, iterate later! 🚀