import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UnifiedMarket } from './types';

interface User {
    id: string;
    address: string;
    username?: string;
    totalSpent: number;
    correctPredictions: number;
    totalPredictions: number;
    rank: number;
    joinedAt: string;
    defaultBetAmount: number; // Default bet amount in USDC
    currentStreak: number;
    bestStreak: number;
    profitLoss: number;
    lastPredictionDate?: string;
}

interface AppState {
    // User session state
    user: User | null;
    isConnected: boolean;

    // UI state
    currentView: 'home' | 'predict' | 'profile' | 'leaderboard' | 'create';
    currentMarketIndex: number;
    swipeHistory: string[]; // Session-only swipe tracking
    isLoading: boolean;
    error: string | null;

    // Temporary data (before blockchain confirmation)
    createdMarkets: UnifiedMarket[]; // Markets created by user, not yet persisted

    // Actions
    setUser: (user: User | null) => void;
    setConnected: (connected: boolean) => void;
    setCurrentView: (view: 'home' | 'predict' | 'profile' | 'leaderboard' | 'create') => void;
    setCurrentMarketIndex: (index: number) => void;
    nextMarket: () => void;
    addSwipeHistory: (marketId: string) => void;
    addCreatedMarket: (market: UnifiedMarket) => void;
    updateUser: (updates: Partial<User>) => void;
    updateStreak: (isCorrect: boolean) => void;
    incrementShareCount: (marketId: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearSwipeHistory: () => void;
    reset: () => void;
}

const initialState = {
    user: null,
    isConnected: false,
    currentView: 'home' as const,
    currentMarketIndex: 0,
    swipeHistory: [],
    isLoading: false,
    error: null,
    createdMarkets: [],
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            ...initialState,

            setUser: (user) => set({ user }),

            setConnected: (connected) => set({ isConnected: connected }),

            setCurrentView: (view) => set({ currentView: view }),

            setCurrentMarketIndex: (index) => set({ currentMarketIndex: index }),

            nextMarket: () => set((state) => ({
                currentMarketIndex: state.currentMarketIndex + 1
            })),

            addSwipeHistory: (marketId) => set((state) => ({
                swipeHistory: [...state.swipeHistory, marketId]
            })),

            addCreatedMarket: (market) => set((state) => ({
                createdMarkets: [...state.createdMarkets, market]
            })),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),

            updateStreak: (isCorrect) => set((state) => {
                if (!state.user) return state;
                
                const newStreak = isCorrect ? state.user.currentStreak + 1 : 0;
                const newBestStreak = Math.max(newStreak, state.user.bestStreak);
                
                return {
                    user: {
                        ...state.user,
                        currentStreak: newStreak,
                        bestStreak: newBestStreak,
                        correctPredictions: isCorrect ? state.user.correctPredictions + 1 : state.user.correctPredictions,
                        totalPredictions: state.user.totalPredictions + 1,
                        lastPredictionDate: new Date().toISOString()
                    }
                };
            }),

            incrementShareCount: (marketId) => {
                // Track share analytics locally if needed
                console.log('Market shared:', marketId);
            },

            setLoading: (loading) => set({ isLoading: loading }),

            setError: (error) => set({ error }),

            clearSwipeHistory: () => set({ swipeHistory: [] }),

            reset: () => set(initialState),
        }),
        {
            name: 'based-app-storage',
            partialize: (state) => ({
                user: state.user,
                swipeHistory: state.swipeHistory,
                createdMarkets: state.createdMarkets,
            }),
        }
    )
);

export const useUserStats = () => {
    const { user } = useAppStore();
    if (!user) return null;

    const winRate = user.totalPredictions > 0
        ? (user.correctPredictions / user.totalPredictions) * 100
        : 0;

    return {
        ...user,
        winRate: Math.round(winRate),
        averageSpent: user.totalPredictions > 0
            ? user.totalSpent / user.totalPredictions
            : 0,
    };
};

// Enhanced leaderboard hook with real data integration
export const useLeaderboard = (sortBy: 'winRate' | 'currentStreak' | 'totalPredictions' | 'profitLoss' = 'winRate') => {
    // In a real app, this would fetch from API
    // Enhanced mock data with streaks and profit/loss
    const mockData = [
        {
            id: '1',
            username: 'CryptoProphet',
            correctPredictions: 89,
            totalPredictions: 112,
            totalSpent: 112,
            rank: 1,
            winRate: 79.5,
            currentStreak: 12,
            bestStreak: 18,
            profitLoss: 45.50
        },
        {
            id: '2',
            username: 'BasedTrader',
            correctPredictions: 76,
            totalPredictions: 98,
            totalSpent: 98,
            rank: 2,
            winRate: 77.6,
            currentStreak: 8,
            bestStreak: 15,
            profitLoss: 32.80
        },
        {
            id: '3',
            username: 'SwipeKing',
            correctPredictions: 134,
            totalPredictions: 178,
            totalSpent: 178,
            rank: 3,
            winRate: 75.3,
            currentStreak: 15,
            bestStreak: 22,
            profitLoss: 67.20
        },
        {
            id: '4',
            username: 'PredictorMax',
            correctPredictions: 92,
            totalPredictions: 125,
            totalSpent: 125,
            rank: 4,
            winRate: 73.6,
            currentStreak: 5,
            bestStreak: 11,
            profitLoss: 28.75
        },
        {
            id: '5',
            username: 'MarketMaven',
            correctPredictions: 67,
            totalPredictions: 92,
            totalSpent: 92,
            rank: 5,
            winRate: 72.8,
            currentStreak: 3,
            bestStreak: 9,
            profitLoss: 18.40
        },
        {
            id: '6',
            username: 'StreakMaster',
            correctPredictions: 45,
            totalPredictions: 65,
            totalSpent: 65,
            rank: 6,
            winRate: 69.2,
            currentStreak: 20,
            bestStreak: 25,
            profitLoss: 15.60
        },
    ];

    // Sort by the specified criteria
    const sortedData = [...mockData].sort((a, b) => {
        switch (sortBy) {
            case 'currentStreak':
                return b.currentStreak - a.currentStreak;
            case 'totalPredictions':
                return b.totalPredictions - a.totalPredictions;
            case 'profitLoss':
                return b.profitLoss - a.profitLoss;
            case 'winRate':
            default:
                return b.winRate - a.winRate;
        }
    });

    // Update ranks after sorting
    return sortedData.map((user, index) => ({
        ...user,
        rank: index + 1
    }));
};

// Streak-focused leaderboard
export const useStreakLeaderboard = () => {
    return useLeaderboard('currentStreak');
};

// Social stats hook
export const useSocialStats = () => {
    return {
        totalUsers: 1247,
        totalPredictions: 12850,
        totalVolume: 15420.75,
        averageAccuracy: 68.4,
        topStreaker: {
            username: 'StreakMaster',
            streak: 25
        },
        dailyActive: 324,
        weeklyActive: 897
    };
};