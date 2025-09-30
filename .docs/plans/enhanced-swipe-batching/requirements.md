# Enhanced Swipe Batching for Gasless Transactions

## Overview

Fix and enhance the swipe-based prediction market system to ensure seamless TikTok-like doomscrolling experience where users can swipe through all available markets and execute all bets in optimally batched gasless transactions.

## Problem Statement

The current swiping mechanism fails to properly map swipes to their respective market smart contracts, causing batch transactions to fail. Additionally, the system creates excessive USDC approval transactions (2 calls per bet) and lacks intelligent batching for large transaction volumes.

**Current Issues:**
- Swipes don't map to correct market contracts due to `undefined` contract addresses
- Each bet requires individual USDC approval, creating 2x transaction overhead
- No intelligent batching for gas limit management
- Batch transactions fail when markets lack contract addresses

## User Experience Goals

### Target Experience: "TikTok-like Doomscrolling"
Users should be able to:
1. Swipe through all available market cards (50+ markets)
2. See immediate visual feedback for each swipe
3. Have all swipes automatically batched together
4. Confirm a single transaction containing all their bets
5. Experience zero gas fees (fully gasless)

### User Flow
```
Load Markets → Swipe Through Cards → Auto-batch (20 swipes OR 10s timeout) → Single Transaction Confirmation → All Bets Executed
```

**Swipe Actions:**
- **Right Swipe** → YES prediction on that market
- **Left Swipe** → NO prediction on that market
- **Up Swipe** → SKIP (ignored in batching)

## Technical Requirements

### 1. Fix Contract Address Mapping
**Problem:** `getMarketContractAddress()` in `lib/blockchain.ts` returns `undefined` for markets without contract addresses.

**Solution:**
- Fix missing return statement in fallback case
- Implement proper error handling for markets without contracts
- Ensure only markets with valid contract addresses are available for swiping

### 2. USDC Approval Optimization
**Current:** Each bet requires individual `approve(marketAddress, amount)` call
**New Approach:** Upfront bulk approval system

**Implementation:**
- Request 100 USDC approval upfront when user starts swiping
- Track remaining approval allowance across batch transactions
- Re-request approval when balance drops below minimum threshold
- Reduce transaction calls from 2-per-bet to 1-per-bet (50% reduction)

### 3. Smart Batching System
**Batching Rules:**
- **Maximum batch size:** 50 transactions per batch
- **Auto-execution triggers:** 20 swipes OR 10 seconds of inactivity
- **Gas limit handling:** Auto-split batches if estimated gas exceeds limits
- **Transaction structure:** Each bet = 1 call to market contract (no approval needed)

**Batch Processing:**
```typescript
// Before: 2 calls per bet
[USDC.approve(market1, amount), market1.betYes(amount), USDC.approve(market2, amount), market2.betNo(amount)]

// After: 1 upfront approval + 1 call per bet
[USDC.approve(batchProcessor, 100_USDC)] // Once upfront
[market1.betYes(amount), market2.betNo(amount), market3.betYes(amount)...] // Batch execution
```

### 4. Enhanced Error Handling
- Validate all market contracts before batching
- Graceful handling of markets without contract addresses
- User-friendly error messages for failed transactions
- Retry mechanism for network issues

## Technical Architecture

### Components to Modify

**1. Market Contract Resolution (`lib/blockchain.ts`)**
- Fix `getMarketContractAddress()` function return statement
- Add contract address validation
- Implement proper fallback handling

**2. Batch Transaction Generation (`lib/gasless-onchainkit.ts`)**
- Implement upfront USDC approval system
- Add intelligent batch splitting logic
- Optimize transaction call generation
- Add gas estimation and limit checking

**3. Swipe Processing (`app/components/PredictionMarket.tsx`)**
- Enhanced market address validation in batch processing
- Improved error handling for invalid markets
- Better user feedback for batching status

**4. Market Data Flow (`app/components/SwipeStack.tsx`)**
- Ensure proper market metadata passes to batching system
- Validate market has contract address before allowing swipes

### Infrastructure Requirements

**Existing (Keep):**
- OnchainKit + Coinbase Paymaster for gasless transactions
- Current batch timing (20 swipes OR 10s timeout)
- Base network integration
- Parimutuel market contracts

**New (Add):**
- Bulk USDC approval management
- Gas limit estimation and batch splitting
- Enhanced market contract validation
- Improved error handling and user feedback

## Success Criteria

### User Experience
- ✅ Users can swipe through all available markets without errors
- ✅ All swipes result in properly targeted smart contract calls
- ✅ Single transaction confirmation for entire batch
- ✅ Fully gasless experience maintained
- ✅ Smooth, uninterrupted swiping flow

### Technical
- ✅ 50% reduction in transaction calls via USDC approval optimization
- ✅ Support for batches up to 50 transactions
- ✅ Automatic batch splitting for gas limit management
- ✅ Zero failed transactions due to undefined contract addresses
- ✅ Proper error handling for edge cases

### Performance
- ✅ Batch processing completes within 30 seconds
- ✅ Gas estimation accuracy within 10% of actual usage
- ✅ Support for concurrent users without conflicts

## Edge Cases & Constraints

**Market Availability:**
- Only markets with deployed contracts are available for swiping
- Markets without contract addresses are filtered out
- Handle case where no valid markets are available

**Transaction Limits:**
- Maximum 50 transactions per batch (auto-split larger batches)
- Minimum 1 transaction per batch
- Handle gas limit exceeded scenarios

**USDC Allowance:**
- Track remaining allowance across multiple batches
- Handle insufficient USDC balance gracefully
- Re-request approval when needed

**Network Issues:**
- Retry failed transactions up to 3 times
- Graceful degradation when paymaster is unavailable
- Clear user communication for network problems

## Files to Modify

### Primary Files
- `/lib/blockchain.ts:163-185` - Fix getMarketContractAddress function
- `/app/components/PredictionMarket.tsx:133-260` - Enhanced batch processing
- `/lib/gasless-onchainkit.ts:46-87` - Smart batching and approval optimization
- `/app/components/SwipeStack.tsx:93-105` - Market data validation

### Supporting Files
- `/lib/supabase.ts` - Market contract address queries
- `/lib/store.ts` - USDC allowance tracking state
- `/contracts/src/ParimutuelPredictionMarket.sol` - Ensure gasless compatibility

### New Files (if needed)
- `/lib/batch-optimizer.ts` - Gas estimation and batch splitting logic
- `/lib/usdc-allowance.ts` - USDC approval management utilities

---

*This requirements document provides the foundation for implementing enhanced swipe batching that delivers a seamless TikTok-like prediction market experience with optimized gasless transactions.*