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
    const progressBarRef = useRef<HTMLDivElement>(null);
    const timerStartTime = useRef<number>(Date.now());
    // removed unused timerDuration (60s) constant

    // Self-contained timer that updates the display with time until market end
    useEffect(() => {
        if (!timerDisplayRef.current || !cardRef.current) return;

        const formatRemaining = () => {
            if (!market.endTime) return 'No end date';
            const now = new Date().getTime();
            const end = new Date(market.endTime).getTime();
            const diffMs = Math.max(0, end - now);
            const minutes = Math.floor(diffMs / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (diffMs <= 0) return 'Ended';
            if (days >= 1) return `${days}d ${hours % 24}h left`;
            if (hours >= 1) return `${hours}h ${minutes % 60}m left`;
            if (minutes > 0) return `${minutes}m left`;
            return 'Ending soon';
        };

        // Initial paint
        timerDisplayRef.current.textContent = formatRemaining();
        // Keep CSS timer-progress static at 1 for now (no 60s animation)
        cardRef.current.style.setProperty('--timer-progress', '1');

        if (!isActive) return; // only live-refresh on active card

        const interval = setInterval(() => {
            if (!timerDisplayRef.current) return;
            timerDisplayRef.current.textContent = formatRemaining();
        }, 60000); // update each minute

        return () => clearInterval(interval);
    }, [isActive, market.endTime]);

    // 60s diminishing progress bar on top; hides after 60s
    useEffect(() => {
        if (!isActive || !progressBarRef.current) {
            // hide when not active
            if (progressBarRef.current) progressBarRef.current.style.width = '0%';
            return;
        }

        timerStartTime.current = Date.now();
        let rafId: number;

        const tick = () => {
            if (!progressBarRef.current) return;
            const elapsed = Date.now() - timerStartTime.current;
            const ratio = Math.max(0, Math.min(1, 1 - elapsed / 60000)); // 1 -> 0 over 60s
            progressBarRef.current.style.width = `${ratio * 100}%`;
            progressBarRef.current.style.opacity = ratio <= 0.02 ? '0' : '1';
            if (elapsed < 60000) {
                rafId = requestAnimationFrame(tick);
            }
        };

        // start full then shrink
        progressBarRef.current.style.width = '100%';
        progressBarRef.current.style.opacity = '1';
        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isActive]);

    const getTimeRemaining = () => {
        if (!market.endTime) return 'No end date';
        const now = new Date().getTime();
        const end = new Date(market.endTime).getTime();
        const diffMs = Math.max(0, end - now);
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (diffMs <= 0) return 'Ended';
        if (days >= 1) return `${days}d ${hours % 24}h left`;
        if (hours >= 1) return `${hours}h ${minutes % 60}m left`;
        if (minutes > 0) return `${minutes}m left`;
        return 'Ending soon';
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            crypto: 'bg-prediction-crypto',
            tech: 'bg-prediction-tech',
            celebrity: 'bg-prediction-celebrity',
            sports: 'bg-prediction-sports',
            politics: 'bg-prediction-politics'
        };
        return colors[category] || 'bg-slate-500';
    };

    // Safely get percentages with fallbacks
    const yesPercentage = SchemaTransformer.getYesPercentage(market);
    const noPercentage = SchemaTransformer.getNoPercentage(market);

    return (
        <div className="relative">
            <motion.div
                ref={cardRef}
                className={`
                    relative w-full h-[600px] rounded-3xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] overflow-hidden
                    ${isActive ? 'backdrop-blur-sm' : 'backdrop-blur-md'} border border-white/10 bg-slate-900/80
                    ${baseGradientClass} ${className}
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
                {/* Top diminishing progress bar (shrinks to zero by 60s) */}
                <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 transition-[width,opacity] duration-200" ref={progressBarRef} />
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
                            <span ref={timerDisplayRef}>{getTimeRemaining()}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content - Passed as children */}
                <div className="relative flex flex-col p-4 pt-16 max-h-[520px] overflow-hidden">
                    {children}
                </div>

                {/* YES/NO Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-green-500/15 backdrop-blur-sm border border-green-500/30 rounded-2xl p-3 text-center shadow-inner">
                            <div className="text-green-400 font-bold text-xl">
                                {yesPercentage}%
                            </div>
                            <div className="text-green-300 text-sm font-semibold tracking-wide">YES</div>
                        </div>
                        <div className="bg-red-500/15 backdrop-blur-sm border border-red-500/30 rounded-2xl p-3 text-center shadow-inner">
                            <div className="text-red-400 font-bold text-xl">
                                {noPercentage}%
                            </div>
                            <div className="text-red-300 text-sm font-semibold tracking-wide">NO</div>
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