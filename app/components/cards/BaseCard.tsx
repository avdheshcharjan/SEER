"use client";

import { motion } from 'framer-motion';
import { getCategoryGradient } from '@/lib/prediction-markets';
import { UnifiedMarket, SchemaTransformer } from '@/lib/types';
import { Clock } from 'lucide-react';
import { memo, useRef, useEffect, useState } from 'react';

interface BaseCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
    children: React.ReactNode;
}

function BaseCardComponent({ market, style, className = '', isActive = false, children }: BaseCardProps) {
    const baseGradientClass = getCategoryGradient(market.category);

    const cardRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const [progressBarWidth, setProgressBarWidth] = useState(100); // Progress bar width percentage
    const [timeLeft, setTimeLeft] = useState(60); // Time left in seconds

    // Timer that updates every 100ms for smooth progressive decline
    useEffect(() => {
        if (!isActive) {
            setProgressBarWidth(100);
            setTimeLeft(60);
            return;
        }

        // Reset timer when card becomes active
        setProgressBarWidth(100);
        setTimeLeft(60);

        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                const newTime = prevTime - 0.1; // Decrease by 0.1 seconds every 100ms
                if (newTime <= 0) {
                    setProgressBarWidth(0);
                    return 0;
                }

                // Calculate progress bar width (100% to 0%)
                const progressPercentage = (newTime / 60) * 100;
                setProgressBarWidth(progressPercentage);

                return newTime;
            });
        }, 100); // Update every 100ms instead of 1000ms

        return () => clearInterval(timer);
    }, [isActive]);

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
        return colors[category as keyof typeof colors] || 'bg-slate-500';
    };

    return (
        <div className="relative">
            <motion.div
                ref={cardRef}
                className={`
                    relative w-full h-[500px] sm:h-[600px] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden
                    border border-white/10
                    ${isActive ? `timer-gradient-active ${baseGradientClass}` : `bg-${baseGradientClass}`} ${className}
                `}
                style={style}
                initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotateY: 15 }}
                transition={{
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{
                    scale: 1.02,
                    rotateY: 5,
                    transition: { duration: 0.2 }
                }}
            >
                {/* 60-Second Progress Bar Timer */}
                {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-2 bg-black z-30">
                        <motion.div
                            ref={progressBarRef}
                            className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-r-full transition-all duration-1000 ease-linear"
                            style={{ width: `${progressBarWidth}%` }}
                        />
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-4 sm:top-5 left-3 sm:left-4 z-20">
                    <div className={`
                        px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold text-white
                        ${getCategoryColor(market.category)}
                    `}>
                        {market.category.toUpperCase()}
                    </div>
                </div>

                {/* Time Badge - Market Expiration Time */}
                <div className="absolute top-4 sm:top-5 right-3 sm:right-4 z-20">
                    <div className="bg-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                        <div className="flex items-center space-x-1 text-white text-xs">
                            <Clock className="w-3 h-3" />
                            <span className="mobile-text-xs">
                                {getTimeRemaining()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content - Passed as children */}
                <div className="relative flex flex-col p-3 sm:p-4 pt-16 sm:pt-20 max-h-[420px] sm:max-h-[520px] overflow-hidden">
                    {children}
                </div>

                {/* NO/YES Progress Bar - Swapped positions */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-red-500 border border-red-600 rounded-xl p-3 text-center shadow-lg">
                            <div className="text-white font-bold text-2xl mb-1">
                                {SchemaTransformer.getNoPercentage(market)}%
                            </div>
                            <div className="text-white font-bold text-lg">NO</div>
                        </div>
                        <div className="bg-green-500 border border-green-600 rounded-xl p-3 text-center shadow-lg">
                            <div className="text-white font-bold text-2xl mb-1">
                                {SchemaTransformer.getYesPercentage(market)}%
                            </div>
                            <div className="text-white font-bold text-lg">YES</div>
                        </div>
                    </div>

                    {/* Swipe Instructions - Hidden on mobile since we show them in SwipeStack */}
                    <div className="text-center hidden sm:block">
                        <div className="text-white/80 mobile-text-xs">
                            Swipe <span className="text-green-400 font-semibold">→</span> for YES •
                            <span className="text-red-400 font-semibold"> ←</span> for NO •
                            <span className="text-blue-400 font-semibold"> ↑</span> to skip
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export const BaseCard = memo(BaseCardComponent, (prevProps, nextProps) => {
    // Only re-render if meaningful props change (excluding timeLeft completely)
    return (
        prevProps.market === nextProps.market &&
        prevProps.style === nextProps.style &&
        prevProps.className === nextProps.className &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.children === nextProps.children
    );
});