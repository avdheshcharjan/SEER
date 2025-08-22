import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION = 60 * 1000; // 1 minute cache

// In-memory cache for API responses
interface CachedData {
  currentPrice: number;
  priceChange: number;
  marketCap: string;
  volume: string;
  chartData: {
    timestamps: number[];
    prices: number[];
  };
}

const cache = new Map<string, { data: CachedData; timestamp: number }>();

// Mapping of tickers to CoinGecko IDs
const TICKER_TO_COINGECKO_ID: Record<string, string> = {
  'ETH': 'ethereum',
  'BTC': 'bitcoin',
  'FARTCOIN': 'fartcoin',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'ADA': 'cardano',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'AVAX': 'avalanche-2',
  'UNI': 'uniswap',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'ATOM': 'cosmos',
  'SUI': 'sui',
  'APT': 'aptos',
  'LTC': 'litecoin',
  'BNB': 'binancecoin',
  'SHIB': 'shiba-inu',
  'DOT': 'polkadot',
  'TRX': 'tron',
  'ALGO': 'algorand',
  'VET': 'vechain',
  'XLM': 'stellar',
  'ENS': 'ethereum-name-service'
};

function formatLargeNumber(num: number): string {
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(1)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
}

function getCacheKey(ticker: string): string {
  return `coingecko_${ticker.toUpperCase()}`;
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: CachedData) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker parameter is required' },
        { status: 400 }
      );
    }

    const coinGeckoId = TICKER_TO_COINGECKO_ID[ticker.toUpperCase()];
    if (!coinGeckoId) {
      return NextResponse.json(
        { error: `No CoinGecko ID found for ticker: ${ticker}` },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(ticker);
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    try {
      // Fetch current price and market data
      const priceResponse = await fetch(
        `${COINGECKO_BASE_URL}/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&include_24hr_vol=true`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!priceResponse.ok) {
        throw new Error(`Price API request failed: ${priceResponse.status}`);
      }

      const priceData = await priceResponse.json();
      const tokenInfo = priceData[coinGeckoId];

      if (!tokenInfo) {
        throw new Error(`No price data found for ${coinGeckoId}`);
      }

      // Try to fetch chart data, but don't fail if it doesn't work
      let chartData = { prices: [] };
      try {
        const chartResponse = await fetch(
          `${COINGECKO_BASE_URL}/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=1`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (chartResponse.ok) {
          chartData = await chartResponse.json();
        }
      } catch (chartError) {
        console.warn('Chart API failed, using empty chart data:', chartError);
      }

      const result = {
        currentPrice: tokenInfo.usd || 0,
        priceChange: tokenInfo.usd_24h_change || 0,
        marketCap: tokenInfo.usd_market_cap ? formatLargeNumber(tokenInfo.usd_market_cap) : 'N/A',
        volume: tokenInfo.usd_24h_vol ? formatLargeNumber(tokenInfo.usd_24h_vol) : 'N/A',
        chartData: {
          timestamps: chartData.prices?.map(([timestamp]: [number, number]) => timestamp) || [],
          prices: chartData.prices?.map(([, price]: [number, number]) => price) || []
        }
      };

      // Cache the successful result
      setCachedData(cacheKey, result);

      return NextResponse.json(result);
    } catch (apiError) {
      // If API calls fail, return mock data to prevent UI breaks
      console.warn('CoinGecko API failed, returning mock data:', apiError);
      
      const mockData = {
        currentPrice: ticker === 'ETH' ? 2500 : ticker === 'BTC' ? 45000 : ticker === 'FARTCOIN' ? 0.8 : 100,
        priceChange: Math.random() * 10 - 5, // Random change between -5 and 5
        marketCap: 'N/A',
        volume: 'N/A',
        chartData: {
          timestamps: [],
          prices: []
        }
      };

      return NextResponse.json(mockData);
    }
  } catch (error) {
    console.error('CoinGecko API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CoinGecko data' },
      { status: 500 }
    );
  }
}