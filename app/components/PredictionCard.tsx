"use client";

import { motion } from 'framer-motion';
import { PredictionMarket, getCategoryGradient } from '@/lib/prediction-markets';
import { Clock, Users, BarChart3 } from 'lucide-react';

interface PredictionCardProps {
    market: PredictionMarket;
    style?: React.CSSProperties;
    className?: string;
    timeLeft?: number;
}

export function PredictionCard({ market, style, className = '', timeLeft = 60 }: PredictionCardProps) {
    const gradientClass = `bg-${getCategoryGradient(market.category)}`;

    const formatPrice = (price: number) => {
        if (price >= 1000) {
            return `$${(price / 1000).toFixed(1)}K`;
        }
        return `$${price.toFixed(2)}`;
    };

    const getTimeRemaining = () => {
        // Generate a random time remaining between 1-24 hours for each market
        // Using market.id as seed for consistency
        const seed = market.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const random = (seed % 24) + 1; // 1-24 hours

        if (random < 1) {
            const minutes = Math.floor(random * 60);
            return `${minutes}m left`;
        } else if (random < 24) {
            const hours = Math.floor(random);
            const minutes = Math.floor((random - hours) * 60);
            if (minutes === 0) {
                return `${hours}h left`;
            }
            return `${hours}h ${minutes}m left`;
        } else {
            return `${Math.floor(random)}h left`;
        }
    };

    const getCategoryColor = (category: string) => {
        const colors = {
            crypto: 'bg-prediction-crypto',
            tech: 'bg-prediction-tech',
            celebrity: 'bg-prediction-celebrity',
            sports: 'bg-prediction-sports',
            politics: 'bg-prediction-politics'
        };
        return colors[category as keyof typeof colors] || 'bg-base-500';
    };

    return (
        <motion.div
            style={style}
            className={`
        relative w-full max-w-sm mx-auto h-[600px] rounded-3xl overflow-hidden
        bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95
        backdrop-blur-xl border border-white/10 shadow-2xl
        ${className}
      `}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Background Gradient Overlay */}
            <div className={`absolute inset-0 ${gradientClass} opacity-20`} />

            {/* Timer Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-700/50 rounded-t-3xl overflow-hidden">
                <motion.div
                    className={`h-full transition-colors duration-500 ${timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 30 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 60) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                />
            </div>



            {/* Header */}
            <div className="relative p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getCategoryColor(market.category)}`}>
                        {market.category.toUpperCase()}
                    </div>
                    <div className="flex items-center text-slate-400 text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        {getTimeRemaining()}
                    </div>
                </div>

                <h2 className="text-xl font-bold text-white leading-tight mb-3">
                    {market.question}
                </h2>

                <p className="text-slate-300 text-sm leading-relaxed">
                    {market.description}
                </p>
            </div>

            {/* Price Section */}
            <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm text-slate-400">
                            {market.timeframe === 'seconds' ? 'Seconds' :
                                market.timeframe === 'hourly' ? 'Hourly' :
                                    market.timeframe === 'daily' ? 'Daily' :
                                        market.timeframe === 'weekly' ? 'Weekly' : 'Monthly'}
                        </span>
                    </div>
                    <div className={`text-sm font-medium ${market.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {market.priceChange >= 0 ? '+' : ''}{market.priceChange}%
                    </div>
                </div>

                <div className="text-3xl font-bold text-white mb-1">
                    {formatPrice(market.currentPrice)}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-700/50 rounded-full h-2 mb-4">
                    <div
                        className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(market.yesOdds / 100) * 100}%` }}
                    />
                </div>

                {/* Market Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                        <div className="text-slate-400 text-xs mb-1">Market Cap</div>
                        <div className="text-white font-semibold">{market.marketCap}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-slate-400 text-xs mb-1 flex items-center justify-center">
                            <Users className="w-3 h-3 mr-1" />
                            Volume
                        </div>
                        <div className="text-white font-semibold">{market.volume}</div>
                    </div>
                </div>
            </div>

            {/* Market Odds */}
            <div className="px-6 mb-6">
                <div className="text-slate-400 text-sm mb-3 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Market Odds
                    <span className="ml-auto text-xs">{market.volume}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-400 mb-1">
                            {market.noOdds}%
                        </div>
                        <div className="text-red-300 text-sm font-medium">NO</div>
                    </div>
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-400 mb-1">
                            {market.yesOdds}%
                        </div>
                        <div className="text-green-300 text-sm font-medium">YES</div>
                    </div>
                </div>
            </div>

            {/* Tags */}
            <div className="px-6 pb-6">
                <div className="flex flex-wrap gap-2">
                    {market.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full border border-slate-600/50"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
        </motion.div>
    );
}
