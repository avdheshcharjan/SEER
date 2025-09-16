import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface UserPrediction {
  id: string
  market_id: string
  user_id: string
  side: 'yes' | 'no'
  amount: number
  // Removed shares_received - not relevant for pari-mutuel
  transaction_hash?: string
  is_correct?: boolean // Track if prediction was correct after resolution
  payout_amount?: number // Amount won/lost
  created_at: string
  updated_at: string
}

export interface Market {
  id: string
  question: string
  category: string
  end_time: string
  created_at: string
  creator_address?: string
  contract_address?: string
  transaction_hash?: string
  // Pari-mutuel specific fields (replacing AMM fields)
  total_yes_bets: number  // Total amount bet on YES
  total_no_bets: number   // Total amount bet on NO
  total_volume: number    // total_yes_bets + total_no_bets
  resolved: boolean
  outcome?: boolean
  resolution_time?: string
  creator_influencer_id?: string
  is_influencer_market?: boolean
  share_count: number // Track how many times this market was shared
  total_participants: number // Number of unique users who bet
}

export interface InfluencerProfile {
  id: string
  wallet_address?: string
  handle: string
  name: string
  avatar_url?: string
  follower_count: number
  verified_status: boolean
  win_rate: number
  total_predictions: number
  total_volume: string
  profit_loss: number
  current_streak: number
  best_streak: number
  last_prediction_date?: string
  last_streak_reset?: string
  tags: string[]
  farcaster_fid?: number
  twitter_handle?: string
  created_at: string
  updated_at: string
}

export interface InfluencerMarket {
  id: string
  market_id: string
  influencer_id: string
  created_at: string
}

export interface UserPosition {
  id: string
  user_id: string
  market_id: string
  yes_bet_amount: number    // Amount bet on YES (replacing yes_shares)
  no_bet_amount: number     // Amount bet on NO (replacing no_shares)
  total_invested: number    // yes_bet_amount + no_bet_amount
  created_at: string
  updated_at: string
}

// Database functions
export class SupabaseService {

