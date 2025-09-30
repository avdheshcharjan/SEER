/**
 * ERC-4337 Configuration Validation Script
 * Run this to check if your gasless transaction setup is correct
 */

import { validateERC4337Config, generateERC4337DebugReport } from '../lib/erc4337-debug';

async function validateConfiguration() {
    console.log('🔍 Validating ERC-4337 Configuration for SEER');
    console.log('==============================================\n');

    // Validate Base Sepolia configuration
    const baseSepoliaConfig = validateERC4337Config(84532);

    console.log('📋 BASE SEPOLIA CONFIGURATION');
    console.log('------------------------------');
    console.log(`Status: ${baseSepoliaConfig.isValid ? '✅ Valid' : '❌ Invalid'}`);

    if (baseSepoliaConfig.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        baseSepoliaConfig.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error}`);
        });
    }

    if (baseSepoliaConfig.warnings.length > 0) {
        console.log('\n⚠️ WARNINGS:');
        baseSepoliaConfig.warnings.forEach((warning, i) => {
            console.log(`  ${i + 1}. ${warning}`);
        });
    }

    console.log('\n🔧 ENVIRONMENT VARIABLES:');
    console.log(`NEXT_PUBLIC_PAYMASTER_URL: ${baseSepoliaConfig.config.paymasterUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`NEXT_PUBLIC_BUNDLER_URL: ${baseSepoliaConfig.config.bundlerUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`NEXT_PUBLIC_ONCHAINKIT_API_KEY: ${baseSepoliaConfig.config.apiKey ? '✅ Set' : '❌ Missing'}`);

    if (baseSepoliaConfig.config.paymasterUrl) {
        console.log(`\n🔗 PAYMASTER URL: ${baseSepoliaConfig.config.paymasterUrl.substring(0, 50)}...`);
    }

    if (baseSepoliaConfig.config.bundlerUrl) {
        console.log(`🔗 BUNDLER URL: ${baseSepoliaConfig.config.bundlerUrl.substring(0, 50)}...`);
    }

    console.log('\n' + '='.repeat(50));

    if (baseSepoliaConfig.isValid) {
        console.log('🎉 CONFIGURATION IS VALID!');
        console.log('Your ERC-4337 setup should work correctly.');

        if (baseSepoliaConfig.warnings.length > 0) {
            console.log('\n💡 Consider addressing the warnings above for optimal performance.');
        }
    } else {
        console.log('❌ CONFIGURATION HAS ISSUES!');
        console.log('Please fix the errors above before testing gasless transactions.');

        console.log('\n🔧 QUICK FIXES:');
        console.log('1. Set missing environment variables in your .env file');
        console.log('2. Ensure URLs are from Coinbase Developer Platform');
        console.log('3. Verify your OnchainKit API key is correct');
        console.log('4. Check that your project is active on Coinbase Developer Platform');
    }

    console.log('\n📚 NEXT STEPS:');
    console.log('1. If configuration is valid, test with a small batch first');
    console.log('2. Check browser console for detailed error logs');
    console.log('3. Verify your contracts are allowlisted on the paymaster');
    console.log('4. Monitor the Tenderly simulation for specific error details');

    return baseSepoliaConfig.isValid;
}

// Run the validation
if (require.main === module) {
    validateConfiguration()
        .then((isValid) => {
            process.exit(isValid ? 0 : 1);
        })
        .catch((error) => {
            console.error('Validation failed:', error);
            process.exit(1);
        });
}

export { validateConfiguration };
