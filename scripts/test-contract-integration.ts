#!/usr/bin/env tsx

/**
 * 🧪 Contract Integration Test Script
 * 
 * This script tests the integration between the frontend and the newly deployed contracts.
 * It verifies that all contract addresses are valid and can be connected to.
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, NETWORK_CONFIG } from '../lib/contracts';

// Create a public client for Base Sepolia
const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(NETWORK_CONFIG.rpcUrl),
});

async function testContractIntegration() {
    console.log('🚀 Starting Contract Integration Test');
    console.log('=====================================');
    console.log(`Network: ${NETWORK_CONFIG.name} (Chain ID: ${NETWORK_CONFIG.chainId})`);
    console.log(`Block Explorer: ${NETWORK_CONFIG.blockExplorer}`);
    console.log('');

    const results: { [key: string]: { success: boolean; error?: string; data?: any } } = {};

    // Test 1: Verify all contract addresses have deployed code
    console.log('📋 Test 1: Verifying Contract Deployments');
    console.log('------------------------------------------');

    for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
        try {
            const code = await publicClient.getBytecode({ address });
            const hasCode = code && code !== '0x' && code.length > 2;

            if (hasCode) {
                console.log(`✅ ${name}: ${address} - Contract deployed`);
                results[name] = { success: true, data: { address, hasCode: true } };
            } else {
                console.log(`❌ ${name}: ${address} - No contract code found`);
                results[name] = { success: false, error: 'No contract code found' };
            }
        } catch (error) {
            console.log(`❌ ${name}: ${address} - Error: ${error}`);
            results[name] = { success: false, error: String(error) };
        }
    }

    console.log('');

    // Test 2: Test basic contract function calls
    console.log('🔧 Test 2: Testing Contract Function Calls');
    console.log('-------------------------------------------');

    // Test ParimutuelMarketFactory
    try {
        const marketCount = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.PARIMUTUEL_MARKET_FACTORY,
            abi: CONTRACT_ABIS.PARIMUTUEL_MARKET_FACTORY,
            functionName: 'getMarketCount',
        });
        console.log(`✅ ParimutuelMarketFactory.getMarketCount(): ${marketCount}`);
        results['ParimutuelMarketFactory_getMarketCount'] = { success: true, data: marketCount };
    } catch (error) {
        console.log(`❌ ParimutuelMarketFactory.getMarketCount() failed: ${error}`);
        results['ParimutuelMarketFactory_getMarketCount'] = { success: false, error: String(error) };
    }

    // Test UMA ParimutuelMarketFactory
    try {
        const collateralToken = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.UMA_PARIMUTUEL_MARKET_FACTORY,
            abi: CONTRACT_ABIS.UMA_PARIMUTUEL_MARKET_FACTORY,
            functionName: 'collateralToken',
        });
        console.log(`✅ UMAParimutuelMarketFactory.collateralToken(): ${collateralToken}`);
        results['UMAParimutuelMarketFactory_collateralToken'] = { success: true, data: collateralToken };
    } catch (error) {
        console.log(`❌ UMAParimutuelMarketFactory.collateralToken() failed: ${error}`);
        results['UMAParimutuelMarketFactory_collateralToken'] = { success: false, error: String(error) };
    }

    // Test MarketResolver
    try {
        const bondAmount = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.MARKET_RESOLVER,
            abi: CONTRACT_ABIS.MARKET_RESOLVER,
            functionName: 'BOND_AMOUNT',
        });
        console.log(`✅ MarketResolver.BOND_AMOUNT(): ${formatUnits(bondAmount as bigint, 6)} USDC`);
        results['MarketResolver_BOND_AMOUNT'] = { success: true, data: bondAmount };
    } catch (error) {
        console.log(`❌ MarketResolver.BOND_AMOUNT() failed: ${error}`);
        results['MarketResolver_BOND_AMOUNT'] = { success: false, error: String(error) };
    }

    // Test Demo Traditional Market
    try {
        const question = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.DEMO_TRADITIONAL_MARKET,
            abi: CONTRACT_ABIS.TRADITIONAL_MARKET,
            functionName: 'question',
        });
        console.log(`✅ Demo Traditional Market question: "${question}"`);
        results['DemoTraditionalMarket_question'] = { success: true, data: question };
    } catch (error) {
        console.log(`❌ Demo Traditional Market.question() failed: ${error}`);
        results['DemoTraditionalMarket_question'] = { success: false, error: String(error) };
    }

    // Test Demo UMA Market
    try {
        const question = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.DEMO_UMA_MARKET,
            abi: CONTRACT_ABIS.UMA_MARKET,
            functionName: 'question',
        });
        console.log(`✅ Demo UMA Market question: "${question}"`);
        results['DemoUMAMarket_question'] = { success: true, data: question };
    } catch (error) {
        console.log(`❌ Demo UMA Market.question() failed: ${error}`);
        results['DemoUMAMarket_question'] = { success: false, error: String(error) };
    }

    console.log('');

    // Test 3: Test USDC contract
    console.log('💰 Test 3: Testing USDC Contract');
    console.log('----------------------------------');

    try {
        const usdcName = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.USDC,
            abi: [
                {
                    name: 'name',
                    type: 'function',
                    inputs: [],
                    outputs: [{ name: '', type: 'string' }],
                    stateMutability: 'view'
                }
            ],
            functionName: 'name',
        });
        console.log(`✅ USDC Token Name: ${usdcName}`);
        results['USDC_name'] = { success: true, data: usdcName };
    } catch (error) {
        console.log(`❌ USDC.name() failed: ${error}`);
        results['USDC_name'] = { success: false, error: String(error) };
    }

    console.log('');

    // Summary
    console.log('📊 Test Summary');
    console.log('================');

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
        console.log('');
        console.log('❌ Failed Tests:');
        Object.entries(results)
            .filter(([_, result]) => !result.success)
            .forEach(([testName, result]) => {
                console.log(`   - ${testName}: ${result.error}`);
            });
    }

    console.log('');
    console.log('🎯 Contract Integration Test Complete');

    // Export results for potential use in CI/CD
    return {
        success: failedTests === 0,
        totalTests,
        passedTests,
        failedTests,
        results
    };
}

// Run the test if this script is executed directly
if (require.main === module) {
    testContractIntegration()
        .then((results) => {
            if (!results.success) {
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

export { testContractIntegration };
