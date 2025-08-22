"use client";

import { UnifiedMarket } from '@/lib/types';
import { BaseCard } from './BaseCard';

interface CelebrityCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
}

export function CelebrityCard({ market, style, className, isActive }: CelebrityCardProps) {
    const getCelebrityIcon = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('taylor swift')) return '🎤';
        if (q.includes('elon musk')) return '🚀';
        if (q.includes('kim kardashian')) return '💄';
        if (q.includes('dwayne johnson') || q.includes('the rock')) return '💪';
        if (q.includes('oprah')) return '📺';
        if (q.includes('beyonce') || q.includes('beyoncé')) return '👑';
        if (q.includes('ryan reynolds')) return '🎬';
        if (q.includes('lebron')) return '🏀';
        if (q.includes('rihanna')) return '💎';
        if (q.includes('gordon ramsay')) return '👨‍🍳';
        if (q.includes('jennifer lawrence')) return '🏹';
        if (q.includes('tom cruise')) return '🎭';
        if (q.includes('ariana grande')) return '🎵';
        if (q.includes('kanye') || q.includes('ye')) return '🎧';
        if (q.includes('lady gaga')) return '🌟';
        if (q.includes('drake')) return '🎶';
        if (q.includes('selena gomez')) return '📱';
        if (q.includes('robert downey')) return '🦾';
        if (q.includes('dolly parton')) return '🤠';
        if (q.includes('will smith')) return '🎭';
        return '⭐';
    };

    const getCelebrityName = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('taylor swift')) return 'Taylor Swift';
        if (q.includes('elon musk')) return 'Elon Musk';
        if (q.includes('kim kardashian')) return 'Kim Kardashian';
        if (q.includes('dwayne johnson') || q.includes('the rock')) return 'Dwayne Johnson';
        if (q.includes('oprah')) return 'Oprah Winfrey';
        if (q.includes('beyonce') || q.includes('beyoncé')) return 'Beyoncé';
        if (q.includes('ryan reynolds')) return 'Ryan Reynolds';
        if (q.includes('lebron')) return 'LeBron James';
        if (q.includes('rihanna')) return 'Rihanna';
        if (q.includes('gordon ramsay')) return 'Gordon Ramsay';
        if (q.includes('jennifer lawrence')) return 'Jennifer Lawrence';
        if (q.includes('tom cruise')) return 'Tom Cruise';
        if (q.includes('ariana grande')) return 'Ariana Grande';
        if (q.includes('kanye') || q.includes('ye')) return 'Kanye West';
        if (q.includes('lady gaga')) return 'Lady Gaga';
        if (q.includes('drake')) return 'Drake';
        if (q.includes('selena gomez')) return 'Selena Gomez';
        if (q.includes('robert downey')) return 'Robert Downey Jr.';
        if (q.includes('dolly parton')) return 'Dolly Parton';
        if (q.includes('will smith')) return 'Will Smith';
        return 'Celebrity';
    };

    const getCelebrityCategory = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('taylor swift') || q.includes('beyonce') || q.includes('drake') || q.includes('kanye') || q.includes('rihanna') || q.includes('ariana') || q.includes('lady gaga') || q.includes('dolly')) return 'Music';
        if (q.includes('jennifer lawrence') || q.includes('tom cruise') || q.includes('robert downey') || q.includes('will smith')) return 'Movies';
        if (q.includes('lebron')) return 'Sports';
        if (q.includes('elon musk')) return 'Tech/Business';
        if (q.includes('kim kardashian')) return 'Reality TV';
        if (q.includes('gordon ramsay')) return 'Culinary';
        if (q.includes('oprah')) return 'Media';
        return 'Entertainment';
    };

    const getFollowerCount = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('taylor swift')) return '279M';
        if (q.includes('elon musk')) return '166M';
        if (q.includes('kim kardashian')) return '364M';
        if (q.includes('beyonce') || q.includes('beyoncé')) return '319M';
        if (q.includes('ariana grande')) return '378M';
        if (q.includes('selena gomez')) return '429M';
        if (q.includes('drake')) return '143M';
        if (q.includes('rihanna')) return '151M';
        if (q.includes('lady gaga')) return '84M';
        return '50M+';
    };

    const getEngagementRate = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('taylor swift')) return '4.2%';
        if (q.includes('elon musk')) return '2.8%';
        if (q.includes('kim kardashian')) return '1.9%';
        if (q.includes('beyonce')) return '3.1%';
        if (q.includes('ariana grande')) return '5.7%';
        if (q.includes('drake')) return '3.4%';
        return '2.5%';
    };

    return (
        <BaseCard market={market} style={style} className={className} isActive={isActive}>
            {/* Celebrity Icon & Name */}
            <div className="flex items-center justify-center mb-4">
                <div className="text-4xl mr-3">
                    {getCelebrityIcon(market.question)}
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-white/90">
                        {getCelebrityName(market.question)}
                    </h3>
                    <div className="text-xs text-white/60">
                        {getCelebrityCategory(market.question)}
                    </div>
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

            {/* Social Stats - Compact */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-4 flex-shrink-0">
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">Followers</div>
                        <div className="text-white font-semibold text-xs">
                            {getFollowerCount(market.question)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">Engagement</div>
                        <div className="text-white font-semibold text-xs">
                            {getEngagementRate(market.question)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Achievement/Status - Compact */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex-shrink-0">
                <div className="text-center">
                    <div className="text-white/70 text-xs mb-1">Event</div>
                    <div className="text-white font-medium text-xs">
                        {market.question.toLowerCase().includes('engagement') ? '💍 Relationship' :
                         market.question.toLowerCase().includes('album') || market.question.toLowerCase().includes('song') ? '🎵 Music' :
                         market.question.toLowerCase().includes('movie') || market.question.toLowerCase().includes('film') ? '🎬 Movie' :
                         market.question.toLowerCase().includes('award') || market.question.toLowerCase().includes('oscar') || market.question.toLowerCase().includes('grammy') ? '🏆 Awards' :
                         market.question.toLowerCase().includes('business') || market.question.toLowerCase().includes('company') ? '💼 Business' :
                         market.question.toLowerCase().includes('comeback') || market.question.toLowerCase().includes('return') ? '🔄 Career' :
                         '⭐ Event'}
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}