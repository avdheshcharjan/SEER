// Event processor for webhook payloads
// Handles MarketCreated event processing and validation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decodeMarketCreatedEventAdvanced, MARKET_CREATED_TOPIC, type MarketCreatedEventData } from "./abi-decoder.ts";

// Type definitions for our webhook payload
export interface WebhookEvent {
  chainId?: number;
  chain_id?: number;
  address?: string;
  contract_address?: string;
  topics: string[];
  data: string;
  transactionHash?: string;
  transaction_hash?: string;
  logIndex?: number;
  log_index?: number;
  blockNumber?: number;
  block_number?: number;
  removed?: boolean;
}

export interface WebhookPayload {
  chainId?: number;
  events: WebhookEvent[];
  provider?: string;
  network?: string;
  timestamp?: string;
}

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Factory contract address from requirements
const FACTORY_CONTRACT_ADDRESS = "0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility functions
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

function normalizeEvent(event: WebhookEvent): {
  chainId: number;
  contractAddress: string;
  transactionHash: string;
  logIndex: number;
  blockNumber: number;
} {
  const chainId = event.chainId || event.chain_id;
  const contractAddress = event.address || event.contract_address;
  const transactionHash = event.transactionHash || event.transaction_hash;
  const logIndex = event.logIndex ?? event.log_index;
  const blockNumber = event.blockNumber || event.block_number;

  if (!chainId || !contractAddress || !transactionHash || logIndex === undefined || !blockNumber) {
    throw new Error("Missing required event fields");
  }

  return {
    chainId,
    contractAddress,
    transactionHash,
    logIndex,
    blockNumber
  };
}

// Validate webhook event
export function validateWebhookEvent(event: WebhookEvent): string | null {
  try {
    const normalized = normalizeEvent(event);

    // Verify chain ID (Base Sepolia)
    if (normalized.chainId !== BASE_SEPOLIA_CHAIN_ID) {
      return `Invalid chain ID: expected ${BASE_SEPOLIA_CHAIN_ID}, got ${normalized.chainId}`;
    }

    // Validate transaction hash
    if (!isValidTxHash(normalized.transactionHash)) {
      return `Invalid transaction hash format: ${normalized.transactionHash}`;
    }

    // Validate contract address format
    if (!isValidAddress(normalized.contractAddress)) {
      return `Invalid contract address format: ${normalized.contractAddress}`;
    }

    // Validate log index
    if (normalized.logIndex < 0 || !Number.isInteger(normalized.logIndex)) {
      return `Invalid log index: ${normalized.logIndex}`;
    }

    // Validate block number
    if (normalized.blockNumber <= 0 || !Number.isInteger(normalized.blockNumber)) {
      return `Invalid block number: ${normalized.blockNumber}`;
    }

    // Check if event is removed (reorg)
    if (event.removed === true) {
      return "Event marked as removed (likely due to chain reorganization)";
    }

    return null; // Valid
  } catch (error) {
    return `Event normalization failed: ${error.message}`;
  }
}

// Check if event is from factory contract
export function isFactoryEvent(event: WebhookEvent): boolean {
  const contractAddress = event.address || event.contract_address;
  if (!contractAddress) return false;

  return contractAddress.toLowerCase() === FACTORY_CONTRACT_ADDRESS.toLowerCase();
}

// Check if event is MarketCreated
export function isMarketCreatedEvent(event: WebhookEvent): boolean {
  return event.topics && event.topics.length > 0 &&
         event.topics[0].toLowerCase() === MARKET_CREATED_TOPIC.toLowerCase();
}

// Decode MarketCreated event data
export function decodeMarketCreatedEvent(event: WebhookEvent): MarketCreatedEventData | null {
  try {
    if (!event.topics || !event.data) {
      return null;
    }

    return decodeMarketCreatedEventAdvanced(event.topics, event.data);
  } catch (error) {
    console.error("Failed to decode MarketCreated event:", error);
    return null;
  }
}

