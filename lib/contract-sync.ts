import { createPublicClient, http, parseAbiItem, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SupabaseService } from './supabase';

// Contract addresses from deployment
const FACTORY_CONTRACT_ADDRESS = "0x89332E711B591DEeAC1a67b4ED5086a209a7414E" as Address;

// ABI events for the ParimutuelMarketFactory
const FACTORY_ABI_EVENTS = [
  parseAbiItem('event MarketCreated(address indexed market, address indexed creator, string question, uint256 endTime, uint256 marketIndex)'),
] as const;

// ABI events for individual markets
const MARKET_ABI_EVENTS = [
  parseAbiItem('event BetPlaced(address indexed bettor, bool side, uint256 amount)'),
  parseAbiItem('event MarketResolved(bool outcome, uint256 timestamp)'),
  parseAbiItem('event RewardsClaimed(address indexed user, uint256 amount)'),
] as const;

// Multiple RPC endpoints for better reliability
const getRpcTransport = () => {
  const rpcUrls = [
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    'https://base-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
    'https://base-sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
    'https://sepolia.base.org',
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-sepolia.blockpi.network/v1/rpc/public'
  ].filter(Boolean);

  // Use the first available URL, fallback to default
  return http(rpcUrls[0] || 'https://sepolia.base.org');
};

// Create viem client for Base Sepolia
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: getRpcTransport(),
});

interface MarketCreatedEvent {
  market: Address;
  creator: Address;
  question: string;
  endTime: bigint;
  marketIndex: bigint;
  transactionHash: string;
  blockNumber: bigint;
}

interface BetPlacedEvent {
  market: Address;
  bettor: Address;
  side: boolean;
  amount: bigint;
  transactionHash: string;
  blockNumber: bigint;
}

interface MarketResolvedEvent {
  market: Address;
  outcome: boolean;
  timestamp: bigint;
  transactionHash: string;
  blockNumber: bigint;
}

export class ContractSyncService {
  private static readonly SYNC_BLOCK_RANGE = BigInt(1000); // Process in chunks of 1000 blocks
  private static readonly FACTORY_DEPLOY_BLOCK = BigInt(0); // Will be set to actual deployment block

  /**
   * Sync all markets created by the factory contract to database
   */
  static async syncAllMarkets(fromBlock?: bigint): Promise<void> {
    console.log('🔄 Starting market sync from contract events...');

    try {
      const startBlock = fromBlock || this.FACTORY_DEPLOY_BLOCK;
      const latestBlock = await publicClient.getBlockNumber();

      console.log(`📊 Syncing from block ${startBlock} to ${latestBlock}`);

      // Get all MarketCreated events
      const marketEvents = await this.getMarketCreatedEvents(startBlock, latestBlock);

      console.log(`🎯 Found ${marketEvents.length} market creation events`);

      // Process each market
      for (const event of marketEvents) {
        await this.syncSingleMarket(event);

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Market sync completed successfully');

    } catch (error) {
      console.error('❌ Error syncing markets:', error);
      throw error;
    }
  }

  /**
   * Sync a single market from contract event to database
   */
  private static async syncSingleMarket(event: MarketCreatedEvent): Promise<void> {
    try {
      console.log(`📝 Syncing market: ${event.question}`);

      // Determine category from question text
      const category = this.categorizeMarket(event.question);

      // Create market in database
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
      };

      const result = await SupabaseService.createMarket(marketData);
      console.log(`✅ Created market in DB: ${result.id}`);

      // Start monitoring this market for bet events
      this.startMarketEventMonitoring(event.market);

    } catch (error) {
      console.error(`❌ Error syncing market ${event.question}:`, error);
    }
  }

