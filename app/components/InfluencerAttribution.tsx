"use client";

import { Influencer } from '@/lib/influencers';
import { CheckCircle } from 'lucide-react';
import { BasenameAvatar, BasenameName } from './BasenameIdentity';
import { Address } from 'viem';

interface InfluencerAttributionProps {
    influencer: Influencer;
    className?: string;
}

export function InfluencerAttribution({ influencer, className = '' }: InfluencerAttributionProps) {
    return (
        <div className={`flex items-center justify-between mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 ${className}`}>
            <div className="flex items-center gap-2">
                {/* Show Basename avatar if wallet address exists, otherwise fallback to image */}
                {influencer.walletAddress ? (
                    <BasenameAvatar address={influencer.walletAddress as Address} size={32} />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold">
                        {influencer.name.charAt(0)}
                    </div>
                )}
                <div>
                    <div className="flex items-center gap-1">
                        {influencer.walletAddress ? (
                            <BasenameName
                                address={influencer.walletAddress as Address}
                                className="text-sm font-medium text-white"
                                showBadge={influencer.verifiedStatus}
                            />
                        ) : (
                            <>
                                <span className="text-sm font-medium text-white">{influencer.name}</span>
                                {influencer.verifiedStatus && <CheckCircle className="w-4 h-4 text-blue-500" />}
                            </>
                        )}
                    </div>
                    <span className="text-xs text-slate-400">{influencer.winRate}% win rate</span>
                </div>
            </div>
            <button className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/30 transition-colors">
                View Profile
            </button>
        </div>
    );
}