import { Market } from './supabase'

interface MockMarket extends Omit<Market, 'id' | 'created_at'> {
  ticker?: string
  currentPrice?: number
  targetPrice?: number
  direction?: 'above' | 'below'
}

const cryptoTickers = ['ETH', 'BTC', 'SOL', 'BASE', 'USDC', 'LINK', 'UNI', 'AAVE']
const sportEvents = [
  'Lakers make NBA playoffs',
  'Chiefs win Super Bowl 2025', 
  'Dodgers win World Series',
  'Real Madrid wins Champions League',
  'Warriors win NBA Championship',
  'Cowboys make NFL playoffs',
  'Barcelona wins La Liga',
  'England wins World Cup 2026'
]

const politicsEvents = [
  'Trump wins 2028 election',
  'Biden runs in 2028',
  'California votes for universal basic income',
  'Federal marijuana legalization passes',
  'Supreme Court overturns Citizens United',
  'New York implements wealth tax',
  'Texas turns blue in 2028',
  'Third party candidate gets 10% in 2028'
]

const techEvents = [
  'Apple releases AR glasses in 2025',
  'Tesla stock hits $500',
  'OpenAI IPO happens in 2025',
  'Meta launches VR social platform',
  'Google releases Pixel foldable',
  'Microsoft acquires Discord',
  'TikTok gets banned in US',
  'X (Twitter) gets sold again'
]

const celebEvents = [
  'Taylor Swift announces new album',
  'Elon Musk steps down as CEO',
  'Kim Kardashian runs for office',
  'Joe Rogan moves to different platform',
  'MrBeast hits 300M subscribers',
  'Kanye releases new album in 2025',
  'The Rock announces presidential run',
  'Beyoncé goes on world tour'
]

