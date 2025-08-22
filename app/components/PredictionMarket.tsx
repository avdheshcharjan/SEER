"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { parseUnits, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SwipeStack } from './SwipeStack';
import { useAppStore } from '@/lib/store';
// Static markets removed - now using only Supabase data
import { UnifiedMarket, SchemaTransformer } from '@/lib/types';
import { SupabaseService } from '@/lib/supabase';
import { getMarketContractAddress, validateMarketContract } from '@/lib/blockchain';
import { 
    generateBuySharesCalls,
    validatePaymasterConfig
} from '@/lib/gasless-onchainkit';
import { 
    Transaction,
    TransactionButton,
    TransactionSponsor,
    TransactionStatusAction,
    TransactionStatusLabel
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface PredictionMarketProps {
    onBack?: () => void;
}

export function PredictionMarket({ onBack }: PredictionMarketProps) {
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

    useEffect(() => {
        const loadMarkets = async () => {
            try {
                // Load markets from Supabase only
                const supabaseMarkets = await SupabaseService.getActiveMarkets();
                setRawSupabaseMarkets(supabaseMarkets); // Keep raw for contract mapping

                // Use only Supabase markets (single source of truth)
                const allAvailableMarkets = supabaseMarkets.map(m => SchemaTransformer.supabaseToUnified(m));
                
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

    // Modify the handleSwipe function to validate market exists in Supabase before adding to batch
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
        const predictionSide = direction === 'right' ? 'yes' : 'no';
        
        // INSTANT FEEDBACK - no blockchain interaction yet
        toast.success(`${direction === 'right' ? '✅ YES' : '❌ NO'} added to batch!`, {
            duration: 2000,
            style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #22c55e',
            },
        });

        try {
            // IMPORTANT FIX: Validate market exists in Supabase before proceeding
            let marketExists;
            try {
                marketExists = await SupabaseService.getMarket(marketId);
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

            // ✅ SECURITY FIX: Get the correct market contract address
            const marketAddress = getMarketContractAddress(marketId, rawSupabaseMarkets);
            
            // Validate the market contract before proceeding
            const isValidContract = await validateMarketContract(marketAddress);
            if (!isValidContract) {
                throw new Error(`Invalid market contract: ${marketAddress}`);
            }
            
            // Log for debugging in development
            console.log(`📋 Adding prediction to batch: market ${marketId} -> contract ${marketAddress}`);
            
            // Generate transaction calls for OnchainKit
            const calls = generateBuySharesCalls(
                marketAddress as Address,
                predictionSide,
                parseUnits(betAmount.toString(), 6) // USDC has 6 decimals
            );

            // Add to batch instead of executing immediately
            const newPrediction = { marketId, direction, amount: betAmount, calls };
            setPendingBatch(prev => {
                const updated = [...prev, newPrediction];
                
                // Only auto-execute if we reach max batch size of 5
                // Otherwise wait for timer or manual trigger
                if (updated.length >= 5) {
                    console.log('🚀 Auto-executing batch: reached max size of 5');
                    setTimeout(() => executeBatch(updated), 500);
                } else {
                    console.log(`📦 Added to batch: ${updated.length}/5 predictions`);
                }
                
                return updated;
            });

            // Clear existing timer and set new one
            if (batchTimer) {
                clearTimeout(batchTimer);
            }
            
            const newTimer = setTimeout(() => {
                // Auto-execute after 8 seconds of no activity (increased from 5)
                console.log('⏰ Auto-executing batch: 8 seconds of inactivity');
                setPendingBatch(currentBatch => {
                    if (currentBatch.length > 0) {
                        executeBatch(currentBatch);
                    }
                    return currentBatch;
                });
            }, 8000);
            
            setBatchTimer(newTimer);

        } catch (error) {
            console.error('Batch setup error:', error);
            toast.error('Failed to add prediction to batch');
        }
    };

    // Execute batch transaction
    const executeBatch = (batch: typeof pendingBatch) => {
        if (batch.length === 0) return;
        
        console.log(`🚀 Executing batch of ${batch.length} predictions`);
        
        // Combine all calls from all predictions in the batch
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
    };

    // Modify the handleBatchStatus function to improve error handling
    const handleBatchStatus = async (status: LifecycleStatus) => {
        if (!user || !address || pendingBatch.length === 0 || isProcessingTransaction) return;

        console.log('🔄 Transaction status update:', status);

        if (status.statusName === 'success' && status.statusData && status.statusData.transactionReceipts && status.statusData.transactionReceipts.length > 0) {
            const txHash = status.statusData.transactionReceipts[0].transactionHash;
            if (txHash && !processedTransactions.has(txHash)) {
                // Mark this transaction as processed
                setProcessedTransactions(prev => new Set(prev).add(txHash));
                setIsProcessingTransaction(true);
                
                // We've already validated markets during handleSwipe, but let's double check
                // to make sure nothing changed in the database since then
                try {
                    console.log(`✅ Batch transaction successful: ${txHash}`);
                    
                    // Show success toast
                    toast.success(
                        <div className="flex items-center justify-between">
                            <span>🎉 {pendingBatch.length} gasless predictions confirmed!</span>
                            <a
                                href={`https://sepolia.basescan.org/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-base-400 hover:text-base-300 text-xs"
                            >
                                View ↗
                            </a>
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

                    // Save all predictions to database
                    for (const prediction of pendingBatch) {
                        try {
                            // Verify market still exists before saving prediction
                            const marketExists = await SupabaseService.getMarket(prediction.marketId);
                            if (!marketExists) {
                                console.error(`Market ${prediction.marketId} no longer exists in database, skipping`);
                                continue;
                            }
                            
                            // Save prediction to Supabase (with duplicate check for development)
                            const existingPrediction = await SupabaseService.getUserPredictions(user.id);
                            const isDuplicate = existingPrediction?.some(p => 
                                p.market_id === prediction.marketId && 
                                p.transaction_hash === txHash
                            );
                            
                            if (!isDuplicate) {
                                await SupabaseService.createPrediction({
                                    market_id: prediction.marketId,
                                    user_id: user.id,
                                    side: prediction.direction === 'right' ? 'yes' : 'no',
                                    amount: prediction.amount,
                                    shares_received: prediction.amount,
                                    transaction_hash: txHash
                                });
                                
                                // Update user position in Supabase
                                const existingPosition = await SupabaseService.getUserPosition(user.id, prediction.marketId);
                                const currentYesShares = existingPosition?.yes_shares || 0;
                                const currentNoShares = existingPosition?.no_shares || 0;
                                const currentInvested = existingPosition?.total_invested || 0;
                                
                                await SupabaseService.updateUserPosition({
                                    user_id: user.id,
                                    market_id: prediction.marketId,
                                    yes_shares: prediction.direction === 'right' ? currentYesShares + prediction.amount : currentYesShares,
                                    no_shares: prediction.direction === 'left' ? currentNoShares + prediction.amount : currentNoShares,
                                    total_invested: currentInvested + prediction.amount
                                });
                            } else {
                                console.log('🚫 Duplicate prediction detected, skipping database save');
                            }
                        } catch (err) {
                            console.error(`Error saving prediction for market ${prediction.marketId}:`, err);
                            // Continue with other predictions even if one fails
                        }
                    }

                    // Clear batch and current prediction
                    setPendingBatch([]);
                    setCurrentPrediction(null);
                    
                    // Add a small delay before allowing new transactions
                    setTimeout(() => {
                        setIsProcessingTransaction(false);
                    }, 1000);

                } catch (error) {
                    console.error('Database save error:', error);
                    toast.error('Predictions successful but failed to save. Contact support.');
                    
                    // Clean up state even on error
                    setPendingBatch([]);
                    setCurrentPrediction(null);
                    setTimeout(() => {
                        setIsProcessingTransaction(false);
                    }, 1000);
                }
            } else if (txHash && processedTransactions.has(txHash)) {
                // Transaction already processed, ignore
                console.log(`Transaction ${txHash} already processed, ignoring`);
                return;
            }
        } else if (status.statusName === 'error') {
            // Transaction failed
            const errorMessage = status.statusData?.code || 'Unknown error';
            console.error('Batch transaction failed:', errorMessage);
            toast.error('Batch prediction failed. Please try again.');
            setPendingBatch([]);
            setCurrentPrediction(null);
            setIsProcessingTransaction(false);
        }
    };

    // Check if paymaster is configured
    const isPaymasterConfigured = () => {
        const config = validatePaymasterConfig();
        return config.valid;
    };



    if (!address) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-6">
                <div className="text-6xl mb-6">🔗</div>
                <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
                <p className="text-slate-400 mb-6 max-w-md">
                    Connect your wallet to start making predictions and earning rewards on the Base network.
                </p>
                <motion.button
                    onClick={onBack}
                    className="px-6 py-3 bg-base-500 hover:bg-base-600 text-white rounded-xl font-semibold transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Go Back
                </motion.button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <motion.button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </motion.button>

                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold text-white">Seer</h1>
                    {isPaymasterConfigured() && (
                        <div className="text-xs text-green-400 mt-1">
                            ⚡ Gasless enabled
                        </div>
                    )}
                    {pendingBatch.length > 0 && (
                        <div className="text-xs text-blue-400 mt-1">
                            {pendingBatch.length} queued
                        </div>
                    )}
                </div>

                <div className="p-2">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs text-slate-300 font-medium">
                            {isPaymasterConfigured() ? '⚡' : '?'}
                        </div>
                    </div>
                </div>
            </div>


            {/* Category Tab Bar */}
            <div className="flex items-center space-x-1 mb-6 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
                {['all', 'crypto', 'tech', 'celebrity', 'sports', 'politics'].map((category) => (
                    <motion.button
                        key={category}
                        onClick={() => setSelectedCategory(category as typeof selectedCategory)}
                        className={`
                            px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex-1 text-center
                            ${selectedCategory === category
                                ? 'bg-base-500 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }
                        `}
                        whileHover={{ scale: selectedCategory === category ? 1 : 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                    </motion.button>
                ))}
            </div>

            {/* Swipe Stack */}
            <SwipeStack
                markets={currentMarkets}
                onSwipe={handleSwipe}
                className="mb-8"
            />

            {/* Batch Indicator */}
            {pendingBatch.length > 0 && (
                <div className="fixed top-20 right-4 z-50 bg-blue-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-blue-400/50">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">{pendingBatch.length} pending</span>
                    </div>
                </div>
            )}

            {/* OnchainKit Transaction component for batch gasless predictions */}
            {currentPrediction && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800/95 backdrop-blur-sm p-6 rounded-xl border border-slate-600 min-w-[300px]">
                    <div className="text-center mb-4">
                        <h3 className="text-white font-semibold mb-2">
                            {pendingBatch.length > 0 ? 
                                `Confirming ${pendingBatch.length} Predictions` : 
                                'Confirming Prediction'
                            }
                        </h3>
                        <p className="text-slate-400 text-sm">Gasless transaction in progress...</p>
                    </div>
                    <Transaction
                        chainId={baseSepolia.id}
                        calls={currentPrediction.calls}
                        isSponsored={true}
                        onStatus={handleBatchStatus}
                    >
                        <TransactionButton 
                            text={pendingBatch.length > 0 ? 
                                `Confirm ${pendingBatch.length} Predictions` : 
                                'Confirm Prediction'
                            }
                            className="w-full mb-2"
                        />
                        <TransactionSponsor />
                                            <div className="mt-4">
                        <TransactionStatusLabel />
                        <TransactionStatusAction />
                    </div>
                    </Transaction>
                </div>
            )}

        </div>
    );
}
