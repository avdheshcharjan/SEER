import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';
import { PARIMUTUEL_MARKET_ABI } from '@/lib/blockchain-parimutuel';

export interface MarketStats {
  totalYesBets: bigint;
  totalNoBets: bigint;
  totalVolume: bigint;
  yesPercentage: number;
  noPercentage: number;
  isLoading: boolean;
  error: string | null;
}

export function useMarketStats(marketAddress: Address | undefined): MarketStats {
  const [stats, setStats] = useState<MarketStats>({
    totalYesBets: BigInt(0),
    totalNoBets: BigInt(0),
    totalVolume: BigInt(0),
    yesPercentage: 50,
    noPercentage: 50,
    isLoading: true,
    error: null,
  });

  // Fetch market stats from the contract
  const {
    data: marketStatsData,
    isError: statsError,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useReadContract({
    address: marketAddress,
    abi: PARIMUTUEL_MARKET_ABI,
    functionName: 'getMarketStats',
    query: {
      enabled: !!marketAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  useEffect(() => {
    if (marketStatsData && Array.isArray(marketStatsData)) {
      const [totalYesBets, totalNoBets, totalVolume] = marketStatsData as [bigint, bigint, bigint];
      
      // Calculate percentages
      let yesPercentage = 50;
      let noPercentage = 50;
      
      if (totalVolume > 0) {
        yesPercentage = Math.round((Number(totalYesBets) / Number(totalVolume)) * 100);
        noPercentage = 100 - yesPercentage;
      }

      setStats({
        totalYesBets,
        totalNoBets,
        totalVolume,
        yesPercentage,
        noPercentage,
        isLoading: false,
        error: null,
      });
    } else if (statsError) {
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch market stats',
      }));
    } else if (!statsLoading) {
      setStats(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [marketStatsData, statsError, statsLoading]);

  // Return stats with refetch function
  return {
    ...stats,
    refetch: refetchStats,
  } as MarketStats & { refetch: () => void };
}

export default useMarketStats;