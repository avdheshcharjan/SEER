"use client";

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { useAccount } from 'wagmi';
import { SwipeStack } from './SwipeStack';
// Static markets removed - now using only Supabase data
import {
    enhancedBatchOptimizer,
    EnhancedBatchUtils,
    type BatchCall,
} from '@/lib/batch-optimizer';
import { getMarketContractAddress, getMarketsWithContracts, validateMarketContract } from '@/lib/blockchain';
import { debugSignatureValidation, logERC4337Debug, validateERC4337Config } from '@/lib/erc4337-debug';
import {
    GaslessOptimizationUtils,
    smartBatchingManager,
    validatePaymasterConfig
} from '@/lib/gasless-onchainkit';
import { SupabaseService } from '@/lib/supabase';
import { SchemaTransformer, UnifiedMarket } from '@/lib/types';
import { checkUSDCAllowance } from '@/lib/usdc-allowance';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import {
    Transaction,
    TransactionButton,
    TransactionSponsor,
    TransactionStatusAction,
    TransactionStatusLabel
} from '@coinbase/onchainkit/transaction';

interface PredictionMarketProps {
    onBack?: () => void;
}

export function PredictionMarket({ onBack }: PredictionMarketProps) {
    const { address } = useAccount();
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics'>('all');
    const [allMarkets, setAllMarkets] = useState<UnifiedMarket[]>([]);
    const [currentMarkets, setCurrentMarkets] = useState<UnifiedMarket[]>([]);
    const [batchStatus, setBatchStatus] = useState<{
        pendingSwipes: number;
        isProcessing: boolean;
        autoExecuteTriggers: {
            swipeCountTrigger: boolean;
            timeoutTrigger: boolean;
            timeRemaining?: number;
        };
    }>({ pendingSwipes: 0, isProcessing: false, autoExecuteTriggers: { swipeCountTrigger: false, timeoutTrigger: false } });
    const [currentPrediction, setCurrentPrediction] = useState<{
        batchNumber: number;
        totalBatches: number;
        calls: BatchCall[];
        estimatedGas: bigint;
        optimizationSummary: {
            originalCalls: number;
            optimizedCalls: number;
            gasSavingsPercent: number;
        };
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
        setUser,
        updateUSDCAllowance,
        markAllowanceForRefresh,
        usdcAllowance
    } = useAppStore();

    useEffect(() => {
        // Validate ERC-4337 configuration on mount
        const erc4337Config = validateERC4337Config(baseSepolia.id);
        if (!erc4337Config.isValid) {
            console.error('❌ ERC-4337 Configuration Issues:', erc4337Config.errors);
            logERC4337Debug(baseSepolia.id);
        } else {
            console.log('✅ ERC-4337 Configuration is valid');
            if (erc4337Config.warnings.length > 0) {
                console.warn('⚠️ ERC-4337 Configuration Warnings:', erc4337Config.warnings);
            }
        }

        const loadMarkets = async () => {
            try {
                console.log('🚀 Starting market loading process...');

                // Load markets with influencer data from Supabase
                const marketsWithInfluencers = await SupabaseService.getMarketsWithInfluencers();

                if (!marketsWithInfluencers || marketsWithInfluencers.length === 0) {
                    console.warn('⚠️ No markets returned from Supabase');
                    setAllMarkets([]);
                    setCurrentMarkets([]);
                    return;
                }

                console.log(`📊 Loaded ${marketsWithInfluencers.length} markets from Supabase`);

                // Filter for active markets only
                const activeMarkets = marketsWithInfluencers.filter(m =>
                    !m.resolved && new Date(m.end_time) > new Date()
                );

                console.log(`📊 Active markets: ${activeMarkets.length}/${marketsWithInfluencers.length}`);

                setRawSupabaseMarkets(activeMarkets); // Keep raw for contract mapping

                // Use markets with influencer data - use the new transformer
                const transformedMarkets = activeMarkets.map(m => SchemaTransformer.marketWithInfluencerToUnified(m));

                // ✅ SECURITY FIX: Filter out markets without deployed contracts
                const marketsWithContracts = getMarketsWithContracts(activeMarkets);
                const validTransformedMarkets = transformedMarkets.filter(market =>
                    marketsWithContracts.some(validMarket => validMarket.id === market.id)
                );

                console.log(`📊 Filtered markets: ${transformedMarkets.length} -> ${validTransformedMarkets.length} (with contracts)`);

                // Shuffle markets
                const shuffledMarkets = validTransformedMarkets.sort(() => 0.5 - Math.random());

                setAllMarkets(shuffledMarkets);
                setCurrentMarkets(shuffledMarkets.slice(0, 20)); // Show first 20 initially

                console.log('✅ Market loading completed successfully');
            } catch (error) {
                console.error('❌ Error loading markets:', error);

                // More detailed error logging
                if (error instanceof Error) {
                    console.error('Error details:', {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    });
                }

                // Fallback to empty array if Supabase fails
                console.log('🔄 Using empty fallback state');
                const allAvailableMarkets: UnifiedMarket[] = [];
                const shuffledMarkets = allAvailableMarkets.sort(() => 0.5 - Math.random());
                setAllMarkets(shuffledMarkets);
                setCurrentMarkets(shuffledMarkets.slice(0, 20));
            }
        };

        loadMarkets();

        // Initialize smart batching manager execution callback
        if (address) {
            smartBatchingManager.setExecutionCallback(async (batches: BatchCall[][]) => {
                console.log(`🚀 Smart batching auto-execution triggered: ${batches.length} batches`);
                await handleEnhancedBatchExecution(batches);
            });
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
                defaultBetAmount: 1, // Default $1 USDC
            });
        }
    }, [address, user, setUser]);

    // Initialize USDC allowance tracking when user connects
    useEffect(() => {
        const initializeAllowance = async () => {
            if (!address || !usdcAllowance.needsRefresh) return;

            try {
                // For now, we'll use the first market address as a representative spender
                // In production, you might want a dedicated batch processor contract
                if (rawSupabaseMarkets.length > 0) {
                    const firstValidMarket = rawSupabaseMarkets.find(m => m.contract_address);
                    if (firstValidMarket?.contract_address) {
                        const allowanceStatus = await checkUSDCAllowance(
                            address,
                            firstValidMarket.contract_address as Address,
                            BigInt(0) // Just checking current allowance
                        );

                        updateUSDCAllowance(allowanceStatus.current.toString(), false);
                        console.log(`💰 Initialized USDC allowance: ${Number(allowanceStatus.current) / 10 ** 6} USDC`);
                    } else {
                        console.warn('⚠️ No markets with contract addresses found for allowance check');
                        updateUSDCAllowance('0', false); // Don't mark for retry if no markets available
                    }
                } else {
                    console.warn('⚠️ No markets loaded yet for allowance check');
                }
            } catch (error) {
                console.error('Failed to initialize USDC allowance:', error);

                // Check if it's an RPC authentication error
                if (error instanceof Error && error.message.includes('RPC authentication failed')) {
                    toast.error('RPC connection failed. Please check your network configuration.');
                }

                updateUSDCAllowance('0', true); // Mark for retry
            }
        };

        initializeAllowance();
    }, [address, rawSupabaseMarkets, usdcAllowance.needsRefresh, updateUSDCAllowance]);

    // Track smart batching manager status
    useEffect(() => {
        const updateBatchStatus = () => {
            const status = smartBatchingManager.getBatchStatus();
            setBatchStatus(status);
        };

        // Update initially
        updateBatchStatus();

        // Set up periodic updates for real-time batch status tracking
        const statusInterval = setInterval(updateBatchStatus, 1000);

        return () => {
            clearInterval(statusInterval);
        };
    }, []);

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

    // Enhanced handleSwipe function with smart batching integration
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
            // Enhanced validation using EnhancedBatchUtils
            const validation = EnhancedBatchUtils.validateSwipe(
                marketId,
                predictionSide,
                betAmount,
                rawSupabaseMarkets
            );

            if (!validation.valid) {
                console.error(`Swipe validation failed: ${validation.error}`);
                toast.error(validation.error || 'Invalid swipe. Please try another market.');
                return;
            }

            // IMPORTANT FIX: Validate market exists in Supabase before proceeding
            try {
                const marketExists = await SupabaseService.getMarket(marketId);
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

            // ✅ SECURITY FIX: Enhanced market address validation
            const marketAddressResult = getMarketContractAddress(marketId, rawSupabaseMarkets);
            if (!marketAddressResult.isValid || !marketAddressResult.address) {
                console.error(`Invalid market contract address: ${marketAddressResult.reason || 'Unknown error'} for market ${marketId}`);
                toast.error('Invalid market contract. This market is not ready for betting.');
                return;
            }

            const marketAddress = marketAddressResult.address;
            // Additional contract validation for security
            const isValidContract = await validateMarketContract(marketAddress);
            if (!isValidContract) {
                console.error(`Market contract validation failed for address: ${marketAddress}`);
                toast.error('Market contract validation failed. Please try another market.');
                return;
            }

            console.log(`📋 Adding swipe to smart batch: ${predictionSide.toUpperCase()} on ${marketId} for ${betAmount} USDC`);

            // Use smart batching manager for enhanced batch processing
            smartBatchingManager.addSwipe(marketId, predictionSide, betAmount, rawSupabaseMarkets);

            // Update USDC allowance tracking for the smart batching manager
            const currentAllowanceBI = BigInt(usdcAllowance.remaining);
            smartBatchingManager.updateUSDCAllowance(currentAllowanceBI);

            console.log(`📦 Swipe added to smart batch. Current status: ${batchStatus.pendingSwipes} pending swipes`);

        } catch (error) {
            console.error('Enhanced batch setup error:', error);

            // Check if it's a validation error vs system error
            if (error instanceof Error && error.message.includes('Invalid or missing contract address')) {
                toast.error('Market contract not found. Please try another market.');
            } else {
                toast.error('Failed to add prediction to batch. Please try again.');
            }
        }
    };

    // Enhanced batch execution handler using smart batching manager
    const handleEnhancedBatchExecution = useCallback(async (batches: BatchCall[][]) => {
        if (!address || batches.length === 0) {
            console.warn('⚠️ Cannot execute batch: missing address or empty batches');
            return;
        }

        try {
            console.log(`🚀 Executing enhanced batch: ${batches.length} batches with smart optimization`);

            // Execute each batch sequentially
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const batchNumber = i + 1;
                const totalBatches = batches.length;

                console.log(`📦 Processing batch ${batchNumber}/${totalBatches} with ${batch.length} calls`);

                // Estimate gas for this batch
                const gasEstimation = await enhancedBatchOptimizer.estimateGas(batch, address);

                // Calculate optimization summary for display
                const optimizationSummary = {
                    originalCalls: batch.length * 2, // Legacy approach: 2 calls per bet (approval + bet)
                    optimizedCalls: batch.length,
                    gasSavingsPercent: 50 // 50% reduction from bulk approval optimization
                };

                // Set current prediction for UI display
                setCurrentPrediction({
                    batchNumber,
                    totalBatches,
                    calls: batch,
                    estimatedGas: gasEstimation.estimatedGas,
                    optimizationSummary
                });

                // The OnchainKit Transaction component will handle the actual execution
                // This function just sets up the UI state for the transaction
                break; // Only process first batch immediately, others will be queued
            }

        } catch (error) {
            console.error('❌ Enhanced batch execution setup failed:', error);

            // Debug ERC-4337 issues
            logERC4337Debug(baseSepolia.id, error);

            // Check for signature validation errors
            const sigDebug = debugSignatureValidation(error);
            if (sigDebug.isSignatureError) {
                toast.error('ERC-4337 signature validation failed. Check console for debug info.', {
                    duration: 8000
                });
            } else {
                toast.error('Failed to prepare enhanced batch transaction. Please try again.');
            }

            // Clear the smart batch manager pending swipes
            smartBatchingManager.clearBatch();
        }
    }, [address]);

    // Manual batch execution trigger (for testing or manual override)
    const triggerManualBatchExecution = async () => {
        if (!address) {
            toast.error('Wallet not connected');
            return;
        }

        try {
            // Get current batch status
            const status = smartBatchingManager.getBatchStatus();
            if (status.pendingSwipes === 0) {
                toast('No pending swipes to execute');
                return;
            }

            console.log(`🎯 Manual batch execution triggered: ${status.pendingSwipes} pending swipes`);

            // Use the first available market address as spender for now
            // In production, this would be a dedicated batch processor contract
            const firstValidMarket = rawSupabaseMarkets.find(m => m.contract_address);
            if (!firstValidMarket?.contract_address) {
                toast.error('No valid market contracts available for batch execution');
                return;
            }

            const spenderAddress = firstValidMarket.contract_address as Address;
            const result = await smartBatchingManager.executeCurrentBatch(address, spenderAddress);

            if (result.success) {
                await handleEnhancedBatchExecution(result.batches);
                toast.success(`Manual batch execution prepared: ${result.batches.length} batches`);
            } else {
                throw new Error(result.error || 'Batch execution failed');
            }

        } catch (error) {
            console.error('❌ Manual batch execution failed:', error);
            toast.error(`Manual batch execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Enhanced batch status handler for OnchainKit Transaction component
    const handleEnhancedBatchStatus = async (status: LifecycleStatus) => {
        if (!user || !address || batchStatus.pendingSwipes === 0 || isProcessingTransaction) return;

        // Handle different status types appropriately
        console.log(`🔄 Batch transaction status: ${status.statusName}`);

        // Handle specific status cases
        if (status.statusName === 'success' && status.statusData && 'transactionReceipts' in status.statusData) {
            // Handle successful transaction directly
            const txHash = status.statusData.transactionReceipts?.[0]?.transactionHash;
            if (txHash) {
                await handleSuccessfulBatch(txHash, currentPrediction?.batchNumber);
            }
        }
    };

    // Handle successful batch transaction
    const handleSuccessfulBatch = async (txHash: string, batchNumber?: number) => {
        if (!user || !address || processedTransactions.has(txHash)) return;

        // Mark this transaction as processed
        setProcessedTransactions(prev => new Set(prev).add(txHash));
        setIsProcessingTransaction(true);

        try {
            console.log(`✅ Enhanced batch transaction successful: ${txHash} (batch ${batchNumber})`);

            // Show enhanced success toast with optimization info
            const batchSizeFeedback = currentPrediction ?
                `${batchStatus.pendingSwipes} gasless predictions (${currentPrediction.optimizationSummary.gasSavingsPercent}% call reduction)` :
                `${batchStatus.pendingSwipes} gasless predictions`;

            toast.success(
                <div className="flex items-center justify-between">
                    <span>🎉 {batchSizeFeedback} confirmed!</span>
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
                    duration: 6000,
                    style: {
                        borderRadius: '12px',
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #22c55e',
                    },
                }
            );

            // Get pending swipes from smart batching manager
            const { swipes } = enhancedBatchOptimizer.getBatchState();

            // Save all predictions to database using enhanced swipe data
            for (const swipe of swipes) {
                try {
                    // Verify market still exists before saving prediction
                    const marketExists = await SupabaseService.getMarket(swipe.marketId);
                    if (!marketExists) {
                        console.error(`Market ${swipe.marketId} no longer exists in database, skipping`);
                        continue;
                    }

                    // Convert amount from BigInt to number (USDC)
                    const amountUSDC = Number(swipe.amount) / 10 ** 6;

                    // Save prediction to Supabase (with duplicate check for development)
                    const existingPrediction = await SupabaseService.getUserPredictions(user.id);
                    const isDuplicate = existingPrediction?.some(p =>
                        p.market_id === swipe.marketId &&
                        p.transaction_hash === txHash
                    );

                    if (!isDuplicate) {
                        await SupabaseService.createPrediction({
                            market_id: swipe.marketId,
                            user_id: user.id,
                            side: swipe.prediction, // Use prediction field from swipe
                            amount: amountUSDC,
                            shares_received: amountUSDC,
                            transaction_hash: txHash
                        });

                        // Update user position in Supabase
                        const existingPosition = await SupabaseService.getUserPosition(user.id, swipe.marketId);
                        const currentYesShares = existingPosition?.yes_shares || 0;
                        const currentNoShares = existingPosition?.no_shares || 0;
                        const currentInvested = existingPosition?.total_invested || 0;

                        await SupabaseService.updateUserPosition({
                            user_id: user.id,
                            market_id: swipe.marketId,
                            yes_shares: swipe.prediction === 'yes' ? currentYesShares + amountUSDC : currentYesShares,
                            no_shares: swipe.prediction === 'no' ? currentNoShares + amountUSDC : currentNoShares,
                            total_invested: currentInvested + amountUSDC
                        });
                    } else {
                        console.log('🚫 Duplicate prediction detected, skipping database save');
                    }
                } catch (err) {
                    console.error(`Error saving prediction for market ${swipe.marketId}:`, err);
                    // Continue with other predictions even if one fails
                }
            }

            // Update USDC allowance tracking after successful transaction
            try {
                const totalSpent = swipes.reduce((sum, swipe) => sum + swipe.amount, BigInt(0));
                const currentAllowanceBI = BigInt(usdcAllowance.remaining);
                const newAllowance = currentAllowanceBI > totalSpent ?
                    currentAllowanceBI - totalSpent : BigInt(0);

                updateUSDCAllowance(newAllowance.toString());
                smartBatchingManager.updateUSDCAllowance(newAllowance); // Also update smart batching manager
                console.log(`💰 Updated USDC allowance: spent ${Number(totalSpent) / 10 ** 6} USDC`);
            } catch (allowanceError) {
                console.error('Failed to update USDC allowance:', allowanceError);
                markAllowanceForRefresh(); // Mark for refresh on next load
            }

            // Clear batch using smart batching manager
            smartBatchingManager.clearBatch();
            setCurrentPrediction(null);

            // Add a small delay before allowing new transactions
            setTimeout(() => {
                setIsProcessingTransaction(false);
            }, 1000);

        } catch (error) {
            console.error('Database save error:', error);
            toast.error('Predictions successful but failed to save. Contact support.');

            // Clean up state even on error
            smartBatchingManager.clearBatch();
            setCurrentPrediction(null);
            setTimeout(() => {
                setIsProcessingTransaction(false);
            }, 1000);
        }
    };


    // Check if paymaster is configured
    const isPaymasterConfigured = () => {
        const config = validatePaymasterConfig();
        return config.valid;
    };




    if (!address) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] sm:min-h-[600px] text-center px-6">
                <div className="text-5xl sm:text-6xl mb-6">🔗</div>
                <h2 className="mobile-text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
                <p className="text-slate-400 mb-6 max-w-md mobile-text-sm">
                    Connect your wallet to start making predictions and earning rewards on the Base network.
                </p>
                <motion.button
                    onClick={onBack}
                    className="px-6 py-3 bg-base-500 hover:bg-base-600 text-white rounded-xl font-semibold transition-colors ios-button min-h-[48px]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Go Back
                </motion.button>
            </div>
        );
    }

    return (
        <div className="w-full mobile-container overflow-touch overscroll-contain">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <motion.button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors ios-button min-h-[44px] min-w-[44px]"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </motion.button>

                <div className="flex flex-col items-center">
                    <h1 className="mobile-text-xl font-bold text-white">Seer</h1>
                    {isPaymasterConfigured() && (
                        <div className="text-xs text-green-400 mt-1">
                            ⚡ Gasless enabled
                        </div>
                    )}
                    {batchStatus.pendingSwipes > 0 && (
                        <div className="text-xs text-blue-400 mt-1">
                            {batchStatus.pendingSwipes} queued {batchStatus.autoExecuteTriggers.swipeCountTrigger && '(auto-executing)'}
                        </div>
                    )}
                    {/* USDC Allowance Status */}
                    {Number(usdcAllowance.remaining) > 0 && (
                        <div className="text-xs text-green-400 mt-1">
                            {(Number(usdcAllowance.remaining) / 10 ** 6).toFixed(1)} USDC approved
                        </div>
                    )}
                    {Number(usdcAllowance.remaining) === 0 && !usdcAllowance.needsRefresh && (
                        <div className="text-xs text-slate-400 mt-1">
                            USDC approval included in transactions
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


            {/* Category Tab Row (scrollable without visible scrollbar) */}
            <div className="flex items-center space-x-1 mb-6 p-0 overflow-x-auto no-scrollbar">
                {['all', 'crypto', 'tech', 'celebrity', 'sports', 'politics'].map((category) => (
                    <motion.button
                        key={category}
                        onClick={() => setSelectedCategory(category as typeof selectedCategory)}
                        className={`
                            px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0 text-center min-w-[72px]
                            ${selectedCategory === category
                                ? 'bg-base-500 text-white shadow-lg shadow-base-500/30'
                                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/70'
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

            {/* Enhanced Batch Indicator */}
            {batchStatus.pendingSwipes > 0 && (
                <div className="fixed safe-top-right z-50 liquid-glass text-white px-4 py-2 rounded-full bg-blue-500/80">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <div className="flex flex-col">
                            <span className="mobile-text-sm font-medium">{batchStatus.pendingSwipes} pending</span>
                            {batchStatus.autoExecuteTriggers.timeRemaining && batchStatus.autoExecuteTriggers.timeRemaining > 0 && (
                                <span className="text-xs opacity-80">
                                    Auto: {Math.ceil(batchStatus.autoExecuteTriggers.timeRemaining / 1000)}s
                                </span>
                            )}
                            {batchStatus.autoExecuteTriggers.swipeCountTrigger && (
                                <span className="text-xs opacity-80">Auto-executing...</span>
                            )}
                        </div>
                        {/* Manual Execute Button */}
                        <button
                            onClick={triggerManualBatchExecution}
                            className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                            disabled={batchStatus.isProcessing}
                        >
                            Execute Now
                        </button>
                    </div>
                </div>
            )}

            {/* Enhanced OnchainKit Transaction component for smart batch gasless predictions */}
            {currentPrediction && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 liquid-glass-strong p-4 sm:p-6 rounded-xl min-w-[280px] sm:min-w-[300px] max-w-[90vw] bg-slate-800/90">
                    <div className="text-center mb-4">
                        <h3 className="text-white font-semibold mb-2 mobile-text-lg">
                            {currentPrediction.totalBatches > 1 ?
                                `Batch ${currentPrediction.batchNumber}/${currentPrediction.totalBatches}` :
                                'Smart Batch Execution'
                            }
                        </h3>
                        <p className="text-slate-400 mobile-text-sm mb-2">
                            {currentPrediction.calls.length} calls • {GaslessOptimizationUtils.formatGasEstimation({
                                estimatedGas: currentPrediction.estimatedGas,
                                estimatedCost: BigInt(0),
                                callCount: currentPrediction.calls.length,
                                accuracy: 85,
                                gasPerCall: currentPrediction.estimatedGas / BigInt(currentPrediction.calls.length)
                            })}
                        </p>
                        <p className="text-green-400 mobile-text-xs">
                            {currentPrediction.optimizationSummary.gasSavingsPercent}% call reduction via bulk approval
                        </p>
                    </div>
                    <Transaction
                        chainId={baseSepolia.id}
                        calls={currentPrediction.calls}
                        isSponsored={true}
                        onStatus={handleEnhancedBatchStatus}
                    >
                        <TransactionButton
                            text={currentPrediction.totalBatches > 1 ?
                                `Execute Batch ${currentPrediction.batchNumber}/${currentPrediction.totalBatches}` :
                                `Execute ${currentPrediction.calls.length} Predictions`
                            }
                            className="w-full mb-2 ios-button min-h-[48px]"
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
