"use client";

import { UnifiedMarket } from '@/lib/types';
import { CryptoCard } from './CryptoCard';
import { TechCard } from './TechCard';
import { CelebrityCard } from './CelebrityCard';
import { SportsCard } from './SportsCard';
import { PoliticsCard } from './PoliticsCard';
import { MarketCard } from './MarketCard';

interface SmartPredictionCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
    forceMarketCard?: boolean; // New prop to force using MarketCard
    suppressEntranceAnimation?: boolean;
}

export function SmartPredictionCard({ market, style, className, isActive, forceMarketCard = false, suppressEntranceAnimation = false }: SmartPredictionCardProps) {
    // If forceMarketCard is true, always use MarketCard
    if (forceMarketCard) {
        return (
            <MarketCard
                market={market}
                style={style}
                className={className}
                isActive={isActive}
                suppressEntranceAnimation={suppressEntranceAnimation}
            />
        );
    }

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
                        suppressEntranceAnimation={suppressEntranceAnimation}
                    />
                );
            case 'tech':
                return (
                    <TechCard
                        market={market}
                        style={style}
                        className={className}
                        isActive={isActive}
                        suppressEntranceAnimation={suppressEntranceAnimation}
                    />
                );
            case 'celebrity':
                return (
                    <CelebrityCard
                        market={market}
                        style={style}
                        className={className}
                        isActive={isActive}
                        suppressEntranceAnimation={suppressEntranceAnimation}
                    />
                );
            case 'sports':
                return (
                    <SportsCard
                        market={market}
                        style={style}
                        className={className}
                        isActive={isActive}
                        suppressEntranceAnimation={suppressEntranceAnimation}
                    />
                );
            case 'politics':
                return (
                    <PoliticsCard
                        market={market}
                        style={style}
                        className={className}
                        isActive={isActive}
                        suppressEntranceAnimation={suppressEntranceAnimation}
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
                        suppressEntranceAnimation={suppressEntranceAnimation}
                    />
                );
        }
    };

    return <CardComponent />;
}