  /**
   * Get all MarketCreated events from the factory contract
   */
  private static async getMarketCreatedEvents(
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<MarketCreatedEvent[]> {
    const events: MarketCreatedEvent[] = [];

    // Process in chunks to avoid RPC limits
    for (let currentBlock = fromBlock; currentBlock <= toBlock; currentBlock += this.SYNC_BLOCK_RANGE) {
      const endBlock = currentBlock + this.SYNC_BLOCK_RANGE > toBlock
        ? toBlock
        : currentBlock + this.SYNC_BLOCK_RANGE;

      try {
        const logs = await publicClient.getLogs({
          address: FACTORY_CONTRACT_ADDRESS,
          events: FACTORY_ABI_EVENTS,
          fromBlock: currentBlock,
          toBlock: endBlock,
        });

        for (const log of logs) {
          if (log.eventName === 'MarketCreated' && log.args.market && log.args.creator) {
            events.push({
              market: log.args.market as Address,
              creator: log.args.creator as Address,
              question: log.args.question as string,
              endTime: log.args.endTime as bigint,
              marketIndex: log.args.marketIndex as bigint,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            });
          }
        }

      } catch (error) {
        console.error(`❌ Error fetching logs for blocks ${currentBlock}-${endBlock}:`, error);
      }
    }

    return events.sort((a, b) => Number(a.blockNumber - b.blockNumber));
  }

  /**
   * Start monitoring a specific market for bet and resolution events
   */
  private static async startMarketEventMonitoring(marketAddress: Address): Promise<void> {
    console.log(`👀 Starting event monitoring for market: ${marketAddress}`);

    try {
      // Get current block as starting point
      const currentBlock = await publicClient.getBlockNumber();

      // Set up periodic polling for this market
      setInterval(async () => {
        await this.syncMarketEvents(marketAddress, currentBlock);
      }, 30000); // Poll every 30 seconds

    } catch (error) {
      console.error(`❌ Error starting monitoring for ${marketAddress}:`, error);
    }
  }

  /**
   * Sync events for a specific market (bets, resolutions)
   */
  private static async syncMarketEvents(
    marketAddress: Address,
    fromBlock: bigint
  ): Promise<void> {
    try {
      const toBlock = await publicClient.getBlockNumber();

      // Get bet events
      const betLogs = await publicClient.getLogs({
        address: marketAddress,
        events: [MARKET_ABI_EVENTS[0]], // BetPlaced event
        fromBlock,
        toBlock,
      });

      // Get resolution events
      const resolutionLogs = await publicClient.getLogs({
        address: marketAddress,
        events: [MARKET_ABI_EVENTS[1]], // MarketResolved event
        fromBlock,
        toBlock,
      });

      // Process bet events
      for (const log of betLogs) {
        if (log.eventName === 'BetPlaced' && log.args.bettor) {
          await this.processBetEvent({
            market: marketAddress,
            bettor: log.args.bettor as Address,
            side: log.args.side as boolean,
            amount: log.args.amount as bigint,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }
      }

      // Process resolution events
      for (const log of resolutionLogs) {
        if (log.eventName === 'MarketResolved' && log.args.outcome !== undefined) {
          await this.processResolutionEvent({
            market: marketAddress,
            outcome: log.args.outcome as boolean,
            timestamp: log.args.timestamp as bigint,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }
      }

    } catch (error) {
      console.error(`❌ Error syncing events for market ${marketAddress}:`, error);
    }
  }

  /**
   * Process a bet event and update database
   */
  private static async processBetEvent(event: BetPlacedEvent): Promise<void> {
    try {
      // Find the market in database
      const markets = await SupabaseService.getMarkets(1000);
      const market = markets.find(m =>
        m.contract_address?.toLowerCase() === event.market.toLowerCase()
      );

      if (!market) {
        console.warn(`⚠️  Market not found for address: ${event.market}`);
        return;
      }

      // Convert amount from wei to USDC (6 decimals)
      const amount = Number(event.amount) / 1e6;

      // Create user prediction record
      await SupabaseService.createPrediction({
        market_id: market.id,
        user_id: event.bettor.toLowerCase(),
        side: event.side ? 'yes' : 'no',
        amount,
        shares_received: amount, // 1:1 ratio for parimutuel
        transaction_hash: event.transactionHash,
      });

      // Update market pools
      const currentPools = {
        yes_pool: market.yes_pool,
        no_pool: market.no_pool,
      };

      if (event.side) {
        currentPools.yes_pool += amount;
      } else {
        currentPools.no_pool += amount;
      }

      await SupabaseService.updateMarket(market.id, currentPools);

      console.log(`💰 Processed bet: ${amount} USDC on ${event.side ? 'YES' : 'NO'} for ${market.question}`);

    } catch (error) {
      console.error('❌ Error processing bet event:', error);
    }
  }

  /**
   * Process a market resolution event
   */
  private static async processResolutionEvent(event: MarketResolvedEvent): Promise<void> {
    try {
      // Find the market in database
      const markets = await SupabaseService.getMarkets(1000);
      const market = markets.find(m =>
        m.contract_address?.toLowerCase() === event.market.toLowerCase()
      );

      if (!market) {
        console.warn(`⚠️  Market not found for address: ${event.market}`);
        return;
      }

      // Update market resolution
      await SupabaseService.updateMarket(market.id, {
        resolved: true,
        outcome: event.outcome,
        resolution_time: new Date(Number(event.timestamp) * 1000).toISOString(),
      });

      console.log(`🏁 Market resolved: ${market.question} - Outcome: ${event.outcome ? 'YES' : 'NO'}`);

    } catch (error) {
      console.error('❌ Error processing resolution event:', error);
    }
  }

  /**
   * Categorize a market based on its question text
   */
  private static categorizeMarket(question: string): string {
    const q = question.toLowerCase();

    // Crypto patterns
    if (q.includes('btc') || q.includes('bitcoin') || q.includes('eth') || q.includes('ethereum') ||
      q.includes('crypto') || q.includes('sol') || q.includes('solana') || q.includes('usd') ||
      q.includes('market cap') || q.includes('dominance') || q.includes('exchange')) {
      return 'crypto';
    }

    // Current affairs patterns
    if (q.includes('earthquake') || q.includes('usgs') || q.includes('opec') || q.includes('oil') ||
      q.includes('gold') || q.includes('airline') || q.includes('sanctions') || q.includes('currency') ||
      q.includes('un security') || q.includes('weather')) {
      return 'current-affairs';
    }

    // Politics patterns
    if (q.includes('white house') || q.includes('parliament') || q.includes('confidence') ||
      q.includes('political') || q.includes('resignation') || q.includes('trade restrictions') ||
      q.includes('protest') || q.includes('head of state') || q.includes('federal agency')) {
      return 'politics';
    }

    // Technology patterns
    if (q.includes('apple') || q.includes('tech company') || q.includes('openai') || q.includes('anthropic') ||
      q.includes('google') || q.includes('social media') || q.includes('acquisition') || q.includes('ai') ||
      q.includes('cybersecurity') || q.includes('cloud provider') || q.includes('aws') || q.includes('azure') ||
      q.includes('gaming') || q.includes('ev manufacturer')) {
      return 'technology';
    }

    // Sports patterns
    if (q.includes('champions league') || q.includes('nba') || q.includes('nfl') || q.includes('basketball') ||
      q.includes('tennis') || q.includes('sports') || q.includes('athlete') || q.includes('injury') ||
      q.includes('world record') || q.includes('triple-double') || q.includes('upset')) {
      return 'sports';
    }

    // Default fallback
    return 'crypto';
  }

  /**
   * Manual trigger to sync specific market by contract address
   */
  static async syncMarketByAddress(contractAddress: Address): Promise<void> {
    console.log(`🎯 Syncing specific market: ${contractAddress}`);

    try {
      // Get market creation event for this specific address
      const logs = await publicClient.getLogs({
        address: FACTORY_CONTRACT_ADDRESS,
        events: FACTORY_ABI_EVENTS,
        fromBlock: this.FACTORY_DEPLOY_BLOCK,
        toBlock: 'latest',
      });

      const marketEvent = logs.find(log =>
        log.eventName === 'MarketCreated' &&
        log.args.market.toLowerCase() === contractAddress.toLowerCase()
      );

      if (!marketEvent) {
        throw new Error(`Market creation event not found for address: ${contractAddress}`);
      }

      const event: MarketCreatedEvent = {
        market: marketEvent.args.market,
        creator: marketEvent.args.creator,
        question: marketEvent.args.question,
        endTime: marketEvent.args.endTime,
        marketIndex: marketEvent.args.marketIndex,
        transactionHash: marketEvent.transactionHash,
        blockNumber: marketEvent.blockNumber,
      };

      await this.syncSingleMarket(event);

      console.log(`✅ Successfully synced market: ${contractAddress}`);

    } catch (error) {
      console.error(`❌ Error syncing market ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Update factory contract address (call this after deployment)
   */
  static setFactoryAddress(address: Address): void {
    // Note: In production, this would be stored in environment variables
    console.log(`🏭 Factory address set to: ${address}`);
  }
}

export default ContractSyncService;