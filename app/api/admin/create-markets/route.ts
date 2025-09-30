import { NextRequest, NextResponse } from 'next/server';
import { Address, type Hex } from 'viem';
import { publicClient } from '../../../../lib/viem-client';
import {
  generateBatchMarketTransaction,
  parseMarketCreatedEvents,
  categorizeMarkets,
  calculate24HourEndTime,
  FACTORY_CONTRACT_ADDRESS
} from '../../../../lib/contract-integration';
import { SupabaseService } from '../../../../lib/supabase';

// Request body type
interface CreateMarketsRequest {
    questions: string[];
    transactionHash?: string; // For parsing events after transaction execution
    creatorAddress?: Address;
    resolverAddress?: Address;
}

// Response types matching shared.md specification
interface CreateMarketsResponse {
    success: boolean;
    markets: Array<{
        id: string;
        question: string;
        category: string;
        contract_address: string;
        explorer_url: string;
    }>;
    error?: string;
}

// Type for transaction generation response (non-standard)
interface TransactionGenerationResponse {
    success: boolean;
    transactionCall: {
        to: string;
        data: string;
        value: string;
    };
    questions: string[];
    categorizedQuestions: Array<{ question: string; category: string }>;
    factoryAddress: string;
    endTime: string;
    note: string;
}

// Internal types for processing
interface MarketCreationData {
    question: string;
    category: 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics';
    contract_address: string;
    end_time: string;
    creator_address?: string;
    transaction_hash?: string;
}

/**
 * Validate market creation request
 * Throws errors early for invalid inputs (no fallbacks)
 */
function validateRequest(body: CreateMarketsRequest): void {
    // Validate questions array
    if (!body.questions || !Array.isArray(body.questions)) {
        throw new Error('Questions must be an array');
    }

    if (body.questions.length !== 10) {
        throw new Error('Exactly 10 market questions are required');
    }

    // Validate each question
    body.questions.forEach((question, index) => {
        if (!question || typeof question !== 'string') {
            throw new Error(`Question ${index + 1} must be a non-empty string`);
        }

        const trimmed = question.trim();
        if (trimmed.length < 10) {
            throw new Error(`Question ${index + 1} must be at least 10 characters long`);
        }

        if (trimmed.length > 256) {
            throw new Error(`Question ${index + 1} must be less than 256 characters`);
        }
    });

    // Validate creator address if provided
    if (body.creatorAddress && !/^0x[a-fA-F0-9]{40}$/.test(body.creatorAddress)) {
        throw new Error('Invalid creator address format');
    }

    // Validate resolver address if provided
    if (body.resolverAddress && !/^0x[a-fA-F0-9]{40}$/.test(body.resolverAddress)) {
        throw new Error('Invalid resolver address format');
    }

    // Validate transaction hash if provided (for event parsing)
    if (body.transactionHash && !/^0x[a-fA-F0-9]{64}$/.test(body.transactionHash)) {
        throw new Error('Invalid transaction hash format');
    }
}

/**
 * Generate Base Sepolia explorer URL for contract address
 */
function generateExplorerUrl(contractAddress: string): string {
    return `https://sepolia.base.org/address/${contractAddress}`;
}

/**
 * Process market creation from transaction hash
 * Parses events and saves markets to database
 */
