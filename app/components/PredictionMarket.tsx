"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { SwipeStack } from './SwipeStack';
import { useAppStore } from '@/lib/store';
import { getRandomMarkets } from '@/lib/prediction-markets';
import { UnifiedMarket, UnifiedUserPrediction, SchemaTransformer } from '@/lib/types';
import { SupabaseService } from '@/lib/supabase';
import { 
    generateBuySharesTransaction,
    getMarketContractAddress,
    validateMarketContract
} from '@/lib/blockchain';
import { 
    executeGaslessTransaction,
    checkSponsorshipEligibility,
    validateGaslessConfig
} from '@/lib/gasless';
import { USDCApprovalFlow } from './USDCApprovalFlow';
import { Address } from 'viem';

interface PredictionMarketProps {
    onBack?: () => void;
}

export function PredictionMarket({ onBack }: PredictionMarketProps) {
    const { address } = useAccount();
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics'>('all');
    const [allMarkets, setAllMarkets] = useState<UnifiedMarket[]>([]);
    const [usdcApproved, setUsdcApproved] = useState(false);
    const {
        currentMarkets,
        setCurrentMarkets,
        addPrediction,
        addSwipeHistory,
        user,
        setUser,
        createdMarkets,
        setSupabaseMarkets,
        updateUserPosition
    } = useAppStore();

    useEffect(() => {
        const loadMarkets = async () => {
            try {
                // Load markets from Supabase
                const supabaseMarkets = await SupabaseService.getActiveMarkets();
                setSupabaseMarkets(supabaseMarkets);

                // Combine Supabase markets with static markets and user-created markets
                const staticMarkets = getRandomMarkets(20).map(m => SchemaTransformer.legacyToUnified(m));
                const unifiedSupabaseMarkets = supabaseMarkets.map(m => SchemaTransformer.supabaseToUnified(m));
                const allAvailableMarkets = [...unifiedSupabaseMarkets, ...staticMarkets, ...createdMarkets];
                
                // Shuffle to mix all market sources throughout the stack
                const shuffledMarkets = allAvailableMarkets.sort(() => 0.5 - Math.random());
                
                setAllMarkets(shuffledMarkets);
                setCurrentMarkets(shuffledMarkets.slice(0, 20)); // Show first 20 initially
            } catch (error) {
                console.error('Error loading markets:', error);
                // Fallback to static markets only
                const staticMarkets = getRandomMarkets(50).map(m => SchemaTransformer.legacyToUnified(m));
                const allAvailableMarkets = [...staticMarkets, ...createdMarkets];
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
    }, [address, user, setCurrentMarkets, setUser, createdMarkets, setSupabaseMarkets]);


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

        // Create prediction using user's default bet amount (fallback to 1)
        const betAmount = user.defaultBetAmount ?? 1;
        const prediction: UnifiedUserPrediction = {
            id: `pred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            marketId,
            userId: user.id,
            side: direction === 'right' ? 'yes' : 'no',
            amount: betAmount,
            sharesReceived: betAmount, // Will be updated after transaction
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Show initial toast
        const predictionText = direction === 'right' ? 'YES' : 'NO';
        const emoji = direction === 'right' ? '✅' : '❌';

        toast.success(`Predicting ${predictionText} for $${betAmount} USDC! ${emoji}`, {
            style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #475569',
            },
        });

        // Show processing toast
        const processingToast = toast.loading('Processing gasless prediction...', {
            style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #475569',
            },
        });

        try {
            // ✅ SECURITY FIX: Get the correct market contract address
            const marketAddress = getMarketContractAddress(marketId);
            
            // Validate the market contract before proceeding
            const isValidContract = await validateMarketContract(marketAddress);
            if (!isValidContract) {
                throw new Error(`Invalid market contract: ${marketAddress}`);
            }
            
            // Log for debugging in development
            console.log(`📋 Executing prediction on market ${marketId} -> contract ${marketAddress}`);
            
            // Generate buy shares transaction for the SPECIFIC market
            const buySharesTx = generateBuySharesTransaction({
                marketAddress,
                prediction: direction === 'right' ? 'yes' : 'no',
                amount: betAmount,
                userAddress: address as Address,
            });

            let transactionHash: string = '';

            if (usdcApproved && validateGaslessConfig()) {
                // Use gasless transactions via existing Base smart account
                toast.loading('Executing gasless prediction via Coinbase Paymaster...', {
                    id: processingToast,
                });

                // Check sponsorship eligibility for buy shares transaction
                const buySharesEligible = await checkSponsorshipEligibility(buySharesTx, address as Address);

                if (buySharesEligible.eligible) {
                    // Execute buy shares transaction (approval already done)
                    const buyResult = await executeGaslessTransaction(buySharesTx, address as Address);
                    console.log('Buy shares transaction:', buyResult);
                    
                    transactionHash = buyResult.transactionHash;
                } else {
                    throw new Error('Transaction not eligible for sponsorship');
                }
            } else {
                // Fallback to simulated transaction if gasless not available
                await simulateBlockchainTransaction();
                transactionHash = `0x${Math.random().toString(16).substring(2, 64)}`;
            }

            // Update prediction with transaction hash
            prediction.transactionHash = transactionHash;

            // Add prediction to store
            addPrediction(prediction);

            // Save prediction to Supabase
            await SupabaseService.createPrediction({
                market_id: marketId,
                user_id: user.id,
                side: direction === 'right' ? 'yes' : 'no',
                amount: betAmount,
                shares_received: betAmount,
                transaction_hash: transactionHash
            });

            // Update user position in Supabase
            const existingPosition = await SupabaseService.getUserPosition(user.id, marketId);
            const currentYesShares = existingPosition?.yes_shares || 0;
            const currentNoShares = existingPosition?.no_shares || 0;
            const currentInvested = existingPosition?.total_invested || 0;

            const updatedPosition = await SupabaseService.updateUserPosition({
                user_id: user.id,
                market_id: marketId,
                yes_shares: direction === 'right' ? currentYesShares + betAmount : currentYesShares,
                no_shares: direction === 'left' ? currentNoShares + betAmount : currentNoShares,
                total_invested: currentInvested + betAmount
            });

            // Update store with new position
            updateUserPosition(updatedPosition);

            // Dismiss processing toast
            toast.dismiss(processingToast);

            // Show success toast with transaction link
            const successMessage = usdcApproved && validateGaslessConfig() ? 
                'Gasless prediction confirmed! No fees paid! 🎉' : 
                'Prediction confirmed! 🔗';

            toast.success(
                <div className="flex items-center justify-between">
                    <span>{successMessage}</span>
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
            console.error('Transaction error:', error);
            toast.dismiss(processingToast);
            
            const errorMessage = usdcApproved && validateGaslessConfig() ? 
                'Gasless prediction failed. Please try again.' : 
                'Prediction failed. Please try again.';
            
            toast.error(errorMessage);
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

                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold text-white">BASED</h1>
                    {usdcApproved && validateGaslessConfig() && (
                        <div className="text-xs text-green-400 mt-1">
                            ⚡ Gasless enabled
                        </div>
                    )}
                </div>

                <div className="p-2">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs text-slate-300 font-medium">
                            {usdcApproved && validateGaslessConfig() ? '⚡' : '?'}
                        </div>
                    </div>
                </div>
            </div>

            {/* USDC Pre-Approval Flow */}
            <USDCApprovalFlow onApprovalComplete={() => setUsdcApproved(true)} />

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
