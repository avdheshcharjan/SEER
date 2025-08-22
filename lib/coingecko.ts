// CoinGecko API integration for real-time price data and charts
// Based on CoinGecko API documentation

export interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
  usd_market_cap: number;
  usd_24h_vol: number;
}

export interface CoinGeckoChartData {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface TokenPriceData {
  currentPrice: number;
  priceChange: number;
  marketCap: string;
  volume: string;
  chartData: {
    timestamps: number[];
    prices: number[];
  };
}

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

export class CoinGeckoService {
  /**
   * Get current price data for a token by ticker
   */
  static async getPriceData(ticker: string): Promise<TokenPriceData | null> {
    try {
      const response = await fetch(`/api/coingecko?ticker=${encodeURIComponent(ticker)}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to fetch CoinGecko data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get price data for multiple tokens
   */
  static async getMultiplePriceData(tickers: string[]): Promise<Record<string, TokenPriceData | null>> {
    const promises = tickers.map(async (ticker) => {
      const data = await this.getPriceData(ticker);
      return { ticker, data };
    });
    
    const results = await Promise.allSettled(promises);
    const priceData: Record<string, TokenPriceData | null> = {};
    
    results.forEach((result, index) => {
      const ticker = tickers[index];
      if (result.status === 'fulfilled') {
        priceData[ticker] = result.value.data;
      } else {
        console.error(`Failed to fetch data for ${ticker}:`, result.reason);
        priceData[ticker] = null;
      }
    });
    
    return priceData;
  }


  /**
   * Extract ticker from market question for crypto markets
   */
  static extractTickerFromQuestion(question: string): string | null {
    // Common patterns in crypto market questions
    const patterns = [
      /Will\s+(\w+)\s+reach/i,
      /Will\s+(\w+)\s+flip/i,
      /Will\s+(\w+)\s+be/i,
      /(\w+)\s+price/i,
      /(\w+)\s+token/i
    ];

    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        const ticker = match[1].toUpperCase();
        if (TICKER_TO_COINGECKO_ID[ticker]) {
          return ticker;
        }
      }
    }

    // Fallback: look for known tickers in the question
    const upperQuestion = question.toUpperCase();
    for (const ticker of Object.keys(TICKER_TO_COINGECKO_ID)) {
      if (upperQuestion.includes(ticker)) {
        return ticker;
      }
    }

    return null;
  }
}