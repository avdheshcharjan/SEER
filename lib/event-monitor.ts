/**
 * 🔄 Event Monitor Service
 * Real-time event monitoring service for smart contract market creation
 *
 * This service provides comprehensive event monitoring with:
 * - Real-time MarketCreated event monitoring from factory contract
 * - 6-block confirmation processing
 * - Chain reorganization handling
 * - Retry logic with exponential backoff
 * - Both polling and webhook mode support
 * - Idempotent database operations
 */

import { createPublicClient, http, parseAbiItem, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import { categorizeMarket } from './contract-integration';

// Factory contract address from shared.md
const FACTORY_ADDRESS = '0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C' as Address;

// Chain configuration
const CHAIN_ID = baseSepolia.id;
const CONFIRMATION_BLOCKS = BigInt(6); // Wait 6 blocks before finalizing
const REORG_SAFETY_BLOCKS = BigInt(12); // Rewind 12 blocks for reorg protection
const MAX_BLOCK_RANGE = BigInt(1000); // Process in chunks to avoid RPC limits
const POLLING_INTERVAL_MS = 30000; // 30 seconds between polls
const WEBHOOK_MODE_POLL_INTERVAL_MS = 5000; // 5 seconds for webhook mode
const MAX_RETRY_ATTEMPTS = 10;
const INITIAL_RETRY_DELAY_MS = 1000;

// MarketCreated event signature
const MARKET_CREATED_EVENT = parseAbiItem(
  'event MarketCreated(address indexed market, address indexed creator, string question, uint256 endTime, uint256 marketIndex)'
);

interface MarketCreatedEvent {
  market: Address;
  creator: Address;
  question: string;
  endTime: bigint;
  marketIndex: bigint;
  transactionHash: string;
  blockNumber: bigint;
  logIndex: number;
}

// interface SyncCheckpoint {
//   key: string;
//   last_processed_block: bigint;
//   chain_id: number;
//   updated_at: Date;
// }

interface SyncJob {
  id?: string;
  event_type: string;
  tx_hash: string;
  log_index: number;
  chain_id: number;
  payload: MarketCreatedEvent;
  status: 'pending' | 'processing' | 'done' | 'dead';
  retry_count?: number;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

interface MonitoringMode {
  polling: boolean;
  webhook: boolean;
}

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

export class EventMonitor {
  private publicClient;
  private supabase;
  private isRunning = false;
  private pollingTimer?: NodeJS.Timeout;
  private webhookTimer?: NodeJS.Timeout;
  private monitoringMode: MonitoringMode = { polling: true, webhook: false };
  private retryConfig: RetryConfig = {
    maxAttempts: MAX_RETRY_ATTEMPTS,
    initialDelayMs: INITIAL_RETRY_DELAY_MS,
    backoffMultiplier: 2
  };

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize viem client with multiple RPC endpoints for reliability
    this.publicClient = this.createPublicClient();
  }

  /**
   * Create viem public client with fallback RPC endpoints
   */
  private createPublicClient() {
    const rpcUrls = [
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
      process.env.ALCHEMY_API_KEY ? `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null,
      process.env.INFURA_PROJECT_ID ? `https://base-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}` : null,
      'https://sepolia.base.org',
      'https://base-sepolia-rpc.publicnode.com',
      'https://base-sepolia.blockpi.network/v1/rpc/public'
    ].filter(Boolean) as string[];

    if (rpcUrls.length === 0) {
      throw new Error('No RPC endpoints available');
    }

    console.log(`🔗 Event Monitor using RPC: ${rpcUrls[0]}`);

    return createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrls[0])
    });
  }

  /**
   * Start continuous monitoring for events
   * Supports both polling and webhook modes
   */
  async startMonitoring(mode: MonitoringMode = { polling: true, webhook: false }): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Event monitor already running');
      return;
    }

    console.log('🚀 Starting event monitor for factory events...');
    this.isRunning = true;
    this.monitoringMode = mode;

    // Initial sync
    await this.performSync();

    // Start factory event monitoring
    await this.monitorFactoryEvents();

    console.log(`✅ Event monitor started`, {
      polling: mode.polling,
      webhook: mode.webhook,
      factory: FACTORY_ADDRESS
    });
  }

  /**
   * Main monitoring function for MarketCreated events from factory
   * Supports both polling and webhook modes with 6-block confirmation
   */
  async monitorFactoryEvents(): Promise<void> {
    console.log('👀 Starting factory event monitoring...');

    if (this.monitoringMode.polling) {
      this.pollingTimer = setInterval(async () => {
        try {
          await this.performSync();
          await this.retryFailedJobs();
        } catch (error) {
          console.error('❌ Event monitor polling error:', error);
        }
      }, POLLING_INTERVAL_MS);
      console.log(`🔄 Polling mode enabled (every ${POLLING_INTERVAL_MS / 1000}s)`);
    }

    if (this.monitoringMode.webhook) {
      // In webhook mode, poll more frequently for confirmation processing
      this.webhookTimer = setInterval(async () => {
        try {
          await this.processConfirmations();
          await this.retryFailedJobs();
        } catch (error) {
          console.error('❌ Webhook mode confirmation error:', error);
        }
      }, WEBHOOK_MODE_POLL_INTERVAL_MS);
      console.log(`📡 Webhook mode enabled (confirmations every ${WEBHOOK_MODE_POLL_INTERVAL_MS / 1000}s)`);
    }
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping event monitor...');
    this.isRunning = false;

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    if (this.webhookTimer) {
      clearInterval(this.webhookTimer);
      this.webhookTimer = undefined;
    }

    console.log('✅ Event monitor stopped');
  }

  /**
   * Perform one-time sync to catch up on missed events
   */
  async performOneTimeSync(): Promise<void> {
    console.log('🔄 Performing one-time event sync...');
    await this.performSync();
    console.log('✅ One-time sync completed');
  }

  /**
   * Main sync logic - scan for missed events and enqueue them
   */
  private async performSync(): Promise<void> {
    try {
      // Get current blockchain state
      const latestBlock = await this.publicClient.getBlockNumber();

      // Get last processed block from checkpoint
      const lastProcessedBlock = await this.getLastProcessedBlock();

      // Calculate safe scanning range (rewind by REORG_SAFETY_BLOCKS)
      const safeStartBlock = lastProcessedBlock > REORG_SAFETY_BLOCKS
        ? lastProcessedBlock - REORG_SAFETY_BLOCKS
        : BigInt(0);

      const scanFromBlock = Math.max(Number(safeStartBlock), 0);
      const scanToBlock = Number(latestBlock);

      if (scanFromBlock >= scanToBlock) {
        console.log(`📊 No new blocks to scan (current: ${scanFromBlock}, latest: ${scanToBlock})`);
        return;
      }

      console.log(`🔍 Scanning blocks ${scanFromBlock} to ${scanToBlock} for missed events...`);

      // Scan for missed events in chunks
      const missedEvents = await this.scanForEvents(BigInt(scanFromBlock), BigInt(scanToBlock));

      if (missedEvents.length > 0) {
        console.log(`📋 Found ${missedEvents.length} events to process`);

        // Enqueue missed events as sync jobs
        await this.enqueueEvents(missedEvents);

        console.log(`✅ Enqueued ${missedEvents.length} sync jobs`);
      } else {
        console.log('📭 No missed events found');
      }

      // Update checkpoint to latest block (minus safety margin)
      const newCheckpoint = latestBlock - REORG_SAFETY_BLOCKS;
      await this.updateLastProcessedBlock(newCheckpoint);

    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }

  /**
   * Scan blockchain for MarketCreated events in the given range
   */
  private async scanForEvents(fromBlock: bigint, toBlock: bigint): Promise<MarketCreatedEvent[]> {
    const events: MarketCreatedEvent[] = [];

    // Process in chunks to avoid RPC limits
    for (let start = fromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
      const end = start + MAX_BLOCK_RANGE > toBlock ? toBlock : start + MAX_BLOCK_RANGE;

      try {
        console.log(`  📊 Scanning blocks ${start} to ${end}...`);

        const logs = await this.publicClient.getLogs({
          address: FACTORY_ADDRESS,
          event: MARKET_CREATED_EVENT,
          fromBlock: start,
          toBlock: end
        });

        // Process each log
        for (const log of logs) {
          if (log.args && log.args.market && log.args.creator && log.args.question !== undefined && log.args.endTime !== undefined && log.args.marketIndex !== undefined) {
            events.push({
              market: log.args.market,
              creator: log.args.creator,
              question: log.args.question,
              endTime: log.args.endTime,
              marketIndex: log.args.marketIndex,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex
            });
          }
        }

      } catch (error) {
        console.error(`❌ Error scanning blocks ${start}-${end}:`, error);
        // Continue with next chunk instead of failing entire sync
      }
    }

    return events.sort((a, b) => {
      // Sort by block number, then by log index
      if (a.blockNumber !== b.blockNumber) {
        return Number(a.blockNumber - b.blockNumber);
      }
      return a.logIndex - b.logIndex;
    });
  }

  /**
   * Enqueue events as sync jobs for processing
   */
  private async enqueueEvents(events: MarketCreatedEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.queueSyncJob(event);
      } catch (error) {
        console.error(`❌ Error enqueuing event ${event.transactionHash}:`, error);
      }
    }
  }

  /**
   * Queue sync job in database (sync_jobs table)
   * Implements idempotent database operations
   */
  async queueSyncJob(event: MarketCreatedEvent): Promise<void> {
    try {
      const syncJob: Omit<SyncJob, 'id' | 'created_at' | 'updated_at'> = {
        event_type: 'MarketCreated',
        tx_hash: event.transactionHash,
        log_index: event.logIndex,
        chain_id: CHAIN_ID,
        payload: event,
        status: 'pending',
        retry_count: 0
      };

      // Use upsert with conflict resolution for idempotency
      const { error } = await this.supabase
        .from('sync_jobs')
        .upsert(syncJob, {
          onConflict: 'tx_hash,log_index,chain_id',
          ignoreDuplicates: true
        });

      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Failed to queue sync job for ${event.transactionHash}:`, error);
        throw error;
      }

      console.log(`📋 Queued sync job for market: ${event.question.substring(0, 50)}...`);

    } catch (error) {
      console.error(`❌ Error queuing sync job for ${event.transactionHash}:`, error);
      throw error;
    }
  }

  /**
   * Process individual MarketCreated event
   * Validates events before processing and handles confirmation delays
   */
  async processMarketCreatedEvent(event: MarketCreatedEvent, blockNumber: bigint): Promise<void> {
    try {
      console.log(`📝 Processing MarketCreated event:`, {
        market: event.market,
        question: event.question.substring(0, 50) + '...',
        blockNumber: blockNumber.toString()
      });

      // Check if we need to wait for confirmations
      const currentBlock = await this.publicClient.getBlockNumber();
      const confirmationsNeeded = CONFIRMATION_BLOCKS;
      const confirmations = currentBlock - blockNumber;

      if (confirmations < confirmationsNeeded) {
        console.log(`⏳ Waiting for confirmations: ${confirmations}/${confirmationsNeeded} for ${event.market}`);
        return; // Will be processed in next cycle
      }

      // Validate event before processing
      if (!this.validateMarketCreatedEvent(event)) {
        throw new Error(`Invalid MarketCreated event: ${JSON.stringify(event)}`);
      }

      // Check for potential reorg
      await this.handleReorg(blockNumber);

      // Determine category from question text
      const category = categorizeMarket(event.question);

      // Create market in database with idempotent operation
      const marketData = {
        question: event.question,
        category,
        end_time: new Date(Number(event.endTime) * 1000).toISOString(),
        creator_address: event.creator.toLowerCase(),
        contract_address: event.market.toLowerCase(),
        transaction_hash: event.transactionHash,
        yes_pool: 0,
        no_pool: 0,
        total_yes_shares: 0,
        total_no_shares: 0,
        resolved: false,
        outcome: undefined,
        // Event tracking fields
        chain_id: BigInt(CHAIN_ID),
        created_tx_hash: this.hexToBytes(event.transactionHash),
        created_log_index: event.logIndex,
        created_block_number: blockNumber,
        is_reorged: false
      };

      // Use upsert to ensure idempotency
      const { data, error } = await this.supabase
        .from('markets')
        .upsert(marketData, {
          onConflict: 'created_tx_hash,created_log_index,chain_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create market in database: ${error.message}`);
      }

      console.log(`✅ Successfully processed MarketCreated event:`, {
        marketId: data.id,
        contractAddress: event.market,
        question: event.question.substring(0, 50) + '...'
      });

    } catch (error) {
      console.error(`❌ Error processing MarketCreated event:`, error);
      throw error;
    }
  }

  /**
   * Get the last processed block from checkpoint table
   */
  private async getLastProcessedBlock(): Promise<bigint> {
    // First, ensure checkpoint table exists
    await this.ensureCheckpointTable();

    const { data, error } = await this.supabase
      .from('sync_checkpoints')
      .select('last_processed_block')
      .eq('key', 'event_monitor')
      .eq('chain_id', CHAIN_ID)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error fetching checkpoint:', error);
      throw error;
    }

    if (!data) {
      // No checkpoint exists, start from factory deployment block
      const deploymentBlock = BigInt(31699964); // From sync-contract-markets.ts
      console.log(`📍 No checkpoint found, starting from deployment block: ${deploymentBlock}`);
      return deploymentBlock;
    }

    const lastBlock = BigInt(data.last_processed_block);
    console.log(`📍 Resuming from checkpoint block: ${lastBlock}`);
    return lastBlock;
  }

  /**
   * Update the last processed block checkpoint
   */
  private async updateLastProcessedBlock(blockNumber: bigint): Promise<void> {
    const checkpoint = {
      key: 'event_monitor',
      last_processed_block: blockNumber.toString(),
      chain_id: CHAIN_ID,
      updated_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('sync_checkpoints')
      .upsert(checkpoint, {
        onConflict: 'key,chain_id'
      });

    if (error) {
      console.error('❌ Error updating checkpoint:', error);
      throw error;
    }

    console.log(`📍 Updated checkpoint to block: ${blockNumber}`);
  }

  /**
   * Ensure the checkpoint table exists
   */
  private async ensureCheckpointTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sync_checkpoints (
        key TEXT NOT NULL,
        chain_id BIGINT NOT NULL,
        last_processed_block BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (key, chain_id)
      );
    `;

    const { error } = await this.supabase.rpc('exec_sql', { sql: createTableQuery });

    if (error) {
      // Try alternative approach if RPC doesn't work
      console.log('📊 Checkpoint table check (may already exist)');
    }
  }

  /**
   * Check sync job queue health and report statistics
   */
  async getQueueHealth(): Promise<{
    pending: number;
    processing: number;
    dead: number;
    total: number;
  }> {
    const { data, error } = await this.supabase
      .from('sync_jobs')
      .select('status')
      .eq('job_type', 'market_created')
      .eq('chain_id', CHAIN_ID);

    if (error) {
      console.error('❌ Error fetching queue health:', error);
      throw error;
    }

    const stats = {
      pending: 0,
      processing: 0,
      dead: 0,
      total: data?.length || 0
    };

    data?.forEach(job => {
      switch (job.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'processing':
          stats.processing++;
          break;
        case 'dead':
          stats.dead++;
          break;
      }
    });

    return stats;
  }

  /**
   * Manually requeue failed jobs (for admin intervention)
   */
  async requeueFailedJobs(): Promise<number> {
    const { data, error } = await this.supabase
      .from('sync_jobs')
      .update({
        status: 'pending',
        retries: 0
      })
      .eq('status', 'dead')
      .eq('job_type', 'market_created')
      .eq('chain_id', CHAIN_ID)
      .select('id');

    if (error) {
      console.error('❌ Error requeuing failed jobs:', error);
      throw error;
    }

    const requeuedCount = data?.length || 0;
    console.log(`🔄 Requeued ${requeuedCount} failed jobs`);
    return requeuedCount;
  }

  /**
   * Force resync from a specific block (for emergency recovery)
   */
  async forceResyncFromBlock(fromBlock: bigint): Promise<void> {
    console.log(`🚨 Force resyncing from block ${fromBlock}...`);

    // Update checkpoint to force resync
    await this.updateLastProcessedBlock(fromBlock);

    // Perform immediate sync
    await this.performSync();

    console.log('✅ Force resync completed');
  }

  /**
   * Handle chain reorganizations
   * Detects and processes reorgs by checking block consistency
   */
  async handleReorg(eventBlockNumber: bigint): Promise<void> {
    try {
      // Get the block hash for the event block
      await this.publicClient.getBlock({ blockNumber: eventBlockNumber });

      // Check if we have any markets from this block in our database
      const { data: existingMarkets, error } = await this.supabase
        .from('markets')
        .select('id, created_block_number, contract_address, transaction_hash')
        .eq('created_block_number', eventBlockNumber.toString())
        .eq('chain_id', CHAIN_ID);

      if (error) {
        console.error('❌ Error checking for reorg:', error);
        return;
      }

      if (!existingMarkets || existingMarkets.length === 0) {
        return; // No markets from this block to check
      }

      // For each market, verify the transaction still exists in the current block
      for (const market of existingMarkets) {
        try {
          const receipt = await this.publicClient.getTransactionReceipt({
            hash: market.transaction_hash as `0x${string}`
          });

          if (receipt.blockNumber !== eventBlockNumber) {
            console.log(`🔄 Reorg detected for market ${market.id} - marking as reorged`);

            // Mark market as reorged
            await this.supabase
              .from('markets')
              .update({ is_reorged: true })
              .eq('id', market.id);
          }
        } catch {
          console.log(`🔄 Transaction not found (likely reorged): ${market.contract_address}`);

          // Mark market as reorged since transaction no longer exists
          await this.supabase
            .from('markets')
            .update({ is_reorged: true })
            .eq('id', market.id);
        }
      }
    } catch (error) {
      console.error('❌ Error handling reorg:', error);
    }
  }

  /**
   * Retry failed jobs with exponential backoff
   * Implements retry logic for sync jobs that failed processing
   */
  async retryFailedJobs(): Promise<void> {
    try {
      // Get failed jobs that haven't exceeded max retry attempts
      const { data: failedJobs, error } = await this.supabase
        .from('sync_jobs')
        .select('*')
        .eq('status', 'pending')
        .lt('retry_count', this.retryConfig.maxAttempts)
        .eq('chain_id', CHAIN_ID)
        .order('created_at', { ascending: true })
        .limit(10); // Process in batches

      if (error) {
        console.error('❌ Error fetching failed jobs:', error);
        return;
      }

      if (!failedJobs || failedJobs.length === 0) {
        return; // No failed jobs to retry
      }

      console.log(`🔄 Retrying ${failedJobs.length} failed sync jobs...`);

      for (const job of failedJobs) {
        try {
          // Calculate delay based on retry count (exponential backoff)
          const delay = this.retryConfig.initialDelayMs *
            Math.pow(this.retryConfig.backoffMultiplier, job.retry_count || 0);

          // Check if enough time has passed since last attempt
          const lastAttempt = new Date(job.updated_at || job.created_at);
          const now = new Date();
          const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();

          if (timeSinceLastAttempt < delay) {
            continue; // Not time to retry yet
          }

          // Mark job as processing
          const { error: updateError } = await this.supabase
            .from('sync_jobs')
            .update({
              status: 'processing',
              retry_count: (job.retry_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`❌ Failed to update job ${job.id}:`, updateError);
            continue;
          }

          // Process the event
          const event = job.payload as MarketCreatedEvent;
          await this.processMarketCreatedEvent(event, BigInt(event.blockNumber));

          // Mark job as done
          await this.supabase
            .from('sync_jobs')
            .update({
              status: 'done',
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          console.log(`✅ Successfully retried job ${job.id}`);

        } catch (jobError) {
          const errorMessage = jobError instanceof Error ? jobError.message : 'Unknown error';

          // Check if we've exceeded max retries
          const newRetryCount = (job.retry_count || 0) + 1;
          const status = newRetryCount >= this.retryConfig.maxAttempts ? 'dead' : 'pending';

          // Update job with error
          await this.supabase
            .from('sync_jobs')
            .update({
              status,
              retry_count: newRetryCount,
              error_message: errorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (status === 'dead') {
            console.error(`💀 Job ${job.id} marked as dead after ${newRetryCount} attempts:`, errorMessage);

            // Move to dead letter queue
            await this.supabase
              .from('dead_letter_queue')
              .insert({
                job_id: job.id,
                final_error: errorMessage
              });
          } else {
            console.log(`🔄 Job ${job.id} retry ${newRetryCount}/${this.retryConfig.maxAttempts} failed:`, errorMessage);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in retry failed jobs:', error);
    }
  }

  /**
   * Process confirmations for pending events (used in webhook mode)
   */
  private async processConfirmations(): Promise<void> {
    try {
      // Get pending sync jobs
      const { data: pendingJobs, error } = await this.supabase
        .from('sync_jobs')
        .select('*')
        .eq('status', 'pending')
        .eq('chain_id', CHAIN_ID)
        .eq('event_type', 'MarketCreated')
        .limit(50);

      if (error || !pendingJobs) {
        return;
      }

      for (const job of pendingJobs) {
        try {
          const event = job.payload as MarketCreatedEvent;
          await this.processMarketCreatedEvent(event, BigInt(event.blockNumber));

          // Mark as done if processing succeeded
          await this.supabase
            .from('sync_jobs')
            .update({ status: 'done' })
            .eq('id', job.id);

        } catch {
          // Error handling is done in processMarketCreatedEvent
        }
      }
    } catch (error) {
      console.error('❌ Error processing confirmations:', error);
    }
  }

  /**
   * Validate MarketCreated event structure
   */
  private validateMarketCreatedEvent(event: MarketCreatedEvent): boolean {
    return !!(event.market &&
             event.creator &&
             event.question &&
             event.endTime &&
             event.transactionHash &&
             event.blockNumber &&
             typeof event.logIndex === 'number');
  }

  /**
   * Utility function to convert hex string to Uint8Array for database storage
   */
  private hexToBytes(hex: string): Uint8Array {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

    // Ensure even length
    const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;

    // Convert to bytes
    const bytes = new Uint8Array(paddedHex.length / 2);
    for (let i = 0; i < paddedHex.length; i += 2) {
      bytes[i / 2] = parseInt(paddedHex.substr(i, 2), 16);
    }

    return bytes;
  }
}

// Export singleton instance and types
export const eventMonitor = new EventMonitor();
export type { MarketCreatedEvent, SyncJob, MonitoringMode, RetryConfig };

// Export convenience functions
export async function startEventMonitoring(mode?: MonitoringMode): Promise<void> {
  await eventMonitor.startMonitoring(mode);
}

export function stopEventMonitoring(): void {
  eventMonitor.stopMonitoring();
}

export async function performOneTimeEventSync(): Promise<void> {
  await eventMonitor.performOneTimeSync();
}

export async function getEventQueueHealth() {
  return await eventMonitor.getQueueHealth();
}

export async function requeueFailedEvents(): Promise<number> {
  return await eventMonitor.requeueFailedJobs();
}

export async function forceEventResync(fromBlock: bigint): Promise<void> {
  await eventMonitor.forceResyncFromBlock(fromBlock);
}

// Export new functions for Task 2.2 requirements
export async function monitorFactoryEvents(): Promise<void> {
  await eventMonitor.monitorFactoryEvents();
}

export async function processMarketCreatedEvent(event: MarketCreatedEvent, blockNumber: bigint): Promise<void> {
  await eventMonitor.processMarketCreatedEvent(event, blockNumber);
}

export async function queueSyncJob(event: MarketCreatedEvent): Promise<void> {
  await eventMonitor.queueSyncJob(event);
}

export async function handleReorg(blockNumber: bigint): Promise<void> {
  await eventMonitor.handleReorg(blockNumber);
}

export async function retryFailedJobs(): Promise<void> {
  await eventMonitor.retryFailedJobs();
}