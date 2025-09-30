/**
 * Smart Contract Integration Service
 *
 * Extension of patterns from /lib/blockchain.ts and /lib/parimutuel-blockchain.ts
 * Provides batch market creation via factory contract with proper event parsing
 * and gas estimation for admin API usage.
 */

import { Address, encodeFunctionData, decodeEventLog, TransactionReceipt, type Hex } from 'viem';
import { publicClient } from './viem-client';

// Factory contract address from requirements
export const FACTORY_CONTRACT_ADDRESS = '0xe23c501f11F6a072cEeCAA08eC4b0E4B33bBEe7C' as const;

// Factory ABI that supports batch market creation
export const FACTORY_ABI = [
    {
        name: 'createMarkets',
        type: 'function',
        inputs: [
            { name: 'questions', type: 'string[]' },
            { name: 'endTime', type: 'uint256' },
            { name: 'resolver', type: 'address' }
        ],
        outputs: [{ name: 'markets', type: 'address[]' }],
        stateMutability: 'nonpayable'
    },
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
        name: 'getMarketCount',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'estimateGasForMarkets',
        type: 'function',
        inputs: [{ name: 'marketCount', type: 'uint256' }],
        outputs: [{ name: 'gasEstimate', type: 'uint256' }],
        stateMutability: 'view'
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
            { name: 'marketIndex', type: 'uint256', indexed: false }
        ]
    }
] as const;

// Type definitions
export interface MarketCreatedEvent {
    market: Address;
    question: string;
    endTime: bigint;
    creator: Address;
    transactionHash: string;
    marketIndex?: bigint;
}

export interface BatchMarketCreationParams {
    questions: string[];
    endTime: bigint;
    resolver: Address;
    userAddress: Address;
}

export interface MarketCreationResult {
    success: boolean;
    transactionHash?: string;
    markets?: MarketCreatedEvent[];
    error?: string;
    gasEstimate?: bigint;
}

export interface TransactionCall {
    to: Address;
    data: Hex;
    value: bigint;
}

/**
 * Main function to create markets on-chain via factory contract
 * Validates inputs, generates transaction, and estimates gas
 */
export async function createMarketsOnChain(
    questions: string[],
    endTime: bigint,
    resolver: Address,
    userAddress: Address
): Promise<MarketCreationResult> {
    try {
        console.log('🚀 Starting batch market creation:', {
            questionCount: questions.length,
            endTime: endTime.toString(),
            resolver,
            userAddress
        });

        // Validate inputs
        validateMarketCreationInputs(questions, endTime, resolver, userAddress);

        // Generate transaction data
        const transactionCall = generateBatchMarketTransaction({
            questions,
            endTime,
            resolver,
            userAddress
        });

        // Estimate gas for the batch operation
        const gasEstimate = await estimateGasForBatchCreation(questions.length);

        console.log('📊 Transaction prepared:', {
            to: transactionCall.to,
            gasEstimate: gasEstimate.toString(),
            questionsToCreate: questions.length
        });

        return {
            success: true,
            gasEstimate,
            // Note: actual transaction execution would happen in the frontend/API
            // This service focuses on transaction generation and event parsing
        };

    } catch (error) {
        console.error('❌ Failed to prepare market creation:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error preparing market creation'
        };
    }
}

/**
 * Generate transaction call for batch market creation
 * Returns properly encoded transaction data
 */
export function generateBatchMarketTransaction(params: BatchMarketCreationParams): TransactionCall {
    console.log('🔧 Generating batch market transaction with params:', {
        questionCount: params.questions.length,
        endTime: params.endTime.toString(),
        resolver: params.resolver
    });

    // Validate that we have 10 markets as per requirements
    if (params.questions.length !== 10) {
        throw new Error(`Must create exactly 10 markets, got ${params.questions.length}`);
    }

    // Encode the batch market creation function call
    const data = encodeFunctionData({
        abi: FACTORY_ABI,
        functionName: 'createMarkets',
        args: [params.questions, params.endTime, params.resolver]
    });

    const transactionCall: TransactionCall = {
        to: FACTORY_CONTRACT_ADDRESS,
        data: data as Hex,
        value: BigInt(0) // No ETH required for market creation
    };

    console.log('✅ Generated transaction call:', {
        to: transactionCall.to,
        dataLength: transactionCall.data.length,
        value: transactionCall.value.toString()
    });

    return transactionCall;
}

