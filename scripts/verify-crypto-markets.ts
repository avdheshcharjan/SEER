#!/usr/bin/env tsx

/**
 * Script to verify our 10 crypto markets are actually in the Supabase database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const cryptoTokens = ['Bitcoin', 'Ethereum', 'Solana', 'Cardano', 'Polygon', 'Chainlink', 'Avalanche', 'Dogecoin', 'Binance', 'XRP'];

async function verifyCryptoMarkets() {
  console.log('🔍 Checking for our 10 crypto markets in Supabase database...\n');

  // Get all markets
  const { data: allMarkets, error: allError } = await supabase
    .from('markets')
    .select('*')
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('❌ Error fetching all markets:', allError);
    return;
  }

  console.log(`📊 Total markets in database: ${allMarkets?.length || 0}`);

  // Look for our crypto markets specifically
  const cryptoMarkets = allMarkets?.filter(market =>
    cryptoTokens.some(token => market.question?.includes(token))
  ) || [];

  console.log(`💰 Crypto markets found: ${cryptoMarkets.length}`);

  if (cryptoMarkets.length > 0) {
    console.log('\n✅ FOUND Crypto Markets:');
    cryptoMarkets.forEach((market, index) => {
      console.log(`${index + 1}. ${market.question}`);
      console.log(`   ID: ${market.id}`);
      console.log(`   Created: ${market.created_at}`);
      console.log(`   TX: ${market.transaction_hash || 'None'}`);
      console.log(`   Creator: ${market.creator_address || 'None'}`);
      console.log('');
    });
  } else {
    console.log('\n❌ NO crypto markets found!');

    // Show recent markets to debug
    console.log('\n🔍 Recent markets in database:');
    const recentMarkets = allMarkets?.slice(0, 10) || [];
    recentMarkets.forEach((market, index) => {
      console.log(`${index + 1}. ${market.question}`);
      console.log(`   Created: ${market.created_at}`);
    });
  }

  // Check for markets created in the last hour (should be our crypto markets)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentMarkets = allMarkets?.filter(market =>
    market.created_at > oneHourAgo
  ) || [];

  console.log(`\n⏰ Markets created in last hour: ${recentMarkets.length}`);

  if (recentMarkets.length > 0) {
    console.log('\n🕐 Recent markets:');
    recentMarkets.forEach((market, index) => {
      console.log(`${index + 1}. ${market.question}`);
      console.log(`   ID: ${market.id}`);
      console.log(`   Created: ${market.created_at}`);
      console.log(`   Creator: ${market.creator_address}`);
      console.log(`   TX: ${market.transaction_hash}`);
      console.log('');
    });
  }

  // Check by creator address
  const creatorAddress = '0x7579c7457F4151B1ae7078fAf9D4A30Af953bDeE';
  const { data: creatorMarkets, error: creatorError } = await supabase
    .from('markets')
    .select('*')
    .eq('creator_address', creatorAddress)
    .order('created_at', { ascending: false });

  console.log(`\n👤 Markets by creator ${creatorAddress}: ${creatorMarkets?.length || 0}`);

  if (creatorMarkets && creatorMarkets.length > 0) {
    console.log('\n👤 Creator markets:');
    creatorMarkets.forEach((market, index) => {
      console.log(`${index + 1}. ${market.question}`);
      console.log(`   Created: ${market.created_at}`);
    });
  }

  return {
    totalMarkets: allMarkets?.length || 0,
    cryptoMarkets: cryptoMarkets.length,
    recentMarkets: recentMarkets.length,
    creatorMarkets: creatorMarkets?.length || 0
  };
}

// Run the verification
verifyCryptoMarkets()
  .then(stats => {
    if (!stats) {
      console.error('❌ No stats returned from verification');
      process.exit(1);
      return;
    }

    console.log('\n📈 SUMMARY:');
    console.log(`   Total markets: ${stats.totalMarkets}`);
    console.log(`   Crypto markets: ${stats.cryptoMarkets}`);
    console.log(`   Recent markets: ${stats.recentMarkets}`);
    console.log(`   Creator markets: ${stats.creatorMarkets}`);

    if (stats.cryptoMarkets === 10) {
      console.log('\n🎉 SUCCESS: All 10 crypto markets found in database!');
    } else {
      console.log(`\n⚠️  ISSUE: Expected 10 crypto markets, found ${stats.cryptoMarkets}`);
    }

    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });