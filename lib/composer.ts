export interface ShareMarketData {
  marketId: string;
  question: string;
  yesPercentage: number;
  noPercentage: number;
  totalVolume: string;
  endDate: string;
}

export const shareMarket = async (market: ShareMarketData) => {
  try {
    const marketUrl = `${process.env.NEXT_PUBLIC_URL}/market/${market.marketId}`;
    const shareText = `${market.question} 🎯\n\nYES: ${market.yesPercentage}% | NO: ${market.noPercentage}%\nVolume: ${market.totalVolume}`;

    // Use native sharing or clipboard fallback
    if (navigator.share) {
      await navigator.share({
        title: market.question,
        text: shareText,
        url: marketUrl,
      });
    } else {
      await navigator.clipboard.writeText(`${shareText}\n\n${marketUrl}`);
      return 'copied'; // Indicate clipboard was used
    }
    
    return 'shared';
  } catch (error) {
    console.error('Error sharing market:', error);
    throw error;
  }
};

export const isEmbeddedView = (searchParams: URLSearchParams): boolean => {
  return searchParams.get('embedded') === 'true';
};

export const getMarketEmbedUrl = (marketId: string): string => {
  return `${process.env.NEXT_PUBLIC_URL}/market/${marketId}?embedded=true`;
};

export const getFullMarketUrl = (marketId: string): string => {
  return `${process.env.NEXT_PUBLIC_URL}/market/${marketId}`;
};