  // User Predictions
  static async createPrediction(prediction: Omit<UserPrediction, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('user_predictions')
      .insert(prediction)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Insert multiple predictions in a batch (for pari-mutuel batched transactions)
  static async insertPredictions(
    predictions: Array<{
      market_id: string;
      prediction: 'yes' | 'no';
      amount: number;
      transaction_hash: string;
    }>,
    userAddress: string
  ) {
    const predictionRows = predictions.map(p => ({
      market_id: p.market_id,
      user_id: userAddress,
      side: p.prediction,
      amount: p.amount,
      transaction_hash: p.transaction_hash
    }));

    const { data, error } = await supabase
      .from('user_predictions')
      .insert(predictionRows)
      .select();

    if (error) throw error;
    return data;
  }

  static async getUserPredictions(userId: string) {
    const { data, error } = await supabase
      .from('user_predictions')
      .select(`
        *,
        markets (
          question,
          category,
          end_time
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async updatePrediction(id: string, updates: Partial<UserPrediction>) {
    const { data, error } = await supabase
      .from('user_predictions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Markets
  static async createMarket(market: Omit<Market, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('markets')
      .insert(market)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get market with contract address validation
  static async getMarketWithContract(id: string) {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Validate contract address exists for blockchain interactions
    if (!data.contract_address) {
      console.warn(`Market ${id} has no contract address - using demo contract`);
    }

    return data
  }

  // Get markets that have deployed contracts (ready for real predictions)
  static async getDeployedMarkets() {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .not('contract_address', 'is', null)
      .eq('resolved', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getMarkets(limit = 20) {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  static async getMarket(id: string) {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async updateMarket(id: string, updates: Partial<Market>) {
    const { data, error } = await supabase
      .from('markets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getActiveMarkets() {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('resolved', false)
      .gt('end_time', now)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getMarketsByCategory(category: string) {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('category', category)
      .eq('resolved', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // User Positions
  static async updateUserPosition(position: Omit<UserPosition, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('user_positions')
      .upsert(
        { ...position, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,market_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getUserPositions(userId: string) {
    const { data, error } = await supabase
      .from('user_positions')
      .select(`
        *,
        markets (
          question,
          category,
          end_time,
          resolved,
          outcome
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getUserPosition(userId: string, marketId: string) {
    const { data, error } = await supabase
      .from('user_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('market_id', marketId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data
  }

  // Analytics
  static async getMarketStats(marketId: string) {
    const { data: predictions, error } = await supabase
      .from('user_predictions')
      .select('side, amount')
      .eq('market_id', marketId)

    if (error) throw error

    const yesTotal = predictions?.filter(p => p.side === 'yes').reduce((sum, p) => sum + p.amount, 0) || 0
    const noTotal = predictions?.filter(p => p.side === 'no').reduce((sum, p) => sum + p.amount, 0) || 0
    const total = yesTotal + noTotal

    return {
      yesTotal,
      noTotal,
      total,
      yesPercentage: total > 0 ? (yesTotal / total) * 100 : 50,
      noPercentage: total > 0 ? (noTotal / total) * 100 : 50,
      totalPredictions: predictions?.length || 0
    }
  }

  static async getUserStats(userId: string) {
    const { data, error } = await supabase
      .from('user_predictions')
      .select('amount')
      .eq('user_id', userId)

    if (error) throw error

    const totalInvested = data?.reduce((sum, p) => sum + p.amount, 0) || 0
    const totalPredictions = data?.length || 0

    return {
      totalInvested,
      totalPredictions
    }
  }

  // Influencer Profile methods
  static async getInfluencerProfile(id: string) {
    const { data, error } = await supabase
      .from('influencer_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async getAllInfluencers() {
    const { data, error } = await supabase
      .from('influencer_profiles')
      .select('*')
      .order('win_rate', { ascending: false })

    if (error) throw error
    return data
  }

  static async getTopInfluencers(limit = 10, sortBy: 'win_rate' | 'follower_count' = 'win_rate') {
    const { data, error } = await supabase
      .from('influencer_profiles')
      .select('*')
      .order(sortBy, { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  // Markets with influencer data
  static async getMarketsWithInfluencers() {
    const { data, error } = await supabase
      .from('markets_with_influencers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getMarketWithInfluencer(marketId: string) {
    const { data, error } = await supabase
      .from('markets_with_influencers')
      .select('*')
      .eq('id', marketId)
      .single()

    if (error) throw error
    return data
  }

  static async getMarketsByInfluencer(influencerId: string) {
    const { data, error } = await supabase
      .rpc('get_markets_by_influencer', { influencer_id_param: influencerId })

    if (error) throw error
    return data
  }

  static async getInfluencerStats() {
    const { data, error } = await supabase
      .rpc('get_influencer_stats')
      .single()

    if (error) throw error
    return data
  }

  // Create market with influencer attribution
  static async createMarketWithInfluencer(
    market: Omit<Market, 'id' | 'created_at'>,
    influencerId?: string
  ) {
    const marketData = {
      ...market,
      creator_influencer_id: influencerId,
      is_influencer_market: !!influencerId,
      share_count: 0,
      total_participants: 0
    }

    const { data, error } = await supabase
      .from('markets')
      .insert(marketData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // SOCIAL FEATURES - Leaderboard Functions
  static async getLeaderboard(limit = 10, sortBy: 'win_rate' | 'total_predictions' | 'current_streak' | 'profit_loss' = 'win_rate') {
    const { data, error } = await supabase
      .from('influencer_profiles')
      .select('*')
      .order(sortBy, { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  static async getUserLeaderboardPosition(userId: string) {
    const { data, error } = await supabase
      .rpc('get_user_leaderboard_position', { user_id_param: userId })

    if (error) throw error
    return data
  }

  // SOCIAL FEATURES - Streak Functions
  static async updateUserStreak(userId: string, isCorrectPrediction: boolean) {
    const { data: user, error: userError } = await supabase
      .from('influencer_profiles')
      .select('current_streak, best_streak')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    let newStreak = 0
    let newBestStreak = user?.best_streak || 0

    if (isCorrectPrediction) {
      newStreak = (user?.current_streak || 0) + 1
      newBestStreak = Math.max(newStreak, newBestStreak)
    } else {
      newStreak = 0
    }

    const updates: Record<string, unknown> = {
      current_streak: newStreak,
      best_streak: newBestStreak,
      last_prediction_date: new Date().toISOString()
    }

    if (!isCorrectPrediction) {
      (updates as { last_streak_reset?: string }).last_streak_reset = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('influencer_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getStreakLeaderboard(limit = 10) {
    const { data, error } = await supabase
      .from('influencer_profiles')
      .select('*')
      .order('current_streak', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  // SOCIAL FEATURES - Sharing Functions
  static async incrementShareCount(marketId: string) {
    const { data, error } = await supabase
      .rpc('increment_share_count', { market_id_param: marketId })

    if (error) throw error
    return data
  }

  static async getMostSharedMarkets(limit = 10) {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('share_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  // SOCIAL FEATURES - Resolution and Stats Updates
  static async resolveMarketAndUpdateStats(marketId: string, outcome: boolean) {
    // First resolve the market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .update({
        resolved: true,
        outcome: outcome,
        resolution_time: new Date().toISOString()
      })
      .eq('id', marketId)
      .select()
      .single()

    if (marketError) throw marketError

    // Get all predictions for this market
    const { data: predictions, error: predictionsError } = await supabase
      .from('user_predictions')
      .select('*')
      .eq('market_id', marketId)

    if (predictionsError) throw predictionsError

    // Update each prediction with correctness and calculate payouts
    const yesTotal = market.total_yes_bets
    const noTotal = market.total_no_bets

    for (const prediction of predictions) {
      const isCorrect = (prediction.side === 'yes' && outcome) || (prediction.side === 'no' && !outcome)
      const winningPool = outcome ? yesTotal : noTotal
      const losingPool = outcome ? noTotal : yesTotal

      let payout = 0
      if (isCorrect && winningPool > 0) {
        // User gets their stake back plus proportional share of losing pool
        payout = prediction.amount + (prediction.amount / winningPool) * losingPool
      }

      // Update prediction record
      await supabase
        .from('user_predictions')
        .update({
          is_correct: isCorrect,
          payout_amount: payout
        })
        .eq('id', prediction.id)

      // Update user streak
      await this.updateUserStreak(prediction.user_id, isCorrect)

      // Update user stats (win rate, profit/loss, etc.)
      await this.updateUserStats(prediction.user_id)
    }

    return market
  }

  static async updateUserStats(userId: string) {
    // Get all user predictions
    const { data: predictions, error } = await supabase
      .from('user_predictions')
      .select('amount, is_correct, payout_amount')
      .eq('user_id', userId)
      .not('is_correct', 'is', null) // Only resolved predictions

    if (error) throw error

    const totalPredictions = predictions.length
    const correctPredictions = predictions.filter(p => p.is_correct).length
    const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0
    const totalVolume = predictions.reduce((sum, p) => sum + p.amount, 0)
    const totalPayout = predictions.reduce((sum, p) => sum + (p.payout_amount || 0), 0)
    const profitLoss = totalPayout - totalVolume

    const { data, error: updateError } = await supabase
      .from('influencer_profiles')
      .update({
        total_predictions: totalPredictions,
        win_rate: winRate,
        total_volume: totalVolume.toString(),
        profit_loss: profitLoss
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }

  // SOCIAL FEATURES - User Social Profile
  static async createOrUpdateUserProfile(userAddress: string, profileData: Partial<InfluencerProfile>) {
    const { data, error } = await supabase
      .from('influencer_profiles')
      .upsert(
        {
          id: userAddress,
          wallet_address: userAddress,
          current_streak: 0,
          best_streak: 0,
          win_rate: 0,
          total_predictions: 0,
          total_volume: '0',
          profit_loss: 0,
          follower_count: 0,
          verified_status: false,
          ...profileData
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  // SOCIAL FEATURES - Daily/Weekly Stats
  static async getDailyStats() {
    const { data, error } = await supabase
      .rpc('get_daily_stats')

    if (error) throw error
    return data
  }

  static async getWeeklyLeaderboard() {
    const { data, error } = await supabase
      .rpc('get_weekly_leaderboard')

    if (error) throw error
    return data
  }
}

export default SupabaseService