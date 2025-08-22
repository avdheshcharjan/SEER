import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Market, UserPosition } from './supabase';
import { UnifiedMarket, UnifiedUserPrediction, UnifiedUserPosition, SchemaTransformer } from './types';

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

            setCurrentMarkets: (markets) => set({
                currentMarkets: markets,
                currentMarketIndex: 0
            }),

            nextMarket: () => set((state) => ({
                currentMarketIndex: Math.min(
                    state.currentMarketIndex + 1,
                    state.currentMarkets.length - 1
                )
            })),

            addSwipeHistory: (marketId) => set((state) => ({
                swipeHistory: [...state.swipeHistory, marketId]
            })),

            addPrediction: (prediction) => set((state) => {
                const updatedPredictions = [...state.userPredictions, prediction];
                const updatedUser = state.user ? {
                    ...state.user,
                    totalSpent: (state.user.totalSpent || 0) + prediction.amount,
                    totalPredictions: (state.user.totalPredictions || 0) + 1,
                } : null;

                return {
                    userPredictions: updatedPredictions,
                    user: updatedUser,
                };
            }),

            addCreatedMarket: (market) => set((state) => ({
                createdMarkets: [...state.createdMarkets, market]
            })),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),

            setDefaultBetAmount: (amount) => set((state) => ({
                user: state.user ? { ...state.user, defaultBetAmount: amount } : null
            })),

            setCurrentView: (view) => set({ currentView: view }),

            setLoading: (loading) => set({ isLoading: loading }),

            setSupabaseMarkets: (markets) => set({
                supabaseMarkets: markets.map(m => SchemaTransformer.supabaseToUnified(m)),
                lastMarketFetch: Date.now()
            }),

            setUserPositions: (positions) => set({
                userPositions: positions.map(p => ({
                    id: p.id,
                    userId: p.user_id,
                    marketId: p.market_id,
                    yesShares: p.yes_shares,
                    noShares: p.no_shares,
                    totalInvested: p.total_invested,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                })),
                lastPositionsFetch: Date.now()
            }),

            updateUserPosition: (position) => set((state) => {
                const unifiedPosition: UnifiedUserPosition = {
                    id: position.id,
                    userId: position.user_id,
                    marketId: position.market_id,
                    yesShares: position.yes_shares,
                    noShares: position.no_shares,
                    totalInvested: position.total_invested,
                    createdAt: position.created_at,
                    updatedAt: position.updated_at
                };

                const existingIndex = state.userPositions.findIndex(
                    p => p.userId === unifiedPosition.userId && p.marketId === unifiedPosition.marketId
                );

                const updatedPositions = existingIndex >= 0
                    ? state.userPositions.map((p, i) => i === existingIndex ? unifiedPosition : p)
                    : [...state.userPositions, unifiedPosition];

                return { userPositions: updatedPositions };
            }),

            setError: (error) => set({ error }),

            clearCache: () => set({
                lastMarketFetch: 0,
                lastPositionsFetch: 0,
                supabaseMarkets: [],
                userPositions: []
            }),

            clearPredictions: () => set({
                userPredictions: []
            }),

            reset: () => set(initialState),
        }),
        {
            name: 'based-app-storage',
            partialize: (state) => ({
                user: state.user,
                userPredictions: state.userPredictions,
                swipeHistory: state.swipeHistory,
                createdMarkets: state.createdMarkets,
                userPositions: state.userPositions,
                lastMarketFetch: state.lastMarketFetch,
                lastPositionsFetch: state.lastPositionsFetch,
            }),
        }
    )
);

// Selectors for derived state
export const useCurrentMarket = () => {
    const { currentMarkets, currentMarketIndex } = useAppStore();
    return currentMarkets[currentMarketIndex] || null;
};

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

// Additional selectors for Supabase integration
export const useSupabaseMarkets = () => {
    const { supabaseMarkets, lastMarketFetch } = useAppStore();
    const shouldRefresh = Date.now() - lastMarketFetch > 5 * 60 * 1000; // 5 minutes cache
    return { markets: supabaseMarkets, shouldRefresh };
};

export const useUserPositions = () => {
    const { userPositions, user } = useAppStore();
    return user ? userPositions.filter(p => p.userId === user.address) : [];
};

export const useMarketPosition = (marketId: string) => {
    const { userPositions, user } = useAppStore();
    return user ? userPositions.find(p => p.userId === user.address && p.marketId === marketId) : null;
};

export const useCacheStatus = () => {
    const { lastMarketFetch, lastPositionsFetch } = useAppStore();
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    return {
        marketsStale: now - lastMarketFetch > CACHE_DURATION,
        positionsStale: now - lastPositionsFetch > CACHE_DURATION,
        lastMarketFetch,
        lastPositionsFetch
    };
};

// Portfolio value calculator
export const usePortfolioValue = () => {
    const positions = useUserPositions();
    const { supabaseMarkets } = useAppStore();
    
    return positions.reduce((total, position) => {
        const market = supabaseMarkets.find(m => m.id === position.marketId);
        if (!market || market.resolved) return total + position.totalInvested;
        
        // Simple value calculation - in real app this would be more complex
        const currentValue = (position.yesShares + position.noShares) * 1.0; // Simplified
        return total + currentValue;
    }, 0);
};
