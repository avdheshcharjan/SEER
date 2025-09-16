"use client";

import { motion } from 'framer-motion';
import { useLeaderboard, useStreakLeaderboard, useSocialStats } from '@/lib/store';
import { Trophy, Medal, Award, TrendingUp, Target, DollarSign, Flame, Activity } from 'lucide-react';
import { useState } from 'react';

interface LeaderboardProps {
    onBack?: () => void;
}

type LeaderboardTab = 'winRate' | 'streaks' | 'volume' | 'predictions';

export function Leaderboard({ onBack }: LeaderboardProps) {
    const [activeTab, setActiveTab] = useState<LeaderboardTab>('winRate');
    const leaderboardData = useLeaderboard(activeTab === 'winRate' ? 'winRate' : activeTab === 'streaks' ? 'currentStreak' : activeTab === 'volume' ? 'profitLoss' : 'totalPredictions');
    const streakLeaderboard = useStreakLeaderboard();
    const socialStats = useSocialStats();

    const currentData = activeTab === 'streaks' ? streakLeaderboard : leaderboardData;

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

            {/* Enhanced Header with Stats */}
            <div className="bg-gradient-to-br from-base-500/20 to-base-600/20 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-base-500/30">
                <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🏆</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Social Leaderboard</h2>
                    <p className="text-slate-300 text-sm">
                        Compete with the community • Track your progress
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-lg font-bold text-blue-400">{socialStats.totalUsers.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">Users</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-green-400">${socialStats.totalVolume.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">Volume</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-purple-400">{socialStats.averageAccuracy}%</div>
                        <div className="text-xs text-slate-400">Avg Accuracy</div>
                    </div>
                </div>
            </div>

            {/* Leaderboard Tabs */}
            <div className="flex bg-slate-800/30 backdrop-blur-sm rounded-xl p-1 mb-6 border border-slate-700/50">
                {[
                    { key: 'winRate', label: 'Win Rate', icon: Target },
                    { key: 'streaks', label: 'Streaks', icon: Flame },
                    { key: 'volume', label: 'Profit', icon: DollarSign },
                    { key: 'predictions', label: 'Volume', icon: Activity }
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as LeaderboardTab)}
                            className={`
                                flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200
                                ${activeTab === tab.key
                                    ? 'bg-base-500/30 text-base-300 border border-base-500/50'
                                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                                }
                            `}
                        >
                            <Icon className="w-3 h-3" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Top 3 Podium with Dynamic Content */}
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
                        <div className="text-sm font-bold text-white">{currentData[1]?.username}</div>
                        <div className="text-xs text-slate-300">
                            {activeTab === 'streaks' ? `🔥${currentData[1]?.currentStreak}` :
                                activeTab === 'volume' ? `$${currentData[1]?.profitLoss?.toFixed(1)}` :
                                    activeTab === 'predictions' ? `${currentData[1]?.totalPredictions}` :
                                        `${currentData[1]?.winRate?.toFixed(1)}%`}
                        </div>
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
                        <div className="text-sm font-bold text-white">{currentData[0]?.username}</div>
                        <div className="text-xs text-yellow-300">
                            {activeTab === 'streaks' ? `🔥${currentData[0]?.currentStreak}` :
                                activeTab === 'volume' ? `$${currentData[0]?.profitLoss?.toFixed(1)}` :
                                    activeTab === 'predictions' ? `${currentData[0]?.totalPredictions}` :
                                        `${currentData[0]?.winRate?.toFixed(1)}%`}
                        </div>
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
                        <div className="text-sm font-bold text-white">{currentData[2]?.username}</div>
                        <div className="text-xs text-amber-500">
                            {activeTab === 'streaks' ? `🔥${currentData[2]?.currentStreak}` :
                                activeTab === 'volume' ? `$${currentData[2]?.profitLoss?.toFixed(1)}` :
                                    activeTab === 'predictions' ? `${currentData[2]?.totalPredictions}` :
                                        `${currentData[2]?.winRate?.toFixed(1)}%`}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Full Leaderboard with Enhanced Info */}
            <div className="space-y-3">
                {currentData.map((user, index) => {
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
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-bold text-white">{user.username}</h3>
                                            {user.currentStreak >= 5 && (
                                                <div className="bg-orange-500/20 px-2 py-0.5 rounded-full text-xs text-orange-300 flex items-center">
                                                    <Flame className="w-3 h-3 mr-1" />
                                                    {user.currentStreak}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                                            <span className="flex items-center">
                                                <Target className="w-3 h-3 mr-1" />
                                                {user.correctPredictions}/{user.totalPredictions}
                                            </span>
                                            {activeTab !== 'volume' && (
                                                <span className="flex items-center">
                                                    <DollarSign className="w-3 h-3 mr-1" />
                                                    ${user.profitLoss?.toFixed(1) || '0.0'}
                                                </span>
                                            )}
                                            {activeTab === 'streaks' && (
                                                <span className="flex items-center">
                                                    <Trophy className="w-3 h-3 mr-1" />
                                                    Best: {user.bestStreak}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${rankStyle.text}`}>
                                        {activeTab === 'streaks' ? `🔥${user.currentStreak}` :
                                            activeTab === 'volume' ? `$${user.profitLoss?.toFixed(1)}` :
                                                activeTab === 'predictions' ? user.totalPredictions :
                                                    `${user.winRate?.toFixed(1)}%`}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center justify-end">
                                        {activeTab === 'streaks' ? (
                                            <><Flame className="w-3 h-3 mr-1" />Current Streak</>
                                        ) : activeTab === 'volume' ? (
                                            <><DollarSign className="w-3 h-3 mr-1" />Profit</>
                                        ) : activeTab === 'predictions' ? (
                                            <><Activity className="w-3 h-3 mr-1" />Total Bets</>
                                        ) : (
                                            <><TrendingUp className="w-3 h-3 mr-1" />Win Rate</>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Enhanced Stats Summary */}
            <div className="mt-8 space-y-4">
                {activeTab === 'streaks' && (
                    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm rounded-xl p-4 border border-orange-500/20">
                        <h3 className="text-sm font-semibold text-orange-300 mb-3 flex items-center">
                            <Flame className="w-4 h-4 mr-2" />
                            Streak Spotlight
                        </h3>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-400 mb-1">
                                🔥 {socialStats.topStreaker.streak}
                            </div>
                            <div className="text-sm text-orange-300">
                                {socialStats.topStreaker.username}&apos;s Best Streak
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Community Stats</h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-lg font-bold text-green-400">
                                {socialStats.dailyActive}
                            </div>
                            <div className="text-xs text-slate-400">Daily Active</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-blue-400">
                                {socialStats.weeklyActive}
                            </div>
                            <div className="text-xs text-slate-400">Weekly Active</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-purple-400">
                                {socialStats.totalPredictions.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-400">Total Predictions</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-yellow-400">
                                {socialStats.averageAccuracy}%
                            </div>
                            <div className="text-xs text-slate-400">Community Accuracy</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
