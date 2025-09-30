/**
 * USDC Debugging Utilities
 * Helper functions to debug USDC allowance and approval issues
 */

import { Address } from 'viem';
import { checkUSDCAllowance, formatUSDC, parseUSDC, USDC_CONFIG } from './usdc-allowance';
import { publicClient } from './viem-client';

/**
 * Debug USDC allowance for multiple markets
 */
export async function debugUSDCAllowances(
    userAddress: Address,
    marketAddresses: Address[],
    requiredAmount: bigint = parseUSDC('1') // Default 1 USDC
) {
    console.log('🔍 USDC Allowance Debug Report');
    console.log('================================');
    console.log(`User: ${userAddress}`);
    console.log(`Required per market: ${formatUSDC(requiredAmount)} USDC`);
    console.log('');

    const results = [];

    for (const marketAddress of marketAddresses) {
        try {
            const allowanceStatus = await checkUSDCAllowance(userAddress, marketAddress, requiredAmount);

            const result = {
                market: marketAddress,
                current: allowanceStatus.current,
                required: allowanceStatus.required,
                needsApproval: allowanceStatus.needsApproval,
                suggested: allowanceStatus.suggestedApproval
            };

            results.push(result);

            console.log(`Market: ${marketAddress}`);
            console.log(`  Current allowance: ${formatUSDC(allowanceStatus.current)} USDC`);
            console.log(`  Required amount: ${formatUSDC(allowanceStatus.required)} USDC`);
            console.log(`  Needs approval: ${allowanceStatus.needsApproval ? '❌ YES' : '✅ NO'}`);
            if (allowanceStatus.needsApproval) {
                console.log(`  Suggested approval: ${formatUSDC(allowanceStatus.suggestedApproval)} USDC`);
            }
            console.log('');

        } catch (error) {
            console.error(`❌ Failed to check allowance for ${marketAddress}:`, error);
            results.push({
                market: marketAddress,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return results;
}

/**
 * Check user's USDC balance
 */
export async function checkUSDCBalance(userAddress: Address): Promise<{
    balance: bigint;
    formatted: string;
}> {
    try {
        const balance = await publicClient.readContract({
            address: USDC_CONFIG.CONTRACT_ADDRESS,
            abi: [
                {
                    name: 'balanceOf',
                    type: 'function',
                    inputs: [{ name: 'account', type: 'address' }],
                    outputs: [{ name: '', type: 'uint256' }],
                    stateMutability: 'view'
                }
            ],
            functionName: 'balanceOf',
            args: [userAddress]
        }) as bigint;

        return {
            balance,
            formatted: formatUSDC(balance)
        };
    } catch (error) {
        console.error('Failed to check USDC balance:', error);
        throw error;
    }
}

/**
 * Generate approval transaction data for debugging
 */
export function generateApprovalTxData(spenderAddress: Address, amount: bigint = parseUSDC('100')) {
    const { encodeFunctionData } = require('viem');

    const approvalData = encodeFunctionData({
        abi: USDC_CONFIG.ABI,
        functionName: 'approve',
        args: [spenderAddress, amount]
    });

    return {
        to: USDC_CONFIG.CONTRACT_ADDRESS,
        data: approvalData,
        value: 0,
        description: `Approve ${formatUSDC(amount)} USDC for ${spenderAddress}`
    };
}

/**
 * Comprehensive debug report
 */
export async function generateDebugReport(
    userAddress: Address,
    marketAddresses: Address[],
    batchRequirement: bigint
) {
    console.log('🚀 COMPREHENSIVE USDC DEBUG REPORT');
    console.log('===================================');

    try {
        // Check USDC balance
        const balance = await checkUSDCBalance(userAddress);
        console.log(`💰 USDC Balance: ${balance.formatted} USDC`);
        console.log(`📊 Batch Requirement: ${formatUSDC(batchRequirement)} USDC`);
        console.log(`✅ Sufficient Balance: ${balance.balance >= batchRequirement ? 'YES' : 'NO'}`);
        console.log('');

        // Check allowances for each market
        const allowanceResults = await debugUSDCAllowances(userAddress, marketAddresses, batchRequirement);

        // Summary
        const needsApproval = allowanceResults.filter(r => !r.error && r.needsApproval).length;
        const totalMarkets = marketAddresses.length;

        console.log('📋 SUMMARY');
        console.log(`Total markets: ${totalMarkets}`);
        console.log(`Markets needing approval: ${needsApproval}`);
        console.log(`Markets with sufficient allowance: ${totalMarkets - needsApproval}`);

        if (needsApproval > 0) {
            console.log('');
            console.log('🔧 RECOMMENDED ACTIONS:');
            console.log('1. Approve USDC for each market that needs it');
            console.log('2. Consider bulk approval of 100 USDC per market to reduce future transactions');
            console.log('3. Check that all market addresses are valid and deployed');
        }

        return {
            balance,
            allowanceResults,
            summary: {
                totalMarkets,
                needsApproval,
                sufficientBalance: balance.balance >= batchRequirement
            }
        };

    } catch (error) {
        console.error('❌ Debug report generation failed:', error);
        throw error;
    }
}
