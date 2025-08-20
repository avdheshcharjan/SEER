"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { PredictionMarket } from '@/lib/prediction-markets';
import toast from 'react-hot-toast';

interface CreateMarketProps {
    onBack: () => void;
}

const TICKERS = [
    { value: 'ETH', label: 'Ethereum (ETH)', symbol: 'ETH', coinGeckoId: 'ethereum' },
    { value: 'BTC', label: 'Bitcoin (BTC)', symbol: 'BTC', coinGeckoId: 'bitcoin' },
    { value: 'FARTCOIN', label: 'Fartcoin (FARTCOIN)', symbol: 'FARTCOIN', coinGeckoId: 'fartcoin' },
];

interface TokenData {
    currentPrice: number;
    priceChange: number;
    marketCap: string;
    volume: string;
}

export function CreateMarket({ onBack }: CreateMarketProps) {
    const { user, addCreatedMarket } = useAppStore();
    const [step, setStep] = useState<'form' | 'preview' | 'creating'>('form');
    const [formData, setFormData] = useState({
        ticker: 'ETH',
        price: '',
        direction: 'above' as 'above' | 'below',
        endDate: '',
    });
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [loadingTokenData, setLoadingTokenData] = useState(false);

    // Fetch token data from CoinGecko
    const fetchTokenData = async (ticker: string) => {
        const selectedToken = TICKERS.find(t => t.value === ticker);
        if (!selectedToken) return;

        setLoadingTokenData(true);
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${selectedToken.coinGeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&include_24hr_vol=true`
            );
            const data = await response.json();
            const tokenInfo = data[selectedToken.coinGeckoId];
            
            if (tokenInfo) {
                setTokenData({
                    currentPrice: tokenInfo.usd,
                    priceChange: tokenInfo.usd_24h_change || 0,
                    marketCap: `$${(tokenInfo.usd_market_cap / 1e9).toFixed(1)}B`,
                    volume: `$${(tokenInfo.usd_24h_vol / 1e6).toFixed(1)}M Volume`
                });
            }
        } catch (error) {
            console.error('Error fetching token data:', error);
            toast.error('Failed to fetch token data');
        } finally {
            setLoadingTokenData(false);
        }
    };

    // Auto-fetch token data when ticker changes
    useEffect(() => {
        fetchTokenData(formData.ticker);
    }, [formData.ticker]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.ticker || !formData.price || !formData.endDate) {
            toast.error('Please fill all fields');
            return;
        }

        if (!user?.address) {
            toast.error('Please connect your wallet first');
            return;
        }

        const price = parseFloat(formData.price);
        if (isNaN(price) || price <= 0) {
            toast.error('Please enter a valid price');
            return;
        }

        const endDate = new Date(formData.endDate);
        const now = new Date();
        const minTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        if (endDate <= minTime) {
            toast.error('End date must be at least 24 hours from now');
            return;
        }

        setStep('preview');
    };

    const handleCreateMarket = async () => {
        if (!user?.address) {
            toast.error('Please connect your wallet');
            return;
        }

        setStep('creating');

        try {
            // Simulate market creation (in real app, this would call smart contract)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Create new market object with CoinGecko data
            const newMarket: PredictionMarket = {
                id: `market_${Date.now()}`,
                question: generateQuestion(),
                description: `A prediction market for ${formData.ticker} price`,
                category: 'crypto',
                endTime: new Date(formData.endDate).toISOString(),
                totalVolume: 0,
                yesPrice: 0.5,
                noPrice: 0.5,
                yesOdds: 50,
                noOdds: 50,
                yesShares: 0,
                noShares: 0,
                createdBy: user.address,
                createdAt: new Date().toISOString(),
                resolved: false,
                outcome: null,
                ticker: formData.ticker,
                targetPrice: parseFloat(formData.price),
                direction: formData.direction,
                isCreatedByUser: true,
                // Add CoinGecko data to prevent crashes
                currentPrice: tokenData?.currentPrice || 0,
                priceChange: tokenData?.priceChange || 0,
                marketCap: tokenData?.marketCap || 'N/A',
                volume: tokenData?.volume || '$0 Volume',
            };

            // Add to store
            addCreatedMarket(newMarket);

            toast.success('Market created successfully!');
            
            // Reset form and go back
            setFormData({
                ticker: 'ETH',
                price: '',
                direction: 'above',
                endDate: '',
            });
            setStep('form');
            onBack();

        } catch (error) {
            console.error('Error creating market:', error);
            toast.error('Failed to create market. Please try again.');
            setStep('preview');
        }
    };

    if (step === 'creating') {
        return (
            <div className="w-full max-w-md mx-auto px-4">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <div className="w-16 h-16 border-4 border-base-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h2 className="text-xl font-bold text-white mb-2">Creating Market</h2>
                        <p className="text-slate-400">Deploying to Base Sepolia...</p>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (step === 'preview') {
        return (
            <div className="w-full max-w-md mx-auto px-4">
                <header className="flex items-center mb-6">
                    <button
                        onClick={() => setStep('form')}
                        className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors -ml-2"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <h1 className="text-xl font-bold text-white ml-2">Preview Market</h1>
                </header>

                <div className="space-y-6">
                    {/* Market Preview Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                    {formData.ticker}
                                </div>
                                <span className="text-sm text-slate-400">Crypto</span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-400">Ends</div>
                                <div className="text-sm font-medium text-white">
                                    {new Date(formData.endDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold text-white mb-4 leading-tight">
                            {generateQuestion()}
                        </h3>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                                <div className="text-green-400 font-bold text-lg">50%</div>
                                <div className="text-green-300 text-sm">YES</div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                                <div className="text-red-400 font-bold text-lg">50%</div>
                                <div className="text-red-300 text-sm">NO</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="text-slate-400">
                                Target: <span className="text-white">${formData.price}</span>
                            </div>
                            <div className="text-slate-400">
                                Direction: <span className={formData.direction === 'above' ? 'text-green-400' : 'text-red-400'}>
                                    {formData.direction.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <motion.button
                            onClick={handleCreateMarket}
                            className="w-full bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-base-500/25"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <Plus className="w-5 h-5" />
                                <span>Create Market</span>
                            </div>
                        </motion.button>

                        <button
                            onClick={() => setStep('form')}
                            className="w-full bg-slate-700/50 hover:bg-slate-600/50 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                        >
                            Edit Market
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto px-4">
            <header className="flex items-center mb-6">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors -ml-2"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h1 className="text-xl font-bold text-white ml-2">Create Market</h1>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Ticker Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                        Select Ticker
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {TICKERS.map((ticker) => (
                            <button
                                key={ticker.value}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, ticker: ticker.value }))}
                                className={`p-3 rounded-xl border transition-all ${
                                    formData.ticker === ticker.value
                                        ? 'bg-base-500/20 border-base-500 text-base-400'
                                        : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                                }`}
                            >
                                <div className="text-center">
                                    <div className="font-bold text-sm">{ticker.symbol}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Current Price Display */}
                    {loadingTokenData && (
                        <div className="mt-3 p-3 bg-slate-800/20 rounded-lg border border-slate-700/30">
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-base-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-slate-400">Fetching current price...</span>
                            </div>
                        </div>
                    )}

                    {!loadingTokenData && tokenData && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 p-3 bg-slate-800/20 rounded-lg border border-slate-700/30"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Current Price:</span>
                                <span className="font-bold text-white">${tokenData.currentPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-slate-400">24h Change:</span>
                                <span className={`font-medium ${
                                    tokenData.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                    {tokenData.priceChange >= 0 ? '+' : ''}{tokenData.priceChange.toFixed(2)}%
                                </span>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Price Input */}
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-slate-300 mb-2">
                        Target Price (USD)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">$</span>
                        <input
                            type="number"
                            id="price"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="Enter target price"
                            className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl px-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-base-500/50 focus:border-transparent"
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
                            className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all ${
                                formData.direction === 'above'
                                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                    : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                            }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            <span>Above</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, direction: 'below' }))}
                            className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all ${
                                formData.direction === 'below'
                                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
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
                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-2">
                        End Date & Time
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="datetime-local"
                            id="endDate"
                            value={formData.endDate}
                            min={getMinDate()}
                            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-base-500/50 focus:border-transparent"
                            required
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Minimum 24 hours from now
                    </p>
                </div>

                {/* Generated Question Preview */}
                {formData.ticker && formData.price && formData.endDate && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4"
                    >
                        <div className="text-sm text-slate-400 mb-1">Question Preview:</div>
                        <div className="text-white font-medium">{generateQuestion()}</div>
                    </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                    type="submit"
                    className="w-full bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-base-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!formData.ticker || !formData.price || !formData.endDate}
                >
                    <div className="flex items-center justify-center space-x-2">
                        <span>Preview Market</span>
                    </div>
                </motion.button>
            </form>
        </div>
    );
}