/**
 * Seed database with test users that have known addresses
 * Some addresses may have Basenames, allowing you to test the integration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test addresses - mix of known addresses and random ones
const TEST_USERS = [
  {
    id: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    wallet_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    handle: 'vitalik',
    name: 'Vitalik Buterin',
    win_rate: 88.5,
    total_predictions: 150,
    total_volume: '15000',
    profit_loss: 2500,
    current_streak: 12,
    best_streak: 28,
    verified_status: true,
    follower_count: 1000000,
    tags: ['crypto', 'ethereum']
  },
  {
    id: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    wallet_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    handle: 'testuser1',
    name: 'Test User One',
    win_rate: 75.2,
    total_predictions: 98,
    total_volume: '9800',
    profit_loss: 890,
    current_streak: 8,
    best_streak: 15,
    verified_status: false,
    follower_count: 5000,
    tags: ['crypto', 'defi']
  },
  {
    id: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    wallet_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    handle: 'testuser2',
    name: 'Test User Two',
    win_rate: 82.3,
    total_predictions: 120,
    total_volume: '12000',
    profit_loss: 1450,
    current_streak: 15,
    best_streak: 20,
    verified_status: true,
    follower_count: 8500,
    tags: ['sports', 'crypto']
  },
  {
    id: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    wallet_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    handle: 'testuser3',
    name: 'Test User Three',
    win_rate: 69.8,
    total_predictions: 87,
    total_volume: '8700',
    profit_loss: 345,
    current_streak: 3,
    best_streak: 11,
    verified_status: false,
    follower_count: 2300,
    tags: ['politics', 'tech']
  },
  {
    id: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    wallet_address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    handle: 'testuser4',
    name: 'Test User Four',
    win_rate: 91.5,
    total_predictions: 200,
    total_volume: '20000',
    profit_loss: 4200,
    current_streak: 22,
    best_streak: 35,
    verified_status: true,
    follower_count: 15000,
    tags: ['crypto', 'predictions']
  }
];

async function seedTestUsers() {
  console.log('🌱 Seeding test users with addresses...\n');

  for (const user of TEST_USERS) {
    try {
      const { data, error } = await supabase
        .from('influencer_profiles')
        .upsert(user, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`❌ Error inserting ${user.handle}:`, error.message);
      } else {
        console.log(`✅ Inserted/Updated: ${user.handle} (${user.wallet_address.slice(0, 10)}...)`);
      }
    } catch (err) {
      console.error(`❌ Exception for ${user.handle}:`, err);
    }
  }

  console.log('\n🎉 Seeding complete!\n');
  console.log('📝 Test Instructions:');
  console.log('1. Run: npm run dev');
  console.log('2. Visit: http://localhost:3000/test-basenames');
  console.log('3. Check the leaderboard: Look for these users');
  console.log('4. Addresses with Basenames will show names, others show 0x...\n');
}

// Run the seed
seedTestUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });