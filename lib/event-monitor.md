# Event Monitor System

The Event Monitor provides a robust backup polling system for smart contract events, ensuring no events are missed even if the primary webhook system fails.

## Architecture

This system implements the backup polling approach recommended in `.docs/plans/SC-event-monitoring.txt`:

- **Primary**: Webhook-based ingestion (faster, real-time)
- **Secondary**: Polling-based backup (reliable, self-healing)

## Features

### Core Functionality
- **Block Range Scanning**: Processes blockchain in 1000-block chunks to avoid RPC limits
- **Reorg Protection**: Rewinds 12 blocks on each scan to detect chain reorganizations
- **Checkpoint Management**: Tracks last processed block in database
- **Job Queue Integration**: Enqueues missed events in `sync_jobs` table for processing
- **Idempotent Operations**: Safe to run multiple times without duplicating data

### Monitoring Modes
1. **One-time Sync**: Catch up on missed events once
2. **Continuous Monitoring**: Periodic polling every 30 seconds
3. **Force Resync**: Emergency recovery from specific block
4. **Health Monitoring**: Queue statistics and dead job detection

## Usage

### Command Line Interface

```bash
# One-time sync to catch up
npm run event-monitor --sync-once

# Start continuous monitoring
npm run event-monitor --monitor

# Check queue health
npm run event-monitor --health

# Requeue failed jobs
npm run event-monitor --requeue

# Show help
npm run event-monitor --help
```

### Programmatic Usage

```typescript
import {
  EventMonitor,
  startEventMonitoring,
  stopEventMonitoring,
  performOneTimeEventSync,
  getEventQueueHealth
} from '../lib/event-monitor';

// One-time sync
await performOneTimeEventSync();

// Start continuous monitoring
await startEventMonitoring();

// Check health
const health = await getEventQueueHealth();
console.log('Queue status:', health);

// Stop monitoring
stopEventMonitoring();
```

## Database Schema

### Required Tables

The system uses these existing tables:

```sql
-- Job queue for reliable processing
sync_jobs (
  id, job_type, chain_id, tx_hash, log_index,
  retries, payload, status, created_at
)

-- Event deduplication
contract_events (
  chain_id, contract_address, topic0, tx_hash,
  log_index, block_number, payload, created_at
)

-- Checkpoint tracking (auto-created)
sync_checkpoints (
  key, chain_id, last_processed_block, updated_at
)
```

### Event Processing Flow

1. **Event Detection**: Scan blockchain for `MarketCreated` events
2. **Job Enqueueing**: Add events to `sync_jobs` table with idempotent keys
3. **Worker Processing**: Background worker processes jobs and updates database
4. **Checkpoint Update**: Track progress to avoid re-scanning blocks

## Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optional (RPC endpoints)
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=your-primary-rpc
ALCHEMY_API_KEY=your-alchemy-key
INFURA_PROJECT_ID=your-infura-key
```

### Constants

```typescript
// Chain configuration
CHAIN_ID = 84532 (Base Sepolia)
FACTORY_ADDRESS = '0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C'

// Safety parameters
REORG_SAFETY_BLOCKS = 12    // Rewind blocks for reorg protection
MAX_BLOCK_RANGE = 1000      // Process chunks to avoid RPC limits
POLLING_INTERVAL_MS = 30000 // 30 seconds between polls
```

## Error Handling

### Reorg Protection
- Rewinds 12 blocks on each scan
- Compares previously processed events
- Marks reorged events appropriately

### RPC Reliability
- Multiple fallback RPC endpoints
- Graceful handling of network failures
- Continues processing if individual chunks fail

### Job Queue Safety
- Idempotent job enqueueing (no duplicates)
- Retry logic with exponential backoff
- Dead letter queue for failed jobs
- Manual recovery options

## Monitoring & Alerts

### Queue Health Metrics
```typescript
{
  pending: 5,     // Jobs waiting to process
  processing: 2,  // Jobs currently being processed
  dead: 0,        // Failed jobs needing attention
  total: 7        // Total jobs in queue
}
```

### Alert Conditions
- **Dead jobs > 0**: Failed processing requiring intervention
- **Pending > 100**: Large backlog indicating processing issues
- **Processing > 10**: Possible worker congestion

### Recovery Procedures

#### Queue Backlog
```bash
# Check health
npm run event-monitor --health

# Requeue failed jobs
npm run event-monitor --requeue
```

#### Missing Events
```bash
# Force resync from specific block
npm run event-monitor
# Then call forceEventResync(blockNumber) programmatically
```

## Integration with Existing System

### Relationship to Other Components
- **ContractSyncService**: Uses similar patterns for event processing
- **sync-contract-markets.ts**: Reference implementation for event scanning
- **viem-client.ts**: Shared RPC client configuration
- **Webhook System**: Primary event ingestion (this is backup)

### Deployment Checklist
1. ✅ Database tables exist (`sync_jobs`, `contract_events`)
2. ✅ Environment variables configured
3. ✅ RPC endpoints accessible
4. ✅ Factory contract address correct
5. ✅ Worker process running to consume jobs
6. ✅ Monitoring alerts configured

## Performance Considerations

### Block Scanning
- **Chunk Size**: 1000 blocks per RPC call (configurable)
- **Rate Limiting**: Built-in delays between chunks
- **Memory Usage**: Processes chunks sequentially to avoid memory issues

### Database Impact
- **Batch Operations**: Upserts events in batches
- **Indexing**: Relies on existing indexes for performance
- **Connection Pooling**: Uses Supabase client connection management

### Cost Optimization
- **Checkpoint Tracking**: Avoids re-scanning old blocks
- **RPC Efficiency**: Minimal calls by processing ranges
- **Event Filtering**: Only processes relevant contract events

This event monitor provides a robust safety net ensuring no smart contract events are missed, complementing the primary webhook system with reliable blockchain polling.