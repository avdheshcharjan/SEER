import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PredictionMarket, UserPrediction } from './prediction-markets';

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
    // User state
    user: User | null;
    isConnected: boolean;

    // Market state
    currentMarkets: PredictionMarket[];
    currentMarketIndex: number;
    swipeHistory: string[]; // IDs of swiped markets
    createdMarkets: PredictionMarket[]; // Markets created by the user

    // Prediction state
    userPredictions: UserPrediction[];

    // UI state
    isLoading: boolean;
    currentView: 'home' | 'predict' | 'profile' | 'leaderboard' | 'create';

    // Actions
    setUser: (user: User | null) => void;
    setConnected: (connected: boolean) => void;
    setCurrentMarkets: (markets: PredictionMarket[]) => void;
    nextMarket: () => void;
    addSwipeHistory: (marketId: string) => void;
    addPrediction: (prediction: UserPrediction) => void;
    addCreatedMarket: (market: PredictionMarket) => void;
    updateUser: (updates: Partial<User>) => void;
    setDefaultBetAmount: (amount: number) => void;
    setCurrentView: (view: 'home' | 'predict' | 'profile' | 'leaderboard' | 'create') => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
}

const initialState = {
    user: null,
    isConnected: false,
    currentMarkets: [],
    currentMarketIndex: 0,
    swipeHistory: [],
    createdMarkets: [],
    userPredictions: [],
    isLoading: false,
    currentView: 'home' as const,
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

            reset: () => set(initialState),
        }),
        {
            name: 'based-app-storage',
            partialize: (state) => ({
                user: state.user,
                userPredictions: state.userPredictions,
                swipeHistory: state.swipeHistory,
                createdMarkets: state.createdMarkets,
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
