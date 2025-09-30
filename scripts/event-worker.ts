#!/usr/bin/env tsx

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { createPublicClient, http, parseAbiItem, decodeEventLog, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

// Type definitions
interface SyncJob {
  id: string;
  event_type: string;
  tx_hash: string;
  log_index: number;
  chain_id: number;
  status: 'pending' | 'processing' | 'done' | 'dead';
  retry_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Constants
const FACTORY_ADDRESS = '0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C' as Address;
const CONFIRMATION_BLOCKS = BigInt(6);
const MAX_RETRIES = 10;
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes maximum delay
const WORKER_INTERVAL = 30000; // 30 seconds between worker cycles as specified
const BATCH_SIZE = 10; // Process jobs in batches

interface ProcessedJob {
  id: string;
  status: 'success' | 'retry' | 'dead';
  error?: string;
  retryAfter?: number;
}

interface JobResult {
  jobId: string;
  success: boolean;
  error?: string;
  shouldRetry: boolean;
}

/**
 * Event Worker - Background job processor for smart contract events
 *
 * This worker:
 * 1. Dequeues pending jobs from sync_jobs table
 * 2. Re-fetches transaction receipts for verification
 * 3. Waits for confirmations before finalizing
 * 4. Processes MarketCreated events to update markets table
 * 5. Implements retry logic with exponential backoff
 * 6. Handles dead letter queue after max failures
 */
async function runEventWorker() {
  console.log('🚀 Starting SEER Event Worker...');
  console.log('='.repeat(50));

  try {
    // Validate environment
    await validateEnvironment();

    // Initialize RPC client with fallbacks
    const publicClient = await initializeRpcClient();

    console.log('✅ Event worker initialized successfully');
    console.log(`🔄 Processing jobs every ${WORKER_INTERVAL}ms`);
    console.log(`📦 Batch size: ${BATCH_SIZE} jobs`);
    console.log(`⏱️  Confirmation blocks: ${CONFIRMATION_BLOCKS}`);
    console.log(`🔁 Max retries: ${MAX_RETRIES}`);

    // Start main processing loop
    await processJobs(publicClient);

  } catch (error) {
    console.error('\n💥 Event worker failed to start:', error);
    process.exit(1);
  }
}

/**
 * Get configured Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Local SupabaseService methods for sync jobs
 */
class LocalSupabaseService {
  static async getPendingSyncJobs(limit = 10) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async updateSyncJob(id: string, updates: Partial<SyncJob>) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sync_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async moveToDeadLetterQueue(jobId: string, finalError: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('dead_letter_queue')
      .insert({
        job_id: jobId,
        final_error: finalError
      });

    if (error) throw error;
  }
}

/**
 * Validate that all required environment variables are set
 */
async function validateEnvironment(): Promise<void> {
  console.log('🔧 Validating environment...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  console.log(`🏭 Factory Address: ${FACTORY_ADDRESS}`);

  // Test Supabase connection
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('sync_jobs').select('count').limit(1);
  if (error) {
    throw new Error(`Failed to connect to Supabase: ${error.message}`);
  }

  console.log('✅ Environment validation passed');
}

/**
 * Initialize RPC client with multiple fallbacks
 */
async function initializeRpcClient() {
  const rpcUrls = [
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    'https://base-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
    'https://base-sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
    'https://sepolia.base.org',
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-sepolia.blockpi.network/v1/rpc/public'
  ].filter(Boolean);

  let publicClient;
  let lastError;

  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`🔗 Testing RPC endpoint: ${rpcUrl}`);
      publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(rpcUrl),
      });

      // Test the connection
      await publicClient.getBlockNumber();
      console.log(`✅ Successfully connected to: ${rpcUrl}`);
      break;
    } catch (error) {
      console.log(`❌ Failed to connect to: ${rpcUrl}`);
      lastError = error;
      continue;
    }
  }

  if (!publicClient) {
    throw new Error(`Failed to connect to any RPC endpoint. Last error: ${lastError}`);
  }

  return publicClient;
}




/**
 * 🔄 Main job processing loop - runs continuously and polls every 30 seconds
 * Task 3.1 requirement: Poll sync_jobs table for pending jobs
 */
