#!/usr/bin/env tsx

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { createPublicClient, http, parseAbiItem, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

// Environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Contract addresses from deployment
const FACTORY_ADDRESS = '0x89332E711B591DEeAC1a67b4ED5086a209a7414E' as Address;
const DEPLOYMENT_BLOCK = BigInt(31699964); // Latest deployment block

interface DeployedMarket {
  contractAddress: string;
  question: string;
  category: string;
  creatorAddress: string;
  transactionHash: string;
  blockNumber: number;
  marketIndex: number;
}

/**
 * Main script to sync all deployed markets from CreateMarkets.s.sol to Supabase
 */
async function syncDeployedMarkets() {
  console.log('🚀 Starting sync of deployed contract markets...');
  console.log('='.repeat(50));

  try {
    // Validate environment
    await validateEnvironment();

    // Get all deployed markets from contract events
    console.log('🔍 Fetching deployed markets from blockchain...');
    const deployedMarkets = await getDeployedMarkets();

    console.log(`📊 Found ${deployedMarkets.length} deployed markets`);
    if (deployedMarkets.length === 0) {
      console.log('ℹ️  No markets found. Make sure the factory contract has been deployed and markets created.');
      return;
    }

    // Sync each market to database
    console.log('💾 Syncing markets to database...');
    let syncedCount = 0;
    let errorCount = 0;

    for (const market of deployedMarkets) {
      try {
        await syncMarketToDatabase(market);
        syncedCount++;
        console.log(`✅ Synced: ${market.question.substring(0, 50)}...`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to sync market: ${error}`);
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Summary
    console.log('\n📈 Sync Summary:');
    console.log(`  ✅ Successfully synced: ${syncedCount} markets`);
    console.log(`  ❌ Failed to sync: ${errorCount} markets`);
    console.log(`  📊 Total processed: ${deployedMarkets.length} markets`);

    if (syncedCount > 0) {
      console.log('\n🎉 Markets are now available in the database!');
      console.log('🔗 They will appear in the UI with "Live Contract" indicators');
      console.log('💰 Users can now place real USDC bets on these markets');
    }

    // Start real-time monitoring
    if (syncedCount > 0) {
      console.log('\n👀 Real-time event monitoring available via ContractSyncService');
      console.log('💡 You can set up monitoring in your application using the contract-sync service');
    }

  } catch (error) {
    console.error('\n💥 Sync failed:', error);
    process.exit(1);
  }
}

/**
 * Validate that all required environment variables are set
 */
async function validateEnvironment(): Promise<void> {
  console.log('🔧 Validating environment...');

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  console.log(`🏭 Using Factory Address: ${FACTORY_ADDRESS}`);
  console.log(`📦 Starting from Block: ${DEPLOYMENT_BLOCK}`);

  // Test Supabase connection
  const { data, error } = await supabase.from('markets').select('count').limit(1);
  if (error) {
    throw new Error(`Failed to connect to Supabase: ${error.message}`);
  }

  console.log('✅ Environment validation passed');
}

/**
 * Get all deployed markets from the factory contract
 */
async function getDeployedMarkets(): Promise<DeployedMarket[]> {
  // Multiple RPC endpoints for better reliability
  const rpcUrls = [
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    'https://base-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
    'https://base-sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
    'https://sepolia.base.org',
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-sepolia.blockpi.network/v1/rpc/public'
  ].filter(Boolean); // Remove undefined values

  let publicClient;
  let lastError;

  // Try each RPC endpoint until one works
  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`🔗 Trying RPC endpoint: ${rpcUrl}`);
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

  const marketCreatedEvent = parseAbiItem('event MarketCreated(address indexed market, address indexed creator, string question, uint256 endTime, uint256 marketIndex)');

  try {
    const logs = await publicClient.getLogs({
      address: FACTORY_ADDRESS,
      event: marketCreatedEvent,
      fromBlock: DEPLOYMENT_BLOCK,
      toBlock: 'latest',
    });

    const markets: DeployedMarket[] = [];

    for (const log of logs) {
      if (log.args) {
        const market: DeployedMarket = {
          contractAddress: log.args.market.toLowerCase(),
          question: log.args.question,
          category: categorizeMarket(log.args.question),
          creatorAddress: log.args.creator.toLowerCase(),
          transactionHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          marketIndex: Number(log.args.marketIndex),
        };

        markets.push(market);
      }
    }

    return markets.sort((a, b) => a.marketIndex - b.marketIndex);

  } catch (error) {
    console.error('❌ Error fetching market events:', error);
    throw error;
  }
}

/**
 * Sync a single market to the database
 */
async function syncMarketToDatabase(market: DeployedMarket): Promise<void> {
  // Check if market already exists
  const { data: existingMarket } = await supabase
    .from('markets')
    .select('id')
    .eq('contract_address', market.contractAddress)
    .single();

  if (existingMarket) {
    console.log(`ℹ️  Market already exists in database: ${market.contractAddress}`);
    return;
  }

  // Insert new market
  const marketData = {
    question: market.question,
    category: market.category,
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    creator_address: market.creatorAddress,
    contract_address: market.contractAddress,
    transaction_hash: market.transactionHash,
    yes_pool: 0,
    no_pool: 0,
    total_yes_shares: 0,
    total_no_shares: 0,
    resolved: false,
    outcome: undefined,
  };

  const { data, error } = await supabase
    .from('markets')
    .insert(marketData)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }

  console.log(`💾 Created market in database with ID: ${data.id}`);
}

/**
 * Categorize market based on question content
 */
function categorizeMarket(question: string): string {
  const q = question.toLowerCase();

  // Use same categorization logic as in contract-sync.ts
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
 * Interactive mode for manual sync operations
 */
async function interactiveMode() {
  console.log('\n🎛️  Interactive Mode');
  console.log('Available commands:');
  console.log('  1. Sync all markets');
  console.log('  2. Check factory events');
  console.log('  3. Verify database state');
  console.log('  4. Monitor specific market');

  // Simple interactive implementation
  // In production, you'd use a proper CLI library like inquirer
  console.log('\nRunning: Sync all markets (default)');
  await syncDeployedMarkets();
}

/**
 * Update deployment info (to be called after running CreateMarkets.s.sol)
 */
export function updateDeploymentInfo(factoryAddress: string, deploymentBlock: string) {
  console.log('📝 Deployment Information Updated:');
  console.log(`  Factory Address: ${factoryAddress}`);
  console.log(`  Deployment Block: ${deploymentBlock}`);
  console.log('');
  console.log('💡 Run this script with the environment variables:');
  console.log(`  FACTORY_CONTRACT_ADDRESS=${factoryAddress}`);
  console.log(`  DEPLOYMENT_BLOCK_NUMBER=${deploymentBlock}`);
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--interactive')) {
    interactiveMode();
  } else if (args.includes('--help')) {
    console.log('🔮 SEER Contract Market Sync Tool');
    console.log('');
    console.log('Usage:');
    console.log('  npm run sync-markets              # Sync all deployed markets');
    console.log('  npm run sync-markets --interactive # Interactive mode');
    console.log('  npm run sync-markets --help       # Show this help');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  FACTORY_CONTRACT_ADDRESS          # ParimutuelMarketFactory address');
    console.log('  DEPLOYMENT_BLOCK_NUMBER           # Block where factory was deployed');
    console.log('  NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key');
  } else {
    syncDeployedMarkets()
      .then(() => {
        console.log('\n✨ Sync completed successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n💥 Sync failed:', error);
        process.exit(1);
      });
  }
}