// Create idempotent key for sync job
function createIdempotentKey(event: WebhookEvent, eventData: MarketCreatedEventData): string {
  const normalized = normalizeEvent(event);
  return `market_created:${normalized.chainId}:${normalized.transactionHash}:${normalized.logIndex}`;
}

// Enqueue sync job with idempotent key
export async function enqueueSyncJob(event: WebhookEvent, eventData: MarketCreatedEventData): Promise<{ success: boolean; error?: string }> {
  try {
    const normalized = normalizeEvent(event);
    const idempotentKey = createIdempotentKey(event, eventData);

    const syncJob = {
      event_type: "MarketCreated",
      tx_hash: normalized.transactionHash,
      log_index: normalized.logIndex,
      chain_id: normalized.chainId,
      status: "pending" as const,
      retry_count: 0,
      error_message: null
    };

    // Use upsert to handle idempotent insertion
    // ON CONFLICT (tx_hash, log_index, chain_id) DO NOTHING
    const { error } = await supabase
      .from("sync_jobs")
      .upsert(syncJob, {
        onConflict: "tx_hash,log_index,chain_id",
        ignoreDuplicates: true
      });

    if (error) {
      console.error("Failed to enqueue sync job:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Enqueued sync job: ${normalized.transactionHash}:${normalized.logIndex}`);
    return { success: true };
  } catch (error) {
    console.error("Error enqueueing sync job:", error);
    return { success: false, error: error.message };
  }
}

// Process webhook payload
export async function processWebhookPayload(payload: WebhookPayload): Promise<{
  processed: number;
  skipped: number;
  errors: number;
  details: string[];
}> {
  const results = {
    processed: 0,
    skipped: 0,
    errors: 0,
    details: [] as string[]
  };

  // Validate payload structure
  if (!payload || !Array.isArray(payload.events)) {
    results.errors++;
    results.details.push("Invalid payload: must contain 'events' array");
    return results;
  }

  console.log(`📥 Processing webhook with ${payload.events.length} events`);

  // Process each event
  for (const event of payload.events) {
    const normalized = normalizeEvent(event);
    const eventId = `${normalized.transactionHash}:${normalized.logIndex}`;

    try {
      // Validate event
      const validationError = validateWebhookEvent(event);
      if (validationError) {
        results.skipped++;
        results.details.push(`Skipped ${eventId} - ${validationError}`);
        continue;
      }

      // Check if it's a factory contract event
      if (!isFactoryEvent(event)) {
        results.skipped++;
        results.details.push(`Skipped ${eventId} - Not from factory contract`);
        continue;
      }

      // Check if it's a MarketCreated event
      if (!isMarketCreatedEvent(event)) {
        results.skipped++;
        results.details.push(`Skipped ${eventId} - Not a MarketCreated event`);
        continue;
      }

      // Decode event data
      const eventData = decodeMarketCreatedEvent(event);
      if (!eventData) {
        results.errors++;
        results.details.push(`Error ${eventId} - Failed to decode event data`);
        continue;
      }

      // Validate decoded addresses
      if (!isValidAddress(eventData.market) || !isValidAddress(eventData.creator)) {
        results.errors++;
        results.details.push(`Error ${eventId} - Invalid addresses in decoded data`);
        continue;
      }

      // Enqueue sync job
      const result = await enqueueSyncJob(event, eventData);
      if (result.success) {
        results.processed++;
        results.details.push(`Processed ${eventId} - MarketCreated event queued`);
      } else {
        results.errors++;
        results.details.push(`Error ${eventId} - Failed to enqueue: ${result.error}`);
      }

    } catch (error) {
      results.errors++;
      results.details.push(`Error ${eventId} - ${error.message}`);
      console.error(`Error processing event ${eventId}:`, error);
    }
  }

  console.log(`📊 Processing complete: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors`);
  return results;
}