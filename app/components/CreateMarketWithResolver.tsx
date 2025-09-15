"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Shield, Users, Info, Calendar, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ParimutuelSupabaseService } from '@/lib/supabase-parimutuel';
import { generateCreateMarketCalls } from '@/lib/market-factory-onchainkit';
import { processMarketCreation, validateMarketCreation } from '@/lib/market-factory-onchainkit';
import { MarketType, getMarketTypeLabel } from '@/lib/market-resolver';
import { getMarketEndTime, MARKET_DURATION } from '@/lib/market-duration';
import { Address } from 'viem';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { Transaction, TransactionButton, TransactionSponsor, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface CreateMarketWithResolverProps {
    onBack: () => void;
}

type MarketCategory = 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics';

const CATEGORIES = [
    {
        value: 'crypto' as MarketCategory,
        label: 'Crypto',
        icon: TrendingUp,
        color: 'from-orange-500 to-yellow-500',
        description: 'Cryptocurrency prices and blockchain events'
    },
    {
        value: 'tech' as MarketCategory,
        label: 'Tech', 
        icon: Shield,
        color: 'from-blue-500 to-purple-500',
        description: 'Technology companies, products, and innovation'
    },
    {
        value: 'celebrity' as MarketCategory,
        label: 'Celebrity',
        icon: Users,
        color: 'from-pink-500 to-rose-500', 
        description: 'Celebrity news, relationships, and career moves'
    },
    {
        value: 'sports' as MarketCategory,
        label: 'Sports',
        icon: TrendingUp,
        color: 'from-green-500 to-emerald-500',
        description: 'Sports events, championships, and player transfers'
    },
    {
        value: 'politics' as MarketCategory,
        label: 'Politics',
        icon: Shield,
        color: 'from-purple-500 to-indigo-500',
        description: 'Political events, elections, and policy decisions'
    }
];

const MARKET_TYPES = [
    {
        type: MarketType.PLATFORM,
        label: 'Platform Market',
        icon: Shield,
        color: 'from-blue-500 to-indigo-500',
        description: 'Resolved by UMA Optimistic Oracle - Decentralized and trustless',
        features: ['Decentralized resolution', 'Economic incentives for accuracy', '2-hour challenge period', 'Transparent outcome'],
        bond: '1000 USDC',
        time: '2 hours'
    },
    {
        type: MarketType.USER,
        label: 'User Market',
        icon: Users,
        color: 'from-green-500 to-teal-500', 
        description: 'Resolved by market creator - Quick and direct resolution',
        features: ['Instant resolution', 'Creator control', 'No bond required', 'Personal responsibility'],
        bond: 'None',
        time: 'Instant'
    }
];

export function CreateMarketWithResolver({ onBack }: CreateMarketWithResolverProps) {
    const { address } = useAccount();
    const { user } = useAppStore();
    
    // Form state
    const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('crypto');
    const [selectedMarketType, setSelectedMarketType] = useState<MarketType>(MarketType.PLATFORM);
    const [question, setQuestion] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    // Market end time is always 24 hours from creation
    const [currentTransaction, setCurrentTransaction] = useState<{
        calls: Array<{
            to: Address;
            data: `0x${string}`;
            value: bigint;
        }>;
    } | null>(null);

    // Validation - only question validation needed now
    const isFormValid = question.trim().length >= 10;
    
    // Market end time is always 24 hours from creation
    const marketEndTime = getMarketEndTime();

    // Create market transaction
    const handleCreateMarket = async () => {
        if (!address || !user || !isFormValid) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            setIsCreating(true);

            // Validate market creation parameters
            const endTime = Math.floor(marketEndTime.getTime() / 1000);
            const validation = validateMarketCreation(question, endTime);
            
            if (!validation.isValid) {
                toast.error(validation.error || 'Invalid market parameters');
                return;
            }

            // Generate transaction calls for market creation
            const calls = generateCreateMarketCalls(
                question,
                endTime,
                selectedMarketType === MarketType.PLATFORM // isPlatformMarket
            );

            setCurrentTransaction({ calls });

        } catch (error) {
            console.error('Market creation setup error:', error);
            toast.error('Failed to setup market creation');
            setIsCreating(false);
        }
    };

    // Handle successful transaction
    const handleSuccessfulTransaction = async (txHash: string) => {
        console.log('🎉 Market creation transaction successful:', txHash);
        setIsCreating(false);

        try {
            // Process market creation (register with resolver, save to database)
            await processMarketCreation(
                txHash,
                question,
                selectedCategory,
                Math.floor(marketEndTime.getTime() / 1000),
                address,
                selectedMarketType
            );

            toast.success(
                <div className="flex items-center space-x-2">
                    <span className="text-lg">🎉</span>
                    <div>
                        <div className="font-semibold">Market Created!</div>
                        <div className="text-sm opacity-90">
                            {getMarketTypeLabel(selectedMarketType)}
                        </div>
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

            // Navigate back after successful creation
            setTimeout(() => onBack(), 2000);

        } catch (error) {
            console.error('Error processing market creation:', error);
            toast.error('Market created but failed to register properly');
        }

        setCurrentTransaction(null);
    };

    // Handle failed transaction
    const handleFailedTransaction = (error: string) => {
        console.error('💥 Market creation failed:', error);
        setIsCreating(false);
        setCurrentTransaction(null);

        toast.error('Failed to create market. Please try again.');
    };

    // Transaction status handler
    const onStatus = (status: LifecycleStatus) => {
        console.log('Market creation transaction status:', status.statusName);

        if (status.statusName === 'success' && status.transactionReceipts?.[0]?.transactionHash) {
            handleSuccessfulTransaction(status.transactionReceipts[0].transactionHash);
        } else if (status.statusName === 'error') {
            handleFailedTransaction(status.error?.message || 'Transaction failed');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 text-slate-300 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1 className="text-2xl font-bold text-white">Create New Market</h1>
                <div className="w-20" /> {/* Spacer */}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="space-y-6">
                    {/* Market Type Selection */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Resolution Method</h3>
                        <div className="space-y-3">
                            {MARKET_TYPES.map(({ type, label, icon: Icon, color, description, features, bond, time }) => (
                                <motion.div
                                    key={type}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedMarketType(type)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        selectedMarketType === type
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg bg-gradient-to-r ${color}`}>
                                            <Icon size={20} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-white">{label}</h4>
                                            <p className="text-sm text-slate-400 mt-1">{description}</p>
                                            <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                                <span>Bond: {bond}</span>
                                                <span>Resolution: {time}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Resolution Method Info */}
                        <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-600">
                            <div className="flex items-start gap-3">
                                <Info size={16} className="text-blue-400 mt-0.5" />
                                <div className="text-sm text-slate-300">
                                    {selectedMarketType === MarketType.PLATFORM ? (
                                        <div>
                                            <p className="font-medium text-white mb-2">UMA Optimistic Oracle Resolution</p>
                                            <ul className="space-y-1 text-slate-400">
                                                <li>• Markets are resolved by decentralized oracle network</li>
                                                <li>• Requires 1000 USDC bond to initiate resolution</li>
                                                <li>• 2-hour challenge period for dispute resolution</li>
                                                <li>• Transparent and tamper-proof outcomes</li>
                                            </ul>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-medium text-white mb-2">Creator Resolution</p>
                                            <ul className="space-y-1 text-slate-400">
                                                <li>• You resolve the market outcome after expiry</li>
                                                <li>• No bond required, instant resolution</li>
                                                <li>• Full responsibility for accurate outcomes</li>
                                                <li>• Ideal for personal or subjective markets</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Category</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORIES.map(({ value, label, icon: Icon, color }) => (
                                <motion.button
                                    key={value}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedCategory(value)}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        selectedCategory === value
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center mb-2`}>
                                        <Icon size={16} className="text-white" />
                                    </div>
                                    <span className="text-sm font-medium text-white">{label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Question Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Market Question *
                        </label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="e.g., Will Bitcoin reach $100,000 by end of 2024?"
                            className="w-full p-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                            rows={3}
                            maxLength={200}
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-slate-400">Minimum 10 characters</span>
                            <span className="text-xs text-slate-400">{question.length}/200</span>
                        </div>
                    </div>

                    {/* Fixed Duration Display */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Market Duration
                        </label>
                        <div className="w-full p-3 bg-slate-800/30 border border-slate-600 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-white font-medium">{MARKET_DURATION.HOURS} Hours</span>
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Clock size={16} />
                                    Fixed Duration
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                                Market will automatically close for betting {MARKET_DURATION.HOURS} hours after creation
                            </div>
                            <div className="mt-1 text-xs text-green-400">
                                End Time: {getMarketEndTime().toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Create Button */}
                    <button
                        onClick={handleCreateMarket}
                        disabled={!isFormValid || isCreating}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed"
                    >
                        {isCreating ? 'Creating Market...' : 'Create Market'}
                    </button>
                </div>

                {/* Preview Section */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Market Preview</h3>
                        
                        {/* Market Card Preview */}
                        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-600">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    selectedCategory === 'crypto' ? 'bg-orange-500/20 text-orange-300' :
                                    selectedCategory === 'tech' ? 'bg-blue-500/20 text-blue-300' :
                                    selectedCategory === 'celebrity' ? 'bg-pink-500/20 text-pink-300' :
                                    selectedCategory === 'sports' ? 'bg-green-500/20 text-green-300' :
                                    'bg-purple-500/20 text-purple-300'
                                }`}>
                                    {selectedCategory.toUpperCase()}
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    selectedMarketType === MarketType.PLATFORM 
                                        ? 'bg-blue-500/20 text-blue-300' 
                                        : 'bg-green-500/20 text-green-300'
                                }`}>
                                    {selectedMarketType === MarketType.PLATFORM ? 'UMA ORACLE' : 'USER RESOLVED'}
                                </div>
                            </div>
                            
                            <h4 className="text-white font-semibold mb-3">
                                {question || 'Your market question will appear here...'}
                            </h4>
                            
                            <div className="space-y-2 text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} />
                                    Ends: {getMarketEndTime().toLocaleString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} />
                                    Duration: {MARKET_DURATION.HOURS} hours
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield size={14} />
                                    {getMarketTypeLabel(selectedMarketType)}
                                </div>
                            </div>

                            {selectedMarketType === MarketType.PLATFORM && (
                                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle size={14} className="text-blue-400 mt-0.5" />
                                        <div className="text-xs text-blue-300">
                                            <p className="font-medium">UMA Oracle Resolution</p>
                                            <p className="mt-1 opacity-90">
                                                This market will be resolved by UMA's decentralized oracle network with economic guarantees.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Modal */}
            {currentTransaction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full"
                    >
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2">Create Market</h3>
                            <p className="text-slate-300 mb-6">
                                {getMarketTypeLabel(selectedMarketType)}
                            </p>

                            <Transaction
                                isSponsored={true}
                                calls={currentTransaction.calls}
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
                                onClick={() => setCurrentTransaction(null)}
                                className="mt-4 text-slate-400 hover:text-white text-sm"
                                disabled={isCreating}
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