"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share, Copy, Twitter, Clock, Users, User, CheckCircle, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { UnifiedMarket } from '@/lib/types';
import { generateCreateMarketCalls } from '@/lib/market-factory-onchainkit';
import { processMarketCreation, validateMarketCreation } from '@/lib/market-factory-onchainkit';
import { getMarketEndTimeTimestamp } from '@/lib/market-duration';
import { MarketType } from '@/lib/market-resolver';
import { getMarketTypeForCreation } from '@/lib/market-authorization';
import { Address } from 'viem';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { Transaction, TransactionButton, TransactionSponsor, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';

interface CreateMarketFlowProps {
    onBack: () => void;
}

type Step = 'question' | 'resolution' | 'success';
type ResolutionMethod = 'vote' | 'creator';

// Popular bet suggestions
const POPULAR_BETS = [
    "Will the Fed increase rates by 25bps in September?",
    "Will $PUMP reach $5bn market cap in September?",
    "Will $BASE launch in 2025?",
    "Will $PUMP airdrop in September?",
    "Will $HYPE go to $60 in September?",
    "Will $USELESS go to $400m mc in September?"
];

export function CreateMarketFlow({ onBack }: CreateMarketFlowProps) {
    const { addCreatedMarket } = useAppStore();
    const { address } = useAccount();

    // Form state
    const [currentStep, setCurrentStep] = useState<Step>('question');
    const [question, setQuestion] = useState('');
    const [resolutionMethod, setResolutionMethod] = useState<ResolutionMethod>('vote');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Transaction state for OnchainKit
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

    // Share state
    const [shareUrl, setShareUrl] = useState('');
    const [timeLeft, setTimeLeft] = useState('4:40');

    // Countdown timer for sharing incentive
    useEffect(() => {
        if (currentStep === 'success') {
            const timer = setInterval(() => {
                // Simple countdown from 4:40 to 0:00
                setTimeLeft(prev => {
                    const [min, sec] = prev.split(':').map(Number);
                    const totalSeconds = min * 60 + sec;
                    if (totalSeconds <= 1) {
                        clearInterval(timer);
                        return '0:00';
                    }
                    const newTotal = totalSeconds - 1;
                    const newMin = Math.floor(newTotal / 60);
                    const newSec = newTotal % 60;
                    return `${newMin}:${newSec.toString().padStart(2, '0')}`;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [currentStep]);

    // Generate market end time (24 hours from now)
    const getMarketEndTime = () => {
        const now = new Date();
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    };

    // Handle question selection from popular bets
    const handlePopularBetSelect = (bet: string) => {
        setQuestion(bet);
    };

    // Validate form
    const isQuestionValid = question.trim().length >= 10;

    // Handle continue to resolution step
    const handleContinueToResolution = () => {
        if (!isQuestionValid) {
            toast.error('Please enter a question with at least 10 characters');
            return;
        }
        setCurrentStep('resolution');
    };

    // Handle market creation with real smart contract calls
    const handleCreateMarket = async () => {
        if (!address || !isQuestionValid) {
            toast.error('Please complete all fields');
            return;
        }

        try {
            setIsCreating(true);

            // Validate market creation parameters
            const endTime = getMarketEndTimeTimestamp();
            const validation = validateMarketCreation(question, endTime);

            if (!validation.isValid) {
                toast.error(validation.error || 'Invalid market parameters');
                setIsCreating(false);
                return;
            }

            // Determine market type based on creator authorization and resolution method
            const marketType = getMarketTypeForCreation(address, resolutionMethod);
            const isPlatformMarket = marketType === MarketType.PLATFORM;

            // Generate transaction calls for factory contract
            const calls = generateCreateMarketCalls(
                question,
                endTime,
                isPlatformMarket
            );

            console.log('🏭 Creating market with calls:', {
                question,
                endTime,
                isPlatformMarket,
                marketType,
                calls
            });

            // Set up transaction state for OnchainKit Transaction component
            setCurrentPrediction({
                marketId: 'new-market',
                direction: 'right',
                amount: 0,
                calls: calls
            });

            // Transaction will be handled by the Transaction component in the UI
            // The success callback will process the market creation

        } catch (error) {
            console.error('Market creation error:', error);
            toast.error('Failed to create market');
            setIsCreating(false);
        }
    };

    // Handle successful market creation
    const handleMarketCreationSuccess = async (transactionHash: string) => {
        try {
            console.log('🎉 Market creation successful:', transactionHash);

            // Determine market type based on creator authorization and resolution method
            const marketType = getMarketTypeForCreation(address!, resolutionMethod);

            // Process market creation and create database entry
            const result = await processMarketCreation(
                transactionHash,
                question,
                'crypto', // Default category
                getMarketEndTimeTimestamp(),
                address!,
                marketType
            );

            if (result.success) {
                // Create mock market for UI
                const mockMarket: UnifiedMarket = {
                    id: result.marketId!,
                    question: question,
                    description: 'A 24-hour prediction market',
                    category: 'crypto',
                    endTime: getMarketEndTime().toISOString(),
                    totalVolume: 0,
                    yesPrice: 0.5,
                    noPrice: 0.5,
                    yesOdds: 50,
                    noOdds: 50,
                    yesPool: 10,
                    noPool: 10,
                    totalYesShares: 10,
                    totalNoShares: 10,
                    yesShares: 0,
                    noShares: 0,
                    creatorAddress: address!,
                    contractAddress: result.contractAddress!,
                    createdAt: new Date().toISOString(),
                    resolved: false,
                    outcome: null,
                    transactionHash: transactionHash,
                };

                addCreatedMarket(mockMarket);

                // Generate share URL
                const url = `https://app.poll.fun/bet/${mockMarket.id}`;
                setShareUrl(url);

                setCurrentStep('success');
                toast.success('Market created successfully!');
            } else {
                throw new Error(result.error || 'Failed to process market creation');
            }
        } catch (error) {
            console.error('Failed to process market creation:', error);
            toast.error('Market created but failed to save to database');
        } finally {
            setIsCreating(false);
            setCurrentPrediction(null);
        }
    };

    // Handle sharing
    const handleShare = (platform: 'twitter' | 'copy') => {
        if (platform === 'copy') {
            navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard!');
        } else if (platform === 'twitter') {
            const text = encodeURIComponent(`Just created a prediction market: "${question}" 🎯\n\nWhat do you think? Cast your prediction:`);
            const url = encodeURIComponent(shareUrl);
            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        }
    };

    const handleBack = () => {
        if (currentStep === 'question') {
            onBack();
        } else if (currentStep === 'resolution') {
            setCurrentStep('question');
        } else if (currentStep === 'success') {
            // Go back to home or reset flow
            onBack();
        }
    };

    if (!address) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-white text-lg">Please connect your wallet to create a market</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="container mx-auto px-4 py-6 max-w-md">
                <AnimatePresence mode="wait">
                    {/* Step 1: Question Input */}
                    {currentStep === 'question' && (
                        <motion.div
                            key="question"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h1 className="text-2xl font-bold text-white">Create Your Own Bet</h1>
                                <div className="w-8" />
                            </div>

                            <div className="text-center">
                                <p className="text-slate-400 text-lg mb-2">Give your bet a clear and concise title.</p>

                                {/* Bets created today counter */}
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-600/50">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="text-slate-300 text-sm">291 bets created today</span>
                                </div>
                            </div>

                            {/* Question Input */}
                            <div className="space-y-4">
                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="Will the Fed increase rates by 25bps in September?"
                                    className="w-full p-4 bg-slate-800/30 border-2 border-slate-700 rounded-2xl text-white placeholder-slate-400 focus:border-slate-500 focus:outline-none resize-none text-lg"
                                    rows={3}
                                    maxLength={200}
                                />
                                <div className="flex justify-between text-sm text-slate-400">
                                    <span>Minimum 10 characters</span>
                                    <span>{question.length}/200</span>
                                </div>
                            </div>

                            {/* Popular Bets */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-white">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                    <span className="font-medium">Popular Bets</span>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {POPULAR_BETS.map((bet, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handlePopularBetSelect(bet)}
                                            className="p-4 text-left bg-slate-800/30 hover:bg-slate-700/30 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all"
                                        >
                                            <span className="text-white text-sm">{bet}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Continue Button */}
                            <div className="pt-4">
                                <button
                                    onClick={handleContinueToResolution}
                                    disabled={!isQuestionValid}
                                    className="w-full py-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-semibold transition-all"
                                >
                                    Continue →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Resolution Method */}
                    {currentStep === 'resolution' && (
                        <motion.div
                            key="resolution"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h1 className="text-2xl font-bold text-white">How To Pick The Winner</h1>
                                <div className="w-8" />
                            </div>

                            <div className="text-center">
                                <p className="text-slate-400 text-lg">Select an option to decide the winner</p>
                            </div>

                            {/* Resolution Method Selection */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* Vote on it */}
                                <button
                                    onClick={() => setResolutionMethod('vote')}
                                    className={`p-6 rounded-2xl border-2 transition-all ${resolutionMethod === 'vote'
                                        ? 'border-slate-400 bg-slate-800/50'
                                        : 'border-slate-600/50 bg-slate-800/30 hover:bg-slate-700/30'
                                        }`}
                                >
                                    <div className="flex flex-col items-center space-y-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${resolutionMethod === 'vote' ? 'bg-slate-600' : 'bg-slate-700'
                                            }`}>
                                            <Users className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-white text-xl font-semibold">Vote on it</h3>
                                            <p className="text-slate-400 text-sm mt-1">Majority wins</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Creator Picks */}
                                <button
                                    onClick={() => setResolutionMethod('creator')}
                                    className={`p-6 rounded-2xl border-2 transition-all ${resolutionMethod === 'creator'
                                        ? 'border-slate-400 bg-slate-800/50'
                                        : 'border-slate-600/50 bg-slate-800/30 hover:bg-slate-700/30'
                                        }`}
                                >
                                    <div className="flex flex-col items-center space-y-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${resolutionMethod === 'creator' ? 'bg-slate-600' : 'bg-slate-700'
                                            }`}>
                                            <User className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-white text-xl font-semibold">Creator Picks</h3>
                                            <p className="text-slate-400 text-sm mt-1">You decide</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Public/Private Toggle */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-400">Public</span>
                                        <button
                                            onClick={() => setIsPrivate(!isPrivate)}
                                            className={`relative w-14 h-8 rounded-full transition-all ${isPrivate ? 'bg-slate-600' : 'bg-slate-600'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${isPrivate ? 'translate-x-7' : 'translate-x-1'
                                                }`} />
                                        </button>
                                        <span className="text-slate-400">Private</span>
                                    </div>
                                </div>

                                <p className="text-slate-400 text-sm text-center">
                                    Users can only join with the share link
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={handleBack}
                                    className="py-4 bg-transparent border border-slate-600 text-white rounded-2xl font-semibold hover:bg-slate-800/30 transition-all"
                                >
                                    Back
                                </button>

                                {/* Transaction Component for Market Creation */}
                                {currentPrediction ? (
                                    <Transaction
                                        calls={currentPrediction.calls}
                                        isSponsored={true}
                                        onStatus={(status) => {
                                            console.log('Market creation status:', status);
                                            if (status.statusName === 'success' && status.statusData?.transactionReceipts?.[0]?.transactionHash) {
                                                handleMarketCreationSuccess(status.statusData.transactionReceipts[0].transactionHash);
                                            } else if (status.statusName === 'error') {
                                                toast.error('Failed to create market');
                                                setIsCreating(false);
                                                setCurrentPrediction(null);
                                            }
                                        }}
                                    >
                                        <TransactionButton
                                            className="py-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-semibold transition-all w-full"
                                            text={isCreating ? 'Creating...' : 'Create Market →'}
                                        />
                                        <TransactionSponsor />
                                        <TransactionStatusLabel />
                                        <TransactionStatusAction />
                                    </Transaction>
                                ) : (
                                    <button
                                        onClick={handleCreateMarket}
                                        disabled={isCreating}
                                        className="py-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-semibold transition-all"
                                    >
                                        {isCreating ? 'Creating...' : 'Continue →'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Success/Share */}
                    {currentStep === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            {/* Success Header */}
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-2">Bet Created!</h1>
                                    <p className="text-slate-400 text-lg">
                                        Your bet is live. Share it with friends to get the action started.
                                    </p>
                                </div>
                            </div>

                            {/* Share Incentive */}
                            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                                <div className="flex items-center justify-center gap-2 text-green-400">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-medium">Share in {timeLeft} to unlock a $5.00 credit!</span>
                                </div>
                            </div>

                            {/* Market Preview */}
                            <div className="bg-slate-800/30 border border-slate-600/50 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-center">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <Share className="w-6 h-6 text-green-400" />
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h3 className="text-white text-xl font-semibold mb-2">{question}</h3>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                        {resolutionMethod === 'vote' ? 'Majority decides' : 'Creator decides'}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-700/50 rounded-full text-slate-300 text-sm">
                                        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                        {isPrivate ? 'Private Bet' : 'Public Bet'}
                                    </div>
                                </div>
                            </div>

                            {/* Share URL */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-600/50 rounded-2xl">
                                    <span className="text-slate-300 text-sm font-mono truncate flex-1 mr-2">
                                        {shareUrl}
                                    </span>
                                    <button
                                        onClick={() => handleShare('copy')}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                    >
                                        <Copy className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Share Buttons */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleShare('twitter')}
                                    className="flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold transition-all"
                                >
                                    <Twitter className="w-5 h-5" />
                                    Share on X
                                </button>
                                <button
                                    className="flex items-center justify-center gap-2 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-semibold transition-all"
                                >
                                    <Share className="w-5 h-5" />
                                    More Options
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3 pt-4">
                                <button
                                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    Start Betting
                                </button>
                                <button
                                    onClick={onBack}
                                    className="w-full py-4 bg-transparent text-slate-400 hover:text-white rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
                                >
                                    + Create Another Bet
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
