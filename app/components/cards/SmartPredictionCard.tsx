"use client";

import { UnifiedMarket } from '@/lib/types';
import { CryptoCard } from './CryptoCard';
import { TechCard } from './TechCard';
import { CelebrityCard } from './CelebrityCard';
import { SportsCard } from './SportsCard';
import { PoliticsCard } from './PoliticsCard';

interface SmartPredictionCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
}

export function SmartPredictionCard({ market, style, className, isActive }: SmartPredictionCardProps) {
    // Smart card selector based on category
    const CardComponent = () => {
        switch (market.category) {
            case 'crypto':
                return (
                    <CryptoCard 
                        market={market} 
                        style={style} 
                        className={className} 
                        isActive={isActive}
                    />
                );
            case 'tech':
                return (
                    <TechCard 
                        market={market} 
                        style={style} 
                        className={className} 
 
                        isActive={isActive}
                    />
                );
            case 'celebrity':
                return (
                    <CelebrityCard 
                        market={market} 
                        style={style} 
                        className={className} 
 
                        isActive={isActive}
                    />
                );
            case 'sports':
                return (
                    <SportsCard 
                        market={market} 
                        style={style} 
                        className={className} 
 
                        isActive={isActive}
                    />
                );
            case 'politics':
                return (
                    <PoliticsCard 
                        market={market} 
                        style={style} 
                        className={className} 
 
                        isActive={isActive}
                    />
                );
            default:
                // Fallback to CryptoCard for unknown categories
                return (
                    <CryptoCard 
                        market={market} 
                        style={style} 
                        className={className} 
 
                        isActive={isActive}
                    />
                );
        }
    };

    return <CardComponent />;
}