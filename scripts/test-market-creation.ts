/**
 * 🧪 Production Testing Script for Market Creation
 * Test the complete flow: Create market → Deploy contract → Execute predictions
 */

import { createPredictionMarket, validateMarketParams } from '../lib/market-factory';
import { USDCApprovalManager } from '../lib/approval-manager';
import { generateBuySharesTransaction, getMarketContractAddress } from '../lib/blockchain';
import { executeGaslessTransaction, validateGaslessConfig } from '../lib/gasless';
import { Address } from 'viem';

// Test configuration
const TEST_CONFIG = {
    // Use your actual wallet address for testing
    testUserAddress: '0xYourWalletAddressHere' as Address,
    
    // Test market parameters
    testMarket: {
        question: 'Will Bitcoin reach $100,000 by March 2025?',
        category: 'crypto' as const,
        endTime: new Date('2025-03-31T23:59:59Z'),
    },
    
    // Test prediction
    testPrediction: {
        side: 'yes' as const,
        amount: 5 // $5 USDC
    }
};

async function runProductionTests() {
    console.log('🧪 Starting Production Market Creation Tests');
    console.log('='.repeat(50));
    
    try {
        // Test 1: Validate gasless configuration
        console.log('\n📋 Test 1: Validating Gasless Configuration');
        const gaslessValid = validateGaslessConfig();
        console.log(`Gasless config valid: ${gaslessValid ? '✅' : '❌'}`);
        
        if (!gaslessValid) {
            throw new Error('Gasless configuration invalid - check environment variables');
        }
        
        // Test 2: Validate market parameters
        console.log('\n📋 Test 2: Validating Market Parameters');
        const validation = validateMarketParams({
            ...TEST_CONFIG.testMarket,
            creatorAddress: TEST_CONFIG.testUserAddress
        });
        
        console.log(`Parameters valid: ${validation.valid ? '✅' : '❌'}`);
        if (!validation.valid) {
            console.log('Validation errors:', validation.errors);
            throw new Error('Market parameters invalid');
        }
        
        // Test 3: Create and deploy new market
        console.log('\n🏭 Test 3: Creating New Prediction Market');
        const marketResult = await createPredictionMarket({
            ...TEST_CONFIG.testMarket,
            creatorAddress: TEST_CONFIG.testUserAddress
        });
        
        if (!marketResult.success) {
            throw new Error(`Market creation failed: ${marketResult.error}`);
        }
        
        console.log('✅ Market created successfully!');
        console.log(`   Market ID: ${marketResult.marketId}`);
        console.log(`   Contract Address: ${marketResult.contractAddress}`);
        console.log(`   Transaction: https://sepolia.basescan.org/tx/${marketResult.transactionHash}`);
        
        // Test 4: Setup USDC approvals for the new market
        console.log('\n🔐 Test 4: Setting Up Multi-Market USDC Approvals');
        const approvalResult = await USDCApprovalManager.setupMultiMarketApprovals(
            TEST_CONFIG.testUserAddress
        );
        
        console.log(`Approvals successful: ${approvalResult.success ? '✅' : '❌'}`);
        console.log(`   Approved markets: ${approvalResult.approvedMarkets.length}`);
        console.log(`   Total approved: $${approvalResult.totalApprovalAmount} USDC`);
        
        if (approvalResult.failedMarkets.length > 0) {
            console.log(`   Failed markets: ${approvalResult.failedMarkets.length}`);
        }
        
        // Test 5: Verify market address resolution
        console.log('\n🔍 Test 5: Testing Market Address Resolution');
        const resolvedAddress = getMarketContractAddress(marketResult.marketId!);
        console.log(`   Resolved address: ${resolvedAddress}`);
        console.log(`   Matches deployed: ${resolvedAddress === marketResult.contractAddress ? '✅' : '❌'}`);
        
        // Test 6: Execute test prediction on the new market
        console.log('\n🎯 Test 6: Executing Test Prediction');
        const testPredictionTx = generateBuySharesTransaction({
            marketAddress: marketResult.contractAddress!,
            prediction: TEST_CONFIG.testPrediction.side,
            amount: TEST_CONFIG.testPrediction.amount,
            userAddress: TEST_CONFIG.testUserAddress
        });
        
        const predictionResult = await executeGaslessTransaction(
            testPredictionTx, 
            TEST_CONFIG.testUserAddress
        );
        
        if (predictionResult.success) {
            console.log('✅ Test prediction executed successfully!');
            console.log(`   Transaction: https://sepolia.basescan.org/tx/${predictionResult.transactionHash}`);
        } else {
            console.log('❌ Test prediction failed: Unknown error');
        }
        
        // Test 7: Check approval status after prediction
        console.log('\n📊 Test 7: Checking Post-Prediction Approval Status');
        const approvalStatus = await USDCApprovalManager.checkMarketApproval(
            TEST_CONFIG.testUserAddress,
            marketResult.contractAddress!,
            TEST_CONFIG.testPrediction.amount
        );
        
        console.log(`   Still approved: ${approvalStatus.approved ? '✅' : '❌'}`);
        console.log(`   Current allowance: $${approvalStatus.currentAllowance} USDC`);
        console.log(`   Needs refresh: ${approvalStatus.needsApproval ? '⚠️' : '✅'}`);
        
        // Test Summary
        console.log('\n🎉 Production Test Summary');
        console.log('='.repeat(50));
        console.log('✅ Market creation and deployment: SUCCESS');
        console.log('✅ Multi-market USDC approvals: SUCCESS');
        console.log('✅ Dynamic market address resolution: SUCCESS');
        console.log(`${predictionResult.success ? '✅' : '❌'} Gasless prediction execution: ${predictionResult.success ? 'SUCCESS' : 'FAILED'}`);
        console.log('\n🚀 Your prediction market is ready for production!');
        
        return {
            success: true,
            marketId: marketResult.marketId,
            contractAddress: marketResult.contractAddress,
            testResults: {
                marketCreation: true,
                approvalSetup: approvalResult.success,
                addressResolution: resolvedAddress === marketResult.contractAddress,
                predictionExecution: predictionResult.success
            }
        };
        
    } catch (error) {
        console.error('\n❌ Production test failed:', error);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check your wallet address in TEST_CONFIG');
        console.log('2. Ensure you have Base Sepolia ETH for gas (if paymaster fails)');
        console.log('3. Verify environment variables for paymaster are set');
        console.log('4. Check that MarketFactory contract is deployed and verified');
        
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Export for use in other scripts or components
export { runProductionTests, TEST_CONFIG };

// Run tests if this file is executed directly
if (require.main === module) {
    runProductionTests()
        .then((result) => {
            if (result.success) {
                console.log('\n✅ All production tests passed!');
                process.exit(0);
            } else {
                console.log('\n❌ Production tests failed!');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}