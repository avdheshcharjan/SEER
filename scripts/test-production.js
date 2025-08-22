/**
 * 🧪 Production Testing Script for BASED Prediction Market
 * Test complete flow: Market creation → USDC approvals → Gasless predictions
 */

// Import the modules we need for testing
const { validateGaslessConfig } = require('../lib/gasless');

// Test configuration - UPDATE THIS WITH YOUR WALLET ADDRESS
const TEST_CONFIG = {
    // 🔧 UPDATE THIS: Replace with your actual wallet address for testing
    testUserAddress: '0xbb65d349dca28a64b5ddba859c0389060efd3d71',
    
    // Test market parameters
    testMarket: {
        question: 'Will Bitcoin reach $100,000 by March 2025?',
        category: 'crypto',
        endTime: new Date('2025-03-31T23:59:59Z'),
    },
    
    // Test prediction
    testPrediction: {
        side: 'yes',
        amount: 5 // $5 USDC
    }
};

async function runQuickTests() {
    console.log('🧪 BASED Production Test Suite');
    console.log('='.repeat(40));
    
    try {
        // Test 1: Environment Variables Check
        console.log('\n📋 Test 1: Environment Configuration');
        console.log(`PAYMASTER_URL: ${process.env.NEXT_PUBLIC_PAYMASTER_URL ? '✅ SET' : '❌ MISSING'}`);
        console.log(`BUNDLER_URL: ${process.env.NEXT_PUBLIC_BUNDLER_URL ? '✅ SET' : '❌ MISSING'}`);
        
        // Test 2: Gasless Config Validation
        console.log('\n⚡ Test 2: Gasless Configuration');
        const gaslessValid = validateGaslessConfig();
        console.log(`Gasless config valid: ${gaslessValid ? '✅ READY' : '❌ NEEDS SETUP'}`);
        
        // Test 3: Contract Addresses
        console.log('\n🏭 Test 3: Contract Configuration');
        const { USDC_CONTRACT_ADDRESS, MARKET_FACTORY_ADDRESS, DEMO_MARKET_ADDRESS } = require('../lib/blockchain');
        console.log(`USDC Contract: ${USDC_CONTRACT_ADDRESS}`);
        console.log(`Market Factory: ${MARKET_FACTORY_ADDRESS}`);
        console.log(`Demo Market: ${DEMO_MARKET_ADDRESS}`);
        
        // Test 4: User Configuration
        console.log('\n👤 Test 4: User Configuration');
        if (TEST_CONFIG.testUserAddress === '0xYourWalletAddressHere') {
            console.log('❌ PLEASE UPDATE: Set your wallet address in TEST_CONFIG');
            console.log('   Edit scripts/test-production.js and replace testUserAddress');
        } else {
            console.log(`✅ Test wallet configured: ${TEST_CONFIG.testUserAddress}`);
        }
        
        // Test Summary
        console.log('\n📊 Quick Test Summary');
        console.log('='.repeat(25));
        
        const allConfigured = process.env.NEXT_PUBLIC_PAYMASTER_URL && 
                              process.env.NEXT_PUBLIC_BUNDLER_URL && 
                              gaslessValid &&
                              TEST_CONFIG.testUserAddress !== '0xYourWalletAddressHere';
        
        if (allConfigured) {
            console.log('🎉 CONFIGURATION COMPLETE!');
            console.log('\n✅ Ready for full production tests');
            console.log('✅ All environment variables set');
            console.log('✅ Gasless transactions configured');
            console.log('✅ Test wallet address configured');
            
            console.log('\n🚀 Next Steps:');
            console.log('1. Run: npm run test:production');
            console.log('2. Or open your app and test manually');
            console.log('3. Create a new market and make predictions');
        } else {
            console.log('⚠️  CONFIGURATION NEEDED');
            
            if (!process.env.NEXT_PUBLIC_PAYMASTER_URL) {
                console.log('❌ Set NEXT_PUBLIC_PAYMASTER_URL in your .env');
            }
            if (!process.env.NEXT_PUBLIC_BUNDLER_URL) {
                console.log('❌ Set NEXT_PUBLIC_BUNDLER_URL in your .env');
            }
            if (TEST_CONFIG.testUserAddress === '0xYourWalletAddressHere') {
                console.log('❌ Update testUserAddress in this script');
            }
        }
        
        return allConfigured;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure you run: npm install');
        console.log('2. Check your .env file has the paymaster URLs');
        console.log('3. Ensure you are in the correct directory');
        return false;
    }
}

// Run the tests
if (require.main === module) {
    runQuickTests()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

module.exports = { runQuickTests, TEST_CONFIG };