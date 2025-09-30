#!/usr/bin/env tsx

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface MarketAuditResult {
  id: string;
  question: string;
  contract_address: string | null;
  created_at: string;
  transaction_hash: string | null;
  creator_address: string | null;
}

/**
 * Main script to audit markets and identify which ones need to be removed
 */
async function auditMarkets() {
  console.log('🔍 Starting market audit...');
  console.log('='.repeat(60));

  try {
    // Validate environment
    await validateEnvironment();

    // Get all markets from database
    console.log('📊 Fetching all markets from database...');
    const allMarkets = await getAllMarkets();

    console.log(`\n📈 Total markets in database: ${allMarkets.length}`);

    // Separate markets with and without contract addresses
    const marketsWithContracts = allMarkets.filter(market =>
      market.contract_address && market.contract_address.trim() !== ''
    );

    const marketsWithoutContracts = allMarkets.filter(market =>
      !market.contract_address || market.contract_address.trim() === ''
    );

    // Display summary
    console.log('\n📊 AUDIT SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ Markets WITH contract addresses: ${marketsWithContracts.length}`);
    console.log(`❌ Markets WITHOUT contract addresses: ${marketsWithoutContracts.length}`);

    // Show details for markets with contracts
    if (marketsWithContracts.length > 0) {
      console.log('\n✅ MARKETS WITH CONTRACTS (KEEP THESE):');
      console.log('-'.repeat(60));
      marketsWithContracts.forEach((market, index) => {
        console.log(`${index + 1}. ID: ${market.id}`);
        console.log(`   Question: ${market.question.substring(0, 80)}...`);
        console.log(`   Contract: ${market.contract_address}`);
        console.log(`   Created: ${new Date(market.created_at).toLocaleDateString()}`);
        console.log('');
      });
    }

    // Show details for markets without contracts
    if (marketsWithoutContracts.length > 0) {
      console.log('\n❌ MARKETS WITHOUT CONTRACTS (SHOULD BE REMOVED):');
      console.log('-'.repeat(60));
      marketsWithoutContracts.forEach((market, index) => {
        console.log(`${index + 1}. ID: ${market.id}`);
        console.log(`   Question: ${market.question.substring(0, 80)}...`);
        console.log(`   Contract: ${market.contract_address || 'NULL'}`);
        console.log(`   Created: ${new Date(market.created_at).toLocaleDateString()}`);
        console.log('');
      });

      // Generate deletion commands
      console.log('\n🗑️  MARKET IDs TO DELETE:');
      console.log('-'.repeat(40));
      const idsToDelete = marketsWithoutContracts.map(market => market.id);
      console.log('Market IDs that should be removed:');
      idsToDelete.forEach((id, index) => {
        console.log(`${index + 1}. ${id}`);
      });

      console.log('\n📝 SQL DELETE COMMAND:');
      console.log('-'.repeat(40));
      console.log(`DELETE FROM markets WHERE id IN (${idsToDelete.map(id => `'${id}'`).join(', ')});`);

      console.log('\n🔧 SUPABASE DASHBOARD FILTER:');
      console.log('-'.repeat(40));
      console.log('To view these markets in Supabase dashboard, use this filter:');
      console.log('contract_address is null OR contract_address = \'\'');

      // Show related data that would be affected
      await checkRelatedData(idsToDelete);
    } else {
      console.log('\n🎉 All markets have contract addresses! No cleanup needed.');
    }

    console.log('\n✨ Audit completed successfully');

  } catch (error) {
    console.error('\n💥 Audit failed:', error);
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

  // Test Supabase connection
  const { data, error } = await supabase.from('markets').select('count').limit(1);
  if (error) {
    throw new Error(`Failed to connect to Supabase: ${error.message}`);
  }

  console.log('✅ Environment validation passed');
}

/**
 * Get all markets from the database
 */
async function getAllMarkets(): Promise<MarketAuditResult[]> {
  const { data, error } = await supabase
    .from('markets')
    .select('id, question, contract_address, created_at, transaction_hash, creator_address')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch markets: ${error.message}`);
  }

  return data || [];
}

/**
 * Check for related data that would be affected by deleting these markets
 */
async function checkRelatedData(marketIds: string[]): Promise<void> {
  if (marketIds.length === 0) return;

  console.log('\n🔍 CHECKING RELATED DATA:');
  console.log('-'.repeat(40));

  try {
    // Check user predictions
    const { data: predictions, error: predError } = await supabase
      .from('user_predictions')
      .select('market_id')
      .in('market_id', marketIds);

    if (predError) {
      console.log('⚠️  Could not check user_predictions table');
    } else {
      const predictionCount = predictions?.length || 0;
      console.log(`📊 User predictions that would be deleted: ${predictionCount}`);
      if (predictionCount > 0) {
        console.log('⚠️  WARNING: Deleting these markets will also remove user predictions!');
      }
    }

    // Check user positions
    const { data: positions, error: posError } = await supabase
      .from('user_positions')
      .select('market_id')
      .in('market_id', marketIds);

    if (posError) {
      console.log('⚠️  Could not check user_positions table');
    } else {
      const positionCount = positions?.length || 0;
      console.log(`💰 User positions that would be deleted: ${positionCount}`);
      if (positionCount > 0) {
        console.log('⚠️  WARNING: Deleting these markets will also remove user positions!');
      }
    }

    // Check influencer markets
    const { data: influencerMarkets, error: infError } = await supabase
      .from('influencer_markets')
      .select('market_id')
      .in('market_id', marketIds);

    if (infError) {
      console.log('⚠️  Could not check influencer_markets table (table may not exist)');
    } else {
      const influencerCount = influencerMarkets?.length || 0;
      console.log(`👑 Influencer market associations that would be deleted: ${influencerCount}`);
    }

  } catch (error) {
    console.log('⚠️  Error checking related data:', error);
  }
}

/**
 * Interactive mode for manual cleanup operations
 */
async function interactiveMode() {
  console.log('\n🎛️  Interactive Mode');
  console.log('Available commands:');
  console.log('  1. Audit markets (default)');
  console.log('  2. Delete markets without contracts (NOT IMPLEMENTED - use manual SQL)');
  console.log('  3. Show markets with contracts only');
  console.log('  4. Export market data');

  console.log('\nRunning: Audit markets (default)');
  await auditMarkets();
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--interactive')) {
    interactiveMode();
  } else if (args.includes('--help')) {
    console.log('🔮 SEER Market Audit Tool');
    console.log('');
    console.log('Purpose: Identify markets without contract addresses for cleanup');
    console.log('');
    console.log('Usage:');
    console.log('  npm run audit-markets              # Audit all markets');
    console.log('  npm run audit-markets --interactive # Interactive mode');
    console.log('  npm run audit-markets --help       # Show this help');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key (or anon key)');
    console.log('');
    console.log('Output:');
    console.log('  - List of all markets with their contract status');
    console.log('  - Market IDs that should be deleted');
    console.log('  - SQL command for bulk deletion');
    console.log('  - Warning about related data that would be affected');
  } else {
    auditMarkets()
      .then(() => {
        console.log('\n✨ Audit completed successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n💥 Audit failed:', error);
        process.exit(1);
      });
  }
}