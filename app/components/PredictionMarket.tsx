"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { SwipeStack } from './SwipeStack';
import { useAppStore } from '@/lib/store';
import { getRandomMarkets } from '@/lib/prediction-markets';
import { UnifiedMarket, UnifiedUserPrediction, SchemaTransformer } from '@/lib/types';
import { usePredictions, useMarkets } from '@/lib/hooks/useSupabaseData';
import { useBuyShares, useUSDCFaucet, SmartContractService, SmartContractUtils } from '@/lib/smart-contracts';
import { DEMO_MARKET_ADDRESS } from '@/lib/blockchain';
import { Address } from 'viem';

interface PredictionMarketProps {
    onBack?: () => void;
}

export function PredictionMarket({ onBack }: PredictionMarketProps) {
    const { address } = useAccount();
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics'>('all');
    const [allMarkets, setAllMarkets] = useState<UnifiedMarket[]>([]);
    const { createPrediction } = usePredictions();
    const { markets: supabaseMarkets } = useMarkets();
    const {
        currentMarkets,
        setCurrentMarkets,
        addSwipeHistory,
        user,
        setUser,
        createdMarkets
    } = useAppStore();

    // Smart contract hooks
    const { buyShares, executeBuyShares, isPending, isConfirming, isConfirmed, hash } = useBuyShares();
    const { claimFaucet, isPending: isFaucetPending, isConfirmed: isFaucetConfirmed, canUseFaucet, faucetCooldown } = useUSDCFaucet();
    const { data: usdcBalance } = SmartContractService.useUSDCBalance(address);
    const { data: demoMarketData } = SmartContractService.useMarketData(DEMO_MARKET_ADDRESS);
    const { data: userPosition } = SmartContractService.useUserPosition(DEMO_MARKET_ADDRESS, address);

    useEffect(() => {
        // Combine Supabase markets with legacy markets for fallback
        const staticMarkets = getRandomMarkets(20).map(m => SchemaTransformer.legacyToUnified(m));
        const allAvailableMarkets = supabaseMarkets.length > 0
            ? [...supabaseMarkets, ...createdMarkets]
            : [...staticMarkets, ...createdMarkets];

        // Shuffle to mix created markets throughout the stack
        const shuffledMarkets = allAvailableMarkets.sort(() => 0.5 - Math.random());

        setAllMarkets(shuffledMarkets);
        setCurrentMarkets(shuffledMarkets.slice(0, 20)); // Show first 20 initially

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
    }, [address, user, setCurrentMarkets, setUser, createdMarkets, supabaseMarkets]);

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
                icon: '⏭️',
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #475569',
                },
            });
            return;
        }

        // Get user's default bet amount (fallback to 1)
        const betAmount = user.defaultBetAmount ?? 1;
        const side = direction === 'right' ? 'yes' : 'no';

        // Check USDC balance
        const balance = usdcBalance ? SmartContractUtils.formatUSDC(usdcBalance) : 0;

        if (balance < betAmount) {
            // Offer to get test USDC from faucet
            toast((t) => (
                <div className="flex flex-col gap-2">
                    <span>Insufficient USDC balance! You need ${betAmount} but have ${balance.toFixed(2)}</span>
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                await claimFaucet();
                                toast.success('Claimed 1,000 test USDC from faucet! 🎉');
                            } catch (error: any) {
                                const errorMessage = error?.message || 'Failed to claim from faucet. Try again later.';
                                toast.error(errorMessage);
                            }
                        }}
                        className="bg-base-500 hover:bg-base-600 text-white px-3 py-1 rounded text-sm"
                        disabled={isFaucetPending || !canUseFaucet}
                        title={!canUseFaucet && faucetCooldown > 0 ? `Cooldown: ${(faucetCooldown / 3600).toFixed(1)} hours remaining` : undefined}
                    >
                        {isFaucetPending ? 'Claiming...' :
                            !canUseFaucet && faucetCooldown > 0 ? `Wait ${(faucetCooldown / 3600).toFixed(1)}h` :
                                'Get Test USDC (1,000)'}
                    </button>
                </div>
            ), {
                duration: 10000,
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #f59e0b',
                },
            });
            return;
        }

        // Show processing toast
        const processingToast = toast.loading('Executing blockchain transaction...', {
            style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #475569',
            },
        });

        try {
            // For now, use demo market for all predictions
            // In production, you'd determine the market address based on marketId
            const marketAddress = DEMO_MARKET_ADDRESS;

            // Execute the buy shares transaction
            await executeBuyShares(marketAddress, side, betAmount);

            // Dismiss processing toast
            toast.dismiss(processingToast);

            // Show success toast
            const predictionText = direction === 'right' ? 'YES' : 'NO';
            const emoji = direction === 'right' ? '✅' : '❌';

            toast.success(
                <div className="flex items-center justify-between">
                    <span>Predicted {predictionText} for ${betAmount} USDC! {emoji}</span>
                    {hash && (
                        <a
                            href={SmartContractUtils.getExplorerUrl(hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-base-400 hover:text-base-300 text-xs"
                        >
                            View ↗
                        </a>
                    )}
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

            // Also save to database for tracking
            if (hash) {
                try {
                    await createPrediction(
                        marketId,
                        side,
                        betAmount,
                        betAmount, // shares received = amount for simplicity
                        hash
                    );
                } catch (dbError) {
                    console.error('Failed to save prediction to database:', dbError);
                    // Don't show error to user since blockchain tx succeeded
                }
            }

        } catch (error) {
            // Dismiss processing toast
            toast.dismiss(processingToast);

            console.error('Failed to execute prediction:', error);

            // Check if it's a user rejection
            if (error && typeof error === 'object' && 'message' in error) {
                const errorMessage = (error as Error).message.toLowerCase();
                if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
                    toast.error('Transaction cancelled by user', {
                        style: {
                            borderRadius: '12px',
                            background: '#1e293b',
                            color: '#f1f5f9',
                            border: '1px solid #f59e0b',
                        },
                    });
                    return;
                }
            }

            toast.error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #dc2626',
                },
            });
        }
    };

    const simulateBlockchainTransaction = async (): Promise<void> => {
        // Simulate network delay
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate 95% success rate
                if (Math.random() > 0.05) {
                    resolve();
                } else {
                    reject(new Error('Transaction failed'));
                }
            }, 1000 + Math.random() * 2000); // 1-3 second delay
        });
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

                <h1 className="text-xl font-bold text-white">BASED</h1>

                <div className="p-2">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs text-slate-300 font-medium">
                            ?
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


        </div>
    );
}
