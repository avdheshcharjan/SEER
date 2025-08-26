"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, animate } from 'framer-motion';
import { UnifiedMarket } from '@/lib/types';
import { SmartPredictionCard } from './cards/SmartPredictionCard';

interface SwipeStackProps {
    markets: UnifiedMarket[];
    onSwipe: (marketId: string, direction: 'left' | 'right' | 'up') => void;
    className?: string;
    forceMarketCard?: boolean; // New prop to force using MarketCard
}

const SWIPE_THRESHOLD = 100;

export function SwipeStack({ markets, onSwipe, className = '', forceMarketCard }: SwipeStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isTimerActive, setIsTimerActive] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const timeLeftRef = useRef<number>(60);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-400, 400], [-15, 15]);
    const opacity = useTransform(
        [x, y],
        (latest: number[]) => {
            const [xVal, yVal] = latest;
            const distance = Math.sqrt(xVal * xVal + yVal * yVal);
            return distance > 200 ? Math.max(0, 1 - (distance - 200) / 300) : 1;
        }
    );

    // Timer effect - uses ref to avoid re-renders
    useEffect(() => {
        if (isTimerActive && !isAnimating && currentIndex < markets.length) {
            timeLeftRef.current = 60; // Reset timer for new card
            timerRef.current = setInterval(() => {
                timeLeftRef.current -= 1;
                if (timeLeftRef.current <= 0) {
                    // Time's up - auto skip
                    const currentMarket = markets[currentIndex];
                    if (currentMarket) {
                        onSwipe(currentMarket.id, 'up');
                        setCurrentIndex(prevIndex => prevIndex + 1);
                    }
                }
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [currentIndex, isTimerActive, isAnimating, markets, onSwipe]);

    // Reset timer active state when card changes
    useEffect(() => {
        setIsTimerActive(true);
        timeLeftRef.current = 60;
    }, [currentIndex]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (isAnimating) return;

        const { offset, velocity } = info;
        const swipeThreshold = SWIPE_THRESHOLD;
        const swipeVelocityThreshold = 500;

        const currentMarket = markets[currentIndex];
        if (!currentMarket) return;

        setIsAnimating(true);
        setIsTimerActive(false); // Pause timer during animation

        // Determine swipe direction with improved logic
        const isVerticalSwipe = Math.abs(offset.y) > Math.abs(offset.x);
        const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y);

        let animXTarget: number | null = null;
        let animYTarget: number | null = null;
        let didSwipe = false;

        if (isVerticalSwipe && offset.y < -swipeThreshold) {
            // Swipe up - SKIP with smooth upward motion and slight scale
            animYTarget = -1200;
            animXTarget = offset.x * 0.3; // Slight horizontal drift based on drag
            onSwipe(currentMarket.id, 'up');
            didSwipe = true;
        } else if (isHorizontalSwipe && (offset.x > swipeThreshold || velocity.x > swipeVelocityThreshold)) {
            // Swipe right - YES with tilt and smooth exit
            animXTarget = 1200;
            animYTarget = offset.y * 0.2; // Slight vertical drift
            onSwipe(currentMarket.id, 'right');
            didSwipe = true;
        } else if (isHorizontalSwipe && (offset.x < -swipeThreshold || velocity.x < -swipeVelocityThreshold)) {
            // Swipe left - NO with tilt and smooth exit
            animXTarget = -1200;
            animYTarget = offset.y * 0.2; // Slight vertical drift
            onSwipe(currentMarket.id, 'left');
            didSwipe = true;
        } else {
            // Snap back to center with spring animation
            const backX = animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
            const backY = animate(y, 0, { type: 'spring', stiffness: 400, damping: 35 });
            Promise.all([backX.finished, backY.finished]).then(() => setIsAnimating(false));
            return;
        }

        if (didSwipe && animXTarget !== null && animYTarget !== null) {
            const controlsX = animate(x, animXTarget, { type: 'spring', stiffness: 280, damping: 30 });
            const controlsY = animate(y, animYTarget, { type: 'spring', stiffness: 280, damping: 30 });

            Promise.all([controlsX.finished, controlsY.finished]).then(() => {
                setCurrentIndex(prev => prev + 1);
                // Reset values for the next card before it mounts as top
                x.set(0);
                y.set(0);
                setIsDragging(false);
                setIsAnimating(false);
            });
        }
    };



    // Show message when no more markets
    if (currentIndex >= markets.length) {
        return (
            <div className={`flex items-center justify-center h-[500px] sm:h-[600px] ${className}`}>
                <div className="text-center">
                    <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                    <h3 className="mobile-text-2xl font-bold text-white mb-2">All done!</h3>
                    <p className="text-slate-400 mobile-text-sm">You&apos;ve swiped through all available markets.</p>
                </div>
            </div>
        );
    }

    const visibleMarkets = markets.slice(currentIndex, currentIndex + 3);

    return (
        <div className={`relative w-full h-[520px] sm:h-[600px] ${className}`}>


            {/* Card Stack */}
            <div className="relative w-full h-full">
                {visibleMarkets.map((market, index) => {
                    const isTopCard = index === 0;
                    const zIndex = visibleMarkets.length - index;
                    const scale = 1 - (index * 0.05);
                    const yOffset = index * 10;

                    if (isTopCard) {
                        return (
                            <motion.div
                                key={market.id}
                                className="absolute inset-0"
                                style={{
                                    x,
                                    y,
                                    rotate,
                                    opacity: isDragging ? 1 : (opacity as unknown as number),
                                    zIndex,
                                }}
                                drag
                                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                dragElastic={0.15}
                                dragMomentum={false}
                                onDragStart={() => {
                                    setIsDragging(true);
                                    setIsTimerActive(false);
                                    if (timerRef.current) {
                                        clearInterval(timerRef.current);
                                        timerRef.current = null;
                                    }
                                }}
                                onDragEnd={handleDragEnd}
                                whileDrag={{ scale: 1.05 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            >
                                <SmartPredictionCard market={market} isActive={true} forceMarketCard={forceMarketCard} />
                            </motion.div>
                        );
                    }

                    return (
                        <motion.div
                            key={market.id}
                            className="absolute inset-0"
                            style={{
                                zIndex,
                                scale,
                                y: yOffset,
                            }}
                            initial={{ scale, y: yOffset }}
                            animate={{ scale, y: yOffset }}
                            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                        >
                            <SmartPredictionCard market={market} className="opacity-60" isActive={false} forceMarketCard={forceMarketCard} />
                        </motion.div>
                    );
                })}
            </div>



            {/* Progress Indicator removed as per request */}
        </div>
    );
}
