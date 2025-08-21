"use client";

import { motion } from 'framer-motion';
import { getCategoryGradient } from '@/lib/prediction-markets';
import { UnifiedMarket, SchemaTransformer } from '@/lib/types';
import { Clock } from 'lucide-react';
import { memo, useRef, useEffect } from 'react';

interface BaseCardProps {
    market: UnifiedMarket;
    style?: React.CSSProperties;
    className?: string;
    isActive?: boolean;
    children: React.ReactNode;
}

function BaseCardComponent({ market, style, className = '', isActive = false, children }: BaseCardProps) {
    const baseGradientClass = getCategoryGradient(market.category);
    const timerDisplayRef = useRef<HTMLSpanElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const timerStartTime = useRef<number>(Date.now());
    const timerDuration = 60000; // 60 seconds in milliseconds
    
    // Self-contained timer that updates display and CSS progress without causing re-renders
    useEffect(() => {
        if (!isActive || !timerDisplayRef.current || !cardRef.current) return;
        
        timerStartTime.current = Date.now();
        const updateTimer = () => {
            if (!timerDisplayRef.current || !cardRef.current) return;
            
            const elapsed = Date.now() - timerStartTime.current;
            const remaining = Math.max(0, timerDuration - elapsed);
            const secondsLeft = Math.ceil(remaining / 1000);
            const progress = remaining / timerDuration;
            
            // Update timer display
            timerDisplayRef.current.textContent = `${secondsLeft}s left`;
            
            // Update CSS custom property for gradient animation
            cardRef.current.style.setProperty('--timer-progress', progress.toString());
            
            if (remaining > 0) {
                requestAnimationFrame(updateTimer);
            }
        };
        
        updateTimer();
        
        // Clean up is handled by the effect dependency
    }, [isActive, timerDuration]);

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
                    relative w-full h-[600px] rounded-3xl shadow-2xl overflow-hidden
                    ${isActive ? 'backdrop-blur-sm' : 'backdrop-blur-md'} border border-white/10
                    ${isActive ? `timer-gradient-active ${baseGradientClass}` : `bg-${baseGradientClass}`} ${className}
                `}
                style={{
                    ...style,
                    '--timer-progress': isActive ? '1' : '1',
                    opacity: isActive ? 1 : style?.opacity || 0.4
                } as React.CSSProperties}
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
                {/* Category Badge */}
                <div className="absolute top-4 left-4 z-20">
                    <div className={`
                        px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur-sm
                        ${getCategoryColor(market.category)}
                    `}>
                        {market.category.toUpperCase()}
                    </div>
                </div>

                {/* Time Badge */}
                <div className="absolute top-4 right-4 z-20">
                    <div className="bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <div className="flex items-center space-x-1 text-white text-xs">
                            <Clock className="w-3 h-3" />
                            <span ref={timerDisplayRef}>
                                {isActive ? '60s left' : getTimeRemaining()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content - Passed as children */}
                <div className="relative flex flex-col p-4 pt-16 max-h-[520px] overflow-hidden">
                    {children}
                </div>

                {/* YES/NO Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-2 text-center">
                            <div className="text-green-400 font-bold text-lg">
                                {SchemaTransformer.getYesPercentage(market)}%
                            </div>
                            <div className="text-green-300 text-sm font-medium">YES</div>
                        </div>
                        <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-2 text-center">
                            <div className="text-red-400 font-bold text-lg">
                                {SchemaTransformer.getNoPercentage(market)}%
                            </div>
                            <div className="text-red-300 text-sm font-medium">NO</div>
                        </div>
                    </div>

                    {/* Swipe Instructions */}
                    <div className="text-center">
                        <div className="text-white/80 text-xs">
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