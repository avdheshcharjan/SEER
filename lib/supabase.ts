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
  shares_received: number
  transaction_hash?: string
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
  yes_pool: number
  no_pool: number
  total_yes_shares: number
  total_no_shares: number
  resolved: boolean
  outcome?: boolean
  resolution_time?: string
  creator_influencer_id?: string
  is_influencer_market?: boolean
  // Event tracking fields for smart contract integration
  chain_id?: bigint
  market_id?: string
  opening_block?: bigint
  closing_block?: bigint
  created_tx_hash?: Uint8Array
  created_log_index?: number
  created_block_number?: bigint
  is_reorged?: boolean
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
  yes_shares: number
  no_shares: number
  total_invested: number
  created_at: string
  updated_at: string
}

export interface SyncJob {
  id: bigint
  job_type: string
  chain_id: bigint
  tx_hash: Uint8Array
  log_index: number
  retries: number
  payload: Record<string, unknown>
  status: 'pending' | 'processing' | 'done' | 'dead'
  created_at: string
}

export interface ContractEvent {
  chain_id: bigint
  contract_address: Uint8Array
  topic0: Uint8Array
  tx_hash: Uint8Array
  log_index: number
  block_number: bigint
  payload: Record<string, unknown>
  created_at: string
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
    try {
      console.log('🔍 Attempting to fetch markets with influencers...');

      // Try to get from the view first
      const { data, error } = await supabase
        .from('markets_with_influencers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('⚠️ markets_with_influencers view error:', error.message);
        console.log('🔄 Falling back to regular markets table...');

        // Fallback to regular markets table if view doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('markets')
          .select('*')
          .order('created_at', { ascending: false })

        if (fallbackError) {
          console.error('❌ Fallback markets table also failed:', fallbackError.message);
          throw new Error(`Both markets_with_influencers view and markets table failed: ${fallbackError.message}`);
        }

        console.log(`✅ Fallback successful: loaded ${fallbackData?.length || 0} markets`);
        return fallbackData
      }

      console.log(`✅ Successfully loaded ${data?.length || 0} markets with influencer data`);
      return data
    } catch (error) {
      console.error('💥 getMarketsWithInfluencers failed completely:', error);
      throw error;
    }
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
      is_influencer_market: !!influencerId
    }

    const { data, error } = await supabase
      .from('markets')
      .insert(marketData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Sync Jobs methods for event processing
  static async createSyncJob(job: Omit<SyncJob, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('sync_jobs')
      .insert(job)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSyncJob(id: bigint) {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async updateSyncJob(id: bigint, updates: Partial<SyncJob>) {
    const { data, error } = await supabase
      .from('sync_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getPendingSyncJobs(limit = 10) {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data
  }

  static async getFailedSyncJobs(maxRetries = 10) {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .in('status', ['dead'])
      .or(`retries.gte.${maxRetries}`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // Enhanced contract management methods
  static async updateMarketContractAddress(marketId: string, contractAddress: string, transactionHash?: string) {
    const { data, error } = await supabase
      .from('markets')
      .update({
        contract_address: contractAddress.toLowerCase(),
        transaction_hash: transactionHash
      })
      .eq('id', marketId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getMarketsWithoutContracts(limit = 50) {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .is('contract_address', null)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  static async getMarketsWithInvalidContracts() {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .not('contract_address', 'is', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Filter for invalid addresses on the client side
    return data?.filter(market => {
      if (!market.contract_address) return false
      // Check if it's a zero address or invalid format
      return market.contract_address === '0x0000000000000000000000000000000000000000' ||
             !/^0x[a-fA-F0-9]{40}$/.test(market.contract_address)
    }) || []
  }

  static async batchUpdateMarketContracts(updates: Array<{ marketId: string; contractAddress: string; transactionHash?: string }>) {
    const promises = updates.map(update =>
      this.updateMarketContractAddress(update.marketId, update.contractAddress, update.transactionHash)
    )

    const results = await Promise.allSettled(promises)

    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length

    return { successful, failed, results }
  }

  // Contract Events methods for deduplication
  static async createContractEvent(event: Omit<ContractEvent, 'created_at'>) {
    const { data, error } = await supabase
      .from('contract_events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getContractEvents(
    chainId: bigint,
    contractAddress?: Uint8Array,
    fromBlock?: bigint,
    toBlock?: bigint,
    limit = 100
  ) {
    let query = supabase
      .from('contract_events')
      .select('*')
      .eq('chain_id', chainId)

    if (contractAddress) {
      query = query.eq('contract_address', contractAddress)
    }

    if (fromBlock) {
      query = query.gte('block_number', fromBlock)
    }

    if (toBlock) {
      query = query.lte('block_number', toBlock)
    }

    const { data, error } = await query
      .order('block_number', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  static async eventExists(txHash: Uint8Array, logIndex: number, chainId: bigint) {
    const { data, error } = await supabase
      .from('contract_events')
      .select('tx_hash')
      .eq('tx_hash', txHash)
      .eq('log_index', logIndex)
      .eq('chain_id', chainId)
      .limit(1)

    if (error) throw error
    return data && data.length > 0
  }
}

export default SupabaseService