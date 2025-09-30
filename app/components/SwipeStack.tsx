"use client";

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { motion, useMotionValue, useTransform, PanInfo, animate } from 'framer-motion';
import { UnifiedMarket } from '@/lib/types';
import { SmartPredictionCard } from './cards/SmartPredictionCard';
import { getMarketContractAddress, getMarketsWithContracts } from '@/lib/blockchain';

interface SwipeStackProps {
    markets: UnifiedMarket[];
    onSwipe: (marketId: string, direction: 'left' | 'right' | 'up') => void;
    className?: string;
    forceMarketCard?: boolean; // New prop to force using MarketCard
    disabled?: boolean; // Prop to disable swiping
}

/**
 * Validates that a market has a valid contract address before allowing swipes
 */
function validateMarketForSwipe(market: UnifiedMarket, allMarkets: UnifiedMarket[]): boolean {
    // Check if market has contract_address field
    if (!market.contractAddress) {
        console.log(`❌ Market ${market.id} rejected: no contract address`);
        return false;
    }

    // Use the blockchain validation function to ensure contract address is valid
    const contractAddress = getMarketContractAddress(market.id, allMarkets);
    if (!contractAddress) {
        console.log(`❌ Market ${market.id} rejected: invalid contract address mapping`);
        return false;
    }

    console.log(`✅ Market ${market.id} validated for swipe -> ${contractAddress}`);
    return true;
}

const SWIPE_THRESHOLD = 100;

