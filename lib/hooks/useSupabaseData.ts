"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { SupabaseService } from '../supabase';
import { UnifiedMarket } from '../types';
import { useAccount } from 'wagmi';

// Hook for fetching and managing markets
export function useMarkets() {
    const {
        supabaseMarkets,
        setSupabaseMarkets,
        setLoading,
        setError,
        isLoading,
        error
    } = useAppStore();

    const [lastFetch, setLastFetch] = useState(0);
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    const fetchMarkets = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && now - lastFetch < CACHE_DURATION && supabaseMarkets.length > 0) {
            return; // Use cached data
        }

        try {
            setLoading(true);
            setError(null);

            const markets = await SupabaseService.getActiveMarkets();
            setSupabaseMarkets(markets);
            setLastFetch(now);
        } catch (err) {
            console.error('Failed to fetch markets:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch markets');
        } finally {
            setLoading(false);
        }
    }, [lastFetch, supabaseMarkets.length, setSupabaseMarkets, setLoading, setError]);

    const fetchMarketsByCategory = useCallback(async (category: string) => {
        try {
            setLoading(true);
            setError(null);

            const markets = await SupabaseService.getMarketsByCategory(category);
            return markets.map(m => ({
                ...m,
                category: m.category as UnifiedMarket['category']
            }));
        } catch (err) {
            console.error('Failed to fetch markets by category:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch markets by category');
            return [];
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError]);

    // Auto-fetch on mount
    useEffect(() => {
        fetchMarkets();
    }, [fetchMarkets]);

    return {
        markets: supabaseMarkets,
        isLoading,
        error,
        refetch: () => fetchMarkets(true),
        fetchByCategory: fetchMarketsByCategory,
        isStale: Date.now() - lastFetch > CACHE_DURATION
    };
}

// Hook for user-specific data
export function useUserData() {
    const { address } = useAccount();
    const {
        userPositions,
        setUserPositions,
        user,
        setUser,
        setLoading,
        setError
    } = useAppStore();

    const fetchUserPositions = useCallback(async () => {
        if (!address) return;

        try {
            setLoading(true);
            setError(null);

            const positions = await SupabaseService.getUserPositions(address);
            setUserPositions(positions);
        } catch (err) {
            console.error('Failed to fetch user positions:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch user positions');
        } finally {
            setLoading(false);
        }
    }, [address, setUserPositions, setLoading, setError]);

    const fetchUserStats = useCallback(async () => {
        if (!address || !user) return;

        try {
            const stats = await SupabaseService.getUserStats(address);
            setUser({
                ...user,
                totalSpent: stats.totalInvested,
                totalPredictions: stats.totalPredictions,
            });
        } catch (err) {
            console.error('Failed to fetch user stats:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch user stats');
        }
    }, [address, user, setUser, setError]);

    const getUserPredictions = useCallback(async () => {
        if (!address) return [];

        try {
            return await SupabaseService.getUserPredictions(address);
        } catch (err) {
            console.error('Failed to fetch user predictions:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch user predictions');
            return [];
        }
    }, [address, setError]);

    // Auto-fetch when address changes
    useEffect(() => {
        if (address) {
            fetchUserPositions();
            fetchUserStats();
        }
    }, [address, fetchUserPositions, fetchUserStats]);

    return {
        userPositions,
        user,
        fetchUserPositions,
        fetchUserStats,
        getUserPredictions,
    };
}

// Hook for market statistics
export function useMarketStats(marketId: string) {
    const [stats, setStats] = useState<{
        yesTotal: number;
        noTotal: number;
        total: number;
        yesPercentage: number;
        noPercentage: number;
        totalPredictions: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        if (!marketId) return;

        try {
            setIsLoading(true);
            setError(null);

            const marketStats = await SupabaseService.getMarketStats(marketId);
            setStats(marketStats);
        } catch (err) {
            console.error('Failed to fetch market stats:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch market stats');
        } finally {
            setIsLoading(false);
        }
    }, [marketId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        isLoading,
        error,
        refetch: fetchStats
    };
}

// Hook for creating predictions
export function usePredictions() {
    const { address } = useAccount();
    const { addPrediction, updateUserPosition } = useAppStore();

    const createPrediction = useCallback(async (
        marketId: string,
        side: 'yes' | 'no',
        amount: number,
        sharesReceived: number,
        transactionHash?: string
    ) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            // Create prediction in database
            const prediction = await SupabaseService.createPrediction({
                market_id: marketId,
                user_id: address,
                side,
                amount,
                shares_received: sharesReceived,
                transaction_hash: transactionHash,
            });

            // Update local store
            addPrediction({
                id: prediction.id,
                marketId: prediction.market_id,
                userId: prediction.user_id,
                side: prediction.side,
                amount: prediction.amount,
                sharesReceived: prediction.shares_received,
                transactionHash: prediction.transaction_hash,
                createdAt: prediction.created_at,
                updatedAt: prediction.updated_at,
            });

            // Update user position
            const existingPosition = await SupabaseService.getUserPosition(address, marketId);
            const newYesShares = (existingPosition?.yes_shares || 0) + (side === 'yes' ? sharesReceived : 0);
            const newNoShares = (existingPosition?.no_shares || 0) + (side === 'no' ? sharesReceived : 0);
            const newTotalInvested = (existingPosition?.total_invested || 0) + amount;

            const updatedPosition = await SupabaseService.updateUserPosition({
                user_id: address,
                market_id: marketId,
                yes_shares: newYesShares,
                no_shares: newNoShares,
                total_invested: newTotalInvested,
            });

            updateUserPosition(updatedPosition);

            return prediction;
        } catch (err) {
            console.error('Failed to create prediction:', err);
            throw err;
        }
    }, [address, addPrediction, updateUserPosition]);

    return {
        createPrediction,
    };
}

// Hook for creating markets
export function useMarketCreation() {
    const { address } = useAccount();
    const { addCreatedMarket } = useAppStore();

    const createMarket = useCallback(async (marketData: {
        question: string;
        category: string;
        endTime: string;
        creatorAddress?: string;
        contractAddress?: string;
    }) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            const market = await SupabaseService.createMarket({
                question: marketData.question,
                category: marketData.category,
                end_time: marketData.endTime,
                creator_address: marketData.creatorAddress || address,
                contract_address: marketData.contractAddress,
                yes_pool: 0,
                no_pool: 0,
                total_yes_shares: 0,
                total_no_shares: 0,
                resolved: false,
            });

            // Add to local store
            addCreatedMarket({
                id: market.id,
                question: market.question,
                category: market.category as UnifiedMarket['category'],
                resolved: market.resolved,
                outcome: market.outcome,
                endTime: market.end_time,
                createdAt: market.created_at,
                resolutionTime: market.resolution_time,
                yesPrice: 0.5,
                noPrice: 0.5,
                yesOdds: 50,
                noOdds: 50,
                yesPool: market.yes_pool,
                noPool: market.no_pool,
                totalYesShares: market.total_yes_shares,
                totalNoShares: market.total_no_shares,
                creatorAddress: market.creator_address,
                contractAddress: market.contract_address,
                isCreatedByUser: true,
            });

            return market;
        } catch (err) {
            console.error('Failed to create market:', err);
            throw err;
        }
    }, [address, addCreatedMarket]);

    return {
        createMarket,
    };
}
