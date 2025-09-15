import { Address, encodeFunctionData, type Hex, decodeEventLog } from 'viem';
import { publicClient } from './viem-client';
// Updated MarketFactory contract address with resolver system
const MARKET_FACTORY_ADDRESS = '0x90193C961A926261B756D1E5bb255e67ff9498A1' as const;
import { SupabaseService } from './supabase';
import { ParimutuelSupabaseService } from './supabase-parimutuel';
import { MarketType } from './market-resolver';

// Updated MarketFactory ABI for new resolver system
export const MARKET_FACTORY_ABI = [
    {
        name: 'createMarket',
        type: 'function',
        inputs: [
            { name: 'question', type: 'string' },
            { name: 'endTime', type: 'uint256' },
            { name: 'isPlatformMarket', type: 'bool' } // true for platform (UMA), false for user
        ],
        outputs: [{ name: 'market', type: 'address' }],
        stateMutability: 'nonpayable'
    },
    {
        name: 'MarketCreated',
        type: 'event',
        anonymous: false,
        inputs: [
            { name: 'market', type: 'address', indexed: true },
            { name: 'creator', type: 'address', indexed: true },
            { name: 'question', type: 'string', indexed: false },
            { name: 'endTime', type: 'uint256', indexed: false },
            { name: 'marketIndex', type: 'uint256', indexed: false },
            { name: 'marketType', type: 'uint8', indexed: false } // 1 = PLATFORM, 2 = USER
        ]
    }
] as const;

/**
 * Generate transaction calls for creating a prediction market with new resolver system
 * Returns calls formatted for OnchainKit's Transaction component
 */
export function generateCreateMarketCalls(
    question: string,
    endTimeTimestamp: number,
    isPlatformMarket: boolean
) {
    // Encode the createMarket function call
    const data = encodeFunctionData({
        abi: MARKET_FACTORY_ABI,
        functionName: 'createMarket',
        args: [question, BigInt(endTimeTimestamp), isPlatformMarket]
    });

    // Return the call in OnchainKit format
    return [{
        to: MARKET_FACTORY_ADDRESS as Hex,
        data: data as Hex,
        value: BigInt(0) // No ETH required for market creation
    }];
}

/**
 * Backward compatibility function with old signature
 */
export function generateCreateMarketCallsOld(params: {
    question: string;
    endTime: Date;
    resolverAddress?: Address;
}) {
    const endTimeTimestamp = Math.floor(params.endTime.getTime() / 1000);
    // Default to platform market for backward compatibility
    return generateCreateMarketCalls(params.question, endTimeTimestamp, true);
}

// Using centralized public client from viem-client.ts

/**
 * Parse MarketCreated event from transaction receipt
 */
async function parseMarketCreatedEvent(transactionHash: string): Promise<Address | null> {
    try {
        // Get transaction receipt
        const receipt = await publicClient.getTransactionReceipt({
            hash: transactionHash as `0x${string}`
        });

        console.log('📋 Transaction receipt logs:', receipt.logs.length, 'logs found');

        // Debug: log all topics to understand what events are actually emitted
        receipt.logs.forEach((log, index) => {
            console.log(`Log ${index}:`, {
                address: log.address,
                topics: log.topics,
                data: log.data
            });

            // Check if this log is from the MarketFactory contract
            if (log.address.toLowerCase() === MARKET_FACTORY_ADDRESS.toLowerCase()) {
                console.log(`🎯 Found log from MarketFactory contract!`);
            }
        });

        // Find MarketCreated event in logs - only from our contract
        for (const log of receipt.logs) {
            // Skip logs that aren't from our MarketFactory contract
            if (log.address.toLowerCase() !== MARKET_FACTORY_ADDRESS.toLowerCase()) {
                continue;
            }

            try {
                const decoded = decodeEventLog({
                    abi: MARKET_FACTORY_ABI,
                    eventName: 'MarketCreated',
                    data: log.data,
                    topics: log.topics,
                });

                if (decoded.eventName === 'MarketCreated') {
                    const marketAddress = decoded.args.market as Address;
                    console.log(`✅ Parsed MarketCreated event:`, {
                        market: marketAddress,
                        creator: decoded.args.creator,
                        question: decoded.args.question,
                        endTime: decoded.args.endTime,
                        marketIndex: decoded.args.marketIndex
                    });

                    return marketAddress;
                }
            } catch (decodeError) {
                // Only log errors for logs from our contract
                console.log(`Failed to decode log from MarketFactory as MarketCreated:`, decodeError);
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
 * Process successful market creation transaction with resolver system
 * Extracts the market address from transaction receipt and creates database entry
 */
export async function processMarketCreation(
    transactionHash: string,
    question: string,
    category: string,
    endTimeTimestamp: number,
    creatorAddress: Address,
    marketType: MarketType
) {
    try {
        console.log('🔍 Processing market creation transaction:', transactionHash);

        // Parse the transaction receipt to get the deployed market address
        const marketAddress = await parseMarketCreatedEvent(transactionHash);

        if (!marketAddress) {
            throw new Error('Failed to extract market address from transaction');
        }

        console.log('📍 Market deployed at:', marketAddress);

        // Create database entry with contract address and transaction hash
        const supabaseMarket = await ParimutuelSupabaseService.createMarket({
            question: question,
            category: category,
            end_time: new Date(endTimeTimestamp * 1000).toISOString(),
            creator_address: creatorAddress,
            contract_address: marketAddress,
            transaction_hash: transactionHash,
            market_type: marketType === MarketType.PLATFORM ? 'platform' : 'user',
            yes_pool: 0, // Start with no pool for parimutuel
            no_pool: 0,  // Start with no pool for parimutuel
            total_yes_bets: 0,
            total_no_bets: 0,
            resolved: false
        });

        console.log('✅ Market created successfully:', {
            marketId: supabaseMarket.id,
            contractAddress: marketAddress,
            transactionHash: transactionHash,
            marketType: marketType
        });

        return {
            success: true,
            marketId: supabaseMarket.id,
            contractAddress: marketAddress,
            transactionHash: transactionHash,
            marketType: marketType
        };

    } catch (error) {
        console.error('❌ Failed to process market creation:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Validate market creation parameters for 24-hour fixed duration
 */
export function validateMarketCreation(
    question: string,
    endTimeTimestamp: number
): { isValid: boolean; error?: string } {
    // Validate question
    if (!question || question.trim().length < 10) {
        return { isValid: false, error: 'Question must be at least 10 characters long' };
    }

    if (question.length > 256) {
        return { isValid: false, error: 'Question must be less than 256 characters' };
    }

    // Validate end time is exactly 24 hours from now (with small tolerance for processing time)
    const now = Math.floor(Date.now() / 1000);
    const expectedEndTime = now + (24 * 60 * 60); // Exactly 24 hours from now
    const tolerance = 60; // 1 minute tolerance
    
    if (Math.abs(endTimeTimestamp - expectedEndTime) > tolerance) {
        return { isValid: false, error: 'Market duration must be exactly 24 hours' };
    }

    // Ensure end time is in the future
    if (endTimeTimestamp <= now) {
        return { isValid: false, error: 'End time must be in the future' };
    }

    return { isValid: true };
}

const marketFactoryOnchainKit = {
    generateCreateMarketCalls,
    processMarketCreation,
    validateMarketCreation,
    MARKET_FACTORY_ADDRESS
};

export { MARKET_FACTORY_ADDRESS };
export default marketFactoryOnchainKit;