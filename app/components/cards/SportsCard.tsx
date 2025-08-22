"use client";

import { UnifiedMarket } from '@/lib/types';
import { BaseCard } from './BaseCard';
import { Trophy, Target } from 'lucide-react';

interface SportsCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
}

export function SportsCard({ market, style, className, isActive }: SportsCardProps) {
    const getSportsIcon = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('messi')) return '⚽';
        if (q.includes('chiefs') || q.includes('superbowl') || q.includes('super bowl')) return '🏈';
        if (q.includes('ronaldo')) return '⚽';
        if (q.includes('lebron') || q.includes('bronny') || q.includes('nba')) return '🏀';
        if (q.includes('serena') || q.includes('tennis')) return '🎾';
        if (q.includes('verstappen') || q.includes('f1')) return '🏎️';
        if (q.includes('tiger') || q.includes('golf')) return '⛳';
        if (q.includes('curry') || q.includes('basketball')) return '🏀';
        if (q.includes('mcdavid') || q.includes('hockey')) return '🏒';
        if (q.includes('djokovic') || q.includes('olympics')) return '🥇';
        if (q.includes('manchester') || q.includes('champions league')) return '⚽';
        if (q.includes('ohtani') || q.includes('baseball')) return '⚾';
        if (q.includes('caitlin') || q.includes('wnba')) return '🏀';
        if (q.includes('team usa') || q.includes('medals')) return '🇺🇸';
        if (q.includes('mbappe') || q.includes('madrid')) return '⚽';
        return '🏆';
    };

    const getAthleteTeamName = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('messi')) return 'Inter Miami CF';
        if (q.includes('chiefs')) return 'Kansas City Chiefs';
        if (q.includes('ronaldo')) return 'Portugal National Team';
        if (q.includes('lebron')) return 'Los Angeles Lakers';
        if (q.includes('serena')) return 'Tennis Legend';
        if (q.includes('verstappen')) return 'Red Bull Racing';
        if (q.includes('tiger')) return 'Professional Golf';
        if (q.includes('curry')) return 'Golden State Warriors';
        if (q.includes('mcdavid')) return 'Edmonton Oilers';
        if (q.includes('djokovic')) return 'Professional Tennis';
        if (q.includes('manchester')) return 'Manchester City';
        if (q.includes('ohtani')) return 'Los Angeles Dodgers';
        if (q.includes('caitlin')) return 'Indiana Fever';
        if (q.includes('team usa')) return 'Team USA';
        if (q.includes('mbappe')) return 'Real Madrid';
        return 'Professional Sports';
    };

    const getSport = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('messi') || q.includes('ronaldo') || q.includes('mbappe') || q.includes('manchester')) return 'Football/Soccer';
        if (q.includes('chiefs') || q.includes('superbowl')) return 'American Football';
        if (q.includes('lebron') || q.includes('curry') || q.includes('caitlin') || q.includes('nba') || q.includes('wnba')) return 'Basketball';
        if (q.includes('serena') || q.includes('djokovic') || q.includes('tennis')) return 'Tennis';
        if (q.includes('verstappen') || q.includes('f1')) return 'Formula 1';
        if (q.includes('tiger') || q.includes('golf')) return 'Golf';
        if (q.includes('mcdavid') || q.includes('hockey')) return 'Ice Hockey';
        if (q.includes('ohtani') || q.includes('baseball')) return 'Baseball';
        if (q.includes('olympics')) return 'Olympics';
        return 'Sports';
    };

    const getCurrentRecord = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('chiefs')) return '14-3';
        if (q.includes('messi')) return '8 Ballon d\'Or';
        if (q.includes('ronaldo')) return '5 Ballon d\'Or';
        if (q.includes('lebron')) return '4 NBA Titles';
        if (q.includes('verstappen')) return '3x Champion';
        if (q.includes('tiger')) return '15 Majors';
        if (q.includes('curry')) return '4x Champion';
        if (q.includes('serena')) return '23 Grand Slams';
        if (q.includes('djokovic')) return '24 Grand Slams';
        if (q.includes('manchester')) return 'EPL Champions';
        if (q.includes('ohtani')) return '2x MVP';
        return 'Elite Status';
    };

    const getOdds = (question: string) => {
        const q = question.toLowerCase();
        if (q.includes('chiefs') && q.includes('superbowl')) return '+450';
        if (q.includes('messi') && q.includes('ballon')) return '+800';
        if (q.includes('verstappen') && q.includes('championship')) return '-200';
        if (q.includes('tiger') && q.includes('major')) return '+1200';
        if (q.includes('curry') && q.includes('record')) return '+300';
        if (q.includes('team usa') && q.includes('medals')) return '-150';
        if (q.includes('manchester') && q.includes('champions')) return '+600';
        if (q.includes('ohtani') && q.includes('60')) return '+2500';
        if (q.includes('caitlin') && q.includes('mvp')) return '+180';
        return 'Even';
    };

    return (
        <BaseCard market={market} style={style} className={className} isActive={isActive}>
            {/* Sports Icon */}
            <div className="flex items-center justify-center mb-6">
                <div className="text-6xl mb-2">
                    {getSportsIcon(market.question)}
                </div>
            </div>

            {/* Athlete/Team Name & Sport */}
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-white/90 mb-1">
                    {getAthleteTeamName(market.question)}
                </h3>
                <div className="text-sm text-white/60">
                    {getSport(market.question)}
                </div>
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

            {/* Current Stats */}
            <div className="bg-black rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                            <Trophy className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="text-white/60 text-xs">Current Record</span>
                        </div>
                        <div className="text-white font-semibold text-sm">
                            {getCurrentRecord(market.question)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                            <Target className="w-4 h-4 text-green-400 mr-1" />
                            <span className="text-white/60 text-xs">Vegas Odds</span>
                        </div>
                        <div className="text-white font-semibold text-sm">
                            {getOdds(market.question)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Status - Simplified */}
            <div className="bg-gradient-to-r from-red-500/30 to-blue-500/30 rounded-lg p-2 flex-shrink-0">
                <div className="text-center">
                    <div className="text-white/70 text-xs mb-1">Event</div>
                    <div className="text-white font-medium text-xs">
                        {market.question.toLowerCase().includes('superbowl') ? '🏆 Super Bowl' :
                            market.question.toLowerCase().includes('olympics') ? '🥇 Olympics' :
                                market.question.toLowerCase().includes('world cup') ? '🌍 World Cup' :
                                    market.question.toLowerCase().includes('champions league') ? '⚽ Champions' :
                                        market.question.toLowerCase().includes('championship') ? '🏆 Championship' :
                                            market.question.toLowerCase().includes('mvp') ? '👑 MVP' :
                                                market.question.toLowerCase().includes('record') ? '📊 Record' :
                                                    '🎯 Event'}
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}