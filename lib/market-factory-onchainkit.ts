import { Address, encodeFunctionData, type Hex, decodeEventLog, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { MARKET_FACTORY_ADDRESS } from './blockchain';
import { SupabaseService } from './supabase';

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
            { name: 'endTime', type: 'uint256', indexed: false }
        ]
    }
] as const;

/**
 * Generate transaction calls for creating a prediction market
 * Returns calls formatted for OnchainKit's Transaction component
 */
export function generateCreateMarketCalls(params: {
    question: string;
    endTime: Date;
    resolverAddress?: Address;
}) {
    // Default resolver to zero address
    const resolverAddress = params.resolverAddress || '0x0000000000000000000000000000000000000000';
    
    // Convert endTime to timestamp
    const endTimeTimestamp = Math.floor(params.endTime.getTime() / 1000);
    
    // Encode the createMarket function call
    const data = encodeFunctionData({
        abi: MARKET_FACTORY_ABI,
        functionName: 'createMarket',
        args: [params.question, BigInt(endTimeTimestamp), resolverAddress]
    });
    
    // Return the call in OnchainKit format
    return [{
        to: MARKET_FACTORY_ADDRESS as Hex,
        data: data as Hex,
        value: 0n // No ETH required for market creation
    }];
}

// Create a public client for reading from the blockchain
const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
});

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
                    console.log(`✅ Parsed MarketCreated event:`, {
                        market: marketAddress,
                        creator: decoded.args.creator,
                        question: decoded.args.question,
                        endTime: decoded.args.endTime
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
 * Process successful market creation transaction
 * Extracts the market address from transaction receipt and creates database entry
 */
export async function processMarketCreation(params: {
    question: string;
    category: string;
    endTime: Date;
    creatorAddress: Address;
    transactionHash: string;
}) {
    try {
        console.log('🔍 Processing market creation transaction:', params.transactionHash);
        
        // Parse the transaction receipt to get the deployed market address
        const marketAddress = await parseMarketCreatedEvent(params.transactionHash);
        
        if (!marketAddress) {
            throw new Error('Failed to extract market address from transaction');
        }
        
        console.log('📍 Market deployed at:', marketAddress);
        
        // Create database entry with contract address
        const supabaseMarket = await SupabaseService.createMarket({
            question: params.question,
            category: params.category,
            end_time: params.endTime.toISOString(),
            creator_address: params.creatorAddress,
            contract_address: marketAddress,
            yes_pool: 10, // Initial liquidity from contract
            no_pool: 10,  // Initial liquidity from contract
            total_yes_shares: 0,
            total_no_shares: 0,
            resolved: false
        });
        
        console.log('✅ Market created successfully:', {
            marketId: supabaseMarket.id,
            contractAddress: marketAddress,
            transactionHash: params.transactionHash
        });
        
        return {
            success: true,
            marketId: supabaseMarket.id,
            contractAddress: marketAddress,
            transactionHash: params.transactionHash
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
 * Validate market creation parameters
 */
export function validateMarketCreation(params: {
    question: string;
    endTime: Date;
    creatorAddress: Address;
}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate question
    if (!params.question || params.question.trim().length < 10) {
        errors.push('Question must be at least 10 characters long');
    }
    
    if (params.question.length > 256) {
        errors.push('Question must be less than 256 characters');
    }
    
    // Validate end time
    const now = new Date();
    const minEndTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    
    if (params.endTime <= now) {
        errors.push('End time must be in the future');
    }
    
    if (params.endTime <= minEndTime) {
        errors.push('End time must be at least 1 hour from now');
    }
    
    // Validate creator address
    if (!params.creatorAddress || params.creatorAddress === '0x0000000000000000000000000000000000000000') {
        errors.push('Valid creator address required');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

const marketFactoryOnchainKit = {
    generateCreateMarketCalls,
    processMarketCreation,
    validateMarketCreation
};

export default marketFactoryOnchainKit;