"use client";

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import { SupabaseService } from '@/lib/supabase';
import { useAccount } from 'wagmi';

interface SupabaseContextType {
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    refetchMarkets: () => Promise<void>;
    refetchUserData: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function useSupabase() {
    const context = useContext(SupabaseContext);
    if (!context) {
        throw new Error('useSupabase must be used within SupabaseProvider');
    }
    return context;
}

interface SupabaseProviderProps {
    children: ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
    const { address, isConnected: walletConnected } = useAccount();
    const {
        setSupabaseMarkets,
        setUserPositions,
        setLoading,
        setError,
        error,
        isLoading,
        user,
        setUser
    } = useAppStore();

    // Initialize user when wallet connects
    useEffect(() => {
        if (walletConnected && address && !user) {
            const newUser = {
                id: address,
                address: address,
                totalSpent: 0,
                correctPredictions: 0,
                totalPredictions: 0,
                rank: 0,
                joinedAt: new Date().toISOString(),
                defaultBetAmount: 10, // Default 10 USDC
            };
            setUser(newUser);
        }
    }, [walletConnected, address, user, setUser]);

    const refetchMarkets = async () => {
        try {
            setLoading(true);
            setError(null);

            const markets = await SupabaseService.getActiveMarkets();
            setSupabaseMarkets(markets);
        } catch (err) {
            console.error('Failed to fetch markets:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch markets');
        } finally {
            setLoading(false);
        }
    };

    const refetchUserData = async () => {
        if (!address) return;

        try {
            setError(null);

            // Fetch user positions
            const positions = await SupabaseService.getUserPositions(address);
            setUserPositions(positions);

            // Fetch user stats
            const stats = await SupabaseService.getUserStats(address);
            if (user) {
                setUser({
                    ...user,
                    totalSpent: stats.totalInvested,
                    totalPredictions: stats.totalPredictions,
                });
            }
        } catch (err) {
            console.error('Failed to fetch user data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch user data');
        }
    };

    // Initial data fetch when component mounts or user connects
    useEffect(() => {
        refetchMarkets();
    }, [refetchMarkets]);

    useEffect(() => {
        if (address) {
            refetchUserData();
        }
    }, [address, refetchUserData]);

    const contextValue: SupabaseContextType = {
        isConnected: walletConnected,
        isLoading,
        error,
        refetchMarkets,
        refetchUserData,
    };

    return (
        <SupabaseContext.Provider value={contextValue}>
            {children}
        </SupabaseContext.Provider>
    );
}