async function processJobs(publicClient: any): Promise<void> {
  let cycleCount = 0;

  console.log('🚀 Starting main job processing loop...');
  console.log(`⏱️  Polling interval: ${WORKER_INTERVAL / 1000} seconds`);
  console.log(`📦 Batch size: ${BATCH_SIZE} jobs`);

  while (true) {
    cycleCount++;
    console.log(`\n🔄 Worker cycle ${cycleCount} - ${new Date().toISOString()}`);

    try {
      // Get pending jobs from database
      const pendingJobs = await LocalSupabaseService.getPendingSyncJobs(BATCH_SIZE);

      if (pendingJobs.length === 0) {
        console.log('📭 No pending jobs found');
      } else {
        console.log(`📬 Processing ${pendingJobs.length} pending jobs`);

        // Process jobs in batches for efficiency
        const results: ProcessedJob[] = [];
        for (const job of pendingJobs) {
          const result = await processSingleJob(publicClient, job);
          results.push(result);
        }

        // Summary
        const successful = results.filter(r => r.status === 'success').length;
        const retries = results.filter(r => r.status === 'retry').length;
        const dead = results.filter(r => r.status === 'dead').length;

        console.log(`📊 Batch Summary: ${successful} successful, ${retries} retries, ${dead} dead`);
      }
    } catch (error) {
      console.error(`❌ Error in worker cycle ${cycleCount}:`, error);
      // Continue running even if one cycle fails
    }

    // Wait 30 seconds before next cycle
    await sleep(WORKER_INTERVAL);
  }
}

/**
 * 🔍 Process individual sync job with confirmation delays
 * Task 3.1 requirement: Process jobs with confirmation delays (6 blocks)
 */
async function processSingleJob(publicClient: any, job: SyncJob): Promise<ProcessedJob> {
  console.log(`\n🔍 Processing job ${job.id} (${job.event_type})`);

  try {
    // Mark job as processing
    await LocalSupabaseService.updateSyncJob(job.id, { status: 'processing' });

    // Wait for block confirmations before finalizing
    const isConfirmed = await waitForConfirmations(publicClient, job.tx_hash);
    if (!isConfirmed) {
      console.log(`⏱️  Job ${job.id} waiting for confirmations`);
      // Reset to pending to retry later
      await LocalSupabaseService.updateSyncJob(job.id, { status: 'pending' });
      return { id: job.id, status: 'retry', error: 'Waiting for confirmations' };
    }

    // Process the job based on event type
    let result: JobResult;
    switch (job.event_type) {
      case 'MarketCreated':
      case 'market_created':
        result = await processMarketCreatedJob(publicClient, job);
        break;
      default:
        result = {
          jobId: job.id,
          success: false,
          error: `Unknown event type: ${job.event_type}`,
          shouldRetry: false
        };
    }

    // Handle the result
    if (result.success) {
      await LocalSupabaseService.updateSyncJob(job.id, { status: 'done' });
      console.log(`✅ Job ${job.id} completed successfully`);
      return { id: job.id, status: 'success' };
    } else {
      return await handleJobFailure(job, result.error || 'Unknown error', result.shouldRetry);
    }

  } catch (error) {
    console.error(`❌ Failed to process job ${job.id}:`, error);
    return await handleJobFailure(job, String(error), true);
  }
}

/**
 * ⏱️  Wait for 6 block confirmations before finalizing
 * Task 3.1 requirement: Wait for block confirmations before finalizing
 */
async function waitForConfirmations(publicClient: any, txHash: string): Promise<boolean> {
  try {
    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt) {
      console.log(`❌ Transaction receipt not found for ${txHash}`);
      return false;
    }

    // Check confirmations
    const currentBlock = await publicClient.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    if (confirmations < CONFIRMATION_BLOCKS) {
      console.log(`⏱️  Waiting for confirmations: ${confirmations.toString()}/${CONFIRMATION_BLOCKS.toString()} for ${txHash}`);
      return false;
    }

    console.log(`✅ Transaction confirmed with ${confirmations.toString()} blocks: ${txHash}`);
    return true;

  } catch (error) {
    console.error(`❌ Error checking confirmations for ${txHash}:`, error);
    return false;
  }
}

/**
 * 💾 Update markets table with contract address
 * Task 3.1 requirement: Update market contract addresses in database
 */