/**
 * Estimate gas for batch market creation operations
 * Provides gas estimates based on number of markets
 */
export async function estimateGasForBatchCreation(marketCount: number): Promise<bigint> {
    try {
        console.log('📊 Estimating gas for batch creation of', marketCount, 'markets');

        // Try to get estimate from contract if available
        try {
            const contractEstimate = await publicClient.readContract({
                address: FACTORY_CONTRACT_ADDRESS,
                abi: FACTORY_ABI,
                functionName: 'estimateGasForMarkets',
                args: [BigInt(marketCount)]
            });

            if (contractEstimate && contractEstimate > BigInt(0)) {
                console.log('📈 Contract gas estimate:', contractEstimate.toString());
                return contractEstimate;
            }
        } catch {
            console.log('⚠️ Contract gas estimation unavailable, using fallback calculation');
        }

        // Fallback gas estimation based on empirical data
        const baseGas = BigInt(200000); // Base transaction overhead
        const gasPerMarket = BigInt(150000); // Estimated gas per market deployment
        const batchOverhead = BigInt(50000); // Additional overhead for batch operation

        const totalEstimate = baseGas + (gasPerMarket * BigInt(marketCount)) + batchOverhead;

        console.log('📊 Fallback gas estimate:', {
            baseGas: baseGas.toString(),
            gasPerMarket: gasPerMarket.toString(),
            marketCount,
            totalEstimate: totalEstimate.toString()
        });

        return totalEstimate;

    } catch (error) {
        console.error('❌ Gas estimation failed, using conservative estimate:', error);
        // Conservative fallback: assume high gas usage
        return BigInt(marketCount) * BigInt(200000) + BigInt(300000);
    }
}

/**
 * Parse MarketCreated events from transaction receipt
 * Returns array of market creation events with contract addresses
 */
export function parseMarketCreatedEvents(receipt: TransactionReceipt): MarketCreatedEvent[] {
    const events: MarketCreatedEvent[] = [];

    console.log('📋 Parsing MarketCreated events from receipt with', receipt.logs.length, 'logs');

    // Filter logs to only process those from the factory contract
    const factoryLogs = receipt.logs.filter(log =>
        log.address.toLowerCase() === FACTORY_CONTRACT_ADDRESS.toLowerCase()
    );

    console.log('🎯 Found', factoryLogs.length, 'logs from factory contract');

    for (const log of factoryLogs) {
        try {
            // Type assertion for log with topics
            const logWithTopics = log as typeof log & { topics: [`0x${string}`, ...`0x${string}`[]] };

            const decoded = decodeEventLog({
                abi: FACTORY_ABI,
                eventName: 'MarketCreated',
                data: logWithTopics.data,
                topics: logWithTopics.topics,
            });

            if (decoded.eventName === 'MarketCreated') {
                const event: MarketCreatedEvent = {
                    market: decoded.args.market as Address,
                    creator: decoded.args.creator as Address,
                    question: decoded.args.question,
                    endTime: decoded.args.endTime,
                    marketIndex: decoded.args.marketIndex,
                    transactionHash: receipt.transactionHash
                };

                events.push(event);

                console.log('✅ Parsed MarketCreated event:', {
                    market: event.market,
                    question: event.question.substring(0, 50) + '...',
                    marketIndex: event.marketIndex?.toString()
                });
            }
        } catch (decodeError) {
            console.log('⚠️ Failed to decode log as MarketCreated event:', decodeError);
            continue;
        }
    }

    if (events.length === 0) {
        console.warn('⚠️ No MarketCreated events found in transaction receipt');
    } else {
        console.log('📊 Successfully parsed', events.length, 'MarketCreated events');
    }

    return events;
}

