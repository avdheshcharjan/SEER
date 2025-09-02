"use client";

import { Influencer } from '@/lib/influencers';
import { CheckCircle } from 'lucide-react';
import Image from 'next/image';

interface InfluencerAttributionProps {
    influencer: Influencer;
    className?: string;
}

export function InfluencerAttribution({ influencer, className = '' }: InfluencerAttributionProps) {
    return (
        <div className={`flex items-center justify-between mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 ${className}`}>
            <div className="flex items-center gap-2">
                <Image 
                    src={influencer.avatar} 
                    alt={influencer.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-white">{influencer.name}</span>
                        {influencer.verifiedStatus && <CheckCircle className="w-4 h-4 text-blue-500" />}
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