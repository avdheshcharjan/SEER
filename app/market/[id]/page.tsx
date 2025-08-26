"use client";


import { SupabaseService } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SwipeStack } from '@/app/components/SwipeStack';
import { SmartPredictionCard } from '@/app/components/cards/SmartPredictionCard';
import { UnifiedMarket } from '@/lib/types';
import { ArrowLeft, Share } from 'lucide-react';
import Link from 'next/link';

interface MarketPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Fetch real market data from database
const getMarket = async (id: string): Promise<UnifiedMarket | null> => {
  try {
    const market = await SupabaseService.getMarket(id);
    if (!market) return null;

    // Convert Supabase market to UnifiedMarket format
    const totalPool = market.yes_pool + market.no_pool;
    const yesPrice = totalPool > 0 ? market.yes_pool / totalPool : 0.5;
    const noPrice = totalPool > 0 ? market.no_pool / totalPool : 0.5;

    return {
      id: market.id,
      question: market.question,
      description: `A prediction market for ${market.category}`,
      category: market.category as UnifiedMarket['category'],
      endTime: market.end_time,
      createdAt: market.created_at,
      resolved: market.resolved,
      outcome: market.outcome,
      creatorAddress: market.creator_address,
      contractAddress: market.contract_address,
      yesPool: market.yes_pool,
      noPool: market.no_pool,
      totalYesShares: market.total_yes_shares,
      totalNoShares: market.total_no_shares,
      yesPrice,
      noPrice,
      yesOdds: Math.round(yesPrice * 100),
      noOdds: Math.round(noPrice * 100),
      totalVolume: market.yes_pool + market.no_pool,
      // Add any additional fields that might be needed
      ticker: market.category === 'crypto' ? 'ETH' : undefined,
      targetPrice: undefined,
      direction: undefined,
      transactionHash: market.transaction_hash,
    };
  } catch (error) {
    console.error('Error fetching market:', error);
    return null;
  }
};

export default function MarketPage({ params, searchParams }: MarketPageProps) {
  const [market, setMarket] = useState<UnifiedMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    const loadMarket = async () => {
      try {
        setLoading(true);
        const resolvedParams = await params;
        const resolvedSearchParams = await searchParams;

        const marketData = await getMarket(resolvedParams.id);
        setIsEmbedded(resolvedSearchParams.embedded === 'true');

        if (!marketData) {
          setError('Market not found');
          return;
        }

        setMarket(marketData);
      } catch (err) {
        console.error('Error loading market:', err);
        setError('Failed to load market');
      } finally {
        setLoading(false);
      }
    };

    loadMarket();
  }, [params, searchParams]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-slate-700/50">
            <div className="animate-pulse">
              <div className="mb-6">
                <div className="h-8 bg-slate-700/50 rounded-lg mb-4 w-3/4"></div>
                <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <div className="h-12 bg-slate-700/50 rounded mb-2"></div>
                  <div className="h-4 bg-slate-700/50 rounded w-1/2 mx-auto"></div>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <div className="h-12 bg-slate-700/50 rounded mb-2"></div>
                  <div className="h-4 bg-slate-700/50 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-slate-700/30 rounded-lg"></div>
                  <div className="h-16 bg-slate-700/30 rounded-lg"></div>
                </div>
                <div className="h-16 bg-slate-700/30 rounded-lg"></div>
              </div>
              <div className="h-12 bg-slate-700/50 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !market) {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            className="bg-slate-800/30 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-slate-700/50 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong!</h1>
            <p className="text-slate-400 mb-6">
              {error || 'We encountered an error while loading this prediction market.'}
            </p>
            <Link
              href="/"
              className="block w-full bg-base-500 hover:bg-base-600 text-white py-3 rounded-xl font-semibold transition-colors mb-3"
            >
              Go to Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-slate-700/50 hover:bg-slate-600/50 text-white py-3 rounded-xl font-semibold transition-colors border border-slate-600/50"
            >
              Go back
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isEmbedded) {
    // Embedded view now reuses the same SmartPredictionCard UI for consistency
    // Mobile/iOS friendly: safe-area padding and rounded container
    return (
      <div className="bg-slate-900 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="w-full max-w-md mx-auto px-2">
          <div className="rounded-3xl overflow-hidden border border-slate-700/50 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)]">
            <SmartPredictionCard market={market} isActive={false} forceMarketCard={true} />
          </div>
        </div>
      </div>
    );
  }

  // Full market view with SwipeStack
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Market Details</h1>
          <div className="w-20" />
        </div>

        {/* Market Card Display */}
        <div className="max-w-md mx-auto">
          <SwipeStack
            markets={[market]}
            onSwipe={(marketId, direction) => {
              // Handle swipe actions
              console.log(`Swiped ${direction} on market ${marketId}`);

              // You can implement different actions based on swipe direction
              switch (direction) {
                case 'right': // YES
                  console.log('User voted YES');
                  break;
                case 'left': // NO
                  console.log('User voted NO');
                  break;
                case 'up': // SKIP
                  console.log('User skipped');
                  break;
              }
            }}
            className="mx-auto"
            forceMarketCard={true}
          />
        </div>

        {/* Market Information */}
        <div className="max-w-2xl mx-auto mt-8">
          <motion.div
            className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-white mb-4">Market Information</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                  <span className="text-slate-400">Total Volume:</span>
                  <div className="text-white font-semibold">${market.totalVolume?.toLocaleString()} USDC</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                  <span className="text-slate-400">Ends:</span>
                  <div className="text-white font-semibold">
                    {new Date(market.endTime).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                <span className="text-slate-400">Created:</span>
                <div className="text-white font-semibold">
                  {new Date(market.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {market.creatorAddress && (
                <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                  <span className="text-slate-400">Creator:</span>
                  <div className="text-white font-mono text-sm">
                    {market.creatorAddress.slice(0, 6)}...{market.creatorAddress.slice(-4)}
                  </div>
                </div>
              )}

              <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                <span className="text-slate-400">Market ID:</span>
                <div className="text-white font-mono text-sm">
                  {market.id}
                </div>
              </div>
            </div>

            {/* Share Button */}
            <button
              onClick={async () => {
                try {
                  const shareUrl = `${process.env.NEXT_PUBLIC_URL || window.location.origin}/market/${market.id}`;
                  if (navigator.share) {
                    await navigator.share({
                      title: market.question,
                      text: `${market.question} - YES: ${market.yesOdds}% | NO: ${market.noOdds}%`,
                      url: shareUrl
                    });
                  } else {
                    await navigator.clipboard.writeText(shareUrl);
                    alert('Market link copied to clipboard!');
                  }
                } catch (error) {
                  console.error('Failed to share:', error);
                  alert('Failed to share market');
                }
              }}
              className="w-full mt-6 bg-slate-700/50 hover:bg-slate-600/50 text-white py-3 rounded-xl font-semibold transition-colors border border-slate-600/50 flex items-center justify-center gap-2"
            >
              <Share className="w-4 h-4" />
              Share Market
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}