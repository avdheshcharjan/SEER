# Smart Contract Market Mapping - Parallel Implementation Plan

## Overview
This plan outlines the implementation tasks for the smart contract market creation and mapping feature, organized for maximum parallel execution. Tasks are grouped by dependencies, allowing multiple agents to work simultaneously.

## Key Files to Read First
- `/Users/avuthegreat/Downloads/SEER-phase-11-share 2/.docs/plans/smart-contract-market-mapping/requirements.md` - Feature requirements
- `/Users/avuthegreat/Downloads/SEER-phase-11-share 2/.docs/plans/smart-contract-market-mapping/codebase-research.md` - Existing code patterns
- `/Users/avuthegreat/Downloads/SEER-phase-11-share 2/.docs/plans/smart-contract-market-mapping/shared.md` - Shared context and dependencies

## Implementation Tasks

### Batch 1: Independent Foundation Tasks (Can run in parallel)

#### Task 1.1: Admin Interface Page
**Type**: Frontend Development
**Dependencies**: None
**Files to create/modify**:
- Create `/app/admin/page.tsx` - Admin landing page with market creation form
- Use existing patterns from `/app/components/CreateMarketOnchainKit.tsx`
- Import types from `/lib/types.ts`

**Requirements**:
- Bulk text area for 10 market questions (one per line)
- "Create Markets" button
- Loading state during creation
- Success/error feedback

#### Task 1.2: Admin Market Creator Component
**Type**: Frontend Component
**Dependencies**: None
**Files to create/modify**:
- Create `/app/admin/components/MarketCreator.tsx` - Bulk market input form component
- Import blockchain utilities from `/lib/blockchain.ts`
- Use existing UI patterns from `/app/components/CreateMarketOnchainKit.tsx`

**Requirements**:
- Text area with placeholder showing example format
- Form validation (ensure 10 markets)
- Category selection or auto-categorization
- Submit button with loading states

#### Task 1.3: Contract Integration Service Extension
**Type**: Backend Service
**Dependencies**: None
**Files to create/modify**:
- Create `/lib/contract-integration.ts` - Smart contract integration service
- Extend patterns from `/lib/blockchain.ts` and `/lib/parimutuel-blockchain.ts`
- Use factory contract address: `0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C`

**Requirements**:
- Function to batch create 10 markets via factory
- Transaction generation with proper encoding
- Gas estimation for batch operations
- Event parsing for contract addresses

#### Task 1.4: Database Schema Updates
**Type**: Database
**Dependencies**: None
**Files to create/modify**:
- Update `/supabase-schema.sql` - Add sync job tables
- Create migration script

**New Tables**:
```sql
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index, chain_id)
);

CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES sync_jobs(id),
  final_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Batch 2: API and Event System (Can run after Batch 1 completes)

#### Task 2.1: Admin API Routes
**Type**: API Development
**Dependencies**: Task 1.1, Task 1.2, Task 1.3
**Files to create/modify**:
- Create `/app/api/admin/create-markets/route.ts` - Market creation API endpoint
- Import from `/lib/contract-integration.ts` (created in Task 1.3)
- Use `/lib/supabase.ts` for database operations

**Requirements**:
- POST endpoint accepting array of market questions
- Call contract integration service
- Parse events for contract addresses
- Save to database with contract addresses
- Return created markets with links

#### Task 2.2: Event Monitor Implementation
**Type**: Backend Service
**Dependencies**: Task 1.3, Task 1.4
**Files to create/modify**:
- Enhance `/lib/event-monitor.ts` - Real-time event monitoring service
- Use patterns from `/lib/contract-sync.ts`
- Import types from `/lib/types.ts`

**Requirements**:
- Monitor `MarketCreated` events from factory
- Process events with 6-block confirmation
- Queue sync jobs in database
- Handle reorgs and missed events
- Implement retry logic

#### Task 2.3: Supabase Edge Function
**Type**: Serverless Function
**Dependencies**: Task 1.4
**Files to create/modify**:
- Create `/supabase/functions/sync-events/index.ts` - Webhook receiver
- Create `/supabase/functions/sync-events/handler.ts` - Event processor

**Requirements**:
- Receive webhook POST requests
- Validate chain ID and signatures
- Queue events in sync_jobs table
- Return 200 OK immediately
- Handle duplicate events

### Batch 3: Worker Process and Integration (Can run after Batch 2 completes)

#### Task 3.1: Event Worker Process
**Type**: Backend Process
**Dependencies**: Task 2.2, Task 2.3
**Files to create/modify**:
- Enhance `/scripts/event-worker.ts` - Background job processor
- Use `/lib/event-monitor.ts` (from Task 2.2)
- Import database service from `/lib/supabase.ts`

**Requirements**:
- Poll sync_jobs table for pending jobs
- Process jobs with confirmation delays
- Update market contract addresses
- Handle failures with exponential backoff
- Move failed jobs to dead letter queue

#### Task 3.2: Admin Success Component
**Type**: Frontend Component
**Dependencies**: Task 2.1
**Files to create/modify**:
- Create `/app/admin/components/CreatedMarkets.tsx` - Success display component
- Import types from `/lib/types.ts`

**Requirements**:
- Display list of created markets
- Show contract addresses as links to Base Sepolia explorer
- Allow navigation back to creation form
- Show any failed markets

### Batch 4: Final Integration (Run after all previous batches)

#### Task 4.1: Update SwipeStack Integration
**Type**: Frontend Integration
**Dependencies**: All previous tasks
**Files to modify**:
- Update `/app/components/SwipeStack.tsx` - Ensure new markets appear
- Verify contract address validation works

**Requirements**:
- Confirm markets with contract addresses appear
- Test swipe functionality with new markets
- Verify filtering logic remains intact

#### Task 4.2: Add Admin Route to Main App
**Type**: Routing
**Dependencies**: Task 1.1
**Files to modify**:
- Update `/app/page.tsx` or routing configuration
- Add navigation to admin interface

**Requirements**:
- Add /admin route
- Ensure proper navigation
- Add link in appropriate location

## Testing Checklist
- [ ] Admin can enter 10 market questions
- [ ] Markets are created via factory contract
- [ ] Contract addresses are captured from events
- [ ] Database is updated with contract addresses
- [ ] New markets appear in swipe interface
- [ ] Users can bet on new markets
- [ ] Event monitoring captures all events
- [ ] Failed syncs are retried appropriately
- [ ] Type validation passes
- [ ] No breaking changes to existing functionality

## Success Criteria
- Admin can create 10 markets in one transaction
- Markets appear in swipe interface within 30 seconds
- All contract addresses are properly mapped
- Event sync has 99.9% accuracy
- User betting flow remains unchanged