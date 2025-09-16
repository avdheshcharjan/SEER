"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Plus,
    Trophy,
    Shield,
    Users,
    Clock,
    CheckCircle,
    BarChart3,
    Zap
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { useAppStore } from '@/lib/store';
import { ParimutuelPredictionMarket } from './ParimutuelPredictionMarket';
import { CreateMarketWithResolver } from './CreateMarketWithResolver';
import { MarketResolution } from './MarketResolution';
import { Leaderboard } from './Leaderboard';
import { Profile } from './Profile';
import { BettingPoolAnalytics } from './BettingPoolAnalytics';
import { ParimutuelSupabaseService } from '@/lib/supabase-parimutuel';

type MainView = 'home' | 'markets' | 'create' | 'resolve' | 'leaderboard' | 'profile' | 'analytics';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<{ size?: number | string; className?: string }>;
    color: string;
    trend?: string;
}

function StatsCard({ title, value, subtitle, icon: Icon, color, trend }: StatsCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-slate-800/30 rounded-xl p-4 border border-slate-600"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-slate-400 text-sm font-medium">{title}</p>
                    <p className="text-white text-2xl font-bold mt-1">{value}</p>
                    <p className="text-slate-400 text-xs mt-1">{subtitle}</p>
                    {trend && (
                        <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                            <TrendingUp size={12} />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${color}`}>
                    <Icon size={20} className="text-white" />
                </div>
            </div>
        </motion.div>
    );
}

export function HomeWithResolver() {
    const { address, isConnected } = useAccount();
    const { user, setUser } = useAppStore();
    const [currentView, setCurrentView] = useState<MainView>('home');
    const [stats, setStats] = useState({
        totalMarkets: 0,
        activeMarkets: 0,
        resolvedMarkets: 0,
        totalVolume: 0,
        platformMarkets: 0,
        userMarkets: 0
    });
    const [loading, setLoading] = useState(false);

    // Load platform statistics
    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);

                // Get all markets from Supabase
                const allMarkets = await ParimutuelSupabaseService.getMarketsWithInfluencers();

                const now = new Date();
                const activeMarkets = allMarkets.filter(m => !m.resolved && new Date(m.end_time) > now);
                const resolvedMarkets = allMarkets.filter(m => m.resolved);
                const platformMarkets = allMarkets.filter(m => m.market_type === 'platform');
                const userMarkets = allMarkets.filter(m => m.market_type === 'user');

                // Calculate total volume (sum of all bets across all markets)
                const totalVolume = allMarkets.reduce((sum, market) => {
                    return sum + (market.total_yes_bets || 0) + (market.total_no_bets || 0);
                }, 0);

                setStats({
                    totalMarkets: allMarkets.length,
                    activeMarkets: activeMarkets.length,
                    resolvedMarkets: resolvedMarkets.length,
                    totalVolume: totalVolume,
                    platformMarkets: platformMarkets.length,
                    userMarkets: userMarkets.length
                });

            } catch (error) {
                console.error('Error loading stats:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    // Initialize user when connected
    useEffect(() => {
        if (isConnected && address && !user) {
            setUser({
                id: address,
                address: address,
                username: `user_${address.slice(-6)}`,
                totalSpent: 0,
                correctPredictions: 0,
                totalPredictions: 0,
                rank: 0,
                joinedAt: new Date().toISOString(),
                defaultBetAmount: 1,
                currentStreak: 0,
                bestStreak: 0,
                profitLoss: 0,
            });
        }
    }, [isConnected, address, user, setUser]);

    // Navigation items
    const navigationItems = [
        {
            id: 'home' as MainView,
            label: 'Overview',
            icon: BarChart3,
            color: 'from-blue-500 to-indigo-500'
        },
        {
            id: 'markets' as MainView,
            label: 'Markets',
            icon: TrendingUp,
            color: 'from-green-500 to-emerald-500'
        },
        {
            id: 'create' as MainView,
            label: 'Create',
            icon: Plus,
            color: 'from-purple-500 to-pink-500'
        },
        {
            id: 'resolve' as MainView,
            label: 'Resolve',
            icon: Shield,
            color: 'from-orange-500 to-red-500'
        },
        {
            id: 'leaderboard' as MainView,
            label: 'Leaderboard',
            icon: Trophy,
            color: 'from-yellow-500 to-orange-500'
        },
        {
            id: 'analytics' as MainView,
            label: 'Analytics',
            icon: BarChart3,
            color: 'from-teal-500 to-cyan-500'
        }
    ];

    const demoMarketAddress: Address = '0x0000000000000000000000000000000000000000';

    const renderMainContent = () => {
        switch (currentView) {
            case 'markets':
                return <ParimutuelPredictionMarket onBack={() => setCurrentView('home')} />;
            case 'create':
                return <CreateMarketWithResolver onBack={() => setCurrentView('home')} />;
            case 'resolve':
                return <MarketResolution onBack={() => setCurrentView('home')} />;
            case 'leaderboard':
                return <Leaderboard onBack={() => setCurrentView('home')} />;
            case 'profile':
                return <Profile onBack={() => setCurrentView('home')} />;
            case 'analytics':
                return (
                    <div className="p-4">
                        <h3 className="text-white font-semibold mb-2">Analytics (Demo)</h3>
                        <BettingPoolAnalytics marketAddress={demoMarketAddress} />
                    </div>
                );
            default:
                return null;
        }
    };

    if (currentView !== 'home') {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentView}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full h-full"
                >
                    {renderMainContent()}
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        SEER Market Platform
                    </h1>
                    <p className="text-slate-400">
                        Decentralized prediction markets with UMA Oracle integration
                    </p>
                </div>

                {isConnected && (
                    <button
                        onClick={() => setCurrentView('profile')}
                        className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-xl text-slate-300 hover:text-white transition-colors"
                    >
                        <Users size={20} />
                        Profile
                    </button>
                )}
            </div>

            {!isConnected ? (
                <div className="text-center py-16">
                    <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-600 max-w-md mx-auto">
                        <Zap size={48} className="text-blue-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Connect Your Wallet
                        </h3>
                        <p className="text-slate-400 mb-6">
                            Connect your wallet to start trading prediction markets with both UMA Oracle and creator resolution
                        </p>
                        <div className="space-y-3 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-blue-400" />
                                <span>UMA Oracle for platform markets</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-green-400" />
                                <span>Creator resolution for user markets</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-purple-400" />
                                <span>Real-time trading and resolution</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatsCard
                            title="Total Markets"
                            value={loading ? "..." : stats.totalMarkets}
                            subtitle="All time"
                            icon={TrendingUp}
                            color="from-blue-500 to-indigo-500"
                        />
                        <StatsCard
                            title="Active Markets"
                            value={loading ? "..." : stats.activeMarkets}
                            subtitle="Currently trading"
                            icon={Clock}
                            color="from-green-500 to-emerald-500"
                            trend="+12% this week"
                        />
                        <StatsCard
                            title="Resolved"
                            value={loading ? "..." : stats.resolvedMarkets}
                            subtitle="Completed markets"
                            icon={CheckCircle}
                            color="from-purple-500 to-pink-500"
                        />
                        <StatsCard
                            title="Total Volume"
                            value={loading ? "..." : `$${stats.totalVolume.toLocaleString()}`}
                            subtitle="USDC traded"
                            icon={BarChart3}
                            color="from-orange-500 to-red-500"
                            trend="+24% this month"
                        />
                        <StatsCard
                            title="Platform Markets"
                            value={loading ? "..." : stats.platformMarkets}
                            subtitle="UMA Oracle"
                            icon={Shield}
                            color="from-blue-500 to-cyan-500"
                        />
                        <StatsCard
                            title="User Markets"
                            value={loading ? "..." : stats.userMarkets}
                            subtitle="Creator resolved"
                            icon={Users}
                            color="from-teal-500 to-green-500"
                        />
                    </div>

                    {/* Navigation Grid */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Platform Features</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {navigationItems.map((item) => (
                                <motion.button
                                    key={item.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setCurrentView(item.id)}
                                    className="p-6 bg-slate-800/30 rounded-xl border border-slate-600 hover:border-slate-500 transition-all group"
                                >
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                        <item.icon size={24} className="text-white" />
                                    </div>
                                    <h3 className="text-white font-semibold text-left">{item.label}</h3>
                                    <p className="text-slate-400 text-sm text-left mt-1">
                                        {item.id === 'markets' && 'Trade prediction markets'}
                                        {item.id === 'create' && 'Create new markets'}
                                        {item.id === 'resolve' && 'Resolve expired markets'}
                                        {item.id === 'leaderboard' && 'View top traders'}
                                        {item.id === 'analytics' && 'Market analytics'}
                                        {item.id === 'home' && 'Platform overview'}
                                    </p>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Resolution Methods Info */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Resolution Methods</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/20 rounded-lg">
                                        <Shield size={24} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-blue-300 font-semibold text-lg mb-2">
                                            Platform Markets (UMA Oracle)
                                        </h3>
                                        <p className="text-blue-200/80 text-sm mb-4">
                                            Markets resolved by UMA&apos;s Optimistic Oracle with economic guarantees and dispute resolution.
                                        </p>
                                        <ul className="space-y-2 text-blue-200/70 text-sm">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                Decentralized and trustless
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                2-hour challenge period
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                1000 USDC bond required
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                Economic incentives for accuracy
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-green-500/10 border border-green-500/20 rounded-xl p-6"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-green-500/20 rounded-lg">
                                        <Users size={24} className="text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-green-300 font-semibold text-lg mb-2">
                                            User Markets (Creator Resolution)
                                        </h3>
                                        <p className="text-green-200/80 text-sm mb-4">
                                            Markets resolved directly by their creators for quick and personal resolution.
                                        </p>
                                        <ul className="space-y-2 text-green-200/70 text-sm">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                Instant resolution
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                No bond required
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                Creator responsibility
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                Perfect for personal markets
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}