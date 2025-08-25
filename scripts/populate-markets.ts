// Script to populate the database with tech, celebrity, and sports markets
// This should be run server-side or through a secure endpoint

import { createClient } from '@supabase/supabase-js';
import { expandedMarkets } from '../lib/expanded-markets';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Use service role key if available, otherwise anon key
const supabase = createClient(supabaseUrl, supabaseKey);

interface MarketInsert {
  question: string;
  category: string;
  end_time: string;
  creator_address?: string;
  contract_address?: string;
  transaction_hash?: string;
  yes_pool: number;
  no_pool: number;
  total_yes_shares: number;
  total_no_shares: number;
  resolved: boolean;
  outcome?: boolean;
}

async function populateMarkets() {
  console.log('🚀 Starting market population...');
  
  const allMarkets = expandedMarkets.all;
  const marketsToInsert: MarketInsert[] = [];
  
  // Convert market templates to database format
  for (const market of allMarkets) {
    const marketInsert: MarketInsert = {
      question: market.question,
      category: market.category,
      end_time: market.endTime,
      creator_address: '0x0000000000000000000000000000000000000000', // Placeholder creator
      contract_address: null, // Will be populated when markets are actually deployed
      transaction_hash: null, // Will be populated when markets are actually deployed
      yes_pool: 10000000, // 10 USDC in 6 decimals (10 * 10^6)
      no_pool: 10000000, // 10 USDC in 6 decimals (10 * 10^6)
      total_yes_shares: 0,
      total_no_shares: 0,
      resolved: false,
      outcome: null
    };
    
    marketsToInsert.push(marketInsert);
  }
  
  console.log(`📊 Prepared ${marketsToInsert.length} markets for insertion`);
  console.log(`  - Tech markets: ${expandedMarkets.tech.length}`);
  console.log(`  - Celebrity markets: ${expandedMarkets.celebrity.length}`);
  console.log(`  - Sports markets: ${expandedMarkets.sports.length}`);
  
  // Insert markets in batches to avoid overwhelming the database
  const batchSize = 10;
  let totalInserted = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < marketsToInsert.length; i += batchSize) {
    const batch = marketsToInsert.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('markets')
        .insert(batch)
        .select('id, question, category');
      
      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
        totalErrors += batch.length;
      } else {
        console.log(`✅ Inserted batch ${i / batchSize + 1}: ${data?.length} markets`);
        totalInserted += data?.length || 0;
        
        // Log some sample questions from this batch
        if (data && data.length > 0) {
          console.log(`   Sample questions:`);
          data.slice(0, 2).forEach(market => {
            console.log(`     - ${market.category}: ${market.question}`);
          });
        }
      }
    } catch (err) {
      console.error(`💥 Unexpected error in batch ${i / batchSize + 1}:`, err);
      totalErrors += batch.length;
    }
    
    // Add a small delay between batches to be respectful to the database
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📈 Population Summary:');
  console.log(`  ✅ Successfully inserted: ${totalInserted} markets`);
  console.log(`  ❌ Failed to insert: ${totalErrors} markets`);
  console.log(`  📊 Total processed: ${marketsToInsert.length} markets`);
  
  if (totalInserted > 0) {
    console.log('\n🎉 Market population completed successfully!');
    console.log('🔗 These markets can now be deployed on-chain using the CreateMarketEnhanced component.');
    console.log('💡 Tip: Users can select these templates and deploy them with real contract addresses.');
  }
}

// Check for existing markets to avoid duplicates
async function checkExistingMarkets() {
  console.log('🔍 Checking for existing markets...');
  
  const { data: existingMarkets, error } = await supabase
    .from('markets')
    .select('question, category')
    .in('category', ['tech', 'celebrity', 'sports']);
  
  if (error) {
    console.error('❌ Error checking existing markets:', error);
    return false;
  }
  
  console.log(`📊 Found ${existingMarkets?.length || 0} existing tech/celebrity/sports markets`);
  
  if (existingMarkets && existingMarkets.length > 0) {
    console.log('⚠️  Some markets already exist. This script will attempt to insert new ones.');
    console.log('   Database constraints will prevent duplicates.');
  }
  
  return true;
}

// Verify market categories are properly distributed
async function verifyMarketDistribution() {
  console.log('\n📊 Verifying market distribution...');
  
  const categories = ['tech', 'celebrity', 'sports'];
  
  for (const category of categories) {
    const { data, error } = await supabase
      .from('markets')
      .select('id')
      .eq('category', category);
    
    if (error) {
      console.error(`❌ Error checking ${category} markets:`, error);
    } else {
      console.log(`  ${category}: ${data?.length || 0} markets`);
    }
  }
}

// Main execution function
async function main() {
  try {
    console.log('🔮 SEER Market Population Script');
    console.log('================================\n');
    
    // Check Supabase connection
    const { data, error } = await supabase.from('markets').select('count').limit(1);
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    
    console.log('✅ Supabase connection successful\n');
    
    // Check existing markets
    const canProceed = await checkExistingMarkets();
    if (!canProceed) {
      throw new Error('Failed to check existing markets');
    }
    
    // Populate markets
    await populateMarkets();
    
    // Verify the results
    await verifyMarketDistribution();
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Test the CreateMarketEnhanced component with these templates');
    console.log('2. Deploy selected markets on-chain for real trading');
    console.log('3. Monitor market engagement and performance');
    
  } catch (error) {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
}

export { populateMarkets, checkExistingMarkets, verifyMarketDistribution };