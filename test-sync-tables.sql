-- Test script for sync_jobs and dead_letter_queue tables
-- This validates the new table structures work correctly

-- Test sync_jobs table
INSERT INTO sync_jobs (event_type, tx_hash, log_index, chain_id)
VALUES ('MarketCreated', '0x1234567890abcdef', 1, 84532);

-- Test dead_letter_queue table
INSERT INTO dead_letter_queue (job_id, final_error)
SELECT id, 'Test error message' FROM sync_jobs LIMIT 1;

-- Verify the unique constraint works
-- This should fail due to duplicate (tx_hash, log_index, chain_id)
-- INSERT INTO sync_jobs (event_type, tx_hash, log_index, chain_id)
-- VALUES ('MarketCreated', '0x1234567890abcdef', 1, 84532);

-- Test queries that will be used by the event monitor
SELECT id, event_type, status, retry_count, created_at
FROM sync_jobs
WHERE status = 'pending'
ORDER BY created_at;

-- Test dead letter queue lookup
SELECT dlq.id, dlq.final_error, sj.event_type, sj.tx_hash
FROM dead_letter_queue dlq
JOIN sync_jobs sj ON dlq.job_id = sj.id;

-- Cleanup test data
DELETE FROM dead_letter_queue WHERE final_error = 'Test error message';
DELETE FROM sync_jobs WHERE tx_hash = '0x1234567890abcdef';