async function processMarketCreation(
    transactionHash: string,
    questions: string[],
    creatorAddress?: Address
): Promise<CreateMarketsResponse> {
    console.log('🔍 Processing market creation from transaction:', transactionHash);

    try {
        // Get transaction receipt
        const receipt = await publicClient.getTransactionReceipt({
            hash: transactionHash as Hex
        });

        // Parse MarketCreated events using contract integration service
        const marketEvents = parseMarketCreatedEvents(receipt);

        if (marketEvents.length === 0) {
            throw new Error('No MarketCreated events found in transaction');
        }

        if (marketEvents.length !== questions.length) {
            throw new Error(`Expected ${questions.length} markets, but found ${marketEvents.length} events`);
        }

        console.log(`📊 Found ${marketEvents.length} MarketCreated events`);

        // Categorize questions for database storage
        const categorizedQuestions = categorizeMarkets(questions);

        // Prepare market data for database insertion
        const marketsData: MarketCreationData[] = marketEvents.map((event) => {
            const matchingQuestion = categorizedQuestions.find(q => q.question === event.question);
            if (!matchingQuestion) {
                throw new Error(`Could not find categorized question for: ${event.question}`);
            }

            return {
                question: event.question,
                category: matchingQuestion.category,
                contract_address: event.market.toLowerCase(),
                end_time: new Date(Number(event.endTime) * 1000).toISOString(),
                creator_address: creatorAddress?.toLowerCase(),
                transaction_hash: transactionHash
            };
        });

        console.log('💾 Saving markets to database...');

        // Save markets to database
        const savedMarkets: Array<{
            id: string;
            question: string;
            category: string;
            contract_address: string;
            explorer_url: string;
        }> = [];

        for (const marketData of marketsData) {
            try {
                const savedMarket = await SupabaseService.createMarket({
                    question: marketData.question,
                    category: marketData.category,
                    end_time: marketData.end_time,
                    contract_address: marketData.contract_address,
                    creator_address: marketData.creator_address,
                    transaction_hash: marketData.transaction_hash,
                    yes_pool: 0,
                    no_pool: 0,
                    total_yes_shares: 0,
                    total_no_shares: 0,
                    resolved: false
                });

                savedMarkets.push({
                    id: savedMarket.id,
                    question: savedMarket.question,
                    category: savedMarket.category,
                    contract_address: savedMarket.contract_address!,
                    explorer_url: generateExplorerUrl(savedMarket.contract_address!)
                });

                console.log(`✅ Saved market: ${savedMarket.question} (${savedMarket.contract_address})`);
            } catch (dbError) {
                console.error(`❌ Failed to save market: ${marketData.question}`, dbError);
                throw new Error(`Failed to save market "${marketData.question}" to database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
            }
        }

        console.log(`🎉 Successfully created ${savedMarkets.length} markets`);

        return {
            success: true,
            markets: savedMarkets
        };

    } catch (error) {
        console.error('❌ Failed to process market creation:', error);
        throw error;
    }
}

/**
 * POST /api/admin/create-markets
 * Creates 10 prediction markets in batch using the factory contract
 *
 * Two modes of operation:
 * 1. Generate transaction data (no transactionHash provided)
 * 2. Process completed transaction (transactionHash provided)
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateMarketsResponse | TransactionGenerationResponse>> {
    try {
        console.log('🚀 Admin market creation API called');

        // Parse request body
        const body: CreateMarketsRequest = await request.json();

        // Validate request (throws on error)
        validateRequest(body);

        console.log(`📋 Processing ${body.questions.length} market questions`);

        // If transaction hash is provided, process the completed transaction
        if (body.transactionHash) {
            console.log('🔄 Processing completed transaction:', body.transactionHash);

            const result = await processMarketCreation(
                body.transactionHash,
                body.questions,
                body.creatorAddress
            );

            return NextResponse.json(result);
        }

        // Otherwise, generate transaction data for frontend execution
        console.log('🏗️ Generating transaction data for frontend execution');

        const endTime = calculate24HourEndTime();
        const resolverAddress = body.resolverAddress || '0x0000000000000000000000000000000000000000' as Address;

        // Use contract integration service to generate transaction
        const transactionCall = generateBatchMarketTransaction({
            questions: body.questions,
            endTime,
            resolver: resolverAddress,
            userAddress: body.creatorAddress || '0x0000000000000000000000000000000000000000' as Address
        });

        // Categorize questions for preview
        const categorizedQuestions = categorizeMarkets(body.questions);

        console.log('✅ Transaction data generated successfully');

        // Return transaction data for frontend execution
        // This is not the final response format but allows frontend to execute transaction
        return NextResponse.json({
            success: true,
            transactionCall: {
                to: transactionCall.to,
                data: transactionCall.data,
                value: transactionCall.value.toString()
            },
            questions: body.questions,
            categorizedQuestions,
            factoryAddress: FACTORY_CONTRACT_ADDRESS,
            endTime: endTime.toString(),
            note: 'Transaction data generated. Execute using OnchainKit Transaction component, then call this endpoint again with the transaction hash to complete the process.'
        } satisfies TransactionGenerationResponse);

    } catch (error) {
        console.error('❌ Admin market creation failed:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return NextResponse.json(
            {
                success: false,
                markets: [],
                error: errorMessage
            } satisfies CreateMarketsResponse,
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/create-markets
 * Returns information about the batch market creation endpoint
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        endpoint: '/api/admin/create-markets',
        method: 'POST',
        description: 'Creates 10 prediction markets in batch using the factory contract',
        factoryAddress: FACTORY_CONTRACT_ADDRESS,
        modes: {
            generate: 'Generate transaction data (no transactionHash)',
            process: 'Process completed transaction (with transactionHash)'
        },
        requirements: {
            questions: 'Array of exactly 10 market questions (string[])',
            transactionHash: 'Optional - Transaction hash to process MarketCreated events',
            creatorAddress: 'Optional - Address of the market creator',
            resolverAddress: 'Optional - Address of the market resolver (defaults to zero address)'
        },
        workflow: [
            '1. Call POST with questions array to get transaction data',
            '2. Execute transaction using OnchainKit Transaction component',
            '3. Call POST again with same questions + transactionHash to save to database',
            '4. Markets appear in swipe interface with contract addresses'
        ],
        example: {
            step1: {
                questions: [
                    'Will BTC close above $50k tomorrow?',
                    'Will ETH gain more than 5% this week?'
                    // ... 8 more questions for total of 10
                ],
                creatorAddress: '0x1234567890123456789012345678901234567890'
            },
            step2: {
                questions: '// Same questions array as step 1',
                transactionHash: '0xabcd1234...',
                creatorAddress: '0x1234567890123456789012345678901234567890'
            }
        },
        response: {
            success: 'boolean',
            markets: 'Array of created markets with contract addresses and explorer links',
            error: 'string (if error occurred)'
        }
    });
}