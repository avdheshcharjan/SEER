"use client";

import { Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { UnifiedMarket } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import SupabaseService from '@/lib/supabase';

interface ShareButtonProps {
    market: UnifiedMarket;
    className?: string;
    includeUserStats?: boolean;
    shareType?: 'market' | 'streak' | 'prediction' | 'leaderboard';
    customText?: string;
}

export function ShareButton({
    market,
    className = '',
    includeUserStats = false,
    shareType = 'market',
    customText
}: ShareButtonProps) {
    const { composeCast } = useComposeCast();
    const { user } = useAppStore();

    const handleShare = async () => {
        try {
            let shareText = '';
            let embedUrl = `${window.location.origin}/market/${market.id}`;

            // Increment share count in database
            try {
                await SupabaseService.incrementShareCount(market.id);
            } catch (error) {
                console.warn('Failed to increment share count:', error);
            }

            // Generate different share content based on type
            switch (shareType) {
                case 'streak':
                    if (user) {
                        shareText = `🔥 ON FIRE! I'm on a ${user.currentStreak}-prediction winning streak on @tomo_base!

📊 My stats:
• Win Rate: ${user.totalPredictions > 0 ? ((user.correctPredictions / user.totalPredictions) * 100).toFixed(1) : 0}%
• Best Streak: ${user.bestStreak || 0}
• Total Predictions: ${user.totalPredictions}

Can you beat my streak? 👇`;
                        embedUrl = `${window.location.origin}`;
                    }
                    break;

                case 'prediction':
                    const userPrediction = customText || 'YES'; // This would come from the actual prediction
                    shareText = `🎯 I just predicted "${userPrediction}" on:

"${market.question}"

${includeUserStats && user ? `My current streak: ${user.currentStreak} 🔥\n` : ''}Join me on @tomo_base and make your prediction! 👇`;
                    break;

                case 'leaderboard':
                    shareText = `🏆 Check out the top predictors on @tomo_base!

🥇 Leading with ${user && user.totalPredictions && user.totalPredictions > 0 ? ((user.correctPredictions / user.totalPredictions) * 100).toFixed(1) : 'high'}% accuracy
🔥 Best streak: ${user?.bestStreak || 'impressive'}
💰 Community volume: $15k+

Think you can make the leaderboard? 👇`;
                    embedUrl = `${window.location.origin}`;
                    break;

                case 'market':
                default:
                    const influencerInfo = market.influencer
                        ? `${market.influencer.name} (@${market.influencer.handle})`
                        : 'The community';

                    shareText = customText || `🔮 ${influencerInfo} created: "${market.question}"

📊 Market Stats:
${market.influencer?.winRate ? `• Creator Win Rate: ${market.influencer.winRate}%\n` : ''}• Total Volume: ${market.totalVolume || 'Growing'}

${includeUserStats && user ? `My prediction power: ${user.currentStreak} streak 🔥\n` : ''}Make your prediction on @tomo_base 👇`;
            }

            composeCast({
                text: shareText,
                url: embedUrl
            });

            // Show success feedback with context
            const messages = {
                market: 'Market shared! 🚀',
                streak: 'Streak shared! 🔥',
                prediction: 'Prediction shared! 🎯',
                leaderboard: 'Leaderboard shared! 🏆'
            };

            toast.success(messages[shareType] || 'Shared successfully! 🚀', {
                duration: 2000,
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #0ea5e9',
                },
            });

        } catch (error) {
            console.error('Share error:', error);
            toast.error('Failed to share. Try again!');
        }
    };

    return (
        <motion.button
            onClick={handleShare}
            className={`
                p-2 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm 
                border border-slate-600/50 hover:border-slate-500/70
                rounded-full transition-all duration-200 group
                ${className}
            `}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Share this prediction"
        >
            <Share2 className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
        </motion.button>
    );
}