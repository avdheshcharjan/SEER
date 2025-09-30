# Smart Contract Market Creation and Mapping Feature

## Overview

This feature implements an end-to-end workflow for creating smart contract-based prediction markets through an admin interface, automatically mapping them to the database, and enabling users to place batched bets through the existing swipe interface.

## User Flows

### Admin Market Creation Flow
1. Admin navigates to `http://localhost:3000/admin`
2. Admin enters 10 market questions in bulk text input
3. Admin clicks "Create Markets" button
4. System deploys 10 smart contracts via factory contract
5. Real-time event monitoring automatically syncs contract addresses to database
6. Admin sees success page with list of created markets and their contract addresses
7. Markets are immediately available in user swipe interface

### User Betting Flow
1. User opens app and sees swipe stack with newly created markets
2. User swipes YES/NO on market cards (skipped markets are excluded)
3. System accumulates swipes in session batch
4. When 20 swipes reached OR 10 seconds of inactivity, batch executes
5. Single gasless transaction processes all bets using Coinbase Paymaster
6. User receives confirmation, database updates with bet records

## Functional Requirements

### Admin Interface (`/admin`)
- **Authentication**: Open access initially, password protection to be added later
- **Market Input**: Bulk text area for entering 10 market questions (one per line)
- **Market Creation**: Single "Create Markets" button to deploy all 10 contracts
- **Success Feedback**: Display list of created markets with contract addresses as hyperlinks to `https://sepolia.base.org/address/{address}`
- **Error Handling**: Show clear error messages for failed contract deployments

### Smart Contract Integration
- **Factory Contract**: Use existing factory at `0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C`
- **Market Parameters**:
  - 24-hour duration from creation time
  - Support for all existing categories (crypto, tech, celebrity, sports, politics)
  - Compatible with $1, $5, $10 USDC betting amounts
- **Contract Deployment**: Batch creation of 10 markets in single transaction

### Real-time Event Monitoring
- **Architecture**: Implement webhook-based system per `.docs/plans/SC-event-monitoring.txt`
- **Primary Ingestion**: Provider webhooks → Supabase Edge Function
- **Secondary Backup**: Polling-based backstop for missed events
- **Event Processing**: Monitor `MarketCreated` events from factory contract
- **Database Sync**: Automatic population of `markets` table with contract addresses

### Database Schema
- **Markets Table**: Utilize existing schema with `contract_address` field
- **Event Deduplication**: Implement unique constraints on `(tx_hash, log_index, chain_id)`
- **Job Queue**: Add `sync_jobs` table for reliable event processing
- **Error Tracking**: Log failed sync attempts with retry counters

### User Experience
- **Market Availability**: New markets appear immediately in swipe stack
- **Betting Interface**: Use existing swipe cards with YES/NO actions
- **Session Management**: Maintain current batching (20 swipes OR 10 seconds timeout)
- **Transaction Processing**: Continue gasless UX via Coinbase Paymaster
- **Betting Amounts**: User-selectable from profile (existing feature)

## Technical Requirements

### Real-time Sync Implementation
- **Webhook Endpoint**: Supabase Edge Function to receive provider notifications
- **Event Validation**: Verify chain ID, signature, and schema before processing
- **Job Queuing**: Enqueue sync jobs with idempotent keys
- **Worker Process**: Node.js worker to process jobs with confirmation delays
- **Retry Logic**: Exponential backoff with dead letter queue after 10 failures

### Error Handling & Reliability
- **Idempotent Operations**: All database writes use `ON CONFLICT DO NOTHING`
- **Confirmation Delays**: Wait 6 blocks before finalizing database records
- **Reorg Protection**: Polling backstop rewinds by 12 blocks to detect chain reorgs
- **Alert System**: Monitor dead jobs and stale pending jobs
- **Manual Recovery**: Admin interface to requeue failed jobs

### Performance Considerations
- **Batch Processing**: Maintain existing 50-transaction batch limits
- **Gas Optimization**: Continue bulk USDC approval patterns
- **Database Indexing**: Optimize queries on contract addresses and timestamps
- **Real-time Updates**: Use Supabase Realtime for instant UI updates

## Non-Functional Requirements

### Reliability
- **99.9% sync accuracy** for smart contract events to database
- **Sub-30 second latency** for new markets appearing in user interface
- **Zero data loss** during contract creation and mapping process

### Security
- **Address validation** for all contract addresses before database storage
- **Chain ID verification** for all incoming webhook events
- **Input sanitization** for admin-provided market questions
- **Rate limiting** on admin market creation endpoint

### Scalability
- **Support 100+ markets** in single admin creation session
- **Handle 1000+ concurrent users** betting on new markets
- **Process 10,000+ batched transactions** per hour during peak usage

## Assumptions and Constraints

### Technical Assumptions
- **Existing Infrastructure**: Factory contract, database schema, and batching system are production-ready
- **Network Stability**: Base Sepolia testnet provides reliable event emission
- **Provider Reliability**: Webhook providers (Alchemy/Infura) have 99%+ uptime
- **Gas Sponsorship**: Coinbase Paymaster continues supporting gasless transactions

### Business Constraints
- **Testing Purpose**: Feature primarily for validating swipe-to-bet functionality
- **Fixed Parameters**: 24-hour market duration and standardized betting amounts
- **Breaking Changes Acceptable**: Pre-production environment allows UX modifications
- **Manual Oversight**: Admin can intervene in failed sync scenarios

### User Constraints
- **Market Volume**: Maximum 10 markets per admin creation session
- **Betting Limits**: Users bound by existing USDC allowance and balance limits
- **Session Timeouts**: 10-second inactivity triggers automatic batch execution
- **Mobile-First**: Interface optimized for mobile swipe interactions

## Files Involved

### Smart Contracts
- `/contracts/src/ParimutuelMarketFactory.sol` - Factory contract for market creation
- `/contracts/src/ParimutuelPredictionMarket.sol` - Individual market contract template
- `/contracts/script/CreateMarkets.s.sol` - Deployment script (reference for admin logic)

### Frontend Components
- `/app/page.tsx` - Main app routing (add admin route)
- `/app/components/PredictionMarket.tsx` - Core betting interface
- `/app/components/SwipeStack.tsx` - Card swipe mechanics
- `/app/components/ParimutuelPredictionMarket.tsx` - Parimutuel-specific UI

### Backend Services
- `/lib/blockchain.ts` - Contract interaction utilities
- `/lib/supabase.ts` - Database service layer
- `/lib/batch-optimizer.ts` - Transaction batching logic
- `/lib/store.ts` - Global state management

### Event Monitoring (New)
- `/lib/event-monitor.ts` - Real-time sync implementation
- `/supabase/functions/sync-events/` - Edge function for webhook processing
- `/scripts/event-worker.ts` - Background job processor
- `/scripts/sync-contract-markets.ts` - Existing sync script (reference)

### Admin Interface (New)
- `/app/admin/page.tsx` - Admin market creation interface
- `/app/admin/components/MarketCreator.tsx` - Bulk market input form
- `/app/admin/components/CreatedMarkets.tsx` - Success page with contract links