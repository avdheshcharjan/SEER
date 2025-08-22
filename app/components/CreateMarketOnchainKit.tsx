"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { UnifiedMarket } from '@/lib/types';
import { SupabaseService } from '@/lib/supabase';
import { generateCreateMarketCalls, handleTransactionStatus } from '@/lib/gasless-onchainkit';
import { processMarketCreation, validateMarketCreation } from '@/lib/market-factory-onchainkit';
import { Address } from 'viem';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { Transaction, TransactionButton, TransactionSponsor, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';

// Import the TransactionStatus type from our local types
import type { TransactionStatus } from '@/lib/types/onchainkit';



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

export function CreateMarketOnchainKit({ onBack }: CreateMarketProps) {
    const { addCreatedMarket } = useAppStore();
    const { address } = useAccount();
    const [step, setStep] = useState<'form' | 'preview' | 'creating'>('form');
    const [formData, setFormData] = useState({
        ticker: 'ETH',
        price: '',
        direction: 'above' as 'above' | 'below',
        endDate: '',
    });
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [loadingTokenData, setLoadingTokenData] = useState(false);
    const [marketQuestion, setMarketQuestion] = useState('');
    const [marketEndTime, setMarketEndTime] = useState<Date | null>(null);

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
                    priceChange: tokenInfo.usd_24h_change,
                    marketCap: tokenInfo.usd_market_cap?.toLocaleString() || 'N/A',
                    volume: tokenInfo.usd_24h_vol?.toLocaleString() || 'N/A',
                });
            }
        } catch (error) {
            console.error('Failed to fetch token data:', error);
        } finally {
            setLoadingTokenData(false);
        }
    };

    useEffect(() => {
        fetchTokenData(formData.ticker);
    }, [formData.ticker]);

    // Generate question string
    const generateQuestion = () => {
        if (!formData.ticker || !formData.price || !formData.endDate) {
            return 'Please fill all fields';
        }

        const endDate = new Date(formData.endDate).toLocaleDateString();
        const direction = formData.direction === 'above' ? 'above' : 'below';
        return `Will ${formData.ticker} be ${direction} $${formData.price} by ${endDate}?`;
    };

    const handlePreview = () => {
        if (!formData.price || !formData.endDate) {
            toast.error('Please fill in all fields');
            return;
        }

        const question = generateQuestion();
        const endTime = new Date(formData.endDate);

        setMarketQuestion(question);
        setMarketEndTime(endTime);

        // Validate parameters
        const validation = validateMarketCreation({
            question,
            endTime,
            creatorAddress: address as Address
        });

        if (!validation.valid) {
            toast.error(validation.errors.join(', '));
            return;
        }

        setStep('preview');
    };

    // Handle transaction status updates from OnchainKit
    const onTransactionStatus = (status: any) => {
        handleTransactionStatus(
            status,
            async (txHash: string) => {
                // On success, process market creation with proper contract address parsing
                try {
                    // Use the existing processMarketCreation function to handle contract address extraction
                    const result = await processMarketCreation({
                        question: generateQuestion(),
                        category: 'crypto',
                        endTime: new Date(formData.endDate),
                        creatorAddress: address as Address,
                        transactionHash: txHash
                    });

                    if (!result.success) {
                        throw new Error(result.error || 'Failed to process market creation');
                    }

                    // Get the created market from database (now has proper contract address)
                    const supabaseMarket = await SupabaseService.getMarket(result.marketId!);

                    const newMarket: UnifiedMarket = {
                        id: supabaseMarket.id,
                        question: supabaseMarket.question,
                        description: `A prediction market for ${formData.ticker} price`,
                        category: 'crypto',
                        endTime: supabaseMarket.end_time,
                        totalVolume: 0,
                        yesPrice: 0.5,
                        noPrice: 0.5,
                        yesOdds: 50,
                        noOdds: 50,
                        yesPool: supabaseMarket.yes_pool,
                        noPool: supabaseMarket.no_pool,
                        totalYesShares: supabaseMarket.total_yes_shares,
                        totalNoShares: supabaseMarket.total_no_shares,
                        yesShares: 0,
                        noShares: 0,
                        creatorAddress: supabaseMarket.creator_address,
                        contractAddress: result.contractAddress!, // Now has the real contract address
                        createdAt: supabaseMarket.created_at,
                        resolved: false,
                        outcome: null,
                        ticker: formData.ticker,
                        targetPrice: parseFloat(formData.price),
                        direction: formData.direction,
                        transactionHash: txHash,
                    };

                    addCreatedMarket(newMarket);

                    toast.success(`Market created successfully! 🎉\nTransaction: ${txHash}`, {
                        duration: 8000,
                        style: {
                            borderRadius: '12px',
                            background: '#1e293b',
                            color: '#f1f5f9',
                            border: '1px solid #10b981',
                        },
                    });

                    // Reset form and go back
                    setStep('form');
                    setFormData({
                        ticker: 'ETH',
                        price: '',
                        direction: 'above',
                        endDate: '',
                    });
                    onBack();

                } catch (error) {
                    console.error('Market creation failed:', error);
                    toast.error(`Failed to save market: ${error instanceof Error ? error.message : 'Unknown error'}`, {
                        style: {
                            borderRadius: '12px',
                            background: '#1e293b',
                            color: '#f1f5f9',
                            border: '1px solid #ef4444',
                        },
                    });
                }
            },
            (error: string) => {
                // On error
                toast.error(`Market creation failed: ${error}`, {
                    style: {
                        borderRadius: '12px',
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #ef4444',
                    },
                });

                setStep('preview');
            }
        );
    };

    if (!address) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-white text-lg">Please connect your wallet to create a market</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>
                    <h1 className="text-2xl font-bold text-white">Create Market</h1>
                    <div className="w-20" />
                </div>

                {step === 'form' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-lg mx-auto"
                    >
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50">
                            {/* Ticker Selection */}
                            <div>
                                <label className="block text-white mb-2 font-medium">Select Token</label>
                                <select
                                    value={formData.ticker}
                                    onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                >
                                    {TICKERS.map(ticker => (
                                        <option key={ticker.value} value={ticker.value} className="text-black">
                                            {ticker.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Token Info */}
                            {tokenData && !loadingTokenData && (
                                <div className="bg-slate-700/30 rounded-xl p-4 space-y-2 border border-slate-600/50">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Current Price</span>
                                        <span className="text-white font-bold">${tokenData.currentPrice}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">24h Change</span>
                                        <span className={`font-bold ${tokenData.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {tokenData.priceChange >= 0 ? '+' : ''}{tokenData.priceChange.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Direction Selection */}
                            <div>
                                <label className="block text-white mb-2 font-medium">Price Direction</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, direction: 'above' })}
                                        className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${formData.direction === 'above'
                                            ? 'bg-green-500 text-white shadow-lg'
                                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
                                            }`}
                                    >
                                        <TrendingUp className="w-5 h-5" />
                                        Above
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, direction: 'below' })}
                                        className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${formData.direction === 'below'
                                            ? 'bg-red-500 text-white shadow-lg'
                                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
                                            }`}
                                    >
                                        <TrendingDown className="w-5 h-5" />
                                        Below
                                    </button>
                                </div>
                            </div>

                            {/* Target Price */}
                            <div>
                                <label className="block text-white mb-2 font-medium">Target Price ($)</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="Enter target price"
                                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-white mb-2 font-medium">End Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                />
                            </div>

                            {/* Preview Button */}
                            <button
                                onClick={handlePreview}
                                className="w-full py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25"
                            >
                                Preview Market
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'preview' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-lg mx-auto"
                    >
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50">
                            <h2 className="text-xl font-bold text-white">Market Preview</h2>

                            <div className="bg-slate-700/30 rounded-xl p-4 space-y-3 border border-slate-600/50">
                                <p className="text-white text-lg font-semibold">{marketQuestion}</p>
                                <div className="space-y-2 text-slate-300">
                                    <p>End Date: {marketEndTime?.toLocaleString()}</p>
                                    <p>Initial Liquidity: 10 USDC each side</p>
                                    <p>Transaction: Gasless (sponsored)</p>
                                </div>
                            </div>

                            {/* OnchainKit Transaction - Gasless Market Creation */}
                            <Transaction
                                isSponsored={true}
                                calls={generateCreateMarketCalls(
                                    generateQuestion(),
                                    BigInt(Math.floor(new Date(formData.endDate).getTime() / 1000))
                                )}
                                onStatus={onTransactionStatus}
                            >
                                <TransactionButton
                                    className="w-full py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25 disabled:opacity-50"
                                    text="Create Market"
                                />
                                <TransactionSponsor />
                                <TransactionStatusLabel />
                                <TransactionStatusAction />
                            </Transaction>

                            <button
                                onClick={() => setStep('form')}
                                className="w-full py-3 bg-slate-700/50 text-white rounded-xl font-semibold hover:bg-slate-600/50 transition-colors border border-slate-600/50"
                            >
                                Back to Edit
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}