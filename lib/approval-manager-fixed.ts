import { Address, parseUnits } from 'viem';
import { SupabaseService } from './supabase';
import { generateBatchApprovalCalls } from './gasless-onchainkit';
import { USDC_CONTRACT_ADDRESS } from './blockchain';

export interface ApprovalStatus {
    marketAddress: Address;
    approved: boolean;
    allowanceAmount: number;
    lastUpdated: Date;
    needsRefresh: boolean;
}

/**
 * Smart USDC Approval Manager - Fixed Version
 * Uses OnchainKit's Transaction component for gasless approvals
 */
export class USDCApprovalManager {
    private static dailyLimit = 100; // $100 USDC daily limit
    private static batchSize = 5; // Approve 5 markets at once
    
    /**
     * Get transaction calls for multi-market approvals
     * This returns the calls array to be used with OnchainKit's Transaction component
     */
    static async getMultiMarketApprovalCalls(userAddress: Address) {
        console.log('Preparing multi-market USDC approval calls...');
        
        try {
            // Get active markets that need approval
            const activeMarkets = await SupabaseService.getDeployedMarkets();
            const marketsNeedingApproval = activeMarkets
                .filter(market => market.contract_address)
                .slice(0, this.batchSize); // Limit batch size
            
            if (marketsNeedingApproval.length === 0) {
                console.log('No markets need approval');
                return [];
            }
            
            const marketAddresses = marketsNeedingApproval
                .map(m => m.contract_address as Address)
                .filter(Boolean);
            
            // Generate batch approval calls
            const approvalAmount = parseUnits(this.dailyLimit.toString(), 6); // USDC has 6 decimals
            const calls = generateBatchApprovalCalls(marketAddresses, approvalAmount);
            
            console.log(`Generated approval calls for ${marketAddresses.length} markets`);
            
            return calls;
            
        } catch (error) {
            console.error('Failed to generate approval calls:', error);
            return [];
        }
    }
    
    /**
     * Get single market approval calls
     */
    static getSingleMarketApprovalCalls(marketAddress: Address, amount: number = 100) {
        const approvalAmount = parseUnits(amount.toString(), 6);
        
        return [{
            to: USDC_CONTRACT_ADDRESS,
            abi: [{
                name: 'approve',
                type: 'function',
                inputs: [
                    { name: 'spender', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                ],
                outputs: [{ name: '', type: 'bool' }],
                stateMutability: 'nonpayable'
            }],
            functionName: 'approve',
            args: [marketAddress, approvalAmount]
        }];
    }
    
    /**
     * Check if a market is already approved
     * This should be called before showing approval UI
     */
    static async checkApprovalStatus(
        userAddress: Address, 
        marketAddress: Address
    ): Promise<ApprovalStatus> {
        try {
            // In production, you'd check the actual allowance on-chain
            // For now, we'll check our database
            const approvalRecord = await SupabaseService.getApprovalStatus(
                userAddress,
                marketAddress
            );
            
            if (approvalRecord) {
                return {
                    marketAddress,
                    approved: approvalRecord.approved,
                    allowanceAmount: approvalRecord.amount,
                    lastUpdated: new Date(approvalRecord.updated_at),
                    needsRefresh: false
                };
            }
            
            return {
                marketAddress,
                approved: false,
                allowanceAmount: 0,
                lastUpdated: new Date(),
                needsRefresh: true
            };
            
        } catch (error) {
            console.error('Failed to check approval status:', error);
            return {
                marketAddress,
                approved: false,
                allowanceAmount: 0,
                lastUpdated: new Date(),
                needsRefresh: true
            };
        }
    }
    
    /**
     * Record successful approval in database
     */
    static async recordApproval(
        userAddress: Address,
        marketAddress: Address,
        amount: number,
        transactionHash: string
    ) {
        try {
            await SupabaseService.recordApproval({
                user_address: userAddress,
                market_address: marketAddress,
                amount,
                transaction_hash: transactionHash,
                approved: true,
                updated_at: new Date().toISOString()
            });
            
            console.log('Approval recorded in database');
        } catch (error) {
            console.error('Failed to record approval:', error);
        }
    }
    
    /**
     * Get markets that need approval
     */
    static async getMarketsNeedingApproval(userAddress: Address): Promise<Address[]> {
        try {
            const activeMarkets = await SupabaseService.getDeployedMarkets();
            const marketsToCheck: Address[] = [];
            
            for (const market of activeMarkets) {
                if (!market.contract_address) continue;
                
                const status = await this.checkApprovalStatus(
                    userAddress,
                    market.contract_address as Address
                );
                
                if (!status.approved || status.needsRefresh) {
                    marketsToCheck.push(market.contract_address as Address);
                }
            }
            
            return marketsToCheck;
            
        } catch (error) {
            console.error('Failed to get markets needing approval:', error);
            return [];
        }
    }
    
    /**
     * Estimate total approval needed for active trading
     */
    static estimateApprovalNeeded(marketCount: number): {
        totalAmount: number;
        perMarket: number;
        description: string;
    } {
        const perMarket = this.dailyLimit;
        const totalAmount = perMarket * Math.min(marketCount, this.batchSize);
        
        return {
            totalAmount,
            perMarket,
            description: `Approve ${totalAmount} USDC across ${Math.min(marketCount, this.batchSize)} markets (${perMarket} USDC per market daily limit)`
        };
    }
}