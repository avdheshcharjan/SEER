"use client";

import { motion } from 'framer-motion';
import { CheckCircle, ExternalLink, Copy, RefreshCw, Home } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface CreatedMarket {
  id: string;
  question: string;
  category: string;
  contract_address: string;
  explorer_url: string;
  transactionHash?: string;
  endTime?: Date;
}

interface FailedMarket {
  question: string;
  error: string;
}

interface CreatedMarketsProps {
  markets: CreatedMarket[];
  failedMarkets?: FailedMarket[];
  onBack: () => void;
}

export function CreatedMarkets({ markets, failedMarkets = [], onBack }: CreatedMarketsProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: 'address' | 'txHash') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'address') {
        setCopiedAddress(text);
        setTimeout(() => setCopiedAddress(null), 2000);
      } else {
        setCopiedTxHash(text);
        setTimeout(() => setCopiedTxHash(null), 2000);
      }
      toast.success('Copied to clipboard!', {
        duration: 2000,
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #10b981',
        },
      });
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTxHash = (txHash: string) => {
    return `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
  };


  const getTxExplorerUrl = (txHash: string) => {
    return `https://sepolia.base.org/tx/${txHash}`;
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {failedMarkets.length === 0 ? 'Markets Created Successfully!' : 'Markets Created'}
        </h1>
        <p className="text-slate-400">
          {markets.length} market{markets.length !== 1 ? 's' : ''} deployed successfully
          {failedMarkets.length > 0 && `, ${failedMarkets.length} failed`}
        </p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Deployment Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Successful</p>
            <p className="text-white text-2xl font-bold">{markets.length}</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Network</p>
            <p className="text-green-400 text-lg font-semibold">Base Sepolia</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Gas Cost</p>
            <p className="text-green-400 text-lg font-semibold">$0 (Sponsored)</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-slate-400 text-sm">{failedMarkets.length > 0 ? 'Failed' : 'Status'}</p>
            <p className={`text-lg font-semibold ${failedMarkets.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {failedMarkets.length > 0 ? failedMarkets.length : 'Live'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Failed Markets (if any) */}
      {failedMarkets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-red-900/20 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-red-500/30"
        >
          <h2 className="text-lg font-semibold text-red-400">Failed Markets</h2>
          <div className="space-y-3">
            {failedMarkets.map((failedMarket, index) => (
              <div
                key={index}
                className="bg-red-800/20 rounded-xl p-4 border border-red-500/30"
              >
                <p className="text-white font-medium text-sm mb-2">
                  {failedMarket.question}
                </p>
                <p className="text-red-400 text-xs">
                  Error: {failedMarket.error}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Successful Markets List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-slate-700/50"
      >
        <h2 className="text-lg font-semibold text-white">
          {failedMarkets.length > 0 ? 'Successful Markets' : 'Created Markets'}
        </h2>

        <div className="space-y-4 max-h-72 sm:max-h-96 overflow-y-auto overflow-touch">
          {markets.map((market, index) => (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-slate-700/30 rounded-xl p-3 sm:p-4 border border-slate-600/50 hover:border-slate-500/50 transition-colors"
            >
              {/* Market Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm leading-snug">
                    {market.question}
                  </p>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-400 mt-2">
                    <span>Category: {market.category}</span>
                    {market.endTime && <span>Ends: {market.endTime.toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>

              {/* Contract Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-1">Contract Address</p>
                    <div className="flex items-center gap-2">
                      <code className="text-white font-mono text-sm">
                        {formatAddress(market.contract_address)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(market.contract_address, 'address')}
                        className="p-1 hover:bg-slate-600/50 rounded transition-colors"
                        title="Copy address"
                      >
                        {copiedAddress === market.contract_address ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <a
                    href={market.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-xs sm:text-sm ios-button"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="hidden sm:inline">View</span>
                  </a>
                </div>

                {/* Transaction Hash - only show if available */}
                {market.transactionHash && (
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-1">Transaction Hash</p>
                      <div className="flex items-center gap-2">
                        <code className="text-white font-mono text-sm">
                          {formatTxHash(market.transactionHash)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(market.transactionHash!, 'txHash')}
                          className="p-1 hover:bg-slate-600/50 rounded transition-colors"
                          title="Copy transaction hash"
                        >
                          {copiedTxHash === market.transactionHash ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <a
                      href={getTxExplorerUrl(market.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-xs sm:text-sm ios-button"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Tx</span>
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3"
      >
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700/50 text-white rounded-xl font-semibold hover:bg-slate-600/50 transition-colors border border-slate-600/50"
        >
          <RefreshCw className="w-4 h-4" />
          Create More Markets
        </button>
        <Link
          href="/"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25"
        >
          <Home className="w-4 h-4" />
          Back to App
        </Link>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">ℹ</span>
          </div>
          <div>
            <p className="text-blue-100 font-medium mb-1">Markets Are Now Live</p>
            <ul className="text-blue-200/80 text-sm space-y-1">
              <li>• Users can start betting on these markets immediately</li>
              <li>• Markets will appear in the main app swipe interface</li>
              <li>• Each market will resolve automatically after 24 hours</li>
              <li>• Contract addresses can be used for direct interaction</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}