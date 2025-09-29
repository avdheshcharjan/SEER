"use client";

import { UnifiedMarket } from '@/lib/types';
import { BaseCard } from './BaseCard';
import { Globe, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface CurrentAffairsCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
    suppressEntranceAnimation?: boolean;
}

export function CurrentAffairsCard({ market, style, className, isActive, suppressEntranceAnimation }: CurrentAffairsCardProps) {
    // Determine the icon based on market question content
    const getMarketIcon = () => {
        const question = market.question.toLowerCase();

        if (question.includes('earthquake') || question.includes('weather') || question.includes('climate')) {
            return <AlertCircle className="w-6 h-6 text-white" />;
        }
        if (question.includes('oil') || question.includes('opec') || question.includes('gold') || question.includes('currency')) {
            return <TrendingUp className="w-6 h-6 text-white" />;
        }
        if (question.includes('airline') || question.includes('travel') || question.includes('sanctions')) {
            return <Globe className="w-6 h-6 text-white" />;
        }

        return <Globe className="w-6 h-6 text-white" />; // Default icon
    };

    // Get background gradient based on content
    const getGradientColors = () => {
        const question = market.question.toLowerCase();

        if (question.includes('earthquake') || question.includes('disaster')) {
            return 'from-red-500 via-orange-600 to-yellow-500';
        }
        if (question.includes('oil') || question.includes('gold') || question.includes('economy')) {
            return 'from-yellow-500 via-orange-500 to-red-500';
        }
        if (question.includes('climate') || question.includes('weather')) {
            return 'from-blue-500 via-green-500 to-teal-500';
        }
        if (question.includes('politics') || question.includes('election')) {
            return 'from-purple-500 via-blue-600 to-indigo-600';
        }

        return 'from-slate-600 via-gray-700 to-slate-800'; // Default gradient
    };

    // Format time remaining
    const getTimeInfo = () => {
        if (!market.endTime) return null;

        const now = new Date();
        const end = new Date(market.endTime);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) return { text: 'Ended', urgent: true };

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
            return {
                text: `${days}d ${hours}h remaining`,
                urgent: days < 2
            };
        } else {
            return {
                text: `${hours}h remaining`,
                urgent: hours < 12
            };
        }
    };

    const timeInfo = getTimeInfo();

    return (
        <BaseCard market={market} style={style} className={className} isActive={isActive} suppressEntranceAnimation={suppressEntranceAnimation}>
            {/* Current Affairs Icon */}
            <div className="flex items-center justify-center mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${getGradientColors()} rounded-full flex items-center justify-center shadow-lg`}>
                    {getMarketIcon()}
                </div>
            </div>

            {/* Question */}
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white leading-tight mb-2">
                    {market.question}
                </h2>
                <p className="text-white/70 text-xs leading-relaxed line-clamp-2">
                    {market.description || "Stay informed on breaking news and global events that shape our world."}
                </p>
            </div>

            {/* Event Timeline & Status */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-4 flex-shrink-0">
                {/* Time Remaining */}
                {timeInfo && (
                    <div className="text-center mb-3">
                        <div className="text-white/60 text-xs mb-1 flex items-center justify-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Market Closes
                        </div>
                        <div className={`text-sm font-bold ${timeInfo.urgent ? 'text-red-400' : 'text-white'}`}>
                            {timeInfo.text}
                        </div>
                    </div>
                )}

                {/* Market Category Badge */}
                <div className="flex justify-center mb-3">
                    <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-white/80">
                        Current Affairs
                    </div>
                </div>

                {/* Key Market Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">YES Pool</div>
                        <div className="text-white font-semibold text-xs">
                            {market.contract_address ?
                                `$${(market.yes_pool || 0).toFixed(0)}` :
                                `${(market.yesPercentage || 50).toFixed(0)}%`
                            }
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">NO Pool</div>
                        <div className="text-white font-semibold text-xs">
                            {market.contract_address ?
                                `$${(market.no_pool || 0).toFixed(0)}` :
                                `${(market.noPercentage || 50).toFixed(0)}%`
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Contract Status Indicator */}
            {market.contract_address && (
                <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-2 flex-shrink-0">
                    <div className="text-center">
                        <div className="text-green-400 text-xs mb-1 flex items-center justify-center">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                            Live Contract
                        </div>
                        <div className="text-white text-xs">
                            Real USDC betting enabled
                        </div>
                    </div>
                </div>
            )}

            {/* Breaking News Badge for urgent events */}
            {timeInfo?.urgent && market.contract_address && (
                <div className="absolute top-3 right-3">
                    <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                        URGENT
                    </div>
                </div>
            )}
        </BaseCard>
    );
}