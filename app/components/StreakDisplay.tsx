"use client";

import { motion } from 'framer-motion';
import { Flame, Trophy, Target, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ShareButton } from './ShareButton';
import { UnifiedMarket } from '@/lib/types';

interface StreakDisplayProps {
    showShareButton?: boolean;
    variant?: 'compact' | 'full' | 'card';
    market?: UnifiedMarket; // Required for share functionality
}

export function StreakDisplay({ 
    showShareButton = false, 
    variant = 'compact',
    market 
}: StreakDisplayProps) {
    const { user } = useAppStore();

    if (!user) return null;

    const winRate = user.totalPredictions > 0 
        ? (user.correctPredictions / user.totalPredictions) * 100 
        : 0;

    const getStreakColor = (streak: number) => {
        if (streak >= 15) return 'from-red-500 to-orange-500'; // Hot streak
        if (streak >= 10) return 'from-orange-500 to-yellow-500'; // Fire
        if (streak >= 5) return 'from-yellow-500 to-amber-500'; // Warming up
        return 'from-slate-500 to-slate-400'; // Cool
    };

    const getStreakEmoji = (streak: number) => {
        if (streak >= 15) return '🔥🔥🔥';
        if (streak >= 10) return '🔥🔥';
        if (streak >= 5) return '🔥';
        return '⚡';
    };

    const getStreakMessage = (streak: number) => {
        if (streak >= 15) return 'LEGENDARY STREAK!';
        if (streak >= 10) return 'ON FIRE!';
        if (streak >= 5) return 'HOT STREAK!';
        if (streak >= 3) return 'Building momentum';
        if (streak > 0) return 'Getting started';
        return 'New prediction';
    };

    if (variant === 'compact') {
        return (
            <div className="flex items-center space-x-2">
                <div className={`bg-gradient-to-r ${getStreakColor(user.currentStreak)} px-3 py-1 rounded-full text-white text-sm font-bold flex items-center space-x-1`}>
                    <Flame className="w-3 h-3" />
                    <span>{user.currentStreak}</span>
                </div>
                <span className="text-xs text-slate-400">{getStreakMessage(user.currentStreak)}</span>
            </div>
        );
    }

    if (variant === 'card') {
        return (
            <motion.div 
                className={`bg-gradient-to-br ${getStreakColor(user.currentStreak)}/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`bg-gradient-to-r ${getStreakColor(user.currentStreak)} w-12 h-12 rounded-full flex items-center justify-center`}>
                            <span className="text-xl">{getStreakEmoji(user.currentStreak)}</span>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{user.currentStreak}</div>
                            <div className="text-sm text-slate-300">{getStreakMessage(user.currentStreak)}</div>
                        </div>
                    </div>
                    {showShareButton && market && (
                        <ShareButton 
                            market={market} 
                            shareType="streak" 
                            className="opacity-80 hover:opacity-100"
                        />
                    )}
                </div>
                
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                        <div className="text-sm font-bold text-white">{user.bestStreak}</div>
                        <div className="text-xs text-slate-400">Best</div>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-green-400">{winRate.toFixed(1)}%</div>
                        <div className="text-xs text-slate-400">Win Rate</div>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-blue-400">{user.totalPredictions}</div>
                        <div className="text-xs text-slate-400">Total</div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Full variant
    return (
        <motion.div 
            className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <Flame className="w-5 h-5 mr-2 text-orange-400" />
                    Prediction Streak
                </h3>
                {showShareButton && market && (
                    <ShareButton 
                        market={market} 
                        shareType="streak" 
                        className="opacity-80 hover:opacity-100"
                    />
                )}
            </div>

            {/* Main Streak Display */}
            <div className="text-center mb-6">
                <motion.div 
                    className={`bg-gradient-to-r ${getStreakColor(user.currentStreak)} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3`}
                    animate={user.currentStreak >= 5 ? { 
                        boxShadow: [
                            '0 0 20px rgba(251, 146, 60, 0.5)',
                            '0 0 40px rgba(251, 146, 60, 0.8)',
                            '0 0 20px rgba(251, 146, 60, 0.5)'
                        ]
                    } : {}}
                    transition={{ 
                        duration: 2, 
                        repeat: user.currentStreak >= 5 ? Infinity : 0, 
                        repeatType: 'reverse'
                    }}
                >
                    <span className="text-3xl">{getStreakEmoji(user.currentStreak)}</span>
                </motion.div>
                
                <div className="text-4xl font-bold text-white mb-1">{user.currentStreak}</div>
                <div className="text-orange-300 font-semibold">{getStreakMessage(user.currentStreak)}</div>
                
                {user.currentStreak > 0 && (
                    <div className="text-sm text-slate-400 mt-2">
                        {user.bestStreak > user.currentStreak && (
                            <>Personal best: {user.bestStreak} predictions 🏆</>
                        )}
                        {user.bestStreak === user.currentStreak && user.currentStreak > 5 && (
                            <>🆕 NEW PERSONAL BEST!</>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-slate-700/30 rounded-lg p-3">
                    <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-white">{user.bestStreak}</div>
                    <div className="text-xs text-slate-400">Best Streak</div>
                </div>
                
                <div className="bg-slate-700/30 rounded-lg p-3">
                    <Target className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-white">{winRate.toFixed(1)}%</div>
                    <div className="text-xs text-slate-400">Accuracy</div>
                </div>
                
                <div className="bg-slate-700/30 rounded-lg p-3">
                    <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-white">{user.correctPredictions}</div>
                    <div className="text-xs text-slate-400">Correct</div>
                </div>
                
                <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="w-4 h-4 bg-purple-400 rounded mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white">
                        #
                    </div>
                    <div className="text-sm font-bold text-white">{user.totalPredictions}</div>
                    <div className="text-xs text-slate-400">Total</div>
                </div>
            </div>

            {/* Streak Progress */}
            {user.currentStreak > 0 && (
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Next milestone</span>
                        <span>
                            {user.currentStreak < 5 ? '5 predictions' : 
                             user.currentStreak < 10 ? '10 predictions' : 
                             user.currentStreak < 15 ? '15 predictions' : 
                             '20 predictions'}
                        </span>
                    </div>
                    <div className="bg-slate-700/50 rounded-full h-2">
                        <motion.div 
                            className={`bg-gradient-to-r ${getStreakColor(user.currentStreak)} h-2 rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ 
                                width: `${Math.min(
                                    (user.currentStreak % 5) * 20 || (user.currentStreak >= 5 ? 100 : 0), 
                                    100
                                )}%` 
                            }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
}