"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { parseUnits, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SwipeStack } from './SwipeStack';
import { useAppStore } from '@/lib/store';
import { UnifiedMarket, SchemaTransformer } from '@/lib/types';
import { ParimutuelSupabaseService } from '@/lib/supabase-parimutuel';
import { getParimutuelMarketContractAddress, validateParimutuelMarketContract, DEMO_PARIMUTUEL_MARKET_ADDRESS } from '@/lib/blockchain-parimutuel';
import {
    generateBetCalls,
    validatePaymasterConfig,
    handleTransactionStatus
} from '@/lib/gasless-parimutuel';
import {
    Transaction,
    TransactionButton,
    TransactionSponsor,
    TransactionStatusAction,
    TransactionStatusLabel
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import type { TransactionStatus } from '@/lib/gasless-parimutuel';

interface ParimutuelPredictionMarketProps {
    onBack?: () => void;
}

export function ParimutuelPredictionMarket({ onBack }: ParimutuelPredictionMarketProps) {
    const { address } = useAccount();
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics'>('all');
    const [allMarkets, setAllMarkets] = useState<UnifiedMarket[]>([]);
    const [currentMarkets, setCurrentMarkets] = useState<UnifiedMarket[]>([]);
    const [pendingBatch, setPendingBatch] = useState<{
        marketId: string;
        direction: 'left' | 'right';
        amount: number;
        calls: Array<{
            to: Address;
            data: `0x${string}`;
            value: bigint;
        }>;
        userAddress: Address;
        contractAddress: Address;
        prediction: 'yes' | 'no';
        timestamp: number;
    }[]>([]);
    const [batchTimer, setBatchTimer] = useState<NodeJS.Timeout | null>(null);
    const [currentPrediction, setCurrentPrediction] = useState<{
        marketId: string;
        direction: 'left' | 'right';
        amount: number;
        calls: Array<{
            to: Address;
            data: `0x${string}`;
            value: bigint;
        }>;
    } | null>(null);
    const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
    // Track processed transactions if needed for future dedupe logic
    // const [processedTransactions] = useState<Set<string>>(new Set());
    const [rawSupabaseMarkets, setRawSupabaseMarkets] = useState<Array<{
        id: string;
        contract_address?: string;
        [key: string]: unknown;
    }>>([]);
    const {
        addSwipeHistory,
        user,
        setUser
    } = useAppStore();

    // Paymaster configuration check for gasless readiness
    const isPaymasterConfigured = useCallback(() => {
        const config = validatePaymasterConfig();
        return config.valid;
    }, []);

    useEffect(() => {
        const loadMarkets = async () => {
            try {
                // Load markets with influencer data from Supabase
                const marketsWithInfluencers = await ParimutuelSupabaseService.getMarketsWithInfluencers();

                // Filter for active markets only
                const activeMarkets = marketsWithInfluencers.filter(m =>
                    !m.resolved && new Date(m.end_time) > new Date()
                );

                setRawSupabaseMarkets(activeMarkets); // Keep raw for contract mapping

                // Use markets with influencer data - use the new transformer
                const allAvailableMarkets = activeMarkets.map(m => SchemaTransformer.marketWithInfluencerToUnified(m));

                // Shuffle markets
                const shuffledMarkets = allAvailableMarkets.sort(() => 0.5 - Math.random());

                setAllMarkets(shuffledMarkets);
                setCurrentMarkets(shuffledMarkets.slice(0, 20)); // Show first 20 initially
            } catch (error) {
                console.error('Error loading markets:', error);
                // Fallback to empty array if Supabase fails
                const allAvailableMarkets: UnifiedMarket[] = [];
                const shuffledMarkets = allAvailableMarkets.sort(() => 0.5 - Math.random());
                setAllMarkets(shuffledMarkets);
                setCurrentMarkets(shuffledMarkets.slice(0, 20));
            }
        };

        loadMarkets();

        // Initialize user if connected but no user data
        if (address && !user) {
            setUser({
                id: address,
                address: address,
                username: `user_${address.slice(-6)}`,
                totalSpent: 0,
                correctPredictions: 0,
                totalPredictions: 0,
                rank: 0,
                joinedAt: new Date().toISOString(),
                defaultBetAmount: 1, // Default $1 USDC
                currentStreak: 0,
                bestStreak: 0,
                profitLoss: 0,
            });
        }
    }, [address, user, setUser]);

    // Filter markets based on selected category
    useEffect(() => {
        if (allMarkets.length > 0) {
            let filteredMarkets = allMarkets;
            if (selectedCategory !== 'all') {
                filteredMarkets = allMarkets.filter(market => market.category === selectedCategory);
            }
            setCurrentMarkets(filteredMarkets.slice(0, 20));
        }
    }, [selectedCategory, allMarkets, setCurrentMarkets]);

    // Handle swipe for pari-mutuel betting
    const handleSwipe = async (marketId: string, direction: 'left' | 'right' | 'up') => {
        if (!address || !user) {
            toast.error('Please connect your wallet first!');
            return;
        }

        // Add to swipe history
        addSwipeHistory(marketId);

        // Handle skip - no blockchain transaction needed
        if (direction === 'up') {
            toast('Market skipped! 📊', {
                icon: '⭐️',
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #475569',
                },
            });
            return;
        }

        const betAmount = user.defaultBetAmount ?? 1;
        const predictionSide: 'yes' | 'no' = direction === 'right' ? 'yes' : 'no';

        // INSTANT FEEDBACK - no blockchain interaction yet
        toast.success(`${direction === 'right' ? '✅ YES' : '❌ NO'} bet added to batch!`, {
            duration: 2000,
            style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #22c55e',
            },
        });

        try {
            // Validate market exists in Supabase before proceeding
            let marketExists;
            try {
                marketExists = await ParimutuelSupabaseService.getMarket(marketId);
                if (!marketExists) {
                    console.error(`Market ${marketId} does not exist in database`);
                    toast.error('Invalid market. Please try another one.');
                    return;
                }
            } catch (error) {
                console.error('Error validating market:', error);
                toast.error('Failed to validate market. Please try again.');
                return;
            }

            // Get the correct market contract address
            let marketAddress = getParimutuelMarketContractAddress(marketId, rawSupabaseMarkets);

            // Validate the market contract before proceeding; gracefully fallback to demo if invalid
            const isValidContract = await validateParimutuelMarketContract(marketAddress);
            if (!isValidContract) {
                console.warn(`Invalid market contract ${marketAddress} for ${marketId}, falling back to demo`);
                marketAddress = DEMO_PARIMUTUEL_MARKET_ADDRESS;
            }

            // Log for debugging in development
            console.log(`📋 Adding pari-mutuel bet to batch: market ${marketId} -> contract ${marketAddress}`);

            // Generate transaction calls for pari-mutuel betting
            let calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
            try {
                calls = generateBetCalls(
                    marketAddress as Address,
                    predictionSide,
                    parseUnits(betAmount.toString(), 6) // USDC has 6 decimals
                );
            } catch (genErr) {
                console.error('Error generating pari-mutuel bet calls:', genErr);
                toast.error('Problem preparing bet. Please try again.');
                return;
            }

            // Add to batch instead of executing immediately with user wallet info
            const newPrediction = {
                marketId,
                direction,
                amount: betAmount,
                calls,
                userAddress: address, // Store user wallet address for database tracking
                contractAddress: marketAddress,
                prediction: predictionSide,
                timestamp: Date.now()
            };
            setPendingBatch(prev => {
                const updated = [...prev, newPrediction];

                // Auto-execute if we reach max batch size of 20 
                if (updated.length >= 20) {
                    console.log('🚀 Auto-executing pari-mutuel batch: reached max size of 20');
                    setTimeout(() => executeBatch(updated), 500);
                } else {
                    console.log(`📦 Added to pari-mutuel batch: ${updated.length}/20 bets`);
                }

                return updated;
            });

            // Clear existing auto-execute timer
            if (batchTimer) {
                clearTimeout(batchTimer);
            }

            const newTimer = setTimeout(() => {
                // Auto-execute after 30 seconds of no activity
                console.log('⏰ Auto-executing pari-mutuel batch: 30 seconds of inactivity');
                setPendingBatch(currentBatch => {
                    if (currentBatch.length > 0) {
                        executeBatch(currentBatch);
                    }
                    return currentBatch;
                });
            }, 30000);

            setBatchTimer(newTimer);

        } catch (error) {
            console.error('Pari-mutuel batch setup error:', error);
            toast.error('Failed to add bet to batch');
        }
    };

    // Execute batch transaction for pari-mutuel bets
    const executeBatch = useCallback((batch: typeof pendingBatch) => {
        if (batch.length === 0) return;

        // Guard: avoid attempting execution when gasless config is invalid
        if (!isPaymasterConfigured()) {
            toast.error('Gasless not configured. Please set Paymaster/Bundler keys.');
            return;
        }

        console.log(`🚀 Executing pari-mutuel batch of ${batch.length} bets`);

        // Combine all calls from all bets in the batch
        const allCalls = batch.map(p => p.calls).flat();

        setCurrentPrediction({
            marketId: 'batch', // Special identifier for batch
            direction: 'right', // Not used for batch
            amount: batch.reduce((sum, p) => sum + p.amount, 0),
            calls: allCalls
        });

        // Clear the timer
        if (batchTimer) {
            clearTimeout(batchTimer);
            setBatchTimer(null);
        }
    }, [batchTimer, isPaymasterConfigured]);

    // Manual commit function for the commit button
    const handleManualCommit = useCallback(() => {
        if (pendingBatch.length === 0 || isProcessingTransaction) return;

        console.log(`👆 Manual commit triggered for ${pendingBatch.length} pari-mutuel bets`);

        // Haptic feedback for mobile devices
        if ('navigator' in window && 'vibrate' in navigator) {
            navigator.vibrate([50, 30, 50]); // Short-long-short pattern
        }

        // Show enhanced feedback for manual commit
        toast.success(
            <div className="flex items-center space-x-2">
                <span className="text-lg">🚀</span>
                <div>
                    <div className="font-semibold">Manual Submit!</div>
                    <div className="text-sm opacity-90">{pendingBatch.length} bets queued</div>
                </div>
            </div>,
            {
                duration: Infinity,
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #3b82f6',
                    minWidth: '200px',
                },
            }
        );

        executeBatch(pendingBatch);
    }, [pendingBatch, isProcessingTransaction, executeBatch]);

    // Handle successful transaction for pari-mutuel bets
    const handleSuccessfulTransaction = useCallback(async (txHash: string) => {
        console.log('🎉 Pari-mutuel batch transaction successful:', txHash);
        setIsProcessingTransaction(false);

        // Optionally track processed transactions to avoid duplicate handling (omitted)

        try {
            // Log each prediction to Supabase with complete user wallet information
            const predictions = pendingBatch.map(({ marketId, amount, userAddress, contractAddress, prediction, timestamp }) => ({
                market_id: marketId,
                prediction: prediction,
                amount: amount, // Amount bet in USDC
                transaction_hash: txHash,
                user_address: userAddress, // Store user wallet address
                contract_address: contractAddress, // Store market contract address
                timestamp: new Date(timestamp).toISOString(),
            }));

            // Insert all predictions at once with user wallet tracking
            await ParimutuelSupabaseService.insertPredictions(predictions, address!);

            // Update user's position for each market with wallet tracking
            for (const { marketId, direction, amount, userAddress } of pendingBatch) {
                try {
                    // Store user position with wallet address for tracking
                    await ParimutuelSupabaseService.updateUserPosition({
                        user_address: userAddress,
                        market_id: marketId,
                        prediction: direction === 'right' ? 'yes' : 'no',
                        amount_bet: amount,
                        transaction_hash: txHash
                    });
                } catch (positionError) {
                    console.error('Error updating user position:', positionError);
                    // Continue processing other positions even if one fails
                }
            }

            toast.success(
                <div className="flex items-center space-x-2">
                    <span className="text-lg">🎉</span>
                    <div>
                        <div className="font-semibold">Bets Placed Successfully!</div>
                        <div className="text-sm opacity-90">{pendingBatch.length} pari-mutuel bets confirmed</div>
                    </div>
                </div>,
                {
                    duration: 5000,
                    style: {
                        borderRadius: '12px',
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #22c55e',
                    },
                }
            );

        } catch (error) {
            console.error('Error logging pari-mutuel predictions to Supabase:', error);
            toast.error('Transaction successful but failed to log predictions');
        }

        // Clear the batch and current prediction
        setPendingBatch([]);
        setCurrentPrediction(null);

    }, [pendingBatch, address]);

    // Handle failed transaction
    const handleFailedTransaction = useCallback((error: string) => {
        console.error('💥 Pari-mutuel transaction failed:', error);
        setIsProcessingTransaction(false);

        toast.error(
            <div className="flex items-center space-x-2">
                <span className="text-lg">💥</span>
                <div>
                    <div className="font-semibold">Transaction Failed</div>
                    <div className="text-sm opacity-90">Please try again</div>
                </div>
            </div>,
            {
                duration: 8000,
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #ef4444',
                },
            }
        );

        // Clear current prediction but keep the batch for retry
        setCurrentPrediction(null);
    }, []);

    // Transaction status handler
    const onStatus = useCallback((status: LifecycleStatus) => {
        console.log('Pari-mutuel transaction status:', status.statusName);

        handleTransactionStatus(
            status as unknown as TransactionStatus,
            handleSuccessfulTransaction,
            handleFailedTransaction
        );

        if (status.statusName === 'transactionPending') {
            setIsProcessingTransaction(true);
            toast.loading('Processing pari-mutuel bets...', {
                duration: Infinity,
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #f59e0b',
                },
            });
        }
    }, [handleSuccessfulTransaction, handleFailedTransaction]);

    return (
        <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-sm">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-2 rounded-xl bg-slate-800/50 text-slate-300 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                )}
                <h1 className="text-xl font-bold text-white">Pari-mutuel Predictions</h1>
                <div className="flex items-center justify-end w-10">
                    {isPaymasterConfigured() ? (
                        <span className="text-xs text-green-400">⚡ Gasless enabled</span>
                    ) : (
                        <span className="text-xs text-yellow-400">⚠️ Gasless off</span>
                    )}
                </div>
            </div>

            {/* Category Filter */}
            <div className="p-4">
                <div className="flex gap-2 overflow-x-auto">
                    {(['all', 'crypto', 'tech', 'celebrity', 'sports', 'politics'] as const).map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800/50 text-slate-300 hover:text-white'
                                }`}
                        >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pending Batch Indicator */}
            {pendingBatch.length > 0 && (
                <div className="px-4 pb-2">
                    <div className="bg-slate-800/30 rounded-xl p-3 flex items-center justify-between">
                        <div className="text-slate-300">
                            <span className="text-sm">Pending bets: </span>
                            <span className="font-semibold text-white">{pendingBatch.length}/20</span>
                        </div>
                        <button
                            onClick={handleManualCommit}
                            disabled={isProcessingTransaction || !isPaymasterConfigured()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {isProcessingTransaction ? 'Processing...' : (!isPaymasterConfigured() ? 'Unavailable' : 'Submit Bets')}
                        </button>
                    </div>
                </div>
            )}

            {/* Swipe Stack */}
            <div className="flex-1 p-4">
                <SwipeStack
                    markets={currentMarkets}
                    onSwipe={handleSwipe}
                    rawSupabaseMarkets={rawSupabaseMarkets}
                />
            </div>

            {/* Transaction Modal */}
            {currentPrediction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full"
                    >
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2">
                                Confirm Pari-mutuel Bets
                            </h3>
                            <p className="text-slate-300 mb-6">
                                {pendingBatch.length} bets • ${currentPrediction.amount} total
                            </p>

                            <Transaction
                                isSponsored={true}
                                calls={currentPrediction.calls}
                                chainId={baseSepolia.id}
                                onStatus={onStatus}
                            >
                                <TransactionButton className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium" />
                                <TransactionSponsor />
                                <div className="mt-4 text-center">
                                    <TransactionStatusLabel />
                                    <TransactionStatusAction />
                                </div>
                            </Transaction>

                            <button
                                onClick={() => setCurrentPrediction(null)}
                                className="mt-4 text-slate-400 hover:text-white text-sm"
                                disabled={isProcessingTransaction}
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}