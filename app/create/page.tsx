"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
// import { useComposeCast } from '@coinbase/onchainkit/minikit';

const TICKERS = [
  { value: 'ETH', label: 'Ethereum', symbol: 'ETH' },
  { value: 'BTC', label: 'Bitcoin', symbol: 'BTC' },
  { value: 'BASE', label: 'Base', symbol: 'BASE' },
];

export default function CreatePage() {
  // const { composeCast } = useComposeCast();
  const [formData, setFormData] = useState({
    ticker: 'ETH',
    price: '',
    direction: 'above' as 'above' | 'below',
    endDate: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Get minimum date (24 hours from now)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  };

  // Generate question string
  const generateQuestion = () => {
    if (!formData.ticker || !formData.price || !formData.endDate) {
      return 'Please fill all fields';
    }

    const endDate = new Date(formData.endDate).toLocaleDateString();
    const direction = formData.direction === 'above' ? 'above' : 'below';
    return `Will ${formData.ticker} be ${direction} $${formData.price} by ${endDate}?`;
  };

  const handleCreateMarket = async () => {
    if (!formData.ticker || !formData.price || !formData.endDate) {
      toast.error('Please fill all fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const endDate = new Date(formData.endDate);
    const now = new Date();
    const minTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (endDate <= minTime) {
      toast.error('End date must be at least 24 hours from now');
      return;
    }

    setIsCreating(true);

    try {
      // Simulate market creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // const marketId = `market_${Date.now()}`;
      // const marketUrl = `${process.env.NEXT_PUBLIC_URL}/market/${marketId}`;
      // const question = generateQuestion();

      // Use OnchainKit's compose cast to share the created market
      // composeCast({
      //   text: `${question} 🎯\n\nJust created this prediction market!`,
      //   embeds: [marketUrl],
      // });

      toast.success('Market created and shared successfully!');
    } catch (error) {
      console.error('Error creating market:', error);
      toast.error('Failed to create market. Please try again.');
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl"
        >
          <div className="w-16 h-16 border-4 border-base-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white mb-2">Creating Market</h2>
          <p className="text-slate-300">Deploying your prediction...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => history.back()}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold">Create Market</h1>
          <div className="w-16" />
        </div>

        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-3xl shadow-xl p-6">

          <div className="space-y-6">
            {/* Ticker Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Select Asset
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TICKERS.map((ticker) => (
                  <button
                    key={ticker.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, ticker: ticker.value }))}
                    className={`p-3 rounded-xl border transition-all ${formData.ticker === ticker.value
                      ? 'bg-base-500/20 border-base-500 text-base-400'
                      : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                      }`}
                  >
                    <div className="text-center">
                      <div className="font-bold text-sm">{ticker.symbol}</div>
                      <div className="text-xs opacity-70">{ticker.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Enter target price"
                  className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl px-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-base-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Direction Toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Price Direction
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, direction: 'above' }))}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all ${formData.direction === 'above'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                    }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Above</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, direction: 'below' }))}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all ${formData.direction === 'below'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                    }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>Below</span>
                </button>
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End Date & Time
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  min={getMinDate()}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-base-500 focus:border-transparent"
                  required
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Minimum 24 hours from now</p>
            </div>

            {/* Question Preview */}
            {formData.ticker && formData.price && formData.endDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-base-500/10 border border-base-500/40 rounded-xl p-4"
              >
                <div className="text-sm text-base-400 mb-1">Question Preview:</div>
                <div className="text-white font-medium">{generateQuestion()}</div>
              </motion.div>
            )}

            {/* Create Button */}
            <motion.button
              onClick={handleCreateMarket}
              disabled={!formData.ticker || !formData.price || !formData.endDate}
              className="w-full bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-base-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>Create Prediction</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}