export function SwipeStack({ markets, onSwipe, className = '', forceMarketCard, disabled = false }: SwipeStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isTimerActive, setIsTimerActive] = useState(true);
    const [, setIsDragging] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const timeLeftRef = useRef<number>(60);

    // Filter markets to only include those with valid contract addresses - memoized to prevent infinite loops
    const validMarkets = React.useMemo(() => {
        console.log(`📊 Filtering ${markets.length} markets for valid contracts...`);
        const filtered = getMarketsWithContracts(markets as any);
        console.log(`✅ Found ${filtered.length} markets with valid contracts`);
        return filtered;
    }, [markets]);

    // Log the filtering result for debugging
    React.useEffect(() => {
        if (validMarkets.length === 0 && markets.length > 0) {
            console.warn('⚠️ No markets with valid contracts available for swiping');
        }
    }, [markets.length, validMarkets.length]);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-400, 400], [-15, 15]);

    // Timer effect - uses ref to avoid re-renders
    useEffect(() => {
        if (isTimerActive && !isAnimating && currentIndex < validMarkets.length) {
            timeLeftRef.current = 60; // Reset timer for new card
            timerRef.current = setInterval(() => {
                timeLeftRef.current -= 1;
                if (timeLeftRef.current <= 0) {
                    // Time's up - auto skip
                    const currentMarket = validMarkets[currentIndex];
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
    }, [currentIndex, isTimerActive, isAnimating, validMarkets, onSwipe]);

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

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (isAnimating) return;

        const { offset, velocity } = info;
        const swipeThreshold = SWIPE_THRESHOLD;
        const swipeVelocityThreshold = 500;

        const currentMarket = validMarkets[currentIndex];
        if (!currentMarket) return;

        // Double-check market validation before allowing swipe
        if (!validateMarketForSwipe(currentMarket as UnifiedMarket, markets)) {
            console.error(`❌ Swipe blocked: Market ${currentMarket.id} failed validation`);
            toast.error('This market is not available for betting');
            return;
        }

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
            console.log(`⬆️ Skip swipe on validated market ${currentMarket.id}`);
            onSwipe(currentMarket.id, 'up');
            didSwipe = true;
        } else if (isHorizontalSwipe && (offset.x > swipeThreshold || velocity.x > swipeVelocityThreshold)) {
            // Swipe right - YES with tilt and smooth exit
            animXTarget = 1200;
            animYTarget = offset.y * 0.2; // Slight vertical drift
            console.log(`➡️ YES swipe on validated market ${currentMarket.id}`);
            onSwipe(currentMarket.id, 'right');
            didSwipe = true;
        } else if (isHorizontalSwipe && (offset.x < -swipeThreshold || velocity.x < -swipeVelocityThreshold)) {
            // Swipe left - NO with tilt and smooth exit
            animXTarget = -1200;
            animYTarget = offset.y * 0.2; // Slight vertical drift
            console.log(`⬅️ NO swipe on validated market ${currentMarket.id}`);
            onSwipe(currentMarket.id, 'left');
            didSwipe = true;
        } else {
            // Snap back to center with spring animation
            const backX = animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
            const backY = animate(y, 0, { type: 'spring', stiffness: 500, damping: 40 });
            Promise.all([backX.finished, backY.finished]).then(() => {
                setIsAnimating(false);
                setIsDragging(false);
            });
            return;
        }

        if (didSwipe && animXTarget !== null && animYTarget !== null) {
            const controlsX = animate(x, animXTarget, { type: 'spring', stiffness: 350, damping: 35 });
            const controlsY = animate(y, animYTarget, { type: 'spring', stiffness: 350, damping: 35 });

            Promise.all([controlsX.finished, controlsY.finished]).then(() => {
                // Small delay to ensure smooth transition
                setTimeout(() => {
                    // Reset values for the next card before updating index
                    x.set(0);
                    y.set(0);
                    setIsDragging(false);
                    setIsAnimating(false);
                    setCurrentIndex(prev => prev + 1);
                }, 50);
            });
        }
    };



    // Show message when no more markets
    if (currentIndex >= validMarkets.length) {
        return (
            <div className={`flex items-center justify-center h-[500px] sm:h-[600px] ${className}`}>
                <div className="text-center">
                    <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                    <h3 className="mobile-text-2xl font-bold text-white mb-2">All done!</h3>
                    <p className="text-slate-400 mobile-text-sm">
                        {validMarkets.length === 0
                            ? "No markets with deployed contracts are available right now."
                            : "You've swiped through all available markets."
                        }
                    </p>
                </div>
            </div>
        );
    }

    // Show message if no valid markets are available
    if (validMarkets.length === 0) {
        return (
            <div className={`flex items-center justify-center h-[500px] sm:h-[600px] ${className}`}>
                <div className="text-center">
                    <div className="text-5xl sm:text-6xl mb-4">📊</div>
                    <h3 className="mobile-text-2xl font-bold text-white mb-2">No Markets Available</h3>
                    <p className="text-slate-400 mobile-text-sm max-w-md">
                        There are currently no prediction markets with deployed smart contracts.
                        Markets need to be deployed to the blockchain before they can accept bets.
                    </p>
                </div>
            </div>
        );
    }

    const visibleMarkets = validMarkets.slice(currentIndex, currentIndex + 3);

    return (
        <div className={`relative w-full h-[520px] sm:h-[600px] ${className}`}>


            {/* Card Stack */}
            <div className="relative w-full h-full">
                {visibleMarkets.map((market, index) => {
                    const isTopCard = index === 0;
                    const zIndex = visibleMarkets.length - index;
                    const scale = 1 - (index * 0.08);
                    const yOffset = index * 20;

                    if (isTopCard) {
                        return (
                            <motion.div
                                key={market.id}
                                className="absolute inset-0"
                                style={{
                                    x,
                                    y,
                                    rotate,
                                    zIndex,
                                }}
                                drag
                                dragElastic={0.2}
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
                                whileDrag={{ scale: 1.02 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                            >
                                <SmartPredictionCard market={market as UnifiedMarket} isActive={true} forceMarketCard={forceMarketCard} suppressEntranceAnimation={true} />
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
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        >
                            <div className="opacity-20 blur-[1px]">
                                <SmartPredictionCard market={market as UnifiedMarket} isActive={false} forceMarketCard={forceMarketCard} suppressEntranceAnimation={true} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>



            {/* Progress Indicator removed as per request */}
        </div>
    );
}
