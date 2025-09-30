"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Database } from 'lucide-react';
import { MarketCreator } from './components/MarketCreator';
import { CreatedMarkets } from './components/CreatedMarkets';

type AdminViewType = 'main' | 'create' | 'success';

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

export default function AdminPage() {
  const [currentView, setCurrentView] = useState<AdminViewType>('main');
  const [createdMarkets, setCreatedMarkets] = useState<CreatedMarket[]>([]);
  const [failedMarkets, setFailedMarkets] = useState<FailedMarket[]>([]);

  // Type for MarketCreator component (legacy format)
  interface LegacyCreatedMarket {
    id: string;
    question: string;
    contractAddress: string;
    transactionHash: string;
    category: string;
    endTime: Date;
  }

  const handleMarketsCreated = (legacyMarkets: LegacyCreatedMarket[]) => {
    // Transform legacy format to new API format
    const transformedMarkets: CreatedMarket[] = legacyMarkets.map(market => ({
      id: market.id,
      question: market.question,
      category: market.category,
      contract_address: market.contractAddress,
      explorer_url: `https://sepolia.base.org/address/${market.contractAddress}`,
      transactionHash: market.transactionHash,
      endTime: market.endTime
    }));

    setCreatedMarkets(transformedMarkets);
    setFailedMarkets([]); // No failed markets from legacy implementation
    setCurrentView('success');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setCreatedMarkets([]);
    setFailedMarkets([]);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create':
        return (
          <MarketCreator
            onBack={() => setCurrentView('main')}
            onSuccess={handleMarketsCreated}
          />
        );
      case 'success':
        return (
          <CreatedMarkets
            markets={createdMarkets}
            failedMarkets={failedMarkets}
            onBack={handleBackToMain}
          />
        );
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Admin Panel</h1>
                <p className="text-slate-400">Manage prediction markets and smart contracts</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setCurrentView('create')}
                  className="w-full p-4 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Bulk Create Markets</div>
                      <div className="text-sm opacity-80">Deploy 10 smart contract markets</div>
                    </div>
                  </div>
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                <h3 className="text-white font-semibold mb-2">Quick Stats</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Factory Contract:</span>
                    <span className="font-mono text-xs text-blue-400">0xe23c...Ee7C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="text-green-400">Base Sepolia</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gas Sponsorship:</span>
                    <span className="text-green-400">Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto mobile-container py-6 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors ios-button"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to App</span>
            <span className="sm:hidden">Back</span>
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-white">
            {currentView === 'create' ? 'Create Markets' :
             currentView === 'success' ? 'Markets Created' : 'Admin'}
          </h1>
          <div className="w-16 sm:w-20" />
        </div>

        {/* Main Content */}
        <main className="min-h-[calc(100vh-200px)]">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}