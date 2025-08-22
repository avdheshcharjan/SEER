"use client";

import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { useAppStore, useUserStats } from '@/lib/store';
import { getMarketById } from '@/lib/prediction-markets';
import { SupabaseService } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Clock, ExternalLink, Trophy, Target, DollarSign, Settings, Plus, Share } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProfileProps {
  onBack?: () => void;
  onCreateMarket?: () => void;
}

export function Profile({ onBack, onCreateMarket }: ProfileProps) {
  const { address } = useAccount();
  const userStats = useUserStats();
  const { createdMarkets, updateUser } = useAppStore();
  const [supabasePredictions, setSupabasePredictions] = useState<Array<{
    id: string;
    market_id: string;
    user_id: string;
    side: 'yes' | 'no';
    amount: number;
    shares_received: number;
    transaction_hash?: string;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  // Load user predictions from Supabase
  const loadSupabasePredictions = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const predictions = await SupabaseService.getUserPredictions(address);
      setSupabasePredictions(predictions || []);
    } catch (error) {
      console.error('Error loading user predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupabasePredictions();
  }, [address]);

  // Refresh function to reload from database
  const handleRefresh = async () => {
    await loadSupabasePredictions();
  };

  // Use only Supabase predictions (no more local cache conflicts)
  const allPredictions = supabasePredictions.map(p => ({
    id: p.id,
    marketId: p.market_id,
    userId: p.user_id,
    side: p.side,
    amount: p.amount,
    sharesReceived: p.shares_received,
    transactionHash: p.transaction_hash,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    resolved: false,
    correct: false
  }));

  if (!address || !userStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-6">
        <div className="text-6xl mb-6">👤</div>
        <h2 className="text-2xl font-bold text-white mb-4">No Profile Found</h2>
        <p className="text-slate-400 mb-6">
          Connect your wallet to view your prediction history and stats.
        </p>
        <motion.button
          onClick={onBack}
          className="px-6 py-3 bg-base-500 hover:bg-base-600 text-white rounded-xl font-semibold transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Go Back
        </motion.button>
      </div>
    );
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 10) return { color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/50' };
    if (rank <= 50) return { color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/50' };
    if (rank <= 100) return { color: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/50' };
    return { color: 'text-slate-400', bg: 'bg-slate-400/20', border: 'border-slate-400/50' };
  };

  const rankBadge = getRankBadge(userStats.rank || 999);

  const handleFaucetRedirect = () => {
    // Redirect to Circle's official Base Sepolia USDC faucet
    window.open('https://faucet.circle.com/', '_blank');

    toast.success(
      'Redirected to Circle Faucet! Get Base Sepolia USDC there.',
      {
        duration: 4000,
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #22c55e',
        },
      }
    );
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <motion.button
          onClick={onBack}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        <h1 className="text-xl font-bold text-white">Profile</h1>

        <motion.button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          whileHover={{ scale: loading ? 1 : 1.1 }}
          whileTap={{ scale: loading ? 1 : 0.95 }}
          title="Refresh predictions from database"
        >
          <svg className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </motion.button>
      </div>

      {/* Profile Header */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-700/50">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-base-500 to-base-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {userStats.username?.charAt(0).toUpperCase() || address.charAt(2).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              {userStats.username || formatAddress(address)}
            </h2>
            <p className="text-slate-400 text-sm">{formatAddress(address)}</p>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${rankBadge.bg} ${rankBadge.color} ${rankBadge.border} border`}>
              <Trophy className="w-3 h-3 mr-1" />
              Rank #{userStats.rank || 'Unranked'}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="w-4 h-4 text-green-400 mr-1" />
            </div>
            <div className="text-2xl font-bold text-white">${userStats.totalSpent || 0}</div>
            <div className="text-xs text-slate-400">Total Spent</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-4 h-4 text-blue-400 mr-1" />
            </div>
            <div className="text-2xl font-bold text-white">{userStats.totalPredictions}</div>
            <div className="text-xs text-slate-400">Predictions</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
            </div>
            <div className="text-2xl font-bold text-green-400">{userStats.winRate}%</div>
            <div className="text-xs text-slate-400">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 mb-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Bet Settings
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Default Bet Amount (USDC)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 5, 10].map((amount) => (
              <motion.button
                key={amount}
                onClick={() => updateUser({ defaultBetAmount: amount })}
                className={`
                  py-3 px-4 rounded-xl border-2 text-center font-semibold transition-all duration-200
                  ${userStats.defaultBetAmount === amount
                    ? 'border-base-500 bg-base-500/20 text-base-400'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-800/50 text-slate-300 hover:text-white'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-lg font-bold">${amount}</div>
                <div className="text-xs opacity-80">USDC</div>
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            This amount will be bet automatically when you swipe on markets
          </p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Correct</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-xl font-bold text-green-400">{userStats.correctPredictions}</div>
        </div>
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Incorrect</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-red-400">
            {userStats.totalPredictions - userStats.correctPredictions}
          </div>
        </div>
      </div>

      {/* Test USDC Faucet */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 mb-6 border border-slate-700/50">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center justify-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Test USDC Faucet
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Get test USDC tokens from Circle&apos;s official faucet for Base Sepolia
          </p>
          <motion.button
            onClick={handleFaucetRedirect}
            className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-green-500/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center">
              <ExternalLink className="w-4 h-4 mr-2" />
              <span>Get USDC from Circle Faucet</span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Created Markets Section */}
      {createdMarkets.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Markets Created ({createdMarkets.length})
            </h3>
            {onCreateMarket && (
              <button
                onClick={onCreateMarket}
                className="text-xs text-base-400 hover:text-base-300 transition-colors"
              >
                Create New
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {createdMarkets
              .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
              .map((market) => (
                <motion.div
                  key={market.id}
                  className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-3 border border-purple-500/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm mb-1 line-clamp-2">
                        {market.question}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                        <span>Created {formatDate(market.createdAt || '')}</span>
                        <span>•</span>
                        <span className={market.resolved ? 'text-slate-500' : 'text-green-400'}>
                          {market.resolved ? 'Resolved' : 'Active'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        ID: {market.id.slice(0, 8)}...{market.id.slice(-8)}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const shareUrl = `${window.location.origin}/market/${market.id}`;
                          await navigator.clipboard.writeText(shareUrl);
                          toast.success('Market link copied to clipboard!', {
                            duration: 3000,
                            style: {
                              borderRadius: '12px',
                              background: '#1e293b',
                              color: '#f1f5f9',
                              border: '1px solid #10b981',
                            },
                          });
                        } catch (error) {
                          console.error('Failed to copy link:', error);
                          toast.error('Failed to copy link', {
                            style: {
                              borderRadius: '12px',
                              background: '#1e293b',
                              color: '#f1f5f9',
                              border: '1px solid #ef4444',
                            },
                          });
                        }
                      }}
                      className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                      title="Copy share link"
                    >
                      <Share className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                      <div className="text-green-400 font-bold text-xs">
                        {Math.round((market.yesPrice || 0.5) * 100)}%
                      </div>
                      <div className="text-green-300 text-xs">YES</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                      <div className="text-red-400 font-bold text-xs">
                        {Math.round((market.noPrice || 0.5) * 100)}%
                      </div>
                      <div className="text-red-300 text-xs">NO</div>
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      )}

      {/* Create Market CTA */}
      {createdMarkets.length === 0 && onCreateMarket && (
        <div className="mb-6">
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-1">Create Your First Market</h3>
            <p className="text-slate-400 text-sm mb-4">Turn your predictions into markets others can bet on</p>
            <motion.button
              onClick={onCreateMarket}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-1">
                <Plus className="w-4 h-4" />
                <span>Create Market</span>
              </div>
            </motion.button>
          </div>
        </div>
      )}

      {/* Prediction History */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Recent Predictions
        </h3>

        {allPredictions.length === 0 ? (
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-slate-400">No predictions yet</p>
            <p className="text-slate-500 text-sm mt-1">Start swiping to make your first prediction!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading && (
              <div className="text-center py-4">
                <div className="text-slate-400">Loading predictions from database...</div>
              </div>
            )}
            {allPredictions
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((prediction) => {
                const market = getMarketById(prediction.marketId);
                if (!market) return null;

                return (
                  <motion.div
                    key={prediction.id}
                    className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm mb-1 line-clamp-2">
                          {market.question}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <span>{formatDate(prediction.createdAt)}</span>
                          <span>•</span>
                          <span className={`px-2 py-1 rounded-full ${market.category === 'crypto' ? 'bg-prediction-crypto/20 text-prediction-crypto' :
                              market.category === 'tech' ? 'bg-prediction-tech/20 text-prediction-tech' :
                                market.category === 'celebrity' ? 'bg-prediction-celebrity/20 text-prediction-celebrity' :
                                  market.category === 'sports' ? 'bg-prediction-sports/20 text-prediction-sports' :
                                    'bg-prediction-politics/20 text-prediction-politics'
                            }`}>
                            {market.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className={`text-lg font-bold ${prediction.side === 'yes' ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {prediction.side === 'yes' ? 'YES' : 'NO'}
                        </div>
                        <div className="text-xs text-slate-400">${prediction.amount}</div>
                      </div>
                    </div>

                    {prediction.transactionHash && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-slate-400">Transaction:</span>
                        <a
                          href={`https://basescan.org/tx/${prediction.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-xs text-base-400 hover:text-base-300 transition-colors"
                        >
                          {prediction.transactionHash.slice(0, 8)}...{prediction.transactionHash.slice(-6)}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    )}

                    {prediction.resolved && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-slate-400">Result:</span>
                        <span className={`text-xs font-medium ${prediction.correct ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {prediction.correct ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Member Since */}
      <div className="text-center text-slate-400 text-sm">
        Member since {formatDate(userStats.joinedAt)}
      </div>
    </div>
  );
}
