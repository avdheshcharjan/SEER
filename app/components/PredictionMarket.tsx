"use client";

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { SwipeStack } from './SwipeStack';
import { useAppStore } from '@/lib/store';
import { getRandomMarkets } from '@/lib/prediction-markets';
import { UserPrediction } from '@/lib/prediction-markets';

interface PredictionMarketProps {
    onBack?: () => void;
}

export function PredictionMarket({ onBack }: PredictionMarketProps) {
    const { address } = useAccount();
    const {
        currentMarkets,
        setCurrentMarkets,
        addPrediction,
        addSwipeHistory,
        user,
        setUser
    } = useAppStore();

    useEffect(() => {
        // Initialize markets when component mounts
        if (currentMarkets.length === 0) {
            const markets = getRandomMarkets(20); // Get 20 random markets
            setCurrentMarkets(markets);
        }

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
            });
        }
    }, [address, currentMarkets.length, user, setCurrentMarkets, setUser]);

    const handleSwipe = async (marketId: string, direction: 'left' | 'right' | 'up') => {
        if (!address || !user) {
            toast.error('Please connect your wallet first!');
            return;
        }

        // Add to swipe history
        addSwipeHistory(marketId);

        // Handle skip
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

        // Create prediction
        const prediction: UserPrediction = {
            id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            marketId,
            userId: user.id,
            prediction: direction === 'right' ? 'yes' : 'no',
            amount: 1, // $1 USDC per prediction as specified
            timestamp: new Date().toISOString(),
        };

        // Add prediction to store
        addPrediction(prediction);

        // Show success toast
        const predictionText = direction === 'right' ? 'YES' : 'NO';
        const emoji = direction === 'right' ? '✅' : '❌';

        toast.success(`Predicted ${predictionText} for $1 USDC! ${emoji}`, {
            style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #475569',
            },
        });

        // Show processing toast
        const processingToast = toast.loading('Processing transaction on Base...', {
            style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #475569',
            },
        });

        try {
            // Simulate blockchain transaction with realistic delay
            await simulateBlockchainTransaction();

            // Update prediction with transaction hash (simulated)
            const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
            prediction.transactionHash = transactionHash;

            // Dismiss processing toast
            toast.dismiss(processingToast);

            // Show success toast with transaction link
            toast.success(
                <div className="flex items-center justify-between">
                    <span>Transaction confirmed! 🔗</span>
                    <a
                        href={`https://sepolia.basescan.org/tx/${transactionHash}`}
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
        } catch (error) {
            toast.dismiss(processingToast);
            toast.error('Transaction failed. Please try again.');
            console.error('Transaction error:', error);
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

                <h1 className="text-xl font-bold text-white">Prediction Market</h1>

                <div className="p-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse" />
                </div>
            </div>

            {/* User Stats */}
            {user && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-slate-700/50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-white">${user.totalSpent}</div>
                            <div className="text-xs text-slate-400">Total Spent</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{user.totalPredictions}</div>
                            <div className="text-xs text-slate-400">Predictions</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-400">
                                {user.totalPredictions > 0
                                    ? Math.round((user.correctPredictions / user.totalPredictions) * 100)
                                    : 0}%
                            </div>
                            <div className="text-xs text-slate-400">Win Rate</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Swipe Stack */}
            <SwipeStack
                markets={currentMarkets}
                onSwipe={handleSwipe}
                className="mb-8"
            />


        </div>
    );
}
