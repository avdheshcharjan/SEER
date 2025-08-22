"use client";

import { UnifiedMarket } from '@/lib/types';
import { BaseCard } from './BaseCard';
import { TrendingUp, TrendingDown, Share } from 'lucide-react';

interface MarketCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
}

export function MarketCard({ market, style, className, isActive }: MarketCardProps) {
    const formatPrice = (price?: number) => {
        if (!price || price === 0) return '$0.00';
        if (price >= 1000) {
            return `$${(price / 1000).toFixed(1)}K`;
        }
        return `$${price.toLocaleString()}`;
    };

    const getTimeRemaining = () => {
        if (!market.endTime) return 'No end date';

        const now = new Date();
        const endTime = new Date(market.endTime);
        const timeLeft = endTime.getTime() - now.getTime();

        if (timeLeft <= 0) return 'Ended';

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d left`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m left`;
        } else {
            return `${minutes}m left`;
        }
    };

    return (
        <BaseCard market={market} style={style} className={className} isActive={isActive}>
            {/* Market Icon */}
            <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold text-white">
                        {market.ticker?.slice(0, 3) || '📊'}
                    </span>
                </div>
            </div>

            {/* Question */}
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white leading-tight mb-2 line-clamp-3">
                    {market.question}
                </h2>
                <p className="text-white/70 text-xs leading-relaxed line-clamp-2">
                    {market.description || `A prediction market for ${market.category}`}
                </p>
            </div>

            {/* Market Stats */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-4 flex-shrink-0">
                <div className="text-center mb-3">
                    <div className="text-white/60 text-xs mb-1">Total Volume</div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {formatPrice(market.totalVolume)}
                    </div>
                    <div className="text-white/60 text-xs">
                        {getTimeRemaining()}
                    </div>
                </div>

                {/* Pool Information */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">YES Pool</div>
                        <div className="text-white font-semibold text-xs">
                            {market.yesPool?.toLocaleString() || '0'} USDC
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">NO Pool</div>
                        <div className="text-white font-semibold text-xs">
                            {market.noPool?.toLocaleString() || '0'} USDC
                        </div>
                    </div>
                </div>
            </div>

            {/* Target Price Info - For crypto markets */}
            {market.targetPrice && market.direction && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex-shrink-0">
                    <div className="text-center">
                        <div className="text-white/70 text-xs mb-1">Target</div>
                        <div className="flex items-center justify-center space-x-1">
                            <span className="text-sm font-bold text-white">
                                ${market.targetPrice.toLocaleString()}
                            </span>
                            <div className={`flex items-center space-x-1 text-xs ${market.direction === 'above' ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {market.direction === 'above' ?
                                    <TrendingUp className="w-3 h-3" /> :
                                    <TrendingDown className="w-3 h-3" />
                                }
                                <span>{market.direction?.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Button */}
            <div className="flex justify-center mt-2">
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        try {
                            const shareUrl = `${window.location.origin}/market/${market.id}`;
                            await navigator.clipboard.writeText(shareUrl);
                            // You could add a toast notification here
                        } catch (error) {
                            console.error('Failed to copy link:', error);
                        }
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    title="Copy share link"
                >
                    <Share className="w-4 h-4 text-white/70" />
                </button>
            </div>
        </BaseCard>
    );
}
