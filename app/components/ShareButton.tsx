"use client";

import { Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { UnifiedMarket } from '@/lib/types';

interface ShareButtonProps {
    market: UnifiedMarket;
    className?: string;
}

export function ShareButton({ market, className = '' }: ShareButtonProps) {
    const { composeCast } = useComposeCast();

    const handleShare = async () => {
        try {
            // Generate shareable content with market details
            const influencerInfo = market.influencer 
                ? `${market.influencer.name} (@${market.influencer.handle})` 
                : 'A verified creator';
                
            const shareText = `🔮 ${influencerInfo} created: "${market.question}"

Win Rate: ${market.influencer?.winRate || 'N/A'}%
Total Predictions: ${market.influencer?.totalPredictions || 'N/A'}

Track their performance on Tomo 👇`;

            // Create absolute embed URL for the specific market
            const embedUrl = typeof window !== 'undefined' 
                ? `${window.location.origin}/market/${market.id}`
                : `${process.env.NEXT_PUBLIC_URL || 'https://based-rust.vercel.app'}/market/${market.id}`;

            // Use proper embeds array format for Farcaster
            await composeCast({
                text: shareText,
                embeds: [embedUrl], // This must be an array of URLs
            });

            // Show success feedback
            toast.success('Share composer opened! 🚀', {
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
            
            // Fallback: copy to clipboard
            try {
                const shareUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}/market/${market.id}`
                    : `${process.env.NEXT_PUBLIC_URL || 'https://based-rust.vercel.app'}/market/${market.id}`;
                
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Market link copied to clipboard! 📋', {
                    duration: 2000,
                    style: {
                        borderRadius: '12px',
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #22c55e',
                    },
                });
            } catch (clipboardError) {
                toast.error('Failed to share or copy link');
            }
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