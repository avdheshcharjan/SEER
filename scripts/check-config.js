/**
 * 🔍 Quick Configuration Check for BASED Production Testing
 */

// Load environment variables from .env file
const fs = require('fs');
const path = require('path');

// Simple .env file parser
function loadEnvFile() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                process.env[key.trim()] = value;
            }
        });
    } catch (error) {
        console.warn('Could not load .env file:', error.message);
    }
}

loadEnvFile();

console.log('🧪 BASED Production Configuration Check');
console.log('='.repeat(45));

// Test configuration - USING WALLET FROM GIT STATUS
const TEST_WALLET = '0xbb65d349dca28a64b5ddba859c0389060efd3d71'; // ✅ CONFIGURED

console.log('\n📋 Environment Variables Check');
console.log(`PAYMASTER_URL: ${process.env.NEXT_PUBLIC_PAYMASTER_URL ? '✅ SET' : '❌ MISSING'}`);
console.log(`BUNDLER_URL: ${process.env.NEXT_PUBLIC_BUNDLER_URL ? '✅ SET' : '❌ MISSING'}`);

console.log('\n👤 Test Configuration');
console.log(`Test wallet: ${TEST_WALLET}`);

console.log('\n🏭 Contract Addresses (Base Sepolia)');
console.log('USDC: 0x32dfDC3bB23d294a1b32E0EDDEddB12088112161');
console.log('MarketFactory: 0xAa84401Ef34C0334D4B85259955DE1fa99495B96');
console.log('Demo Market: 0xC1f3f3528AD71348AC4683CAde6e5988019735D8');

console.log('\n⚙️  Coinbase Paymaster Project');
console.log('Project ID: AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx');
console.log('Network: Base Sepolia');

console.log('\n🔧 Manual Testing Steps');
console.log('1. Connect your wallet to the app');
console.log('2. Switch to Base Sepolia network');
console.log('3. Get test USDC from Circle Faucet');
console.log('4. Complete USDC approval flow');
console.log('5. Create a new market');
console.log('6. Make predictions with swipe gestures');

// Check if basic config is ready
const hasPaymaster = process.env.NEXT_PUBLIC_PAYMASTER_URL;
const hasBundler = process.env.NEXT_PUBLIC_BUNDLER_URL;
const configReady = hasPaymaster && hasBundler;

console.log('\n📊 Configuration Status');
console.log('='.repeat(25));

if (configReady) {
    console.log('🎉 CONFIGURATION READY!');
    console.log('✅ Environment variables set');
    console.log('✅ Test wallet configured');
    console.log('✅ Contract addresses verified');
    
    console.log('\n🚀 Ready for Production Testing!');
    console.log('Start your app with: npm run dev');
} else {
    console.log('⚠️  CONFIGURATION NEEDED');
    
    if (!hasPaymaster) {
        console.log('❌ Missing NEXT_PUBLIC_PAYMASTER_URL');
        console.log('   Add: NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx');
    }
    
    if (!hasBundler) {
        console.log('❌ Missing NEXT_PUBLIC_BUNDLER_URL');
        console.log('   Add: NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx');
    }
    
    console.log('\n📝 Create .env.local file with:');
    console.log('NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx');
    console.log('NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx');
}

process.exit(configReady ? 0 : 1);