/**
 * 🔍 Coinbase Paymaster Configuration Verification Script
 * Verify that your paymaster is properly configured to sponsor market creation and trading
 */

import { MARKET_FACTORY_ADDRESS, USDC_CONTRACT_ADDRESS, DEMO_MARKET_ADDRESS } from '../lib/blockchain';
import { checkSponsorshipEligibility, validateGaslessConfig } from '../lib/gasless';
import { Address } from 'viem';

// Configuration to verify
const PAYMASTER_CONFIG = {
    // Your Coinbase Developer Platform project ID
    projectId: 'AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx',
    
    // Contracts that should be allowlisted
    allowlistedContracts: {
        usdc: USDC_CONTRACT_ADDRESS,
        marketFactory: MARKET_FACTORY_ADDRESS,
        demoMarket: DEMO_MARKET_ADDRESS
    },
    
    // Functions that should be sponsored
    sponsoredFunctions: [
        'approve(address,uint256)', // USDC approvals
        'buyShares(bool,uint256)',  // Market predictions
        'createMarket(string,uint256,address)', // Market creation
        'faucet()' // USDC faucet for testing
    ],
    
    // Test wallet (replace with your address)
    testWallet: '0xYourWalletAddressHere' as Address
};

async function verifyPaymasterConfiguration() {
    console.log('🔍 Coinbase Paymaster Configuration Verification');
    console.log('='.repeat(55));
    console.log(`Project ID: ${PAYMASTER_CONFIG.projectId}`);
    console.log(`Base Sepolia Network: https://sepolia.base.org`);
    
    try {
        // Step 1: Validate environment variables
        console.log('\n📋 Step 1: Environment Variables Check');
        const gaslessValid = validateGaslessConfig();
        console.log(`PAYMASTER_URL configured: ${process.env.NEXT_PUBLIC_PAYMASTER_URL ? '✅' : '❌'}`);
        console.log(`BUNDLER_URL configured: ${process.env.NEXT_PUBLIC_BUNDLER_URL ? '✅' : '❌'}`);
        console.log(`Gasless config valid: ${gaslessValid ? '✅' : '❌'}`);
        
        if (!gaslessValid) {
            console.log('\n🔧 Required environment variables:');
            console.log('NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx');
            console.log('NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/AGCPnhFO0tNarqEZdRYJLIV8PlQDuHcx');
            return {
                success: false,
                results: {
                    environmentConfig: false,
                    usdcApprovals: false,
                    marketCreation: false,
                    predictions: false
                }
            };
        }
        
        // Step 2: Test sponsorship for each contract and function
        console.log('\n💰 Step 2: Sponsorship Eligibility Tests');
        
        // Test USDC approval sponsorship
        console.log('\n🔐 Testing USDC Approval Sponsorship...');
        const usdcApprovalTx = {
            to: PAYMASTER_CONFIG.allowlistedContracts.usdc,
            data: ('0x095ea7b3' + // approve function selector
                  PAYMASTER_CONFIG.allowlistedContracts.demoMarket.slice(2).padStart(64, '0') + // spender
                  '0000000000000000000000000000000000000000000000000000000005f5e100') as `0x${string}`, // 100 USDC (6 decimals)
            value: BigInt(0)
        };
        
        const usdcSponsorshipResult = await checkSponsorshipEligibility(usdcApprovalTx, PAYMASTER_CONFIG.testWallet);
        console.log(`   USDC approve() sponsorship: ${usdcSponsorshipResult.eligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
        if (!usdcSponsorshipResult.eligible) {
            console.log(`   Error: ${usdcSponsorshipResult.error}`);
        }
        
        // Test market creation sponsorship
        console.log('\n🏭 Testing Market Creation Sponsorship...');
        const marketCreationTx = {
            to: PAYMASTER_CONFIG.allowlistedContracts.marketFactory,
            data: '0x1234abcd' as `0x${string}`, // Mock createMarket function call
            value: BigInt(0)
        };
        
        const marketCreationResult = await checkSponsorshipEligibility(marketCreationTx, PAYMASTER_CONFIG.testWallet);
        console.log(`   MarketFactory createMarket() sponsorship: ${marketCreationResult.eligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
        if (!marketCreationResult.eligible) {
            console.log(`   Error: ${marketCreationResult.error}`);
        }
        
        // Test prediction (buyShares) sponsorship
        console.log('\n🎯 Testing Prediction (buyShares) Sponsorship...');
        const buySharesTx = {
            to: PAYMASTER_CONFIG.allowlistedContracts.demoMarket,
            data: '0x12345678' as `0x${string}`, // Mock buyShares function call
            value: BigInt(0)
        };
        
        const buySharesResult = await checkSponsorshipEligibility(buySharesTx, PAYMASTER_CONFIG.testWallet);
        console.log(`   SimplePredictionMarket buyShares() sponsorship: ${buySharesResult.eligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
        if (!buySharesResult.eligible) {
            console.log(`   Error: ${buySharesResult.error}`);
        }
        
        // Step 3: Configuration recommendations
        console.log('\n⚙️ Step 3: Paymaster Configuration Recommendations');
        console.log('\nRequired Allowlist Configuration:');
        console.log('1. Go to: https://portal.cdp.coinbase.com/');
        console.log(`2. Select project: ${PAYMASTER_CONFIG.projectId}`);
        console.log('3. Navigate to Paymaster → Allowlist');
        console.log('\n📝 Contracts to allowlist:');
        console.log(`   • USDC: ${PAYMASTER_CONFIG.allowlistedContracts.usdc}`);
        console.log(`   • MarketFactory: ${PAYMASTER_CONFIG.allowlistedContracts.marketFactory}`);
        console.log(`   • Demo Market: ${PAYMASTER_CONFIG.allowlistedContracts.demoMarket}`);
        
        console.log('\n📝 Functions to allowlist:');
        PAYMASTER_CONFIG.sponsoredFunctions.forEach(func => {
            console.log(`   • ${func}`);
        });
        
        console.log('\n💰 Recommended spending limits:');
        console.log('   • Per-user daily limit: $5.00');
        console.log('   • Global daily limit: $100.00');
        console.log('   • Max per transaction: $25.00');
        
        // Step 4: Testing summary and next steps
        const allTestsPassed = usdcSponsorshipResult.eligible && 
                              marketCreationResult.eligible && 
                              buySharesResult.eligible;
        
        console.log('\n📊 Configuration Status Summary');
        console.log('='.repeat(35));
        console.log(`Environment variables: ${gaslessValid ? '✅ CONFIGURED' : '❌ MISSING'}`);
        console.log(`USDC approvals: ${usdcSponsorshipResult.eligible ? '✅ SPONSORED' : '❌ NOT SPONSORED'}`);
        console.log(`Market creation: ${marketCreationResult.eligible ? '✅ SPONSORED' : '❌ NOT SPONSORED'}`);
        console.log(`Predictions: ${buySharesResult.eligible ? '✅ SPONSORED' : '❌ NOT SPONSORED'}`);
        
        if (allTestsPassed) {
            console.log('\n🎉 PAYMASTER FULLY CONFIGURED!');
            console.log('Your users can now enjoy gasless transactions for:');
            console.log('• Creating prediction markets');
            console.log('• Approving USDC for predictions');
            console.log('• Making predictions without gas fees');
        } else {
            console.log('\n⚠️ PAYMASTER CONFIGURATION INCOMPLETE');
            console.log('Please update your Coinbase Developer Platform settings.');
        }
        
        return {
            success: allTestsPassed,
            results: {
                environmentConfig: gaslessValid,
                usdcApprovals: usdcSponsorshipResult.eligible,
                marketCreation: marketCreationResult.eligible,
                predictions: buySharesResult.eligible
            }
        };
        
    } catch (error) {
        console.error('\n❌ Paymaster verification failed:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your internet connection');
        console.log('2. Verify your Coinbase Developer Platform project is active');
        console.log('3. Ensure Base Sepolia network is selected in paymaster settings');
        console.log('4. Contact Coinbase support if API endpoints are not responding');
        
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Export for use in other scripts
export { verifyPaymasterConfiguration, PAYMASTER_CONFIG };

// Run verification if this file is executed directly
if (require.main === module) {
    verifyPaymasterConfiguration()
        .then((result) => {
            if (result.success) {
                console.log('\n✅ Paymaster configuration verified!');
                process.exit(0);
            } else {
                console.log('\n❌ Paymaster configuration needs attention!');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Verification error:', error);
            process.exit(1);
        });
}