/**
 * Validate market creation inputs
 * Throws errors early for invalid inputs (no fallbacks)
 */
function validateMarketCreationInputs(
    questions: string[],
    endTime: bigint,
    resolver: Address,
    userAddress: Address
): void {
    // Validate questions array
    if (!Array.isArray(questions)) {
        throw new Error('Questions must be an array');
    }

    if (questions.length === 0) {
        throw new Error('At least one question is required');
    }

    if (questions.length > 10) {
        throw new Error('Maximum 10 markets can be created in one batch');
    }

    // Validate each question
    questions.forEach((question, index) => {
        if (typeof question !== 'string') {
            throw new Error(`Question at index ${index} must be a string`);
        }

        if (question.trim().length < 10) {
            throw new Error(`Question at index ${index} must be at least 10 characters long`);
        }

        if (question.length > 256) {
            throw new Error(`Question at index ${index} must be less than 256 characters`);
        }
    });

    // Validate end time
    const now = BigInt(Math.floor(Date.now() / 1000));
    const oneHourFromNow = now + BigInt(3600); // 1 hour in seconds

    if (endTime <= now) {
        throw new Error('End time must be in the future');
    }

    if (endTime <= oneHourFromNow) {
        throw new Error('End time must be at least 1 hour from now');
    }

    // Validate resolver address
    if (!isValidAddress(resolver)) {
        throw new Error('Invalid resolver address');
    }

    // Validate user address
    if (!isValidAddress(userAddress)) {
        throw new Error('Invalid user address');
    }

    console.log('✅ All inputs validated successfully');
}

/**
 * Enhanced address validation
 * Rejects zero address and other problematic addresses
 */
function isValidAddress(address: string): boolean {
    // Check basic format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return false;
    }

    // Reject problematic addresses
    const problematicAddresses = [
        '0x0000000000000000000000000000000000000000', // Zero address
        '0x000000000000000000000000000000000000dead', // Burn address
    ];

    return !problematicAddresses.includes(address.toLowerCase());
}

/**
 * Helper function to generate resolver array for batch creation
 * All markets use the same resolver address
 */
export function generateResolverArray(resolver: Address, count: number): Address[] {
    return new Array(count).fill(resolver);
}

/**
 * Calculate 24-hour end time from current time
 * Returns timestamp as bigint
 */
export function calculate24HourEndTime(): bigint {
    const now = Date.now();
    const twentyFourHoursFromNow = now + (24 * 60 * 60 * 1000); // 24 hours in milliseconds
    return BigInt(Math.floor(twentyFourHoursFromNow / 1000)); // Convert to seconds
}

/**
 * Helper to categorize markets based on question content
 * Auto-categorizes when possible as specified in shared context
 */
export function categorizeMarket(question: string): 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics' {
    const lowerQuestion = question.toLowerCase();

    // Crypto keywords
    if (lowerQuestion.match(/\b(bitcoin|btc|ethereum|eth|crypto|defi|nft|blockchain|token|coin|price|trading)\b/)) {
        return 'crypto';
    }

    // Tech keywords
    if (lowerQuestion.match(/\b(apple|google|microsoft|tesla|meta|amazon|tech|startup|ai|software|hardware)\b/)) {
        return 'tech';
    }

    // Celebrity keywords
    if (lowerQuestion.match(/\b(celebrity|actor|singer|movie|music|hollywood|fame|award|oscar|grammy)\b/)) {
        return 'celebrity';
    }

    // Sports keywords
    if (lowerQuestion.match(/\b(football|basketball|baseball|soccer|nfl|nba|mlb|olympics|championship|team|player)\b/)) {
        return 'sports';
    }

    // Politics keywords
    if (lowerQuestion.match(/\b(election|president|government|congress|senate|vote|policy|political|candidate)\b/)) {
        return 'politics';
    }

    // Default to crypto if no clear category
    return 'crypto';
}

/**
 * Batch categorize multiple market questions
 */
export function categorizeMarkets(questions: string[]): Array<{ question: string; category: 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics' }> {
    return questions.map(question => ({
        question,
        category: categorizeMarket(question)
    }));
}