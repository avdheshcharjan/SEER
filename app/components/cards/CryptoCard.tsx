"use client";

import { useState, useEffect } from 'react';
import { UnifiedMarket } from '@/lib/types';
import { BaseCard } from './BaseCard';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CoinGeckoService } from '@/lib/coingecko';
import { CryptoChart } from '../charts/CryptoChart';

interface CryptoCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
}

export function CryptoCard({ market, style, className, isActive }: CryptoCardProps) {
    const [coinGeckoData, setCoinGeckoData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Fetch CoinGecko data when component mounts or market changes
    useEffect(() => {
        const fetchCoinGeckoData = async () => {
            if (!market.ticker) {
                // Try to extract ticker from question for legacy markets
                const extractedTicker = CoinGeckoService.extractTickerFromQuestion(market.question);
                if (!extractedTicker) return;
                
                setLoading(true);
                const data = await CoinGeckoService.getPriceData(extractedTicker);
                setCoinGeckoData(data);
                setLoading(false);
            } else {
                setLoading(true);
                const data = await CoinGeckoService.getPriceData(market.ticker);
                setCoinGeckoData(data);
                setLoading(false);
            }
        };

        fetchCoinGeckoData();
    }, [market.ticker, market.question]);

    const formatPrice = (price?: number) => {
        if (!price || price === 0) return '$0.00';
        if (price >= 1000) {
            return `$${(price / 1000).toFixed(1)}K`;
        }
        return `$${price.toLocaleString()}`;
    };

    // Use CoinGecko data if available, fallback to market data
    const displayPrice = coinGeckoData?.currentPrice || market.currentPrice || 0;
    const displayPriceChange = coinGeckoData?.priceChange || market.priceChange || 0;
    const displayMarketCap = coinGeckoData?.marketCap || market.marketCap || 'N/A';
    const displayVolume = coinGeckoData?.volume || market.volume || '$0';


    return (
        <BaseCard market={market} style={style} className={className} isActive={isActive}>
            {/* Crypto Symbol/Icon */}
            <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold text-white">
                        {market.ticker?.slice(0, 3) || '₿'}
                    </span>
                </div>
            </div>

            {/* Question */}
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white leading-tight mb-2">
                    {market.question}
                </h2>
                <p className="text-white/70 text-xs leading-relaxed line-clamp-2">
                    {market.description}
                </p>
            </div>

            {/* Current Price Display */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-4 flex-shrink-0">
                <div className="text-center mb-3">
                    <div className="text-white/60 text-xs mb-1">
                        Current Price {loading && <span className="animate-pulse">●</span>}
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {formatPrice(displayPrice)}
                    </div>
                    <div className={`flex items-center justify-center space-x-1 text-xs font-medium ${
                        displayPriceChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                        {displayPriceChange >= 0 ? 
                            <TrendingUp className="w-3 h-3" /> : 
                            <TrendingDown className="w-3 h-3" />
                        }
                        <span>
                            {displayPriceChange >= 0 ? '+' : ''}{displayPriceChange.toFixed(2)}%
                        </span>
                        <span className="text-white/60">24h</span>
                    </div>
                </div>

                {/* Hourly Chart */}
                {coinGeckoData?.chartData && (
                    <div className="mb-3">
                        <CryptoChart 
                            data={coinGeckoData.chartData}
                            currentPrice={displayPrice}
                            priceChange={displayPriceChange}
                        />
                    </div>
                )}

                {/* Market Stats - Only show 2 most important */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">Market Cap</div>
                        <div className="text-white font-semibold text-xs">
                            {displayMarketCap}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">Volume</div>
                        <div className="text-white font-semibold text-xs">
                            {displayVolume}
                        </div>
                    </div>
                </div>
            </div>

            {/* Target Price Info - More compact */}
            {market.targetPrice && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex-shrink-0">
                    <div className="text-center">
                        <div className="text-white/70 text-xs mb-1">Target</div>
                        <div className="flex items-center justify-center space-x-1">
                            <span className="text-sm font-bold text-white">
                                ${market.targetPrice.toLocaleString()}
                            </span>
                            <div className={`flex items-center space-x-1 text-xs ${
                                market.direction === 'above' ? 'text-green-400' : 'text-red-400'
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
        </BaseCard>
    );
}