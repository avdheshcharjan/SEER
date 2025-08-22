"use client";

import { motion } from 'framer-motion';
import { useLeaderboard } from '@/lib/store';
import { Trophy, Medal, Award, TrendingUp, Target, DollarSign } from 'lucide-react';

interface LeaderboardProps {
    onBack?: () => void;
}

export function Leaderboard({ onBack }: LeaderboardProps) {
    const leaderboardData = useLeaderboard();

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-6 h-6 text-yellow-400" />;
            case 2:
                return <Medal className="w-6 h-6 text-slate-300" />;
            case 3:
                return <Award className="w-6 h-6 text-amber-600" />;
            default:
                return <span className="w-6 h-6 flex items-center justify-center text-slate-400 font-bold">#{rank}</span>;
        }
    };

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return {
                    bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
                    border: 'border-yellow-500/50',
                    text: 'text-yellow-400'
                };
            case 2:
                return {
                    bg: 'bg-gradient-to-r from-slate-400/20 to-slate-500/20',
                    border: 'border-slate-400/50',
                    text: 'text-slate-300'
                };
            case 3:
                return {
                    bg: 'bg-gradient-to-r from-amber-600/20 to-orange-600/20',
                    border: 'border-amber-600/50',
                    text: 'text-amber-600'
                };
            default:
                return {
                    bg: 'bg-slate-800/30',
                    border: 'border-slate-700/50',
                    text: 'text-slate-400'
                };
        }
    };

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

                <h1 className="text-xl font-bold text-white">Leaderboard</h1>

                <div className="w-8 h-8" />
            </div>

            {/* Leaderboard Header */}
            <div className="bg-gradient-to-br from-base-500/20 to-base-600/20 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-base-500/30">
                <div className="text-center">
                    <div className="text-4xl mb-2">🏆</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Top Predictors</h2>
                    <p className="text-slate-300 text-sm">
                        Ranked by win rate and prediction accuracy
                    </p>
                </div>
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-2 mb-6 h-32">
                {/* 2nd Place */}
                <div className="flex flex-col items-center justify-end">
                    <motion.div
                        className="bg-gradient-to-t from-slate-400/20 to-slate-300/20 rounded-t-xl p-3 w-full text-center border-t border-x border-slate-400/50"
                        style={{ height: '70%' }}
                        initial={{ height: 0 }}
                        animate={{ height: '70%' }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        <Medal className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{leaderboardData[1]?.username}</div>
                        <div className="text-xs text-slate-300">{leaderboardData[1]?.winRate.toFixed(1)}%</div>
                    </motion.div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center justify-end">
                    <motion.div
                        className="bg-gradient-to-t from-yellow-500/20 to-amber-400/20 rounded-t-xl p-3 w-full text-center border-t border-x border-yellow-500/50"
                        style={{ height: '100%' }}
                        initial={{ height: 0 }}
                        animate={{ height: '100%' }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                    >
                        <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{leaderboardData[0]?.username}</div>
                        <div className="text-xs text-yellow-300">{leaderboardData[0]?.winRate.toFixed(1)}%</div>
                    </motion.div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center justify-end">
                    <motion.div
                        className="bg-gradient-to-t from-amber-600/20 to-orange-600/20 rounded-t-xl p-3 w-full text-center border-t border-x border-amber-600/50"
                        style={{ height: '60%' }}
                        initial={{ height: 0 }}
                        animate={{ height: '60%' }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <Award className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{leaderboardData[2]?.username}</div>
                        <div className="text-xs text-amber-500">{leaderboardData[2]?.winRate.toFixed(1)}%</div>
                    </motion.div>
                </div>
            </div>

            {/* Full Leaderboard */}
            <div className="space-y-3">
                {leaderboardData.map((user, index) => {
                    const rankStyle = getRankStyle(user.rank);

                    return (
                        <motion.div
                            key={user.id}
                            className={`${rankStyle.bg} backdrop-blur-sm rounded-xl p-4 border ${rankStyle.border}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center justify-center w-10 h-10">
                                        {getRankIcon(user.rank)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{user.username}</h3>
                                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                                            <span className="flex items-center">
                                                <Target className="w-3 h-3 mr-1" />
                                                {user.correctPredictions}/{user.totalPredictions}
                                            </span>
                                            <span className="flex items-center">
                                                <DollarSign className="w-3 h-3 mr-1" />
                                                ${user.totalSpent}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${rankStyle.text}`}>
                                        {user.winRate.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        Win Rate
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Stats Summary */}
            <div className="mt-8 bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Global Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-lg font-bold text-white">
                            {leaderboardData.reduce((sum, user) => sum + user.totalPredictions, 0)}
                        </div>
                        <div className="text-xs text-slate-400">Total Predictions</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-green-400">
                            ${leaderboardData.reduce((sum, user) => sum + user.totalSpent, 0)}
                        </div>
                        <div className="text-xs text-slate-400">Total Volume</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-blue-400">
                            {leaderboardData.length}
                        </div>
                        <div className="text-xs text-slate-400">Active Users</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
