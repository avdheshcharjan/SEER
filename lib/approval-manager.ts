import { Address } from 'viem';
import { SupabaseService } from './supabase';
import { executeGaslessUSDCApproval } from './gasless';

export interface ApprovalStatus {
    marketAddress: Address;
    approved: boolean;
    allowanceAmount: number;
    lastUpdated: Date;
    needsRefresh: boolean;
}

/**
 * Smart USDC Approval Manager
 * Handles batch approvals for multiple markets with daily limits
 */
export class USDCApprovalManager {
    private static dailyLimit = 100; // $100 USDC daily limit
    private static batchSize = 5; // Approve 5 markets at once
    
    /**
     * Pre-approve USDC for active markets that need trading
     */
    static async setupMultiMarketApprovals(userAddress: Address): Promise<{
        success: boolean;
        approvedMarkets: Address[];
        failedMarkets: Address[];
        totalApprovalAmount: number;
    }> {
        console.log('Setting up multi-market USDC approvals...');
        
        try {
            // Get active markets that need approval
            const activeMarkets = await SupabaseService.getDeployedMarkets();
            const marketsNeedingApproval = activeMarkets
                .filter(market => market.contract_address)
                .slice(0, this.batchSize); // Limit batch size
                
            const approvedMarkets: Address[] = [];
            const failedMarkets: Address[] = [];
            let totalApprovalAmount = 0;
            
            // Batch approve markets
            for (const market of marketsNeedingApproval) {
                try {
                    const marketAddress = market.contract_address as Address;
                    
                    // Check if already approved
                    const currentApproval = await this.getCurrentApproval(userAddress, marketAddress);
                    
                    if (currentApproval >= this.dailyLimit) {
                        console.log(`Market ${marketAddress} already approved (${currentApproval} USDC)`);
                        approvedMarkets.push(marketAddress);
                        continue;
                    }
                    
                    // Execute gasless approval
                    console.log(`Approving ${this.dailyLimit} USDC for market ${marketAddress}...`);
                    const result = await executeGaslessUSDCApproval(
                        this.dailyLimit,
                        marketAddress,
                        userAddress
                    );
                    
                    if (result.success) {
                        approvedMarkets.push(marketAddress);
                        totalApprovalAmount += this.dailyLimit;
                        console.log(`Approved ${this.dailyLimit} USDC for market ${marketAddress}`);
                    } else {
                        failedMarkets.push(marketAddress);
                        console.warn(`Failed to approve market ${marketAddress}:`, result.error);
                    }
                    
                    // Small delay between approvals to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`Error approving market ${market.contract_address}:`, error);
                    failedMarkets.push(market.contract_address as Address);
                }
            }
            
            console.log(`Approval summary:`, {
                approved: approvedMarkets.length,
                failed: failedMarkets.length,
                totalAmount: totalApprovalAmount
            });
            
            return {
                success: approvedMarkets.length > 0,
                approvedMarkets,
                failedMarkets,
                totalApprovalAmount
            };
            
        } catch (error) {
            console.error('Multi-market approval failed:', error);
            return {
                success: false,
                approvedMarkets: [],
                failedMarkets: [],
                totalApprovalAmount: 0
            };
        }
    }
    
    /**
     * Check if a specific market has sufficient USDC approval
     */
    static async checkMarketApproval(
        userAddress: Address,
        marketAddress: Address,
        requiredAmount: number = 10
    ): Promise<{
        approved: boolean;
        currentAllowance: number;
        needsApproval: boolean;
    }> {
        try {
            const currentAllowance = await this.getCurrentApproval(userAddress, marketAddress);
            
            return {
                approved: currentAllowance >= requiredAmount,
                currentAllowance,
                needsApproval: currentAllowance < requiredAmount
            };
        } catch (error) {
            console.error('Failed to check market approval:', error);
            return {
                approved: false,
                currentAllowance: 0,
                needsApproval: true
            };
        }
    }
    
    /**
     * Get approval status for all markets for a user
     */
    static async getUserApprovedMarkets(userAddress: Address): Promise<ApprovalStatus[]> {
        try {
            const activeMarkets = await SupabaseService.getDeployedMarkets();
            const approvalStatuses: ApprovalStatus[] = [];
            
            for (const market of activeMarkets) {
                if (market.contract_address) {
                    const currentAllowance = await this.getCurrentApproval(
                        userAddress, 
                        market.contract_address as Address
                    );
                    
                    approvalStatuses.push({
                        marketAddress: market.contract_address as Address,
                        approved: currentAllowance >= this.dailyLimit,
                        allowanceAmount: currentAllowance,
                        lastUpdated: new Date(),
                        needsRefresh: currentAllowance < this.dailyLimit
                    });
                }
            }
            
            return approvalStatuses;
        } catch (error) {
            console.error('Failed to get user approved markets:', error);
            return [];
        }
    }
    
    /**
     * Get current USDC allowance for a market (placeholder)
     * In production, this would call the USDC contract's allowance() function
     */
    private static async getCurrentApproval(
        userAddress: Address,
        marketAddress: Address
    ): Promise<number> {
        try {
            // TODO: Call USDC.allowance(userAddress, marketAddress)
            // For now, return mock data
            
            // Simulate: some markets already approved, others not
            const mockApprovals: Record<string, number> = {
                '0xC1f3f3528AD71348AC4683CAde6e5988019735D8': 100, // Demo market
                // Other markets would be 0 (not approved)
            };
            
            return mockApprovals[marketAddress] || 0;
        } catch (error) {
            console.error('Failed to get current approval:', error);
            return 0;
        }
    }
}