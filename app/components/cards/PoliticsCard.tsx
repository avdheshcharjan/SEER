"use client";

import { UnifiedMarket } from '@/lib/types';
import { BaseCard } from './BaseCard';

interface PoliticsCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
}

export function PoliticsCard({ market, style, className, isActive }: PoliticsCardProps) {
    const getPoliticalIcon = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('trump')) return '🇺🇸';
        if (q.includes('biden')) return '🗳️';
        if (q.includes('rfk')) return '🗽';
        if (q.includes('republican')) return '🐘';
        if (q.includes('newsom')) return '🌴';
        if (q.includes('supreme court')) return '⚖️';
        if (q.includes('ukraine') || q.includes('nato')) return '🛡️';
        if (q.includes('china') || q.includes('taiwan')) return '🌏';
        if (q.includes('brexit') || q.includes('uk')) return '🇬🇧';
        if (q.includes('aoc')) return '🗽';
        if (q.includes('putin')) return '🇷🇺';
        if (q.includes('india')) return '🇮🇳';
        if (q.includes('tiktok')) return '📱';
        if (q.includes('climate')) return '🌍';
        if (q.includes('un') || q.includes('security')) return '🏛️';
        return '🗳️';
    };

    const getPoliticalEntity = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('trump')) return 'Donald Trump';
        if (q.includes('biden')) return 'Joe Biden';
        if (q.includes('rfk')) return 'RFK Jr.';
        if (q.includes('republican')) return 'Republican Party';
        if (q.includes('newsom')) return 'Gavin Newsom';
        if (q.includes('supreme court')) return 'Supreme Court';
        if (q.includes('ukraine')) return 'Ukraine';
        if (q.includes('china')) return 'China';
        if (q.includes('brexit')) return 'United Kingdom';
        if (q.includes('aoc')) return 'Alexandria Ocasio-Cortez';
        if (q.includes('putin')) return 'Vladimir Putin';
        if (q.includes('india')) return 'India';
        if (q.includes('tiktok')) return 'TikTok';
        if (q.includes('climate')) return 'Climate Action';
        if (q.includes('un')) return 'United Nations';
        return 'Political Entity';
    };

    const getPoliticalCategory = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('election') || q.includes('vote') || q.includes('ballot')) return 'Elections';
        if (q.includes('court') || q.includes('legal') || q.includes('precedent')) return 'Legal/Judicial';
        if (q.includes('ukraine') || q.includes('china') || q.includes('nato') || q.includes('taiwan')) return 'Foreign Policy';
        if (q.includes('brexit') || q.includes('uk') || q.includes('eu')) return 'International';
        if (q.includes('climate') || q.includes('refugee')) return 'Global Issues';
        if (q.includes('tiktok') || q.includes('ban') || q.includes('regulation')) return 'Tech Policy';
        if (q.includes('congress') || q.includes('senate') || q.includes('aoc')) return 'Domestic Politics';
        return 'Politics';
    };

    const getPollingData = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('trump') && q.includes('2024')) return '47%';
        if (q.includes('biden') && q.includes('re-election')) return '85%';
        if (q.includes('rfk') && q.includes('ballot')) return '32%';
        if (q.includes('republican') && q.includes('senate')) return '58%';
        if (q.includes('newsom') && q.includes('2028')) return '71%';
        if (q.includes('supreme court')) return '43%';
        if (q.includes('ukraine') && q.includes('nato')) return '18%';
        if (q.includes('china') && q.includes('taiwan')) return '8%';
        if (q.includes('brexit')) return '22%';
        if (q.includes('aoc') && q.includes('senate')) return '25%';
        if (q.includes('putin')) return '74%';
        if (q.includes('tiktok')) return '67%';
        if (q.includes('climate')) return '78%';
        return '50%';
    };

    const getApprovalRating = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('trump')) return '43%';
        if (q.includes('biden')) return '42%';
        if (q.includes('putin')) return '81%';
        if (q.includes('supreme court')) return '40%';
        if (q.includes('congress')) return '21%';
        if (q.includes('ukraine')) return '72%';
        if (q.includes('nato')) return '67%';
        if (q.includes('un')) return '35%';
        return 'N/A';
    };

    return (
        <BaseCard market={market} style={style} className={className} isActive={isActive}>
            {/* Political Icon & Info */}
            <div className="flex items-center justify-center mb-4">
                <div className="text-4xl mr-3">
                    {getPoliticalIcon(market.question)}
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-white/90">
                        {getPoliticalEntity(market.question)}
                    </h3>
                    <div className="text-xs text-white/60">
                        {getPoliticalCategory(market.question)}
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

            {/* Political Metrics - Compact */}
            <div className="bg-black rounded-xl p-3 mb-4 flex-shrink-0">
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">Polling</div>
                        <div className="text-white font-semibold text-xs">
                            {getPollingData(market.question)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-white/60 text-xs mb-1">Approval</div>
                        <div className="text-white font-semibold text-xs">
                            {getApprovalRating(market.question)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Classification - Simplified */}
            <div className="bg-gradient-to-r from-red-500/30 to-blue-500/30 rounded-lg p-2 flex-shrink-0">
                <div className="text-center">
                    <div className="text-white/70 text-xs mb-1">Event</div>
                    <div className="text-white font-medium text-xs">
                        {market.question.toLowerCase().includes('election') ? '🗳️ Election' :
                            market.question.toLowerCase().includes('court') || market.question.toLowerCase().includes('legal') ? '⚖️ Legal' :
                                market.question.toLowerCase().includes('war') || market.question.toLowerCase().includes('military') ? '⚔️ Military' :
                                    market.question.toLowerCase().includes('treaty') || market.question.toLowerCase().includes('nato') ? '🤝 Treaty' :
                                        market.question.toLowerCase().includes('ban') || market.question.toLowerCase().includes('regulation') ? '📋 Policy' :
                                            market.question.toLowerCase().includes('climate') || market.question.toLowerCase().includes('refugee') ? '🌍 Crisis' :
                                                '🏛️ Political'}
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}