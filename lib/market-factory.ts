import { Address, encodeFunctionData, decodeEventLog } from 'viem';
import { MARKET_FACTORY_ADDRESS } from './blockchain';
import { SupabaseService } from './supabase';
import { executeGaslessTransaction, publicClient } from './gasless';

// MarketFactory ABI for contract interaction
export const MARKET_FACTORY_ABI = [
    {
        name: 'createMarket',
        type: 'function',
        inputs: [
            { name: 'question', type: 'string' },
            { name: 'endTime', type: 'uint256' },
            { name: 'resolver', type: 'address' }
        ],
        outputs: [{ name: 'market', type: 'address' }],
        stateMutability: 'nonpayable'
    },
    {
        name: 'MarketCreated',
        type: 'event',
        inputs: [
            { name: 'market', type: 'address', indexed: true },
            { name: 'creator', type: 'address', indexed: true },
            { name: 'question', type: 'string', indexed: false },
            { name: 'endTime', type: 'uint256', indexed: false },
            { name: 'marketIndex', type: 'uint256', indexed: false }
        ]
    }
] as const;

export interface CreateMarketParams {
    question: string;
    category: 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics';
    endTime: Date;
    creatorAddress: Address;
    resolver?: Address; // Optional, uses default resolver if not provided
}

/**
 * 🏭 Deploy a new prediction market contract via MarketFactory
 * This creates both the smart contract AND the database entry
 */
export async function createPredictionMarket(params: CreateMarketParams): Promise<{
    success: boolean;
    marketId?: string;
    contractAddress?: Address;
    transactionHash?: string;
    error?: string;
}> {
    try {
        console.log('🏭 Creating new prediction market:', params.question);

        // 1. Validate parameters
        if (params.endTime <= new Date()) {
            throw new Error('End time must be in the future');
        }

        if (params.endTime <= new Date(Date.now() + 60 * 60 * 1000)) {
            throw new Error('End time must be at least 1 hour from now');
        }

        // 2. Generate transaction data for MarketFactory.createMarket()
        const endTimeTimestamp = Math.floor(params.endTime.getTime() / 1000);
        const resolverAddress = params.resolver || '0x0000000000000000000000000000000000000000'; // Use factory default

        const createMarketTx = {
            to: MARKET_FACTORY_ADDRESS,
            data: encodeFunctionData({
                abi: MARKET_FACTORY_ABI,
                functionName: 'createMarket',
                args: [params.question, BigInt(endTimeTimestamp), resolverAddress]
            }),
            value: BigInt(0)
        };

        // 3. Execute gasless market creation via paymaster
        console.log('⚡ Executing gasless market creation...');
        const result = await executeGaslessTransaction(createMarketTx, params.creatorAddress);

        if (!result.success) {
            throw new Error(`Market creation failed: Unknown error`);
        }

        // 4. Extract the deployed market address from transaction receipt
        console.log('🔍 Parsing transaction receipt for deployed contract address...');
        const contractAddress = await parseMarketCreatedEvent(result.transactionHash);
        
        if (!contractAddress) {
            throw new Error('Failed to extract contract address from transaction receipt');
        }
        
        console.log(`✅ Market contract deployed at: ${contractAddress}`);

        // 5. Create database entry with contract address
        const supabaseMarket = await SupabaseService.createMarket({
            question: params.question,
            category: params.category,
            end_time: params.endTime.toISOString(),
            creator_address: params.creatorAddress,
            contract_address: contractAddress,
            yes_pool: 10, // Initial liquidity from contract
            no_pool: 10,  // Initial liquidity from contract
            total_yes_shares: 0,
            total_no_shares: 0,
            resolved: false
        });

        console.log('✅ Market created successfully:', {
            marketId: supabaseMarket.id,
            contractAddress,
            transactionHash: result.transactionHash
        });

        return {
            success: true,
            marketId: supabaseMarket.id,
            contractAddress: contractAddress as Address,
            transactionHash: result.transactionHash
        };

    } catch (error) {
        console.error('❌ Market creation failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * 🔄 Sync market state from blockchain to database
 * This keeps Supabase in sync with smart contract state
 */
export async function syncMarketState(marketId: string, contractAddress: Address) {
    try {
        // TODO: Read market state from blockchain contract
        // For now, this is a placeholder for the sync logic
        
        console.log(`🔄 Syncing market ${marketId} from contract ${contractAddress}`);
        
        // You would call the smart contract to get:
        // - Current YES/NO pool sizes
        // - Total shares outstanding  
        // - Resolution status
        // - Current prices
        
        // Then update Supabase with the latest state
        /*
        await SupabaseService.updateMarket(marketId, {
            yes_pool: yesPoolFromContract,
            no_pool: noPoolFromContract,
            total_yes_shares: totalYesShares,
            total_no_shares: totalNoShares,
            resolved: isResolved,
            outcome: finalOutcome
        });
        */
        
    } catch (error) {
        console.error(`Failed to sync market ${marketId}:`, error);
    }
}

/**
 * 📋 Get all markets created by a user
 */
export async function getUserCreatedMarkets(userAddress: Address) {
    try {
        const markets = await SupabaseService.getMarkets(50); // Get recent markets
        return markets.filter(market => 
            market.creator_address?.toLowerCase() === userAddress.toLowerCase()
        );
    } catch (error) {
        console.error('Failed to get user markets:', error);
        return [];
    }
}

/**
 * 🎯 Estimate gas cost for market creation
 */
export function estimateMarketCreationCost(): {
    gasEstimate: string;
    usdEstimate: string;
    sponsoredByPaymaster: boolean;
} {
    return {
        gasEstimate: '~0.008 ETH', // Updated for market creation + initial liquidity
        usdEstimate: '~$20 USD',
        sponsoredByPaymaster: true // Coinbase Paymaster covers creation costs
    };
}

/**
 * Parse MarketCreated event from transaction receipt to get deployed contract address
 */
async function parseMarketCreatedEvent(transactionHash: string): Promise<Address | null> {
    try {
        // Get transaction receipt
        const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash as `0x${string}` });
        
        // Find MarketCreated event in logs
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: MARKET_FACTORY_ABI,
                    eventName: 'MarketCreated',
                    data: log.data,
                    topics: log.topics,
                });
                
                if (decoded.eventName === 'MarketCreated') {
                    const marketAddress = decoded.args.market as Address;
                    console.log(`📋 Parsed MarketCreated event:`, {
                        market: marketAddress,
                        creator: decoded.args.creator,
                        question: decoded.args.question,
                        endTime: decoded.args.endTime,
                        marketIndex: decoded.args.marketIndex
                    });
                    
                    return marketAddress;
                }
            } catch {
                // Not a MarketCreated event, continue
                continue;
            }
        }
        
        console.warn('⚠️ No MarketCreated event found in transaction receipt');
        return null;
        
    } catch (error) {
        console.error('Failed to parse MarketCreated event:', error);
        return null;
    }
}

/**
 * ✅ Validate market creation parameters
 */
export function validateMarketParams(params: CreateMarketParams): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (!params.question || params.question.length < 10) {
        errors.push('Question must be at least 10 characters long');
    }

    if (params.question.length > 200) {
        errors.push('Question must be less than 200 characters');
    }

    if (params.endTime <= new Date()) {
        errors.push('End time must be in the future');
    }

    if (params.endTime <= new Date(Date.now() + 60 * 60 * 1000)) {
        errors.push('End time must be at least 1 hour from now');
    }

    const validCategories = ['crypto', 'tech', 'celebrity', 'sports', 'politics'];
    if (!validCategories.includes(params.category)) {
        errors.push('Invalid category selected');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}