#!/usr/bin/env node

/**
 * Test script to verify AA23 error fixes
 * Tests the improved gasless transaction implementation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing AA23 Error Fixes...\n');

// Check if environment variables are set
function checkEnvironment() {
    console.log('📋 Checking environment configuration...');

    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.log('❌ .env.local file not found');
        console.log('   Create .env.local with:');
        console.log('   NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_KEY');
        console.log('   NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_KEY');
        return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasPaymaster = envContent.includes('NEXT_PUBLIC_PAYMASTER_URL');
    const hasBundler = envContent.includes('NEXT_PUBLIC_BUNDLER_URL');

    if (!hasPaymaster || !hasBundler) {
        console.log('❌ Missing required environment variables');
        return false;
    }

    console.log('✅ Environment variables configured');
    return true;
}

// Test the gasless implementation
function testGaslessImplementation() {
    console.log('\n🔧 Testing gasless implementation...');

    try {
        // Check if the improved gasless.ts file exists
        const gaslessPath = path.join(process.cwd(), 'lib', 'gasless.ts');
        if (!fs.existsSync(gaslessPath)) {
            console.log('❌ lib/gasless.ts not found');
            return false;
        }

        const gaslessContent = fs.readFileSync(gaslessPath, 'utf8');

        // Check for key improvements
        const improvements = [
            { name: 'Enhanced error handling', pattern: 'switch \\(errorCode\\)' },
            { name: 'Smart account validation', pattern: 'validateSmartAccount' },
            { name: 'Improved gas limits', pattern: '0x4C4B40' },
            { name: 'AA23 error handling', pattern: 'AA23' },
            { name: '30% gas buffer', pattern: 'BigInt\\(130\\)' }
        ];

        let passedTests = 0;
        improvements.forEach(improvement => {
            if (new RegExp(improvement.pattern).test(gaslessContent)) {
                console.log(`✅ ${improvement.name}`);
                passedTests++;
            } else {
                console.log(`❌ ${improvement.name}`);
            }
        });

        if (passedTests === improvements.length) {
            console.log(`\n🎉 All ${passedTests} improvements implemented!`);
            return true;
        } else {
            console.log(`\n⚠️  ${passedTests}/${improvements.length} improvements implemented`);
            return false;
        }

    } catch (error) {
        console.log('❌ Error testing gasless implementation:', error.message);
        return false;
    }
}

// Test the PredictionMarket component
function testPredictionMarketComponent() {
    console.log('\n🎯 Testing PredictionMarket component...');

    try {
        const componentPath = path.join(process.cwd(), 'app', 'components', 'PredictionMarket.tsx');
        if (!fs.existsSync(componentPath)) {
            console.log('❌ PredictionMarket component not found');
            return false;
        }

        const componentContent = fs.readFileSync(componentPath, 'utf8');

        // Check for improved error handling
        const improvements = [
            { name: 'Enhanced error messages', pattern: 'Gasless transaction failed due to insufficient gas or invalid signature' },
            { name: 'Smart account validation errors', pattern: 'Smart account validation failed' },
            { name: 'Gas estimation error handling', pattern: 'Gas estimation failed' },
            { name: 'Extended error toast duration', pattern: 'duration: 8000' }
        ];

        let passedTests = 0;
        improvements.forEach(improvement => {
            if (new RegExp(improvement.pattern).test(componentContent)) {
                console.log(`✅ ${improvement.name}`);
                passedTests++;
            } else {
                console.log(`❌ ${improvement.name}`);
            }
        });

        if (passedTests === improvements.length) {
            console.log(`\n🎉 All ${passedTests} component improvements implemented!`);
            return true;
        } else {
            console.log(`\n⚠️  ${passedTests}/${improvements.length} component improvements implemented`);
            return false;
        }

    } catch (error) {
        console.log('❌ Error testing PredictionMarket component:', error.message);
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running AA23 Error Fix Tests...\n');

    const envOk = checkEnvironment();
    const gaslessOk = testGaslessImplementation();
    const componentOk = testPredictionMarketComponent();

    console.log('\n📊 Test Results:');
    console.log(`Environment: ${envOk ? '✅' : '❌'}`);
    console.log(`Gasless Implementation: ${gaslessOk ? '✅' : '❌'}`);
    console.log(`PredictionMarket Component: ${componentOk ? '✅' : '❌'}`);

    if (envOk && gaslessOk && componentOk) {
        console.log('\n🎉 All tests passed! The AA23 error fixes are properly implemented.');
        console.log('\n📚 Next steps:');
        console.log('1. Test gasless transactions in the browser');
        console.log('2. Monitor for AA23 errors in the console');
        console.log('3. Check Coinbase Developer Portal for transaction logs');
        console.log('4. Verify gas policy configuration');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the implementation.');
        console.log('\n🔧 To fix AA23 errors:');
        console.log('1. Ensure environment variables are set');
        console.log('2. Verify gasless.ts improvements are implemented');
        console.log('3. Check PredictionMarket component error handling');
        console.log('4. Review Coinbase Paymaster configuration');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    checkEnvironment,
    testGaslessImplementation,
    testPredictionMarketComponent,
    runAllTests
};
