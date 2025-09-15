"use client";

import { motion } from 'framer-motion';
import { Address } from 'viem';
import { useMarketStats } from '@/lib/hooks/useMarketStats';

interface BettingPoolAnalyticsProps {
  marketAddress: Address;
  className?: string;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function BettingPoolAnalytics({ 
  marketAddress, 
  className = "", 
  showLabels = true, 
  size = 'medium' 
}: BettingPoolAnalyticsProps) {
  const { yesPercentage, noPercentage, totalVolume, isLoading, error } = useMarketStats(marketAddress);

  // Size configurations
  const sizeConfig = {
    small: {
      container: "h-2",
      text: "text-xs",
      spacing: "space-y-1",
    },
    medium: {
      container: "h-3",
      text: "text-sm",
      spacing: "space-y-2",
    },
    large: {
      container: "h-4",
      text: "text-base",
      spacing: "space-y-3",
    }
  };

  const config = sizeConfig[size];

  if (isLoading) {
    return (
      <div className={`${config.spacing} ${className}`}>
        <div className={`w-full ${config.container} bg-slate-700/50 rounded-full animate-pulse`} />
        {showLabels && (
          <div className="flex justify-between">
            <div className={`${config.text} bg-slate-700/50 rounded w-16 h-4 animate-pulse`} />
            <div className={`${config.text} bg-slate-700/50 rounded w-16 h-4 animate-pulse`} />
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${config.spacing} ${className}`}>
        <div className={`w-full ${config.container} bg-slate-700/50 rounded-full`}>
          <div className="w-1/2 h-full bg-slate-600 rounded-full" />
        </div>
        {showLabels && (
          <div className="flex justify-between">
            <span className={`${config.text} text-slate-400`}>YES 50%</span>
            <span className={`${config.text} text-slate-400`}>NO 50%</span>
          </div>
        )}
      </div>
    );
  }

  // Format volume for display
  const formatVolume = (volume: bigint): string => {
    const volumeNum = Number(volume) / 1e6; // Convert from USDC (6 decimals) to display
    if (volumeNum < 1000) {
      return `$${volumeNum.toFixed(0)}`;
    } else if (volumeNum < 1000000) {
      return `$${(volumeNum / 1000).toFixed(1)}K`;
    } else {
      return `$${(volumeNum / 1000000).toFixed(1)}M`;
    }
  };

  return (
    <div className={`${config.spacing} ${className}`}>
      {/* Progress Bar */}
      <div className={`w-full ${config.container} bg-slate-700/50 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: '50%' }}
          animate={{ width: `${yesPercentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
        />
      </div>

      {/* Labels and Stats */}
      {showLabels && (
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className={`${config.text} font-semibold text-green-400`}>
              YES {yesPercentage}%
            </span>
            {size !== 'small' && (
              <span className={`${config.text} text-slate-400`}>
                •
              </span>
            )}
          </div>
          
          {size !== 'small' && totalVolume > 0 && (
            <span className={`${config.text} text-slate-300 font-medium`}>
              {formatVolume(totalVolume)} pool
            </span>
          )}
          
          <div className="flex items-center space-x-2">
            {size !== 'small' && (
              <span className={`${config.text} text-slate-400`}>
                •
              </span>
            )}
            <span className={`${config.text} font-semibold text-red-400`}>
              NO {noPercentage}%
            </span>
          </div>
        </div>
      )}

      {/* Additional Stats for Large Size */}
      {size === 'large' && totalVolume > 0 && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
          <div className="text-center">
            <div className="text-xs text-slate-400">YES Pool</div>
            <div className="text-sm font-semibold text-green-400">
              {formatVolume((totalVolume * BigInt(yesPercentage)) / BigInt(100))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">NO Pool</div>
            <div className="text-sm font-semibold text-red-400">
              {formatVolume((totalVolume * BigInt(noPercentage)) / BigInt(100))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BettingPoolAnalytics;