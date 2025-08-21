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
  yes_pool: number
  no_pool: number
  total_yes_shares: number
  total_no_shares: number
  resolved: boolean
  outcome?: boolean
  resolution_time?: string
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
}

export default SupabaseService