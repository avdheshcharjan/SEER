/**
 * Debug script for USDC allowance issues
 * Run this to diagnose the current problem
 */

import { Address, parseUnits } from 'viem';
import { generateDebugReport, checkUSDCBalance } from '../lib/debug-usdc';
import { getMarketsWithContracts } from '../lib/blockchain';
import { SupabaseService } from '../lib/supabase';

async function debugCurrentIssue() {
    console.log('🔍 Debugging USDC Allowance Issue');
    console.log('=================================');

    // Replace with your actual wallet address
    const userAddress = process.env.DEBUG_WALLET_ADDRESS as Address;
    if (!userAddress) {
        console.error('❌ Please set DEBUG_WALLET_ADDRESS environment variable');
        process.exit(1);
    }

    try {
        // Get active markets from Supabase
        console.log('📊 Loading markets from Supabase...');
        const marketsWithInfluencers = await SupabaseService.getMarketsWithInfluencers();
        const activeMarkets = marketsWithInfluencers.filter(m =>
            !m.resolved && new Date(m.end_time) > new Date()
        );

        console.log(`Found ${activeMarkets.length} active markets`);

        // Get markets with deployed contracts
        const marketsWithContracts = getMarketsWithContracts(activeMarkets);
        console.log(`Found ${marketsWithContracts.length} markets with deployed contracts`);

        if (marketsWithContracts.length === 0) {
            console.error('❌ No markets with deployed contracts found');
            return;
        }

        // Extract contract addresses
        const marketAddresses = marketsWithContracts
            .map(m => m.contract_address)
            .filter(addr => addr && addr !== '0x0000000000000000000000000000000000000000') as Address[];

        console.log(`Market addresses to check: ${marketAddresses.length}`);
        marketAddresses.forEach((addr, i) => {
            console.log(`  ${i + 1}. ${addr}`);
        });
        console.log('');

        // Simulate a 4 USDC batch (4 x 1 USDC bets)
        const batchRequirement = parseUnits('4', 6); // 4 USDC

        // Generate comprehensive debug report
        const report = await generateDebugReport(userAddress, marketAddresses, batchRequirement);

        console.log('');
        console.log('🎯 SPECIFIC ISSUE ANALYSIS');
        console.log('==========================');

        if (!report.summary.sufficientBalance) {
            console.log('❌ ISSUE: Insufficient USDC balance');
            console.log(`   You need ${(Number(batchRequirement) / 10 ** 6).toFixed(2)} USDC but only have ${report.balance.formatted} USDC`);
        }

        if (report.summary.needsApproval > 0) {
            console.log(`❌ ISSUE: ${report.summary.needsApproval} markets need USDC approval`);
            console.log('   This is likely causing the "execution reverted" error');
        }

        // Check for common issues
        const invalidAddresses = marketAddresses.filter(addr =>
            !addr || addr === '0x0000000000000000000000000000000000000000'
        );

        if (invalidAddresses.length > 0) {
            console.log(`❌ ISSUE: ${invalidAddresses.length} invalid market addresses detected`);
        }

        console.log('');
        console.log('🔧 RECOMMENDED FIXES');
        console.log('====================');
        console.log('1. Ensure you have sufficient USDC balance');
        console.log('2. Approve USDC for each market contract that needs it');
        console.log('3. The error "execution reverted" is likely due to insufficient USDC allowance');
        console.log('4. Try approving 100 USDC for the first market as a test');

    } catch (error) {
        console.error('❌ Debug script failed:', error);

        if (error instanceof Error) {
            if (error.message.includes('Must be authenticated')) {
                console.log('💡 TIP: Check your RPC configuration and API keys');
            } else if (error.message.includes('network')) {
                console.log('💡 TIP: Check your network connection and RPC endpoints');
            }
        }
    }
}

// Run the debug script
if (require.main === module) {
    debugCurrentIssue()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

export { debugCurrentIssue };
