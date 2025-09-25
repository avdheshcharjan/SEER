"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SwipeStack } from './SwipeStack';
import { useAppStore } from '@/lib/store';
import { UnifiedMarket, SchemaTransformer } from '@/lib/types';
import { SupabaseService } from '@/lib/supabase';
import {
  getParimutuelMarketAddress,
  validateParimutuelMarket,
  type ParimutuelBetAmount,
  type ParimutuelBetSide
} from '@/lib/parimutuel-blockchain';
import {
  generateParimutuelBetCalls,
  generateParimutuelBatchCalls,
  validateParimutuelPaymasterConfig,
  formatBetSummary,
  estimateParimutuelGas
} from '@/lib/parimutuel-gasless';
import {
    Transaction,
    TransactionButton,
    TransactionSponsor,
    TransactionStatusAction,
    TransactionStatusLabel
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface ParimutuelPredictionMarketProps {
    onBack?: () => void;
}

export function ParimutuelPredictionMarket({ onBack }: ParimutuelPredictionMarketProps) {
    const { address } = useAccount();
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics'>('all');
    const [allMarkets, setAllMarkets] = useState<UnifiedMarket[]>([]);
    const [currentMarkets, setCurrentMarkets] = useState<UnifiedMarket[]>([]);

    // Parimutuel betting state
    const [pendingBets, setPendingBets] = useState<{
        marketId: string;
        direction: 'left' | 'right';
        betAmount: ParimutuelBetAmount;
        calls: Array<{
            to: Address;
            data: `0x${string}`;
            value: bigint;
        }>;
    }[]>([]);

    const [batchTimer, setBatchTimer] = useState<NodeJS.Timeout | null>(null);
    const [currentTransaction, setCurrentTransaction] = useState<{
        marketId: string;
        direction: 'left' | 'right';
        betAmount: ParimutuelBetAmount;
        calls: Array<{
            to: Address;
            data: `0x${string}`;
            value: bigint;
        }>;
    } | null>(null);

    const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
    const [processedTransactions, setProcessedTransactions] = useState<Set<string>>(new Set());
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

    // Load markets from Supabase
    useEffect(() => {
        const loadMarkets = async () => {
            try {
                const marketsWithInfluencers = await SupabaseService.getMarketsWithInfluencers();

                // Filter for active markets only
                const activeMarkets = marketsWithInfluencers.filter(m =>
                    !m.resolved && new Date(m.end_time) > new Date()
                );

                setRawSupabaseMarkets(activeMarkets);

                // Transform to unified market format
                const allAvailableMarkets = activeMarkets.map(m => SchemaTransformer.marketWithInfluencerToUnified(m));

                // Shuffle markets
                const shuffledMarkets = allAvailableMarkets.sort(() => 0.5 - Math.random());

                setAllMarkets(shuffledMarkets);
                setCurrentMarkets(shuffledMarkets.slice(0, 20));
            } catch (error) {
                console.error('Error loading markets:', error);
                setAllMarkets([]);
                setCurrentMarkets([]);
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
    }, [selectedCategory, allMarkets]);

    // Handle swipe actions for parimutuel betting
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
                },
            });
            return;
        }

        // Find the market data
        const marketSupabaseData = rawSupabaseMarkets.find(m => m.id === marketId);
        if (!marketSupabaseData || !marketSupabaseData.contract_address) {
            toast.error('Market contract not found!');
            return;
        }

        try {
            const marketAddress = getParimutuelMarketAddress(marketSupabaseData);

            // Validate it's a parimutuel market
            const isValidMarket = await validateParimutuelMarket(marketAddress);
            if (!isValidMarket) {
                toast.error('Invalid parimutuel market!');
                return;
            }

            const betSide: ParimutuelBetSide = direction === 'right' ? 'yes' : 'no';
            const betAmount: ParimutuelBetAmount = user.defaultBetAmount as ParimutuelBetAmount || 1;

            // Generate transaction calls
            const calls = generateParimutuelBetCalls(marketAddress, betSide, betAmount, true);

            // Add to pending batch
            const newBet = {
                marketId,
                direction,
                betAmount,
                calls
            };

            setPendingBets(prev => [...prev, newBet]);

            // Show immediate feedback
            const sideText = betSide === 'yes' ? 'YES' : 'NO';
            const market = allMarkets.find(m => m.id === marketId);
            const question = market?.question || 'Unknown question';

            toast(`$${betAmount} on ${sideText}`, {
                icon: direction === 'right' ? '✅' : '❌',
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                },
            });

            // Log to Supabase immediately (optimistic update)
            try {
                await SupabaseService.logPrediction({
                    user_id: address,
                    market_id: marketId,
                    prediction: betSide === 'yes',
                    amount: betAmount,
                    shares_received: betAmount, // In parimutuel, shares = amount for simplicity
                    transaction_hash: 'pending',
                });
            } catch (error) {
                console.error('Failed to log prediction to Supabase:', error);
            }

            // Set up batch timer (shorter for parimutuel - simpler transactions)
            if (batchTimer) {
                clearTimeout(batchTimer);
            }

            const newTimer = setTimeout(() => {
                processBatch();
            }, 8000); // 8 seconds for parimutuel (vs 12 for AMM)

            setBatchTimer(newTimer);

        } catch (error) {
            console.error('Error processing swipe:', error);
            toast.error('Failed to process bet!');
        }
    };

    // Process batched bets
    const processBatch = async () => {
        if (pendingBets.length === 0) return;

        setIsProcessingTransaction(true);

        try {
            // Prepare batch transaction data
            const bets = pendingBets.map(bet => {
                const marketSupabaseData = rawSupabaseMarkets.find(m => m.id === bet.marketId);
                if (!marketSupabaseData?.contract_address) {
                    throw new Error(`Market contract not found for ${bet.marketId}`);
                }

                return {
                    marketAddress: getParimutuelMarketAddress(marketSupabaseData),
                    betSide: (bet.direction === 'right' ? 'yes' : 'no') as ParimutuelBetSide,
                    betAmount: bet.betAmount,
                };
            });

            const { calls, totalAmount, betCount } = generateParimutuelBatchCalls(bets, true);
            const gasEstimate = estimateParimutuelGas(betCount, true);
            const betSummary = formatBetSummary(bets.map((bet, index) => ({
                ...bet,
                question: allMarkets.find(m => m.id === pendingBets[index].marketId)?.question
            })));

            console.log('Processing parimutuel batch:', {
                betCount,
                totalAmount: betSummary.totalAmount,
                estimatedGas: gasEstimate.estimatedGas.toString(),
                summary: betSummary.summary
            });

            // Set current transaction for OnchainKit
            setCurrentTransaction({
                marketId: pendingBets.map(b => b.marketId).join(','),
                direction: 'right', // Mixed batch
                betAmount: 1, // Mixed amounts
                calls
            });

            // Clear pending bets and timer
            setPendingBets([]);
            if (batchTimer) {
                clearTimeout(batchTimer);
                setBatchTimer(null);
            }

            toast.success(`Processing ${betSummary.summary}...`);

        } catch (error) {
            console.error('Error processing batch:', error);
            toast.error('Failed to process bet batch!');
            setIsProcessingTransaction(false);
        }
    };

    // Handle transaction status changes
    const handleTransactionStatus = (status: LifecycleStatus) => {
        console.log('Parimutuel transaction status:', status);

        if (status.statusName === 'success' && status.statusData) {
            const txHash = status.statusData.transactionHash;

            if (txHash && !processedTransactions.has(txHash)) {
                setProcessedTransactions(prev => new Set([...prev, txHash]));

                // Update user stats
                if (user) {
                    const betCount = pendingBets.length || 1;
                    const totalSpent = pendingBets.reduce((sum, bet) => sum + bet.betAmount, 0);

                    setUser({
                        ...user,
                        totalPredictions: user.totalPredictions + betCount,
                        totalSpent: user.totalSpent + totalSpent,
                    });
                }

                toast.success('Parimutuel bets placed successfully! 🎰', {
                    style: {
                        borderRadius: '12px',
                        background: '#059669',
                        color: '#ffffff',
                    },
                });
            }

            setIsProcessingTransaction(false);
            setCurrentTransaction(null);
        } else if (status.statusName === 'error') {
            console.error('Transaction failed:', status.statusData);
            toast.error('Transaction failed. Please try again.');
            setIsProcessingTransaction(false);
            setCurrentTransaction(null);
        }
    };

    // Category filter buttons
    const categories = [
        { id: 'all', label: 'All', icon: '🎯' },
        { id: 'crypto', label: 'Crypto', icon: '₿' },
        { id: 'tech', label: 'Tech', icon: '💻' },
        { id: 'celebrity', label: 'Celebrity', icon: '⭐' },
        { id: 'sports', label: 'Sports', icon: '🏈' },
        { id: 'politics', label: 'Politics', icon: '🗳️' },
    ] as const;

    // Bet amount selector
    const betAmounts: ParimutuelBetAmount[] = [1, 5, 10];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <div className="relative z-10 pt-6 pb-4 px-4">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={onBack}
                        className="text-white/80 hover:text-white transition-colors text-2xl"
                    >
                        ←
                    </button>
                    <h1 className="text-2xl font-bold text-white">🎰 Parimutuel Betting</h1>
                    <div className="w-8" />
                </div>

                {/* Bet Amount Selector */}
                <div className="flex justify-center mb-4">
                    <div className="flex bg-black/20 rounded-xl p-1">
                        {betAmounts.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => user && setUser({ ...user, defaultBetAmount: amount })}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    user?.defaultBetAmount === amount
                                        ? 'bg-purple-600 text-white'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                ${amount}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex justify-center overflow-x-auto pb-2">
                    <div className="flex space-x-2 min-w-max">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    selectedCategory === category.id
                                        ? 'bg-white text-purple-900'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                            >
                                {category.icon} {category.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pending Batch Indicator */}
            {pendingBets.length > 0 && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium"
                    >
                        {pendingBets.length} bet{pendingBets.length !== 1 ? 's' : ''} queued
                        (${pendingBets.reduce((sum, bet) => sum + bet.betAmount, 0)})
                    </motion.div>
                </div>
            )}

            {/* SwipeStack */}
            <div className="relative z-10 px-4">
                <SwipeStack
                    markets={currentMarkets}
                    onSwipe={handleSwipe}
                    disabled={isProcessingTransaction}
                />
            </div>

            {/* OnchainKit Transaction Component */}
            {currentTransaction && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Process Parimutuel Bets
                            </h3>
                            <p className="text-gray-600">
                                Placing your bets on the prediction markets
                            </p>
                        </div>

                        <Transaction
                            calls={currentTransaction.calls}
                            chainId={baseSepolia.id}
                            onStatus={handleTransactionStatus}
                        >
                            <TransactionButton
                                text="Place Bets"
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                            />
                            <TransactionSponsor />
                            <TransactionStatusLabel />
                            <TransactionStatusAction />
                        </Transaction>

                        <button
                            onClick={() => {
                                setCurrentTransaction(null);
                                setIsProcessingTransaction(false);
                            }}
                            className="w-full mt-4 text-gray-500 hover:text-gray-700 py-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Info Panel */}
            <div className="fixed bottom-4 left-4 right-4 z-20">
                <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 text-white text-center">
                    <p className="text-sm">
                        <span className="text-red-400">← NO</span> • <span className="text-white/60">↑ SKIP</span> • <span className="text-green-400">YES →</span>
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                        Winners split the losers&apos; pool • Fixed amounts: $1, $5, $10
                    </p>
                </div>
            </div>
        </div>
    );
}