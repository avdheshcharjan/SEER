import { Address, parseUnits } from 'viem';
import { SupabaseService } from './supabase';
import { generateApprovalCalls } from './gasless-onchainkit';
import { USDC_CONTRACT_ADDRESS, MARKET_FACTORY_ADDRESS } from './blockchain';

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
     * Get transaction calls for USDC approval to the MarketFactory
     * This returns the calls array to be used with OnchainKit's Transaction component
     */
    static async getUSDCApprovalCalls(userAddress: Address) {
        console.log('Preparing USDC approval calls for MarketFactory...');
        
        try {
            // Approve a reasonable amount of USDC to the MarketFactory
            // The factory will handle transfers when users make predictions
            const approvalAmount = parseUnits('10000', 6); // Approve 10,000 USDC (can be adjusted)
            
            // Generate approval call for the MarketFactory contract
            const calls = generateApprovalCalls(
                MARKET_FACTORY_ADDRESS, // The spender is the MarketFactory
                approvalAmount
            );
            
            console.log(`Generated USDC approval call for MarketFactory: ${MARKET_FACTORY_ADDRESS}`);
            console.log(`Approval amount: 10,000 USDC`);
            // Don't use JSON.stringify with BigInt - just log the calls directly
            console.log('Call structure:', calls);
            
            return {
                calls,
                spenderAddress: MARKET_FACTORY_ADDRESS,
                totalAmount: 10000
            };
            
        } catch (error) {
            console.error('Failed to generate approval calls:', error);
            throw error;
        }
    }
    
    /**
     * Setup USDC approval for the MarketFactory
     * Returns the prepared calls for the UI to execute via OnchainKit
     */
    static async setupUSDCApproval(userAddress: Address): Promise<{
        success: boolean;
        spenderAddress: Address;
        totalApprovalAmount: number;
        calls?: any[];
    }> {
        console.log('Setting up USDC approval for MarketFactory...');
        
        try {
            const { calls, spenderAddress, totalAmount } = await this.getUSDCApprovalCalls(userAddress);
            
            if (!calls || calls.length === 0) {
                console.error('No approval calls generated');
                return {
                    success: false,
                    spenderAddress: MARKET_FACTORY_ADDRESS,
                    totalApprovalAmount: 0
                };
            }
            
            console.log(`Approval summary:`, {
                spender: spenderAddress,
                totalAmount: totalAmount
            });
            
            // Return the calls for the UI to execute
            return {
                success: true,
                spenderAddress,
                totalApprovalAmount: totalAmount,
                calls // Return the calls for OnchainKit to execute
            };
            
        } catch (error) {
            console.error('USDC approval setup failed:', error);
            return {
                success: false,
                spenderAddress: MARKET_FACTORY_ADDRESS,
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