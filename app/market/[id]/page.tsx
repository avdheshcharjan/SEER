import { SupabaseService } from '@/lib/supabase';
import { Metadata } from 'next';
import { UnifiedMarket } from '@/lib/types';
import MarketPageClient from './MarketPageClient';

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

// Generate metadata for proper Open Graph support
export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const market = await getMarket(resolvedParams.id);
    
    if (!market) {
      return {
        title: 'Market Not Found - SeerMarkets',
        description: 'The requested prediction market could not be found.',
      };
    }

    const influencerInfo = market.influencer 
      ? ` by ${market.influencer.name} (@${market.influencer.handle})`
      : ' by a verified creator';

    const description = `${market.question}${influencerInfo} - YES: ${market.yesOdds}% | NO: ${market.noOdds}% - Track predictions on SeerMarkets`;
    
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://based-rust.vercel.app';
    const marketUrl = `${baseUrl}/market/${market.id}`;
    const ogImageUrl = `${baseUrl}/api/og/market/${market.id}`;

    return {
      title: `${market.question} - SeerMarkets`,
      description,
      openGraph: {
        title: market.question,
        description,
        url: marketUrl,
        siteName: 'SeerMarkets',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: market.question,
          }
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: market.question,
        description,
        images: [ogImageUrl],
      },
      other: {
        // Farcaster frame metadata
        'fc:frame': 'vNext',
        'fc:frame:image': ogImageUrl,
        'fc:frame:button:1': 'View Market',
        'fc:frame:button:1:action': 'link',
        'fc:frame:button:1:target': marketUrl,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'SeerMarkets',
      description: 'Swipe-based prediction markets',
    };
  }
}

export default function MarketPage({ params, searchParams }: MarketPageProps) {
  return <MarketPageClient params={params} searchParams={searchParams} />;
}