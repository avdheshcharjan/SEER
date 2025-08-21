import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface MarketPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Mock market data - replace with real data fetching
const getMarket = async (id: string) => {
  // This would typically fetch from your database or API
  const mockMarkets = [
    {
      id: '1',
      question: 'Will ETH reach $4000 by end of 2024?',
      description: 'Prediction market for Ethereum price target',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/hero.png`,
      yesPercentage: 67,
      noPercentage: 33,
      totalVolume: '1,234 USDC',
      endDate: '2024-12-31',
    },
    {
      id: '2', 
      question: 'Will Bitcoin hit $100k in 2024?',
      description: 'Prediction market for Bitcoin price milestone',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/hero.png`,
      yesPercentage: 45,
      noPercentage: 55,
      totalVolume: '2,567 USDC',
      endDate: '2024-12-31',
    },
  ];
  
  return mockMarkets.find(market => market.id === id);
};

export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  const { id } = await params;
  const market = await getMarket(id);
  
  if (!market) {
    return {
      title: 'Market Not Found',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL;
  const marketUrl = `${baseUrl}/market/${id}`;
  
  return {
    title: market.question,
    description: market.description,
    openGraph: {
      title: market.question,
      description: `YES: ${market.yesPercentage}% | NO: ${market.noPercentage}% | Volume: ${market.totalVolume}`,
      images: [market.imageUrl],
      url: marketUrl,
    },
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: market.imageUrl,
        button: {
          title: 'Place Prediction',
          action: {
            type: 'launch_frame',
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
            url: marketUrl,
            splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
            splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  };
}

export default async function MarketPage({ params, searchParams }: MarketPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const market = await getMarket(id);
  const isEmbedded = resolvedSearchParams.embedded === 'true';
  
  if (!market) {
    notFound();
  }

  if (isEmbedded) {
    // Compact embed view for social feeds (optimized for 3:2 aspect ratio)
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="w-full max-w-sm mx-auto aspect-[3/2] bg-white rounded-2xl shadow-lg p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3 line-clamp-2">{market.question}</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-green-600 font-semibold">YES {market.yesPercentage}%</span>
                <span className="text-red-600 font-semibold">NO {market.noPercentage}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${market.yesPercentage}%` }}
                />
              </div>
              
              <div className="text-xs text-gray-600 text-center">
                Volume: {market.totalVolume}
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_URL}/market/${id}`, '_blank')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Place Prediction →
          </button>
        </div>
      </div>
    );
  }

  // Full market view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{market.question}</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{market.yesPercentage}%</div>
              <div className="text-green-700 font-semibold">YES</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{market.noPercentage}%</div>
              <div className="text-red-700 font-semibold">NO</div>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Volume: {market.totalVolume}</span>
              <span>Ends: {market.endDate}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-green-600 text-white py-4 rounded-xl font-semibold hover:bg-green-700 transition-colors">
              Bet YES - 10 USDC
            </button>
            <button className="bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 transition-colors">
              Bet NO - 10 USDC
            </button>
          </div>
          
          <button 
            onClick={async () => {
              const shareUrl = `${process.env.NEXT_PUBLIC_URL}/market/${id}`;
              if (navigator.share) {
                await navigator.share({ 
                  title: market.question,
                  text: `${market.question} - YES: ${market.yesPercentage}% | NO: ${market.noPercentage}%`,
                  url: shareUrl 
                });
              } else {
                await navigator.clipboard.writeText(shareUrl);
              }
            }}
            className="w-full mt-4 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Share Market
          </button>
        </div>
      </div>
    </div>
  );
}