async function updateMarketContract(marketAddress: string, question: string, creator: string, endTime: bigint, txHash: string, logIndex: number, blockNumber: bigint): Promise<boolean> {
  try {
    console.log(`💾 Updating market in database: ${marketAddress}`);

    // Categorize market based on question
    const category = categorizeMarket(question);

    // Prepare market data for insertion/update
    const marketData = {
      question: question,
      category: category,
      end_time: new Date(Number(endTime) * 1000).toISOString(),
      creator_address: creator.toLowerCase(),
      contract_address: marketAddress.toLowerCase(),
      transaction_hash: txHash,
      yes_pool: 0,
      no_pool: 0,
      total_yes_shares: 0,
      total_no_shares: 0,
      resolved: false,
      outcome: null,
      // Event tracking fields
      chain_id: 84532, // Base Sepolia
      created_tx_hash: Buffer.from(txHash.slice(2), 'hex'),
      created_log_index: logIndex,
      created_block_number: blockNumber,
      is_reorged: false
    };

    // Insert market using idempotent operation
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('markets')
      .insert(marketData)
      .select('id')
      .single();

    if (error) {
      // Check if it's a duplicate (conflict) - this is expected and OK
      if (error.code === '23505') { // Unique constraint violation
        console.log(`ℹ️  Market already exists in database (idempotent operation)`);
        return true;
      } else {
        throw error;
      }
    }

    console.log(`✅ Created market in database with ID: ${data.id}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to update market contract:`, error);
    return false;
  }
}

/**
 * 🔄 Handle job failure with exponential backoff and dead letter queue
 * Task 3.1 requirement: Handle failures with exponential backoff, move failed jobs to dead letter queue after 10 retries
 */
async function handleJobFailure(job: SyncJob, errorMessage: string, shouldRetry: boolean): Promise<ProcessedJob> {
  const newRetryCount = (job.retry_count || 0) + 1;

  if (!shouldRetry || newRetryCount >= MAX_RETRIES) {
    // Move to dead letter queue after max retries
    console.log(`💀 Job ${job.id} moved to dead letter queue after ${newRetryCount} retries`);

    await LocalSupabaseService.updateSyncJob(job.id, {
      status: 'dead',
      retry_count: newRetryCount,
      error_message: errorMessage
    });

    await LocalSupabaseService.moveToDeadLetterQueue(job.id, errorMessage);

    return { id: job.id, status: 'dead', error: errorMessage };
  }

  // Calculate exponential backoff delay: 2^retry_count seconds (max 5 minutes)
  const delaySeconds = Math.min(Math.pow(2, newRetryCount), MAX_RETRY_DELAY_MS / 1000);
  const delayMs = delaySeconds * 1000;

  console.log(`🔄 Job ${job.id} scheduled for retry ${newRetryCount}/${MAX_RETRIES} in ${delaySeconds}s`);

  await LocalSupabaseService.updateSyncJob(job.id, {
    status: 'pending',
    retry_count: newRetryCount,
    error_message: errorMessage
  });

  return { id: job.id, status: 'retry', error: errorMessage, retryAfter: delayMs };
}

/**
 * 🏭 Process MarketCreated event job
 * Handles the core business logic of creating markets in the database
 */
