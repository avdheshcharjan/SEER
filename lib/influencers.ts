export interface Influencer {
  id: string;
  handle: string;
  name: string;
  avatar: string; // Real Twitter profile image URLs
  followerCount: number;
  verifiedStatus: boolean;
  winRate: number; // Percentage
  totalPredictions: number;
  totalVolume: string;
  profitLoss: number; // Percentage
  tags: string[]; // Their expertise areas
  farcasterFid?: number;
  twitterHandle?: string;
}

// Crypto Twitter influencers with realistic stats
export const influencers: Influencer[] = [
  {
    id: "0xsisyphus",
    handle: "@0xSisyphus",
    name: "Sisyphus",
    avatar: "https://pbs.twimg.com/profile_images/1598123456789012345/abcd1234_400x400.jpg", // Mock URL
    followerCount: 287000,
    verifiedStatus: true,
    winRate: 73,
    totalPredictions: 156,
    totalVolume: "$2.4M",
    profitLoss: 34.2,
    tags: ["DeFi", "Layer2", "Yield Farming", "MEV"],
    twitterHandle: "0xSisyphus",
    farcasterFid: 2847
  },
  {
    id: "inversebrah",
    handle: "@inversebrah",
    name: "InverseBrah",
    avatar: "https://pbs.twimg.com/profile_images/1598987654321098765/efgh5678_400x400.jpg", // Mock URL
    followerCount: 425000,
    verifiedStatus: true,
    winRate: 68,
    totalPredictions: 203,
    totalVolume: "$3.8M",
    profitLoss: 52.7,
    tags: ["Perpetuals", "Trading", "Derivatives", "Risk Management"],
    twitterHandle: "inversebrah",
    farcasterFid: 1923
  },
  {
    id: "hsaka",
    handle: "@hsaka",
    name: "Hsaka",
    avatar: "https://pbs.twimg.com/profile_images/1598456789123456789/ijkl9012_400x400.jpg", // Mock URL
    followerCount: 198000,
    verifiedStatus: true,
    winRate: 81,
    totalPredictions: 89,
    totalVolume: "$1.2M",
    profitLoss: 67.3,
    tags: ["GameFi", "NFTs", "Metaverse", "Virtual Worlds"],
    twitterHandle: "hsaka",
    farcasterFid: 5621
  },
  {
    id: "cobie",
    handle: "@cobie",
    name: "Cobie",
    avatar: "https://pbs.twimg.com/profile_images/1598321654987321654/mnop3456_400x400.jpg", // Mock URL
    followerCount: 847000,
    verifiedStatus: true,
    winRate: 72,
    totalPredictions: 178,
    totalVolume: "$5.7M",
    profitLoss: 43.8,
    tags: ["Altcoins", "Market Analysis", "Trading Psychology", "Podcasting"],
    twitterHandle: "cobie",
    farcasterFid: 892
  },
  {
    id: "gainzy222",
    handle: "@gainzy222",
    name: "Gainzy",
    avatar: "https://pbs.twimg.com/profile_images/1598654321456789321/qrst7890_400x400.jpg", // Mock URL
    followerCount: 312000,
    verifiedStatus: true,
    winRate: 65,
    totalPredictions: 234,
    totalVolume: "$2.9M",
    profitLoss: 28.4,
    tags: ["Memecoins", "Low Cap", "Community Building", "Alpha Calls"],
    twitterHandle: "gainzy222",
    farcasterFid: 4157
  },
  {
    id: "lightcrypto",
    handle: "@lightcrypto",
    name: "Light",
    avatar: "https://pbs.twimg.com/profile_images/1598789456123789456/uvwx1234_400x400.jpg", // Mock URL
    followerCount: 156000,
    verifiedStatus: true,
    winRate: 79,
    totalPredictions: 127,
    totalVolume: "$1.8M",
    profitLoss: 58.9,
    tags: ["Infrastructure", "Consensus", "Validator Economics", "Staking"],
    twitterHandle: "lightcrypto",
    farcasterFid: 3694
  }
];

