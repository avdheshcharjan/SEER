#!/usr/bin/env tsx

/**
 * Example script demonstrating how to use the Event Monitor system
 *
 * This shows how to:
 * 1. Start continuous monitoring
 * 2. Perform one-time sync
 * 3. Check queue health
 * 4. Handle failed jobs
 */

import * as dotenv from 'dotenv';
dotenv.config();

import {
  EventMonitor,
  startEventMonitoring,
  stopEventMonitoring,
  performOneTimeEventSync,
  getEventQueueHealth,
  requeueFailedEvents,
  forceEventResync
} from '../lib/event-monitor';

async function main() {
  console.log('🔄 Event Monitor Example Script');
  console.log('='.repeat(50));

  try {
    // Example 1: Perform one-time sync to catch up
    console.log('\n📋 Example 1: One-time sync');
    await performOneTimeEventSync();

    // Example 2: Check queue health
    console.log('\n📊 Example 2: Queue health check');
    const health = await getEventQueueHealth();
    console.log('Queue status:', health);

    // Example 3: Requeue failed jobs if any
    console.log('\n🔄 Example 3: Requeue failed jobs');
    const requeuedCount = await requeueFailedEvents();
    console.log(`Requeued ${requeuedCount} failed jobs`);

    // Example 4: Start continuous monitoring (uncomment to enable)
    // console.log('\n🚀 Example 4: Start continuous monitoring');
    // await startEventMonitoring();
    //
    // // Let it run for a minute
    // console.log('Monitoring for 60 seconds...');
    // await new Promise(resolve => setTimeout(resolve, 60000));
    //
    // // Stop monitoring
    // stopEventMonitoring();
    // console.log('Stopped monitoring');

    // Example 5: Force resync from specific block (emergency use)
    // console.log('\n🚨 Example 5: Force resync from block');
    // await forceEventResync(BigInt(31700000)); // Start from specific block

    console.log('\n✅ Event monitor examples completed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--monitor')) {
    // Start continuous monitoring
    console.log('🚀 Starting continuous event monitoring...');
    console.log('Press Ctrl+C to stop');

    startEventMonitoring()
      .then(() => {
        console.log('✅ Event monitoring started');
      })
      .catch(error => {
        console.error('❌ Failed to start monitoring:', error);
        process.exit(1);
      });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      stopEventMonitoring();
      process.exit(0);
    });

  } else if (args.includes('--sync-once')) {
    // Perform one-time sync
    performOneTimeEventSync()
      .then(() => {
        console.log('✅ One-time sync completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Sync failed:', error);
        process.exit(1);
      });

  } else if (args.includes('--health')) {
    // Check queue health
    getEventQueueHealth()
      .then(health => {
        console.log('📊 Queue Health:', health);

        if (health.dead > 0) {
          console.log('⚠️ Warning: Dead jobs found!');
        }
        if (health.pending > 100) {
          console.log('⚠️ Warning: Large queue backlog!');
        }

        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Health check failed:', error);
        process.exit(1);
      });

  } else if (args.includes('--requeue')) {
    // Requeue failed jobs
    requeueFailedEvents()
      .then(count => {
        console.log(`✅ Requeued ${count} failed jobs`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Requeue failed:', error);
        process.exit(1);
      });

  } else if (args.includes('--help')) {
    console.log('🔄 Event Monitor Usage:');
    console.log('');
    console.log('  npm run event-monitor --monitor      # Start continuous monitoring');
    console.log('  npm run event-monitor --sync-once    # Perform one-time sync');
    console.log('  npm run event-monitor --health       # Check queue health');
    console.log('  npm run event-monitor --requeue      # Requeue failed jobs');
    console.log('  npm run event-monitor --help         # Show this help');
    console.log('');
    console.log('Environment Variables:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL            # Supabase project URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY           # Supabase service role key');
    console.log('  NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL    # RPC endpoint');
    console.log('');

  } else {
    // Run examples
    main();
  }
}