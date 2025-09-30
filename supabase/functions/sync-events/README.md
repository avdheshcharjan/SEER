# Sync Events Edge Function

This Supabase Edge Function serves as a webhook endpoint for real-time blockchain event monitoring, specifically designed to capture and process `MarketCreated` events from the PredictionMarket factory contracts.

## Architecture

This function implements the webhook → Edge Function → job queue pattern described in `.docs/plans/SC-event-monitoring.txt`.

### Flow:
1. **Webhook Reception**: Accepts POST requests from blockchain providers (Alchemy, Infura, QuickNode)
2. **Event Validation**: Validates chain ID, event schema, and data integrity
3. **Event Processing**: Decodes MarketCreated events from factory contracts
4. **Job Queueing**: Enqueues sync jobs with idempotent keys in `sync_jobs` table
5. **Response**: Returns detailed processing results with appropriate HTTP status codes

## Key Features

### Security & Validation
- **Chain ID Verification**: Only accepts events from Base Sepolia (84532)
- **Contract Address Filtering**: Only processes events from known factory contracts
- **Event Schema Validation**: Validates transaction hashes, addresses, and event structure
- **Rate Limiting**: 100 requests per minute per IP address
- **Reorg Protection**: Filters out events marked as removed

### Factory Contract Support
- Supports both factory contract addresses:
  - `0x89332E711B591DEeAC1a67b4ED5086a209a7414E` (old)
  - `0xB788385cf679A69C43CfD9cB35045BBd4c2843f2` (new)

### Event Processing
- **MarketCreated Event Detection**: Uses proper keccak256 signature matching
- **ABI Decoding**: Extracts market address, creator, and metadata from event logs
- **Idempotent Enqueuing**: Uses `(job_type, chain_id, tx_hash, log_index)` as unique constraint

### Error Handling
- **Multi-Status Responses**: Returns 207 if some events failed, 200 if all succeeded
- **Detailed Error Reporting**: Provides specific error messages for each failed event
- **Graceful Degradation**: Continues processing other events even if some fail

## API Reference

### Endpoint
```
POST /functions/v1/sync-events
```

### Request Body
```typescript
interface WebhookPayload {
  events: WebhookEvent[];
  provider?: string;
  network?: string;
  timestamp?: string;
}

interface WebhookEvent {
  chain_id: number;
  transaction_hash: string;
  block_number: number;
  log_index: number;
  contract_address: string;
  topic0: string;
  topics: string[];
  data: string;
  removed?: boolean;
}
```

### Response Format
```typescript
interface WebhookResponse {
  message: string;
  summary: {
    total_events: number;
    processed: number;
    skipped: number;
    errors: number;
  };
  details: string[];
}
```

### HTTP Status Codes
- `200`: All events processed successfully
- `207`: Multi-Status - some events failed
- `400`: Invalid request format or missing data
- `405`: Method not allowed (only POST accepted)
- `429`: Rate limit exceeded
- `500`: Internal server error

## Environment Variables

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## Database Integration

### Tables Used
- **`sync_jobs`**: Queue for background processing
  - Idempotent insertion using unique constraint
  - Stores full event payload for worker processing
- **`contract_events`**: Raw event storage (via worker)
- **`markets`**: Final market data (via worker)

### Job Payload Structure
```typescript
{
  event: WebhookEvent,           // Original webhook event
  decoded: MarketCreatedEventData, // Decoded event data
  webhook_timestamp: string,      // When webhook was received
  provider: string               // Event provider name
}
```

## Rate Limiting

- **Window**: 1 minute rolling window
- **Limit**: 100 requests per IP address
- **Storage**: In-memory (for production, use Redis)
- **Headers**: Standard rate limiting response headers

## Monitoring & Logging

### Logs Include:
- Event processing statistics
- Validation failures with reasons
- Rate limiting events
- Database operation results
- Error details with context

### Metrics Tracked:
- Total events received per webhook
- Processing success/failure rates
- Skip reasons (wrong chain, contract, event type)
- Rate limit hits per IP

## Testing

### Local Testing
```bash
# Test with curl
curl -X POST http://localhost:54321/functions/v1/sync-events \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "chain_id": 84532,
      "transaction_hash": "0x123...",
      "block_number": 12345,
      "log_index": 0,
      "contract_address": "0x89332E711B591DEeAC1a67b4ED5086a209a7414E",
      "topic0": "0x627df7324a60c10d7af827d3b247a53b6a97e478e7772db76f8dc7704bcfed98",
      "topics": ["0x627df7324a60c10d7af827d3b247a53b6a97e478e7772db76f8dc7704bcfed98", "0x000000000000000000000000newMarketAddress", "0x000000000000000000000000creatorAddress"],
      "data": "0x..."
    }]
  }'
```

### Integration with Providers
Configure your blockchain provider (Alchemy, Infura, etc.) to send webhooks to:
```
https://your-project.supabase.co/functions/v1/sync-events
```

## Performance Considerations

- **Batching**: Processes multiple events in single request
- **Async Processing**: Uses background job queue for heavy operations
- **Memory Efficient**: Streams event processing without loading all into memory
- **Database Optimized**: Uses batch operations and proper indexing

## Error Recovery

- **Idempotent Operations**: Safe to retry webhook deliveries
- **Worker Healing**: Background worker can reprocess failed jobs
- **Manual Recovery**: Failed jobs can be requeued through admin interface
- **Provider Fallback**: Multiple providers can send same events safely

## Related Files

- `abi-decoder.ts`: ABI decoding utilities for MarketCreated events
- `deno.json`: Deno configuration for Edge Function environment
- `../../lib/supabase.ts`: Database types and service methods
- `../../lib/blockchain.ts`: Contract ABIs and addresses