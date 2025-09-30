#!/usr/bin/env tsx

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Remove markets that don't have contract addresses
 * Following the user flow: deployed smart contracts → mapped with market.id → stored in database
 * Any market.id without a contract address should be removed
 */
async function cleanupUnmappedMarkets() {
  console.log('🧹 Starting cleanup of unmapped markets...');
  console.log('=' .repeat(50));

  try {
    // First, get all markets without contract addresses
    const { data: unmappedMarkets, error: fetchError } = await supabase
      .from('markets')
      .select('id, question, contract_address')
      .or('contract_address.is.null,contract_address.eq.');

    if (fetchError) {
      throw new Error(`Failed to fetch unmapped markets: ${fetchError.message}`);
    }

    console.log(`📊 Found ${unmappedMarkets?.length || 0} markets without contract addresses`);

    if (!unmappedMarkets || unmappedMarkets.length === 0) {
      console.log('✅ No unmapped markets found. Database is already clean!');
      return;
    }

    // Show what will be deleted
    console.log('\n🗑️  Markets to be removed:');
    unmappedMarkets.forEach((market, index) => {
      console.log(`${index + 1}. ${market.id} - ${market.question.substring(0, 60)}...`);
    });

    // Check for any related data that would be affected
    console.log('\n🔍 Checking for related data...');

    const marketIds = unmappedMarkets.map(m => m.id);

    // Check user predictions
    const { data: predictions, error: predError } = await supabase
      .from('user_predictions')
      .select('id, market_id')
      .in('market_id', marketIds);

    if (predError) {
      console.warn(`⚠️  Could not check user predictions: ${predError.message}`);
    } else {
      console.log(`📈 Found ${predictions?.length || 0} user predictions for these markets`);
    }

    // Check user positions
    const { data: positions, error: posError } = await supabase
      .from('user_positions')
      .select('id, market_id')
      .in('market_id', marketIds);

    if (posError) {
      console.warn(`⚠️  Could not check user positions: ${posError.message}`);
    } else {
      console.log(`💼 Found ${positions?.length || 0} user positions for these markets`);
    }

    // Proceed with deletion
    console.log('\n🗑️  Proceeding with deletion...');

    let deletedCount = 0;
    const batchSize = 10; // Delete in batches to avoid overwhelming the database

    for (let i = 0; i < marketIds.length; i += batchSize) {
      const batch = marketIds.slice(i, i + batchSize);

      const { error: deleteError } = await supabase
        .from('markets')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`❌ Failed to delete batch ${Math.floor(i/batchSize) + 1}: ${deleteError.message}`);
        continue;
      }

      deletedCount += batch.length;
      console.log(`✅ Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(marketIds.length/batchSize)} (${batch.length} markets)`);

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Verify cleanup
    const { data: remainingUnmapped, error: verifyError } = await supabase
      .from('markets')
      .select('id')
      .or('contract_address.is.null,contract_address.eq.');

    if (verifyError) {
      console.warn(`⚠️  Could not verify cleanup: ${verifyError.message}`);
    } else {
      console.log(`\n🔍 Verification: ${remainingUnmapped?.length || 0} unmapped markets remaining`);
    }

    // Get final count of markets with contracts
    const { data: mappedMarkets, error: mappedError } = await supabase
      .from('markets')
      .select('id')
      .not('contract_address', 'is', null);

    if (mappedError) {
      console.warn(`⚠️  Could not count mapped markets: ${mappedError.message}`);
    } else {
      console.log(`✅ ${mappedMarkets?.length || 0} markets with contract addresses remain in database`);
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`  🗑️  Markets removed: ${deletedCount}`);
    console.log(`  ✅ Markets with contracts: ${mappedMarkets?.length || 0}`);
    console.log(`  📊 Total processed: ${unmappedMarkets.length}`);

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('📝 User flow is now clean: deployed smart contracts → mapped with market.id → stored in database');

  } catch (error) {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log('🧹 SEER Market Cleanup Tool');
    console.log('');
    console.log('Removes markets that don\'t have contract addresses, ensuring the user flow:');
    console.log('deployed smart contracts → mapped with market.id → stored in database');
    console.log('');
    console.log('Usage:');
    console.log('  npm run cleanup-markets              # Clean unmapped markets');
    console.log('  npm run cleanup-markets --help       # Show this help');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key');
  } else {
    cleanupUnmappedMarkets()
      .then(() => {
        console.log('\n✨ Market cleanup completed successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n💥 Market cleanup failed:', error);
        process.exit(1);
      });
  }
}