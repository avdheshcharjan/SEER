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

export interface LeaderboardUser {
    id: string;
    username: string;
    address: string;
    correctPredictions: number;
    totalPredictions: number;
    totalSpent: number;
    rank: number;
    winRate: number;
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

    // USDC Allowance tracking for batch optimization
    usdcAllowance: {
        remaining: string; // Store as string to avoid BigInt serialization issues
        lastUpdated: number; // timestamp
        needsRefresh: boolean;
        spenderAddress: string | null; // Track which spender this allowance is for
        lastCheckedOnChain: number; // Last time we actually checked the blockchain
        pendingApproval: boolean; // Track if approval transaction is in progress
    };

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
    updateUSDCAllowance: (remaining: string, needsRefresh?: boolean, spenderAddress?: string) => void;
    markAllowanceForRefresh: () => void;
    setPendingApproval: (pending: boolean) => void;
    consumeAllowance: (amount: string) => void;
    checkAllowanceSufficient: (requiredAmount: string) => boolean;
    forceRefreshAllowance: () => void;
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
    usdcAllowance: {
        remaining: '0',
        lastUpdated: 0,
        needsRefresh: true,
        spenderAddress: null,
        lastCheckedOnChain: 0,
        pendingApproval: false,
    },
    createdMarkets: [],
};

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
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

            updateUSDCAllowance: (remaining, needsRefresh = false, spenderAddress) => set((state) => ({
                usdcAllowance: {
                    ...state.usdcAllowance,
                    remaining,
                    lastUpdated: Date.now(),
                    lastCheckedOnChain: Date.now(),
                    needsRefresh,
                    spenderAddress: spenderAddress || state.usdcAllowance.spenderAddress,
                    pendingApproval: false, // Clear pending status on successful update
                }
            })),

            markAllowanceForRefresh: () => set((state) => ({
                usdcAllowance: {
                    ...state.usdcAllowance,
                    needsRefresh: true
                }
            })),

            setPendingApproval: (pending) => set((state) => ({
                usdcAllowance: {
                    ...state.usdcAllowance,
                    pendingApproval: pending
                }
            })),

            consumeAllowance: (amount) => set((state) => {
                try {
                    const currentRemaining = BigInt(state.usdcAllowance.remaining);
                    const consumeAmount = BigInt(amount);
                    const newRemaining = currentRemaining > consumeAmount
                        ? currentRemaining - consumeAmount
                        : BigInt(0);

                    return {
                        usdcAllowance: {
                            ...state.usdcAllowance,
                            remaining: newRemaining.toString(),
                            lastUpdated: Date.now(),
                            needsRefresh: newRemaining < BigInt('10000000'), // Less than 10 USDC (6 decimals)
                        }
                    };
                } catch (error) {
                    console.error('Failed to consume allowance:', error);
                    // Mark for refresh if we can't parse amounts
                    return {
                        usdcAllowance: {
                            ...state.usdcAllowance,
                            needsRefresh: true
                        }
                    };
                }
            }),

            checkAllowanceSufficient: (requiredAmount) => {
                try {
                    const state = get();
                    const currentRemaining = BigInt(state.usdcAllowance.remaining);
                    const required = BigInt(requiredAmount);
                    return currentRemaining >= required;
                } catch (error) {
                    console.error('Failed to check allowance sufficiency:', error);
                    return false; // Assume insufficient if we can't parse
                }
            },

            forceRefreshAllowance: () => set((state) => ({
                usdcAllowance: {
                    ...state.usdcAllowance,
                    needsRefresh: true,
                    lastCheckedOnChain: 0, // Force fresh check from blockchain
                }
            })),

            reset: () => set(initialState),
        }),
        {
            name: 'based-app-storage',
            partialize: (state) => ({
                user: state.user,
                swipeHistory: state.swipeHistory,
                createdMarkets: state.createdMarkets,
                usdcAllowance: state.usdcAllowance,
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

export const useLeaderboard = (): LeaderboardUser[] => {
    // In a real app, this would fetch from API
    // For now, return mock leaderboard data with random Base addresses
    return [
        {
            id: '1',
            username: 'CryptoProphet',
            address: '0x742E4C4B4c8c341b7F7A8E5E5C8e8e8e8e8e8e8e',
            correctPredictions: 89,
            totalPredictions: 112,
            totalSpent: 112,
            rank: 1,
            winRate: 79.5
        },
        {
            id: '2',
            username: 'BasedTrader',
            address: '0xA1b2C3d4E5f6789012345678901234567890abcd',
            correctPredictions: 76,
            totalPredictions: 98,
            totalSpent: 98,
            rank: 2,
            winRate: 77.6
        },
        {
            id: '3',
            username: 'SwipeKing',
            address: '0x9876543210123456789abcdef0123456789abcde',
            correctPredictions: 134,
            totalPredictions: 178,
            totalSpent: 178,
            rank: 3,
            winRate: 75.3
        },
        {
            id: '4',
            username: 'PredictorMax',
            address: '0xfedcba0987654321098765432109876543210987',
            correctPredictions: 92,
            totalPredictions: 125,
            totalSpent: 125,
            rank: 4,
            winRate: 73.6
        },
        {
            id: '5',
            username: 'MarketMaven',
            address: '0x123456789abcdef0123456789abcdef012345678',
            correctPredictions: 67,
            totalPredictions: 92,
            totalSpent: 92,
            rank: 5,
            winRate: 72.8
        },
    ];
};