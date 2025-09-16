import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Updated types for pari-mutuel betting system
export interface UserPrediction {
  id: string
  market_id: string
  user_id: string
  side: 'yes' | 'no'
  amount: number
  // Removed shares_received - not relevant for pari-mutuel
  transaction_hash?: string
  created_at: string
  updated_at: string
}

// Updated Market interface for pari-mutuel system
export interface ParimutuelMarket {
  id: string
  question: string
  category: string
  end_time: string
  created_at: string
  creator_address?: string
  contract_address?: string
  transaction_hash?: string
  // Pari-mutuel specific fields
  total_yes_bets: number  // Total amount bet on YES
  total_no_bets: number   // Total amount bet on NO
  total_volume: number    // total_yes_bets + total_no_bets
  resolved: boolean
  outcome?: boolean
  resolution_time?: string
  creator_influencer_id?: string
  is_influencer_market?: boolean
}

// Keep InfluencerProfile unchanged
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

// Updated UserPosition for pari-mutuel system
export interface UserPosition {
  id: string
  user_id: string
  market_id: string
  yes_bet_amount: number    // Amount bet on YES
  no_bet_amount: number     // Amount bet on NO
  total_invested: number    // yes_bet_amount + no_bet_amount
  created_at: string
  updated_at: string
}

// Updated database functions for pari-mutuel system
export class ParimutuelSupabaseService {

  // User Predictions (updated for pari-mutuel)
  static async createPrediction(prediction: Omit<UserPrediction, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('user_predictions')
      .insert(prediction)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Insert multiple predictions in a batch (for batched transactions)
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

  // Markets (updated for pari-mutuel)
  static async createMarket(market: Omit<ParimutuelMarket, 'id' | 'created_at' | 'total_volume'>) {
    const marketData = {
      ...market,
      total_volume: market.total_yes_bets + market.total_no_bets
    };

    const { data, error } = await supabase
      .from('markets')
      .insert(marketData)
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

  static async updateMarket(id: string, updates: Partial<ParimutuelMarket>) {
    const updateData = {
      ...updates,
      // Recalculate total_volume if bet amounts are updated
      ...(updates.total_yes_bets !== undefined || updates.total_no_bets !== undefined) && {
        total_volume: (updates.total_yes_bets || 0) + (updates.total_no_bets || 0)
      }
    };

    const { data, error } = await supabase
      .from('markets')
      .update(updateData)
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

  // User Positions (updated for pari-mutuel)
  static async updateUserPosition(position: {
    market_id: string;
    user_address: string;
    prediction: 'yes' | 'no';
    amount_bet: number;
    transaction_hash: string;
  }) {
    // First get existing position
    const existingPosition = await this.getUserPosition(position.user_address, position.market_id);

    const positionData: any = {
      user_id: position.user_address,
      market_id: position.market_id,
      // Schema uses yes_shares/no_shares; we store bet amounts here for pari-mutuel
      yes_shares: (existingPosition as any)?.yes_shares || 0,
      no_shares: (existingPosition as any)?.no_shares || 0,
      total_invested: existingPosition?.total_invested || 0,
      updated_at: new Date().toISOString()
    };

    // Add the new bet amount to the appropriate side
    if (position.prediction === 'yes') {
      positionData.yes_shares += position.amount_bet;
    } else {
      positionData.no_shares += position.amount_bet;
    }

    positionData.total_invested = positionData.yes_shares + positionData.no_shares;

    const { data, error } = await supabase
      .from('user_positions')
      .upsert(
        positionData,
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

  // Analytics (updated for pari-mutuel)
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
      totalPredictions: predictions?.length || 0,
      // Pari-mutuel specific: implied odds
      yesImpliedOdds: total > 0 ? yesTotal / total : 0.5,
      noImpliedOdds: total > 0 ? noTotal / total : 0.5
    }
  }

  // Calculate potential payout for a user in a pari-mutuel market
  static async getUserPotentialPayout(userId: string, marketId: string) {
    const [userPosition, marketStats] = await Promise.all([
      this.getUserPosition(userId, marketId),
      this.getMarketStats(marketId)
    ]);

    if (!userPosition) return { yesPayout: 0, noPayout: 0 };

    const { yes_bet_amount, no_bet_amount } = userPosition;
    const { yesTotal, noTotal } = marketStats;

    let yesPayout = 0;
    let noPayout = 0;

    // Calculate potential payout if YES wins
    if (yes_bet_amount > 0 && yesTotal > 0) {
      yesPayout = yes_bet_amount + (yes_bet_amount / yesTotal) * noTotal;
    }

    // Calculate potential payout if NO wins  
    if (no_bet_amount > 0 && noTotal > 0) {
      noPayout = no_bet_amount + (no_bet_amount / noTotal) * yesTotal;
    }

    return { yesPayout, noPayout };
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

  // Influencer Profile methods (unchanged)
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
    market: Omit<ParimutuelMarket, 'id' | 'created_at' | 'total_volume'>,
    influencerId?: string
  ) {
    const marketData = {
      ...market,
      creator_influencer_id: influencerId,
      is_influencer_market: !!influencerId,
      total_volume: market.total_yes_bets + market.total_no_bets
    }

    const { data, error } = await supabase
      .from('markets')
      .insert(marketData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Migration helper: Convert AMM market data to pari-mutuel
  static async convertMarketToParimutuel(marketId: string) {
    // Get all predictions for this market
    const { data: predictions, error: predError } = await supabase
      .from('user_predictions')
      .select('side, amount')
      .eq('market_id', marketId);

    if (predError) throw predError;

    // Calculate total bet amounts from predictions
    const totalYesBets = predictions?.filter(p => p.side === 'yes').reduce((sum, p) => sum + p.amount, 0) || 0;
    const totalNoBets = predictions?.filter(p => p.side === 'no').reduce((sum, p) => sum + p.amount, 0) || 0;

    // Update market with pari-mutuel fields
    return await this.updateMarket(marketId, {
      total_yes_bets: totalYesBets,
      total_no_bets: totalNoBets,
      total_volume: totalYesBets + totalNoBets
    });
  }
}

export default ParimutuelSupabaseService