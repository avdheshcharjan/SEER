#!/usr/bin/env tsx

/**
 * Script to create 10 crypto price prediction markets on Base Sepolia
 * Using UMA Optimistic Oracle for decentralized resolution
 * Markets will be created on-chain and registered in Supabase database
 */

import { createWalletClient, http, createPublicClient, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { processMarketCreation } from '../lib/market-factory-onchainkit';
import { MarketType } from '../lib/market-resolver';

// Market Factory ABI - only the functions we need
const MARKET_FACTORY_ABI = [
  {
    name: 'createMarket',
    type: 'function',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'isPlatformMarket', type: 'bool' }
    ],
    outputs: [{ name: 'market', type: 'address' }],
    stateMutability: 'nonpayable'
  }
] as const;

// Contract address from market-factory-onchainkit.ts (updated)
const MARKET_FACTORY_ADDRESS = '0x34A1D3fff3958843C43aD80F30b94c510645C316' as const;

// Set up wallet client
const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
if (!privateKey) {
  console.error('❌ PRIVATE_KEY environment variable required');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);
const client = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

// Public client for reading transaction receipts
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// 10 Crypto Price Prediction Markets
const cryptoMarkets = [
  {
    question: "Will Bitcoin (BTC) be above $110,000 by December 31, 2024?",
    description: "Bitcoin's continued institutional adoption and potential ETF inflows could drive price to new highs",
    duration: 24 // hours
  },
  {
    question: "Will Ethereum (ETH) reach $5,000 by end of 2024?",
    description: "Ethereum's upcoming upgrades and growing DeFi ecosystem may push price to new all-time highs",
    duration: 24
  },
  {
    question: "Will Solana (SOL) surpass $300 by December 2024?",
    description: "Solana's high-performance blockchain and growing ecosystem could drive significant price appreciation",
    duration: 24
  },
  {
    question: "Will Cardano (ADA) reach $2 by end of 2024?",
    description: "Cardano's smart contract developments and partnerships may lead to substantial price growth",
    duration: 24
  },
  {
    question: "Will Polygon (MATIC) be above $3 by December 2024?",
    description: "Polygon's layer-2 scaling solutions and zkEVM adoption could significantly increase token value",
    duration: 24
  },
  {
    question: "Will Chainlink (LINK) reach $100 by end of 2024?",
    description: "Chainlink's oracle network expansion and cross-chain integrations may drive major price appreciation",
    duration: 24
  },
  {
    question: "Will Avalanche (AVAX) surpass $150 by December 2024?",
    description: "Avalanche's subnet technology and institutional adoption could lead to significant price gains",
    duration: 24
  },
  {
    question: "Will Dogecoin (DOGE) reach $1 by end of 2024?",
    description: "Elon Musk's continued support and potential X (Twitter) integration could drive DOGE to $1",
    duration: 24
  },
  {
    question: "Will Binance Coin (BNB) be above $800 by December 2024?",
    description: "Binance ecosystem growth and BNB utility expansion may push price to new highs",
    duration: 24
  },
  {
    question: "Will XRP reach $5 by end of 2024?",
    description: "Ripple's legal clarity and institutional partnerships could lead to explosive price growth",
    duration: 24
  }
];

async function createMarket(question: string, durationHours: number) {
  try {
    console.log(`\n🚀 Creating market: "${question}"`);

    // Calculate end time (24 hours from now)
    const endTimeTimestamp = Math.floor(Date.now() / 1000) + (durationHours * 60 * 60);
    const endTime = BigInt(endTimeTimestamp);

    // Create market with UMA resolver (isPlatformMarket = true)
    const hash = await client.writeContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'createMarket',
      args: [question, endTime, true], // true = platform market (UMA resolver)
    });

    console.log(`✅ Transaction hash: ${hash}`);
    console.log(`🔗 View on Basescan: https://sepolia.basescan.org/tx/${hash}`);

    // Wait for transaction confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Process market creation - register in database
    console.log('📝 Registering market in database...');
    const result = await processMarketCreation(
      hash,
      question,
      'crypto', // category
      endTimeTimestamp,
      account.address,
      MarketType.PLATFORM // UMA resolver
    );

    if (result.success) {
      console.log(`✅ Market registered in database with ID: ${result.marketId}`);
      console.log(`📍 Contract address: ${result.contractAddress}`);
      return { success: true, hash, question, marketId: result.marketId, contractAddress: result.contractAddress };
    } else {
      console.error(`❌ Failed to register market in database: ${result.error}`);
      return { success: false, error: `Database registration failed: ${result.error}`, question };
    }

  } catch (error) {
    console.error(`❌ Failed to create market:`, error);
    return { success: false, error, question };
  }
}

async function createAllMarkets() {
  console.log('🎯 Creating 10 Crypto Price Prediction Markets on Base Sepolia');
  console.log('📍 Using UMA Optimistic Oracle for decentralized resolution');
  console.log(`🏭 Factory Address: ${MARKET_FACTORY_ADDRESS}`);
  console.log(`👤 Creator: ${account.address}`);
  console.log('\n' + '='.repeat(80) + '\n');

  const results = [];

  for (let i = 0; i < cryptoMarkets.length; i++) {
    const market = cryptoMarkets[i];
    console.log(`📊 Market ${i + 1}/${cryptoMarkets.length}`);

    const result = await createMarket(market.question, market.duration);
    results.push(result);

    // Wait between transactions to avoid nonce issues
    if (i < cryptoMarkets.length - 1) {
      console.log('⏱️  Waiting 3 seconds before next transaction...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 CRYPTO MARKETS CREATION SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successfully created: ${successful.length} markets`);
  console.log(`❌ Failed: ${failed.length} markets`);

  if (successful.length > 0) {
    console.log('\n🎉 SUCCESS - Created Markets:');
    successful.forEach((result, index) => {
      console.log(`${index + 1}. ${result.question}`);
      console.log(`   TX: https://sepolia.basescan.org/tx/${result.hash}`);
      console.log(`   Contract: ${result.contractAddress}`);
      console.log(`   DB ID: ${result.marketId}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n💥 FAILED Markets:');
    failed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.question}`);
      console.log(`   Error: ${result.error}`);
    });
  }

  console.log('\n🔗 Base Sepolia Network Info:');
  console.log(`   Chain ID: 84532`);
  console.log(`   RPC: https://sepolia.base.org`);
  console.log(`   Factory: ${MARKET_FACTORY_ADDRESS}`);
  console.log(`   Explorer: https://sepolia.basescan.org`);

  console.log('\n📋 All markets use:');
  console.log('   ⚡ 24-hour duration');
  console.log('   🔮 UMA Optimistic Oracle resolution');
  console.log('   💰 1000 USDC bond requirement for resolution');
  console.log('   ⏱️  2-hour challenge period');
  console.log('   🗄️  Registered in Supabase database');
  console.log('   🌐 Visible in frontend application');

  console.log(`\n🎯 Markets created successfully! Total: ${successful.length}/${cryptoMarkets.length}`);
  console.log('\n💡 All markets are now live and tradeable in the frontend!');
}

// Run the script
createAllMarkets().catch(console.error);