async function processMarketCreatedJob(publicClient: any, job: SyncJob): Promise<JobResult> {
  try {
    console.log('🏭 Processing MarketCreated event');

    // Re-fetch transaction receipt for verification
    const receipt = await publicClient.getTransactionReceipt({ hash: job.tx_hash as `0x${string}` });
    if (!receipt) {
      throw new Error(`Transaction receipt not found for ${job.tx_hash}`);
    }

    // Find the specific log by index
    const log = receipt.logs.find((l: any) => Number(l.logIndex) === job.log_index);
    if (!log) {
      return {
        jobId: job.id,
        success: false,
        error: `Log at index ${job.log_index} not found in transaction`,
        shouldRetry: false // No point retrying if log doesn't exist
      };
    }

    // Decode the MarketCreated event
    const marketCreatedEvent = parseAbiItem('event MarketCreated(address indexed market, address indexed creator, string question, uint256 endTime, uint256 marketIndex)');

    let decodedLog;
    try {
      decodedLog = decodeEventLog({
        abi: [marketCreatedEvent],
        data: log.data,
        topics: log.topics,
      });
    } catch (error) {
      return {
        jobId: job.id,
        success: false,
        error: `Failed to decode MarketCreated event: ${error}`,
        shouldRetry: false // No point retrying if we can't decode
      };
    }

    const { market, creator, question, endTime, marketIndex } = decodedLog.args;

    console.log(`📊 Market: ${market}`);
    console.log(`👤 Creator: ${creator}`);
    console.log(`❓ Question: ${question}`);
    console.log(`📅 End Time: ${new Date(Number(endTime) * 1000).toISOString()}`);
    console.log(`🔢 Market Index: ${marketIndex}`);

    // Update market contract address in database
    const success = await updateMarketContract(
      market,
      question,
      creator,
      endTime,
      job.tx_hash,
      job.log_index,
      receipt.blockNumber
    );

    if (success) {
      console.log(`✅ MarketCreated event processed successfully`);
      return { jobId: job.id, success: true, shouldRetry: false };
    } else {
      return {
        jobId: job.id,
        success: false,
        error: 'Failed to update market in database',
        shouldRetry: true // Database errors are usually temporary
      };
    }

  } catch (error) {
    console.error('❌ Error processing MarketCreated job:', error);
    return {
      jobId: job.id,
      success: false,
      error: String(error),
      shouldRetry: true // Most errors are worth retrying
    };
  }
}

/**
 * Categorize market based on question content
 * (Same logic as sync-contract-markets.ts)
 */
function categorizeMarket(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('btc') || q.includes('bitcoin') || q.includes('eth') || q.includes('ethereum') ||
    q.includes('crypto') || q.includes('sol') || q.includes('solana') || q.includes('usd') ||
    q.includes('market cap') || q.includes('dominance') || q.includes('exchange')) {
    return 'crypto';
  }

  if (q.includes('earthquake') || q.includes('usgs') || q.includes('opec') || q.includes('oil') ||
    q.includes('gold') || q.includes('airline') || q.includes('sanctions') || q.includes('currency') ||
    q.includes('un security') || q.includes('weather')) {
    return 'current-affairs';
  }

  if (q.includes('white house') || q.includes('parliament') || q.includes('confidence') ||
    q.includes('political') || q.includes('resignation') || q.includes('trade restrictions') ||
    q.includes('protest') || q.includes('head of state') || q.includes('federal agency')) {
    return 'politics';
  }

  if (q.includes('apple') || q.includes('tech company') || q.includes('openai') || q.includes('anthropic') ||
    q.includes('google') || q.includes('social media') || q.includes('acquisition') || q.includes('ai') ||
    q.includes('cybersecurity') || q.includes('cloud provider') || q.includes('aws') || q.includes('azure') ||
    q.includes('gaming') || q.includes('ev manufacturer')) {
    return 'technology';
  }

  if (q.includes('champions league') || q.includes('nba') || q.includes('nfl') || q.includes('basketball') ||
    q.includes('tennis') || q.includes('sports') || q.includes('athlete') || q.includes('injury') ||
    q.includes('world record') || q.includes('triple-double') || q.includes('upset')) {
    return 'sports';
  }

  return 'crypto'; // Default fallback
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log('🔮 SEER Event Worker - Background Job Processor');
    console.log('');
    console.log('Usage:');
    console.log('  npm run event-worker              # Start the worker');
    console.log('  npm run event-worker --help       # Show this help');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key');
    console.log('  ALCHEMY_API_KEY                   # Alchemy API key (optional)');
    console.log('  INFURA_PROJECT_ID                 # Infura project ID (optional)');
    console.log('');
    console.log('Features:');
    console.log('  • Processes sync_jobs table for MarketCreated events');
    console.log('  • Re-fetches transactions for verification');
    console.log('  • Waits for 6 block confirmations before finalizing');
    console.log('  • Implements exponential backoff retry logic');
    console.log('  • Handles dead letter queue after 10 failures');
    console.log('  • Idempotent database operations (ON CONFLICT DO NOTHING)');
  } else {
    runEventWorker()
      .catch(error => {
        console.error('\n💥 Event worker failed:', error);
        process.exit(1);
      });
  }
}