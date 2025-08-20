"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { PredictionMarket } from '@/lib/prediction-markets';
import { PredictionCard } from './PredictionCard';

interface SwipeStackProps {
    markets: PredictionMarket[];
    onSwipe: (marketId: string, direction: 'left' | 'right' | 'up') => void;
    className?: string;
}

const SWIPE_THRESHOLD = 100;

export function SwipeStack({ markets, onSwipe, className = '' }: SwipeStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isTimerActive, setIsTimerActive] = useState(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-400, 400], [-25, 25]);
    const scale = useTransform(y, [0, -200], [1, 0.9]);
    const opacity = useTransform(
        [x, y],
        ([xVal, yVal]) => {
            const distance = Math.sqrt(xVal * xVal + yVal * yVal);
            return distance > 200 ? Math.max(0, 1 - (distance - 200) / 300) : 1;
        }
    );

    // Timer effect
    useEffect(() => {
        if (isTimerActive && !isAnimating && currentIndex < markets.length) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        // Time's up - auto skip
                        const currentMarket = markets[currentIndex];
                        if (currentMarket) {
                            onSwipe(currentMarket.id, 'up');
                            setCurrentIndex(prevIndex => prevIndex + 1);
                        }
                        return 60; // Reset for next card
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [currentIndex, isTimerActive, isAnimating, markets, onSwipe]);

    // Reset timer when card changes
    useEffect(() => {
        setTimeLeft(60);
        setIsTimerActive(true);
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

        if (isVerticalSwipe && offset.y < -swipeThreshold) {
            // Swipe up - SKIP with smooth upward motion and slight scale
            y.set(-1200);
            x.set(offset.x * 0.3); // Slight horizontal drift based on drag
            onSwipe(currentMarket.id, 'up');
        } else if (isHorizontalSwipe && (offset.x > swipeThreshold || velocity.x > swipeVelocityThreshold)) {
            // Swipe right - YES with tilt and smooth exit
            x.set(1200);
            y.set(offset.y * 0.2); // Slight vertical drift
            onSwipe(currentMarket.id, 'right');
        } else if (isHorizontalSwipe && (offset.x < -swipeThreshold || velocity.x < -swipeVelocityThreshold)) {
            // Swipe left - NO with tilt and smooth exit
            x.set(-1200);
            y.set(offset.y * 0.2); // Slight vertical drift
            onSwipe(currentMarket.id, 'left');
        } else {
            // Snap back to center with spring animation
            x.set(0);
            y.set(0);
            setIsAnimating(false);
            return;
        }

        // Move to next card after animation with longer delay for smoother transition
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            x.set(0);
            y.set(0);
            setIsAnimating(false);
        }, 400);
    };

    const programmaticSwipe = (direction: 'left' | 'right' | 'up') => {
        if (isAnimating) return;

        const currentMarket = markets[currentIndex];
        if (!currentMarket) return;

        setIsAnimating(true);
        setIsTimerActive(false); // Pause timer during animation

        switch (direction) {
            case 'left':
                x.set(-1200);
                y.set(-50); // Slight upward drift for natural feel
                break;
            case 'right':
                x.set(1200);
                y.set(-50); // Slight upward drift for natural feel
                break;
            case 'up':
                y.set(-1200);
                x.set(0); // Keep centered for up swipe
                break;
        }

        onSwipe(currentMarket.id, direction);

        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            x.set(0);
            y.set(0);
            setIsAnimating(false);
        }, 400);
    };

    // Show message when no more markets
    if (currentIndex >= markets.length) {
        return (
            <div className={`flex items-center justify-center h-[600px] ${className}`}>
                <div className="text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold text-white mb-2">All done!</h3>
                    <p className="text-slate-400">You&apos;ve swiped through all available markets.</p>
                </div>
            </div>
        );
    }

    const visibleMarkets = markets.slice(currentIndex, currentIndex + 3);

    return (
        <div className={`relative w-full h-[600px] ${className}`}>


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
                                    opacity,
                                    zIndex,
                                }}
                                drag
                                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                dragElastic={0.2}
                                onDragEnd={handleDragEnd}
                                whileDrag={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            >
                                <PredictionCard market={market} timeLeft={timeLeft} />
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
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <PredictionCard market={market} className="opacity-60" timeLeft={60} />
                        </motion.div>
                    );
                })}
            </div>



            {/* Progress Indicator */}
            <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-slate-300">
                {currentIndex + 1} / {markets.length}
            </div>
        </div>
    );
}
