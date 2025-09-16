#!/usr/bin/env tsx

/**
 * Script to check what's in the Supabase database and understand the schema
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabaseSchema() {
  console.log('🔍 Checking Supabase database schema and existing data...\n');

  try {
    // Check existing markets
    console.log('📊 Checking existing markets...');
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('*')
      .limit(5);

    if (marketsError) {
      console.error('❌ Error fetching markets:', marketsError);
    } else {
      console.log(`✅ Found ${markets?.length || 0} existing markets`);
      if (markets && markets.length > 0) {
        console.log('📋 Sample market structure:');
        console.log(JSON.stringify(markets[0], null, 2));
        
        console.log('\n🔑 Available columns:');
        Object.keys(markets[0]).forEach(key => {
          console.log(`   - ${key}: ${typeof markets[0][key]}`);
        });
      } else {
        console.log('💡 No existing markets found - database is empty');
      }
    }

    // Try to create a simple test market to understand the schema
    console.log('\n🧪 Testing market creation with minimal data...');
    const testMarket = {
      question: "Test market for schema discovery",
      category: "crypto",
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      resolved: false
    };

    const { data: testResult, error: testError } = await supabase
      .from('markets')
      .insert(testMarket)
      .select()
      .single();

    if (testError) {
      console.error('❌ Test market creation failed:', testError);
      console.log('💡 This tells us what columns are required/missing');
    } else {
      console.log('✅ Test market created successfully!');
      console.log('📝 Created market:', JSON.stringify(testResult, null, 2));
      
      // Clean up test market
      await supabase.from('markets').delete().eq('id', testResult.id);
      console.log('🧹 Test market cleaned up');
    }

  } catch (error) {
    console.error('💥 Database check failed:', error);
  }
}

// Run the check
checkDatabaseSchema()
  .then(() => {
    console.log('\n✅ Database schema check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Schema check failed:', error);
    process.exit(1);
  });