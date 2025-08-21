"use client";

import { motion } from 'framer-motion';
import { TrendingUp, Users, Zap, Trophy, Plus, Wallet } from 'lucide-react';
import { useMarkets } from '@/lib/hooks/useSupabaseData';
import { useAppStore } from '@/lib/store';
import { useAccount } from 'wagmi';
import { SmartContractService, useUSDCFaucet, SmartContractUtils } from '@/lib/smart-contracts';
import toast from 'react-hot-toast';

interface HomeProps {
    onStartPredicting: () => void;
    onViewProfile: () => void;
    onViewLeaderboard: () => void;
    onCreateMarket: () => void;
}

export function Home({ onStartPredicting, onViewProfile, onViewLeaderboard, onCreateMarket }: HomeProps) {
    const { markets, isLoading } = useMarkets();
    const { userPredictions, user } = useAppStore();
    const { address } = useAccount();

    // Smart contract hooks
    const { data: usdcBalance } = SmartContractService.useUSDCBalance(address);
    const { claimFaucet, isPending: isFaucetPending, isConfirmed: isFaucetConfirmed, canUseFaucet, faucetCooldown } = useUSDCFaucet();

    // Calculate real stats from Supabase data
    const totalMarkets = markets.length;
    const totalVolume = markets.reduce((sum, market) => sum + market.yesPool + market.noPool, 0);
    const userPredictionCount = userPredictions.length;
    const formattedBalance = usdcBalance ? SmartContractUtils.formatUSDC(usdcBalance) : 0;

    const features = [
        {
            icon: <TrendingUp className="w-8 h-8" />,
            title: "Swipe to Predict",
            description: "Tinder-like interface for making predictions on crypto, tech, and more",
            color: "text-green-400"
        },
        {
            icon: <Zap className="w-8 h-8" />,
            title: "Base Network",
            description: "Fast, cheap transactions on Coinbase's Layer 2 blockchain",
            color: "text-base-500"
        },
        {
            icon: <Users className="w-8 h-8" />,
            title: "Social Predictions",
            description: "Compete with friends and climb the leaderboard",
            color: "text-purple-400"
        },
        {
            icon: <Trophy className="w-8 h-8" />,
            title: "Earn Rewards",
            description: "Get rewarded for accurate predictions and consistent performance",
            color: "text-yellow-400"
        }
    ];

    return (
        <div className="w-full max-w-md mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="text-6xl mb-4">🔮</div>
                    <h1 className="text-4xl font-bold text-white mb-4">
                        <span className="bg-gradient-to-r from-base-400 to-base-600 bg-clip-text text-transparent">
                            BASED
                        </span>
                    </h1>
                    <p className="text-slate-300 text-lg mb-2">
                        Prediction Market Mini-App
                    </p>
                    <p className="text-slate-400 text-sm">
                        Swipe right for YES, left for NO, up to SKIP
                    </p>
                </motion.div>
            </div>



            {/* Action Buttons */}
            <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-3">
                    <motion.button
                        onClick={onStartPredicting}
                        className="bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white font-bold py-4 px-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-base-500/25"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <TrendingUp className="w-5 h-5" />
                            <span>Start Predicting</span>
                        </div>
                    </motion.button>

                    <motion.button
                        onClick={onCreateMarket}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <Plus className="w-5 h-5" />
                            <span>Create Market</span>
                        </div>
                    </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <motion.button
                        onClick={onViewProfile}
                        className="bg-slate-800/50 hover:bg-slate-700/50 text-white font-medium py-3 px-4 rounded-xl transition-colors border border-slate-700/50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                    >
                        <div className="text-center">
                            <div className="text-2xl mb-1">👤</div>
                            <div className="text-sm">Profile</div>
                        </div>
                    </motion.button>

                    <motion.button
                        onClick={onViewLeaderboard}
                        className="bg-slate-800/50 hover:bg-slate-700/50 text-white font-medium py-3 px-4 rounded-xl transition-colors border border-slate-700/50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                    >
                        <div className="text-center">
                            <div className="text-2xl mb-1">🏆</div>
                            <div className="text-sm">Leaderboard</div>
                        </div>
                    </motion.button>
                </div>
            </div>

            {/* Wallet Info Section */}
            {address && (
                <motion.div
                    className="bg-gradient-to-r from-base-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-4 border border-base-500/20 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-base-500/20 rounded-full flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-base-400" />
                            </div>
                            <div>
                                <div className="text-white font-semibold">
                                    {formattedBalance.toFixed(2)} USDC
                                </div>
                                <div className="text-slate-400 text-sm">Test Balance</div>
                            </div>
                        </div>
                        {formattedBalance < 10 && (
                            <motion.button
                                onClick={async () => {
                                    try {
                                        await claimFaucet();
                                        toast.success('Claimed 1,000 test USDC! 🎉', {
                                            style: {
                                                borderRadius: '12px',
                                                background: '#1e293b',
                                                color: '#f1f5f9',
                                                border: '1px solid #22c55e',
                                            },
                                        });
                                    } catch (error: any) {
                                        const errorMessage = error?.message || 'Failed to claim from faucet';
                                        toast.error(errorMessage, {
                                            style: {
                                                borderRadius: '12px',
                                                background: '#1e293b',
                                                color: '#f1f5f9',
                                                border: '1px solid #dc2626',
                                            },
                                        });
                                    }
                                }}
                                className="bg-base-500 hover:bg-base-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                disabled={isFaucetPending || !canUseFaucet}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title={!canUseFaucet && faucetCooldown > 0 ? `Cooldown: ${(faucetCooldown / 3600).toFixed(1)} hours remaining` : undefined}
                            >
                                {isFaucetPending ? 'Getting...' :
                                    !canUseFaucet && faucetCooldown > 0 ? `Wait ${(faucetCooldown / 3600).toFixed(1)}h` :
                                        'Get Test USDC'}
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                    <motion.div
                        key={feature.title}
                        className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + (index * 0.1), duration: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className={`${feature.color} mb-3`}>
                            {feature.icon}
                        </div>
                        <h3 className="text-white font-semibold text-sm mb-2">
                            {feature.title}
                        </h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            {feature.description}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Stats Preview */}
            <motion.div
                className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.3 }}
            >
                <h3 className="text-white font-semibold mb-4 text-center">
                    Platform Stats
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-base-400 mb-1">
                            {isLoading ? '...' : totalMarkets || '0'}
                        </div>
                        <div className="text-xs text-slate-400">Markets</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-green-400 mb-1">
                            {isLoading ? '...' : `$${Math.round(totalVolume)}`}
                        </div>
                        <div className="text-xs text-slate-400">Volume</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-purple-400 mb-1">
                            {user ? userPredictionCount : '0'}
                        </div>
                        <div className="text-xs text-slate-400">Your Bets</div>
                    </div>
                </div>
            </motion.div>

            {/* Footer */}
            <div className="text-center mt-8 mb-4">
                <p className="text-slate-500 text-xs">
                    Built on Base • Powered by OnchainKit
                </p>
            </div>
        </div>
    );
}
