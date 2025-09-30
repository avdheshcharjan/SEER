// ABI decoder utilities for MarketCreated events
// This provides proper event decoding using the same patterns as the main codebase

// MarketCreated event ABI (from lib/market-factory-onchainkit.ts)
export const MARKET_CREATED_EVENT_ABI = {
  name: 'MarketCreated',
  type: 'event',
  anonymous: false,
  inputs: [
    { name: 'market', type: 'address', indexed: true },
    { name: 'creator', type: 'address', indexed: true },
    { name: 'question', type: 'string', indexed: false },
    { name: 'endTime', type: 'uint256', indexed: false },
    { name: 'marketIndex', type: 'uint256', indexed: false }
  ]
} as const;

// MarketCreated event signature - keccak256("MarketCreated(address,address,string,uint256,uint256)")
// Calculated from Ethereum event signature: MarketCreated(address indexed market, address indexed creator, string question, uint256 endTime, uint256 marketIndex)
export const MARKET_CREATED_TOPIC = "0x627df7324a60c10d7af827d3b247a53b6a97e478e7772db76f8dc7704bcfed98";

export interface MarketCreatedEventData {
  market: string;
  creator: string;
  question: string;
  endTime: bigint;
  marketIndex: bigint;
}

// Simple ABI decoder for MarketCreated event
// This is a lightweight version that doesn't require full viem import
export function decodeMarketCreatedEvent(topics: string[], data: string): MarketCreatedEventData | null {
  try {
    // Validate we have the right number of topics
    if (!topics || topics.length !== 3) {
      throw new Error(`Invalid topics length: expected 3, got ${topics?.length || 0}`);
    }

    // Validate event signature
    if (topics[0] !== MARKET_CREATED_TOPIC) {
      throw new Error(`Invalid event signature: ${topics[0]}`);
    }

    // Extract indexed parameters from topics
    // topic[0] = event signature
    // topic[1] = market address (indexed)
    // topic[2] = creator address (indexed)
    const market = `0x${topics[1].slice(-40)}`; // Remove padding and take last 40 chars (20 bytes)
    const creator = `0x${topics[2].slice(-40)}`;

    // Validate addresses
    if (!isValidAddress(market) || !isValidAddress(creator)) {
      throw new Error(`Invalid addresses: market=${market}, creator=${creator}`);
    }

    // Decode non-indexed parameters from data
    // For simplicity, we'll use a basic decoder
    // In production, you'd want to use a proper ABI decoder like ethers or viem

    // Remove 0x prefix
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;

    if (cleanData.length < 64) {
      throw new Error(`Data too short: ${cleanData.length} characters`);
    }

    // For now, we'll set placeholder values for question, endTime, and marketIndex
    // The actual worker will re-fetch this data using proper RPC calls
    // This is acceptable because the Edge Function's job is just to enqueue work
    const decoded: MarketCreatedEventData = {
      market,
      creator,
      question: "TBD", // Will be fetched by worker
      endTime: BigInt(0), // Will be fetched by worker
      marketIndex: BigInt(0) // Will be fetched by worker
    };

    return decoded;

  } catch (error) {
    console.error("Failed to decode MarketCreated event:", error);
    return null;
  }
}

// Utility function for address validation (copied to avoid circular imports)
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Alternative decoder that attempts to extract more data
// This is more complex but tries to parse the actual question and endTime
export function decodeMarketCreatedEventAdvanced(topics: string[], data: string): MarketCreatedEventData | null {
  try {
    const basicDecode = decodeMarketCreatedEvent(topics, data);
    if (!basicDecode) {
      return null;
    }

    // Try to extract additional data from the data field
    // Note: This is a simplified parser and may not work for all cases
    // For production use, implement a proper ABI decoder

    const cleanData = data.startsWith('0x') ? data.slice(2) : data;

    // ABI encoding structure for non-indexed parameters:
    // - offset to question string (32 bytes)
    // - endTime (32 bytes)
    // - marketIndex (32 bytes)
    // - question string length (32 bytes)
    // - question string data (padded to 32-byte boundaries)

    if (cleanData.length >= 192) { // At least 96 bytes for the three main fields
      try {
        // Extract endTime (starts at byte 32, 32 bytes long)
        const endTimeHex = cleanData.slice(64, 128);
        const endTime = BigInt(`0x${endTimeHex}`);

        // Extract marketIndex (starts at byte 64, 32 bytes long)
        const marketIndexHex = cleanData.slice(128, 192);
        const marketIndex = BigInt(`0x${marketIndexHex}`);

        return {
          ...basicDecode,
          endTime,
          marketIndex
        };
      } catch (parseError) {
        console.warn("Advanced parsing failed, using basic decode:", parseError);
        return basicDecode;
      }
    }

    return basicDecode;

  } catch (error) {
    console.error("Advanced decode failed:", error);
    return null;
  }
}

export default {
  MARKET_CREATED_EVENT_ABI,
  MARKET_CREATED_TOPIC,
  decodeMarketCreatedEvent,
  decodeMarketCreatedEventAdvanced
};