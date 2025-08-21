// Unified type definitions for BASED prediction markets
// Handles both legacy mock data and Supabase schema

import { Market as SupabaseMarket } from './supabase';

// Base unified market interface
export interface UnifiedMarket {
  // Core fields (consistent across both schemas)
  id: string;
  question: string;
  category: 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics';
  resolved: boolean;
  outcome?: boolean | null;
  
  // Time fields (normalized to ISO format)
  endTime: string; // Always ISO format
  createdAt: string; // Always ISO format
  resolutionTime?: string; // Always ISO format
  
  // Price/odds fields (normalized)
  yesPrice: number; // 0-1 probability
  noPrice: number; // 0-1 probability
  yesOdds: number; // 0-100 percentage
  noOdds: number; // 0-100 percentage
  
  // Pool data (from Supabase)
  yesPool: number; // Pool amounts
  noPool: number; // Pool amounts
  totalYesShares: number;
  totalNoShares: number;
  
  // Creator info
  creatorAddress?: string;
  contractAddress?: string;
  
  // Legacy display fields (optional)
  endDate?: string; // Display format like "31/12/2024"
  description?: string;
  currentPrice?: number;
  priceChange?: number;
  marketCap?: string;
  volume?: string;
  totalVolume?: number;
  yesShares?: number;
  noShares?: number;
  tags?: string[];
  imageUrl?: string;
  timeframe?: 'seconds' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  ticker?: string;
  targetPrice?: number;
  direction?: 'above' | 'below';
  isCreatedByUser?: boolean;
}

// User prediction unified interface
export interface UnifiedUserPrediction {
  id: string;
  marketId: string;
  userId: string;
  side: 'yes' | 'no';
  amount: number;
  sharesReceived: number;
  transactionHash?: string;
  createdAt: string;
  updatedAt: string;
  resolved?: boolean;
  correct?: boolean;
}

// User position unified interface  
export interface UnifiedUserPosition {
  id: string;
  userId: string;
  marketId: string;
  yesShares: number;
  noShares: number;
  totalInvested: number;
  createdAt: string;
  updatedAt: string;
}

// Transformation utilities
export class SchemaTransformer {
  
  // Convert Supabase Market to UnifiedMarket
  static supabaseToUnified(market: SupabaseMarket): UnifiedMarket {
    const totalPool = market.yes_pool + market.no_pool;
    const yesPrice = totalPool > 0 ? market.yes_pool / totalPool : 0.5;
    const noPrice = totalPool > 0 ? market.no_pool / totalPool : 0.5;
    
    return {
      id: market.id,
      question: market.question,
      category: market.category as UnifiedMarket['category'],
      resolved: market.resolved,
      outcome: market.outcome,
      endTime: market.end_time,
      createdAt: market.created_at,
      resolutionTime: market.resolution_time,
      yesPrice,
      noPrice,
      yesOdds: Math.round(yesPrice * 100),
      noOdds: Math.round(noPrice * 100),
      yesPool: market.yes_pool,
      noPool: market.no_pool,
      totalYesShares: market.total_yes_shares,
      totalNoShares: market.total_no_shares,
      creatorAddress: market.creator_address,
      contractAddress: market.contract_address,
      // Generate display format from ISO
      endDate: this.formatDisplayDate(market.end_time)
    };
  }

  // Convert legacy PredictionMarket to UnifiedMarket
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static legacyToUnified(market: any): UnifiedMarket {
    const yesPrice = (market.yesPrice as number) ?? ((market.yesOdds as number) ? (market.yesOdds as number) / 100 : 0.5);
    const noPrice = (market.noPrice as number) ?? ((market.noOdds as number) ? (market.noOdds as number) / 100 : 0.5);
    
    return {
      id: market.id,
      question: market.question,
      category: market.category,
      resolved: market.resolved ?? false,
      outcome: market.outcome,
      endTime: market.endTime ?? this.parseDisplayDate(market.endDate) ?? new Date().toISOString(),
      createdAt: market.createdAt ?? new Date().toISOString(),
      resolutionTime: market.resolutionTime,
      yesPrice,
      noPrice,
      yesOdds: Math.round(yesPrice * 100),
      noOdds: Math.round(noPrice * 100),
      yesPool: market.yesShares ?? 0,
      noPool: market.noShares ?? 0,
      totalYesShares: market.yesShares ?? 0,
      totalNoShares: market.noShares ?? 0,
      creatorAddress: market.createdBy,
      contractAddress: market.contractAddress,
      // Preserve legacy fields
      endDate: market.endDate,
      description: market.description,
      currentPrice: market.currentPrice,
      priceChange: market.priceChange,
      marketCap: market.marketCap,
      volume: market.volume,
      totalVolume: market.totalVolume,
      yesShares: market.yesShares,
      noShares: market.noShares,
      tags: market.tags,
      imageUrl: market.imageUrl,
      timeframe: market.timeframe,
      ticker: market.ticker,
      targetPrice: market.targetPrice,
      direction: market.direction,
      isCreatedByUser: market.isCreatedByUser
    };
  }

  // Safe property access with fallbacks
  static getYesPercentage(market: UnifiedMarket): number {
    return market.yesOdds ?? Math.round((market.yesPrice ?? 0.5) * 100);
  }

  static getNoPercentage(market: UnifiedMarket): number {
    return market.noOdds ?? Math.round((market.noPrice ?? 0.5) * 100);
  }

  static getEndDate(market: UnifiedMarket): string {
    return market.endDate ?? this.formatDisplayDate(market.endTime);
  }

  // Date utilities
  private static formatDisplayDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '/');
    } catch {
      return '31/12/2024'; // Safe fallback
    }
  }

  private static parseDisplayDate(displayDate?: string): string | null {
    if (!displayDate) return null;
    try {
      const [day, month, year] = displayDate.split('/');
      return new Date(`${year}-${month}-${day}T23:59:59Z`).toISOString();
    } catch {
      return null;
    }
  }
}

// Type guards
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSupabaseMarket(market: any): market is SupabaseMarket {
  return market && typeof market.end_time === 'string' && typeof market.yes_pool === 'number';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLegacyMarket(market: any): boolean {
  return market && (market.yesOdds !== undefined || market.endDate !== undefined);
}