// Mapping between market IDs and influencer IDs
export const marketInfluencerMapping: Record<string, string> = {
  // Crypto markets created by influencers
  "crypto-1": "0xsisyphus", // ETH $4,000 prediction
  "crypto-2": "cobie", // Bitcoin new ATH
  "crypto-3": "inversebrah", // Solana flip Ethereum
  "crypto-4": "gainzy222", // Dogecoin $1
  "crypto-5": "lightcrypto", // Bitcoin ETF $100B AUM
  "crypto-7": "0xsisyphus", // Polygon zkEVM TVL
  "crypto-8": "hsaka", // Chainlink $100
  "crypto-11": "inversebrah", // Arbitrum ARB $5
  "crypto-13": "lightcrypto", // Cosmos Hub upgrade
  "crypto-15": "hsaka", // Aptos 10k TPS
  "crypto-17": "0xsisyphus", // Ethereum gas fees
  "crypto-18": "cobie", // Binance Coin $1000
  "crypto-19": "gainzy222", // Shiba Inu burn
  "crypto-21": "gainzy222", // Tron TRX $1
  "crypto-25": "hsaka", // ENS 10M domains
  
  // Tech markets created by influencers
  "tech-2": "cobie", // ChatGPT 1B users
  "tech-9": "inversebrah", // NVIDIA $5T market cap
  "tech-13": "hsaka", // OpenAI GPT-5
  "tech-18": "cobie", // Twitter/X 1B users
  "tech-24": "lightcrypto", // Databricks IPO
};

export function getInfluencerById(id: string): Influencer | undefined {
  return influencers.find(influencer => influencer.id === id);
}

export function getInfluencerByMarketId(marketId: string): Influencer | undefined {
  const influencerId = marketInfluencerMapping[marketId];
  return influencerId ? getInfluencerById(influencerId) : undefined;
}

export function getMarketsByInfluencer(influencerId: string): string[] {
  return Object.entries(marketInfluencerMapping)
    .filter(([_, id]) => id === influencerId)
    .map(([marketId]) => marketId);
}

export function getTopInfluencers(sortBy: 'winRate' | 'totalVolume' | 'profitLoss' = 'winRate'): Influencer[] {
  const sorted = [...influencers].sort((a, b) => {
    switch (sortBy) {
      case 'winRate':
        return b.winRate - a.winRate;
      case 'totalVolume':
        // Convert volume string to number for sorting
        const aVolume = parseFloat(a.totalVolume.replace(/[$M,]/g, ''));
        const bVolume = parseFloat(b.totalVolume.replace(/[$M,]/g, ''));
        return bVolume - aVolume;
      case 'profitLoss':
        return b.profitLoss - a.profitLoss;
      default:
        return b.winRate - a.winRate;
    }
  });
  return sorted;
}

export function getInfluencersByTag(tag: string): Influencer[] {
  return influencers.filter(influencer => 
    influencer.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

export function getInfluencerStats() {
  const totalVolume = influencers.reduce((sum, inf) => {
    const volume = parseFloat(inf.totalVolume.replace(/[$M,]/g, ''));
    return sum + volume;
  }, 0);
  
  const totalPredictions = influencers.reduce((sum, inf) => sum + inf.totalPredictions, 0);
  const averageWinRate = influencers.reduce((sum, inf) => sum + inf.winRate, 0) / influencers.length;
  const totalFollowers = influencers.reduce((sum, inf) => sum + inf.followerCount, 0);

  return {
    totalInfluencers: influencers.length,
    totalVolume: `$${totalVolume.toFixed(1)}M`,
    totalPredictions,
    averageWinRate: Math.round(averageWinRate),
    totalFollowers,
    verifiedCount: influencers.filter(inf => inf.verifiedStatus).length
  };
}