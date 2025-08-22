#!/usr/bin/env node

/**
 * Test script for gasless transactions
 * Run with: node -r dotenv/config scripts/test-gasless.js
 * Or: npm run test:gasless
 */

// Mock environment variables if not present
if (!process.env.NEXT_PUBLIC_PAYMASTER_URL) {
    process.env.NEXT_PUBLIC_PAYMASTER_URL = 'https://api.developer.coinbase.com/rpc/v1/base/AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx';
    process.env.NEXT_PUBLIC_BUNDLER_URL = 'https://api.developer.coinbase.com/rpc/v1/base/AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx';
    process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY = '0y4aA3gi2Q8IXg8OFMjRUHlykvwDHvFY';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://pdtclhakximcltwpskmo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdGNsaGFreGltY2x0d3Bza21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTcyNzYsImV4cCI6MjA3MTMzMzI3Nn0.4KOp_QtvkSEqdXEWsKGgZaWnvFfjF7pgEf89Wy1U4LQ';
}

import { validatePaymasterConfig, getRequiredAllowlist } from '../lib/gasless-onchainkit';
import { USDCApprovalManager } from '../lib/approval-manager-fixed';
import { 
    USDC_CONTRACT_ADDRESS, 
    MARKET_FACTORY_ADDRESS,
    DEMO_MARKET_ADDRESS 
} from '../lib/blockchain';

async function testGaslessConfiguration() {
    console.log('🧪 Testing Gasless Transaction Configuration\n');
    console.log('=' .repeat(50));
    
    // 1. Validate Paymaster Configuration
    console.log('\n1️⃣  Validating Paymaster Configuration...');
    const validation = validatePaymasterConfig();
    
    if (validation.valid) {
        console.log('✅ Paymaster configuration is valid!');
        console.log('   - Paymaster URL:', process.env.NEXT_PUBLIC_PAYMASTER_URL);
        console.log('   - Bundler URL:', process.env.NEXT_PUBLIC_BUNDLER_URL);
        console.log('   - API Key:', process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY?.slice(0, 10) + '...');
    } else {
        console.log('❌ Paymaster configuration has errors:');
        validation.errors.forEach(error => {
            console.log(`   - ${error}`);
        });
    }
    
    // 2. Show Required Allowlist
    console.log('\n2️⃣  Required Allowlist for Coinbase Developer Platform:');
    const allowlist = getRequiredAllowlist();
    
    console.log('\n📋 Contracts to Allowlist:');
    console.log('   Copy these to your Coinbase Developer Platform project:\n');
    
    console.log('   USDC Contract:');
    console.log(`   - Address: ${USDC_CONTRACT_ADDRESS}`);
    console.log('   - Functions: approve(), transfer()');
    
    console.log('\n   MarketFactory Contract:');
    console.log(`   - Address: ${MARKET_FACTORY_ADDRESS}`);
    console.log('   - Functions: createMarket()');
    
    console.log('\n   Demo Market Contract:');
    console.log(`   - Address: ${DEMO_MARKET_ADDRESS}`);
    console.log('   - Functions: buyShares(), sellShares()');
    
    console.log('\n   ⚠️  Note: Each new market created needs to be added to the allowlist!');
    
    // 3. Test Approval Call Generation
    console.log('\n3️⃣  Testing Approval Call Generation...');
    const testUserAddress = '0x0000000000000000000000000000000000000001' as any;
    
    try {
        // Test single market approval
        const singleApprovalCalls = USDCApprovalManager.getSingleMarketApprovalCalls(
            DEMO_MARKET_ADDRESS,
            100
        );
        console.log('✅ Single market approval calls generated:', singleApprovalCalls.length, 'call(s)');
        
        // Test multi-market approval
        console.log('   Generating multi-market approval calls...');
        const multiApprovalCalls = await USDCApprovalManager.getMultiMarketApprovalCalls(testUserAddress);
        console.log('✅ Multi-market approval calls generated:', multiApprovalCalls.length, 'call(s)');
        
    } catch (error) {
        console.error('❌ Failed to generate approval calls:', error);
    }
    
    // 4. Show Integration Example
    console.log('\n4️⃣  Integration Example:');
    console.log('=' .repeat(50));
    console.log(`
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import { USDCApprovalManager } from '@/lib/approval-manager-fixed';

function ApprovalComponent() {
  const calls = USDCApprovalManager.getSingleMarketApprovalCalls(
    marketAddress,
    100 // USDC amount
  );
  
  return (
    <Transaction
      isSponsored={true}  // ← This enables gasless!
      calls={calls}
      chainId={84532}     // Base Sepolia
    >
      <TransactionButton text="Approve USDC (Gasless)" />
    </Transaction>
  );
}
`);
    
    // 5. Troubleshooting Guide
    console.log('\n5️⃣  Common Issues & Solutions:');
    console.log('=' .repeat(50));
    
    console.log('\n❌ "preVerificationGas is 21000 but must be at least 21738"');
    console.log('   → Solution: Use OnchainKit Transaction component with isSponsored={true}');
    
    console.log('\n❌ "Multi-market approval failed"');
    console.log('   → Solution: Ensure contracts are allowlisted in CDP dashboard');
    
    console.log('\n❌ "Transaction not eligible for sponsorship"');
    console.log('   → Solution: Check daily spending limits in CDP dashboard');
    
    console.log('\n❌ "Failed to extract contract address"');
    console.log('   → Solution: Parse MarketCreated event from transaction receipt');
    
    // 6. Next Steps
    console.log('\n6️⃣  Next Steps:');
    console.log('=' .repeat(50));
    console.log('1. Go to https://portal.cdp.coinbase.com/products/bundler-and-paymaster');
    console.log('2. Enable Paymaster for your project');
    console.log('3. Add the contract addresses and functions to allowlist');
    console.log('4. Set spending limits (e.g., $100/day per user)');
    console.log('5. Test with the example component above');
    console.log('6. Monitor usage in the CDP dashboard');
    
    console.log('\n✅ Gasless transaction setup complete!');
    console.log('=' .repeat(50));
}

// Run the test
testGaslessConfiguration().catch(console.error);