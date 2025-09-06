"use client";

import { UnifiedMarket } from '@/lib/types';
import { BaseCard } from './BaseCard';
import { Building2, Users, Zap, TrendingUp, TrendingDown } from 'lucide-react';

interface TechCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
    suppressEntranceAnimation?: boolean;
}

export function TechCard({ market, style, className, isActive, suppressEntranceAnimation }: TechCardProps) {
    const formatPrice = (price?: number) => {
        if (!price || price === 0) return '$0.00';
        return `$${price.toLocaleString()}`;
    };

    const getCompanyIcon = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('apple')) return '🍎';
        if (q.includes('tesla')) return '⚡';
        if (q.includes('meta')) return '📘';
        if (q.includes('google')) return '🔍';
        if (q.includes('microsoft')) return '💻';
        if (q.includes('netflix')) return '🎬';
        if (q.includes('amazon')) return '📦';
        if (q.includes('nvidia')) return '🎮';
        if (q.includes('openai') || q.includes('chatgpt')) return '🤖';
        if (q.includes('twitter') || q.includes('x')) return '🐦';
        return '🏢';
    };

    const getCompanyName = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('apple')) return 'Apple Inc.';
        if (q.includes('tesla')) return 'Tesla Inc.';
        if (q.includes('meta')) return 'Meta Platforms';
        if (q.includes('google')) return 'Alphabet Inc.';
        if (q.includes('microsoft')) return 'Microsoft Corp.';
        if (q.includes('netflix')) return 'Netflix Inc.';
        if (q.includes('amazon')) return 'Amazon.com Inc.';
        if (q.includes('nvidia')) return 'NVIDIA Corp.';
        if (q.includes('openai')) return 'OpenAI';
        if (q.includes('twitter') || q.includes('x')) return 'X Corp.';
        return 'Tech Company';
    };

    return (
        <BaseCard market={market} style={style} className={className} isActive={isActive} suppressEntranceAnimation={suppressEntranceAnimation}>
            {/* Company Icon */}
            <div className="flex items-center justify-center mb-6">
                <div className="text-6xl mb-2">
                    {getCompanyIcon(market.question)}
                </div>
            </div>

            {/* Company Name */}
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-white/90 mb-2">
                    {getCompanyName(market.question)}
                </h3>
            </div>

            {/* Question */}
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white leading-tight mb-2">
                    {market.question}
                </h2>
                <p className="text-white/70 text-sm leading-relaxed">
                    {market.description}
                </p>
            </div>

            {/* Stock Price (if available) */}
            {market.currentPrice && market.currentPrice > 0 && (
                <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 mb-6">
                    <div className="text-center mb-4">
                        <div className="text-white/60 text-sm mb-1">Stock Price</div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {formatPrice(market.currentPrice)}
                        </div>
                        <div className={`flex items-center justify-center space-x-1 text-sm font-medium ${
                            (market.priceChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                            {(market.priceChange || 0) >= 0 ? 
                                <TrendingUp className="w-4 h-4" /> : 
                                <TrendingDown className="w-4 h-4" />
                            }
                            <span>
                                {(market.priceChange || 0) >= 0 ? '+' : ''}{(market.priceChange || 0).toFixed(2)}%
                            </span>
                            <span className="text-white/60">24h</span>
                        </div>
                    </div>

                    {/* Company Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                                <Building2 className="w-4 h-4 text-blue-400 mr-1" />
                                <span className="text-white/60 text-xs">Market Cap</span>
                            </div>
                            <div className="text-white font-semibold text-sm">
                                {market.marketCap || 'N/A'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                                <Zap className="w-4 h-4 text-purple-400 mr-1" />
                                <span className="text-white/60 text-xs">Volume</span>
                            </div>
                            <div className="text-white font-semibold text-sm">
                                {market.volume || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tech Metrics (for non-price questions) */}
            {(!market.currentPrice || market.currentPrice === 0) && (
                <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                                <Users className="w-4 h-4 text-green-400 mr-1" />
                                <span className="text-white/60 text-xs">Users</span>
                            </div>
                            <div className="text-white font-semibold text-sm">
                                {market.question.toLowerCase().includes('chatgpt') ? '100M+' :
                                 market.question.toLowerCase().includes('netflix') ? '260M+' :
                                 market.question.toLowerCase().includes('meta') ? '3.9B+' : 
                                 'N/A'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                                <Zap className="w-4 h-4 text-orange-400 mr-1" />
                                <span className="text-white/60 text-xs">Innovation</span>
                            </div>
                            <div className="text-white font-semibold text-sm">
                                {market.question.toLowerCase().includes('ai') || market.question.toLowerCase().includes('quantum') ? 'High' :
                                 market.question.toLowerCase().includes('ar') || market.question.toLowerCase().includes('vr') ? 'High' :
                                 'Medium'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Key Milestone - More compact */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex-shrink-0">
                <div className="text-center">
                    <div className="text-white/70 text-xs mb-1">Event</div>
                    <div className="text-white font-medium text-xs">
                        {market.question.toLowerCase().includes('release') ? '🚀 Launch' :
                         market.question.toLowerCase().includes('acquire') ? '🤝 Acquisition' :
                         market.question.toLowerCase().includes('ipo') ? '📈 IPO' :
                         market.question.toLowerCase().includes('reach') ? '📊 Milestone' :
                         '⭐ Event'}
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}