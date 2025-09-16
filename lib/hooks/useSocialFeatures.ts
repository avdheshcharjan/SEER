"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import SupabaseService, { supabase } from '@/lib/supabase';

export interface LeaderboardUser {
    id: string;
    address: string;
    username: string;
    correctPredictions: number;
    totalPredictions: number;
    totalSpent: number;
    rank: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    profitLoss: number;
    joinedAt: string;
}

export interface SocialStats {
    totalUsers: number;
    totalPredictions: number;
    totalVolume: number;
    averageAccuracy: number;
    topStreaker: {
        username: string;
        streak: number;
    };
    dailyActive: number;
    weeklyActive: number;
}

export function useLeaderboardData(sortBy: 'winRate' | 'currentStreak' | 'totalPredictions' | 'profitLoss' = 'winRate', limit = 10) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchLeaderboard = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/leaderboard?sortBy=${sortBy}&limit=${limit}&realTime=true`);
            const data = await response.json();
            
            if (data.success) {
                setLeaderboard(data.data);
                setLastUpdated(new Date());
                setError(null);
            } else {
                setError('Failed to fetch leaderboard');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [sortBy, limit]);

    useEffect(() => {
        fetchLeaderboard();

        // Set up real-time subscription for leaderboard changes
        const subscription = supabase
            .channel('leaderboard_updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'influencer_profiles'
            }, (payload) => {
                console.log('Leaderboard update received:', payload);
                // Refetch data when leaderboard changes
                fetchLeaderboard();
            })
            .subscribe();

        // Refresh data periodically
        const interval = setInterval(fetchLeaderboard, 30000); // 30 seconds

        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
        };
    }, [fetchLeaderboard]);

    return {
        leaderboard,
        loading,
        error,
        lastUpdated,
        refresh: fetchLeaderboard
    };
}

export function useSocialStats() {
    const [stats, setStats] = useState<SocialStats>({
        totalUsers: 1247,
        totalPredictions: 12850,
        totalVolume: 15420.75,
        averageAccuracy: 68.4,
        topStreaker: { username: 'StreakMaster', streak: 25 },
        dailyActive: 324,
        weeklyActive: 897
    });
    const [loading, setLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            // Try to get real stats from database
            const dailyStats = await SupabaseService.getDailyStats();
            if (dailyStats) {
                setStats(prevStats => ({
                    ...prevStats,
                    ...dailyStats
                }));
            }
        } catch (error) {
            console.warn('Using mock social stats:', error);
            // Keep mock data on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        
        // Update stats every 5 minutes
        const interval = setInterval(fetchStats, 300000);
        
        return () => clearInterval(interval);
    }, [fetchStats]);

    return { stats, loading, refresh: fetchStats };
}

export function useUserStreakUpdates() {
    const { user, updateStreak, updateUser } = useAppStore();

    const handlePredictionResult = useCallback(async (marketId: string, isCorrect: boolean, payoutAmount?: number) => {
        if (!user) return;

        try {
            // Update local state immediately for responsive UI
            updateStreak(isCorrect);
            
            // Update user stats if we have payout information
            if (payoutAmount !== undefined) {
                const newProfitLoss = (user.profitLoss || 0) + (payoutAmount - (user.defaultBetAmount || 1));
                updateUser({ 
                    profitLoss: newProfitLoss,
                    totalSpent: user.totalSpent + (user.defaultBetAmount || 1)
                });
            }

            // Sync with database
            await SupabaseService.updateUserStreak(user.address, isCorrect);
            await SupabaseService.updateUserStats(user.address);

        } catch (error) {
            console.error('Failed to update user streak:', error);
        }
    }, [user, updateStreak, updateUser]);

    return { handlePredictionResult };
}

export function useShareTracking() {
    const incrementShareCount = useCallback(async (marketId: string) => {
        try {
            await SupabaseService.incrementShareCount(marketId);
            console.log('Share count incremented for market:', marketId);
        } catch (error) {
            console.error('Failed to track share:', error);
        }
    }, []);

    const getMostSharedMarkets = useCallback(async (limit = 10) => {
        try {
            return await SupabaseService.getMostSharedMarkets(limit);
        } catch (error) {
            console.error('Failed to get most shared markets:', error);
            return [];
        }
    }, []);

    return {
        incrementShareCount,
        getMostSharedMarkets
    };
}

export function useRealTimeNotifications() {
    const [notifications, setNotifications] = useState<Array<{
        id: string;
        type: 'streak' | 'leaderboard' | 'achievement';
        message: string;
        timestamp: Date;
    }>>([]);

    const addNotification = useCallback((type: 'streak' | 'leaderboard' | 'achievement', message: string) => {
        const notification = {
            id: Date.now().toString(),
            type,
            message,
            timestamp: new Date()
        };
        
        setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5 notifications
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    return {
        notifications,
        addNotification,
        clearNotifications
    };
}

// Combined hook for all social features
export function useSocialFeatures(options: {
    leaderboardSort?: 'winRate' | 'currentStreak' | 'totalPredictions' | 'profitLoss';
    leaderboardLimit?: number;
    enableRealTime?: boolean;
} = {}) {
    const {
        leaderboardSort = 'winRate',
        leaderboardLimit = 10,
        enableRealTime = true
    } = options;

    const leaderboardData = useLeaderboardData(leaderboardSort, leaderboardLimit);
    const socialStats = useSocialStats();
    const streakUpdates = useUserStreakUpdates();
    const shareTracking = useShareTracking();
    const notifications = useRealTimeNotifications();

    return {
        leaderboard: leaderboardData,
        stats: socialStats,
        streaks: streakUpdates,
        sharing: shareTracking,
        notifications
    };
}