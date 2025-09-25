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

export const useLeaderboard = () => {
    // In a real app, this would fetch from API
    // For now, return mock leaderboard data
    return [
        {
            id: '1',
            username: 'CryptoProphet',
            correctPredictions: 89,
            totalPredictions: 112,
            totalSpent: 112,
            rank: 1,
            winRate: 79.5
        },
        {
            id: '2',
            username: 'BasedTrader',
            correctPredictions: 76,
            totalPredictions: 98,
            totalSpent: 98,
            rank: 2,
            winRate: 77.6
        },
        {
            id: '3',
            username: 'SwipeKing',
            correctPredictions: 134,
            totalPredictions: 178,
            totalSpent: 178,
            rank: 3,
            winRate: 75.3
        },
        {
            id: '4',
            username: 'PredictorMax',
            correctPredictions: 92,
            totalPredictions: 125,
            totalSpent: 125,
            rank: 4,
            winRate: 73.6
        },
        {
            id: '5',
            username: 'MarketMaven',
            correctPredictions: 67,
            totalPredictions: 92,
            totalSpent: 92,
            rank: 5,
            winRate: 72.8
        },
    ];
};