function getRandomPrice(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomDate(daysFromNow: number, maxDaysFromNow: number): string {
  const min = daysFromNow * 24 * 60 * 60 * 1000
  const max = maxDaysFromNow * 24 * 60 * 60 * 1000
  const randomTime = Math.random() * (max - min) + min
  return new Date(Date.now() + randomTime).toISOString()
}

function generateCryptoMarkets(): MockMarket[] {
  return cryptoTickers.slice(0, 6).map(ticker => {
    const currentPrice = getRandomPrice(1, 100000)
    const direction = Math.random() > 0.5 ? 'above' : 'below'
    const multiplier = direction === 'above' ? 1.1 + Math.random() * 0.4 : 0.6 + Math.random() * 0.3
    const targetPrice = Math.floor(currentPrice * multiplier)
    
    return {
      question: `Will ${ticker} be ${direction} $${targetPrice.toLocaleString()} by ${new Date(getRandomDate(7, 90)).toLocaleDateString()}?`,
      category: 'crypto',
      end_time: getRandomDate(7, 90),
      ticker,
      currentPrice,
      targetPrice,
      direction,
      yes_pool: getRandomPrice(500, 5000),
      no_pool: getRandomPrice(500, 5000),
      total_yes_shares: getRandomPrice(100, 1000),
      total_no_shares: getRandomPrice(100, 1000),
      resolved: false
    }
  })
}

function generateSportsMarkets(): MockMarket[] {
  return sportEvents.slice(0, 4).map(event => ({
    question: `Will ${event}?`,
    category: 'sports',
    end_time: getRandomDate(30, 365),
    yes_pool: getRandomPrice(800, 3000),
    no_pool: getRandomPrice(800, 3000),
    total_yes_shares: getRandomPrice(150, 800),
    total_no_shares: getRandomPrice(150, 800),
    resolved: false
  }))
}

function generatePoliticsMarkets(): MockMarket[] {
  return politicsEvents.slice(0, 3).map(event => ({
    question: `Will ${event}?`,
    category: 'politics',
    end_time: getRandomDate(90, 1460), // 3 months to 4 years
    yes_pool: getRandomPrice(1000, 8000),
    no_pool: getRandomPrice(1000, 8000),
    total_yes_shares: getRandomPrice(200, 1500),
    total_no_shares: getRandomPrice(200, 1500),
    resolved: false
  }))
}

function generateTechMarkets(): MockMarket[] {
  return techEvents.slice(0, 4).map(event => ({
    question: `Will ${event}?`,
    category: 'tech',
    end_time: getRandomDate(14, 365),
    yes_pool: getRandomPrice(600, 4000),
    no_pool: getRandomPrice(600, 4000),
    total_yes_shares: getRandomPrice(120, 900),
    total_no_shares: getRandomPrice(120, 900),
    resolved: false
  }))
}

function generateCelebMarkets(): MockMarket[] {
  return celebEvents.slice(0, 3).map(event => ({
    question: `Will ${event}?`,
    category: 'celebrity',
    end_time: getRandomDate(7, 180),
    yes_pool: getRandomPrice(300, 2000),
    no_pool: getRandomPrice(300, 2000),
    total_yes_shares: getRandomPrice(80, 600),
    total_no_shares: getRandomPrice(80, 600),
    resolved: false
  }))
}

export function generateMockMarkets(): MockMarket[] {
  return [
    ...generateCryptoMarkets(),
    ...generateSportsMarkets(),
    ...generatePoliticsMarkets(), 
    ...generateTechMarkets(),
    ...generateCelebMarkets()
  ].sort(() => Math.random() - 0.5) // Shuffle the array
}

export function generateTrendingMarkets(): MockMarket[] {
  const allMarkets = generateMockMarkets()
  
  // Pick markets with higher activity (higher pools)
  return allMarkets
    .filter(market => (market.yes_pool + market.no_pool) > 2000)
    .slice(0, 5)
}

export function generateRecentActivity() {
  const activities = [
    'Alice bet $50 on YES for "ETH above $4000"',
    'Bob bet $25 on NO for "Lakers make playoffs"', 
    'Charlie created "Will Apple release AR glasses?"',
    'Dana bet $100 on YES for "Bitcoin hits $150k"',
    'Eve bet $30 on NO for "Trump wins 2028"',
    'Frank bet $75 on YES for "Tesla stock hits $500"',
    'Grace created "Will Meta launch VR platform?"',
    'Henry bet $40 on NO for "Chiefs win Super Bowl"'
  ]
  
  return activities
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map((activity, index) => ({
      id: `activity_${index}`,
      text: activity,
      timestamp: Date.now() - Math.random() * 3600000 // Random time in last hour
    }))
}

export function calculateMarketOdds(yesPool: number, noPool: number) {
  const total = yesPool + noPool
  if (total === 0) return { yesPercent: 50, noPercent: 50 }
  
  return {
    yesPercent: Math.round((yesPool / total) * 100),
    noPercent: Math.round((noPool / total) * 100)
  }
}

export function getMarketsByCategory(category: string): MockMarket[] {
  const allMarkets = generateMockMarkets()
  return allMarkets.filter(market => market.category === category)
}

export function getRandomMarket(): MockMarket {
  const markets = generateMockMarkets()
  return markets[Math.floor(Math.random() * markets.length)]
}

// Hot/trending topics based on current events
export function getHotTopics() {
  return [
    { name: 'Crypto Bull Run', count: 156 },
    { name: 'NBA Playoffs', count: 89 },
    { name: '2028 Election', count: 234 },
    { name: 'AI Breakthrough', count: 67 },
    { name: 'Celebrity Drama', count: 45 }
  ]
}

export const mockCategories = [
  { name: 'crypto', count: 67, icon: '₿' },
  { name: 'sports', count: 45, icon: '⚽' },
  { name: 'politics', count: 89, icon: '🗳️' },
  { name: 'tech', count: 34, icon: '💻' },
  { name: 'celebrity', count: 23, icon: '⭐' }
]