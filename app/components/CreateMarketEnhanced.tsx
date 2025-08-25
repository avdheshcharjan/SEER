"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles, Users, Trophy, Calendar, Tag } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { UnifiedMarket } from '@/lib/types';
import { SupabaseService } from '@/lib/supabase';
import { generateCreateMarketCalls } from '@/lib/market-factory-onchainkit';
import { processMarketCreation, validateMarketCreation } from '@/lib/market-factory-onchainkit';
import { Address } from 'viem';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { Transaction, TransactionButton, TransactionSponsor, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { getRandomMarketsFromCategory, type MarketTemplate } from '@/lib/expanded-markets';

interface CreateMarketProps {
    onBack: () => void;
}

type MarketCategory = 'crypto' | 'tech' | 'celebrity' | 'sports';
type CreateMode = 'template' | 'custom';

const CATEGORIES = [
    { 
        value: 'crypto' as MarketCategory, 
        label: 'Crypto', 
        icon: TrendingUp,
        color: 'from-orange-500 to-yellow-500',
        description: 'Cryptocurrency prices and blockchain events'
    },
    { 
        value: 'tech' as MarketCategory, 
        label: 'Tech', 
        icon: Sparkles,
        color: 'from-blue-500 to-purple-500',
        description: 'Technology companies, products, and innovation'
    },
    { 
        value: 'celebrity' as MarketCategory, 
        label: 'Celebrity', 
        icon: Users,
        color: 'from-pink-500 to-rose-500',
        description: 'Celebrity news, relationships, and career moves'
    },
    { 
        value: 'sports' as MarketCategory, 
        label: 'Sports', 
        icon: Trophy,
        color: 'from-green-500 to-emerald-500',
        description: 'Championships, records, and athletic achievements'
    }
];

const CRYPTO_TICKERS = [
    { value: 'ETH', label: 'Ethereum (ETH)', symbol: 'ETH', coinGeckoId: 'ethereum' },
    { value: 'BTC', label: 'Bitcoin (BTC)', symbol: 'BTC', coinGeckoId: 'bitcoin' },
    { value: 'SOL', label: 'Solana (SOL)', symbol: 'SOL', coinGeckoId: 'solana' },
    { value: 'BASE', label: 'Base Token (BASE)', symbol: 'BASE', coinGeckoId: 'base' },
];

interface TokenData {
    currentPrice: number;
    priceChange: number;
    marketCap: string;
    volume: string;
}

export function CreateMarketEnhanced({ onBack }: CreateMarketProps) {
    const { addCreatedMarket } = useAppStore();
    const { address } = useAccount();
    const [step, setStep] = useState<'category' | 'mode' | 'form' | 'preview'>('category');
    const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('crypto');
    const [createMode, setCreateMode] = useState<CreateMode>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<MarketTemplate | null>(null);
    const [templateSuggestions, setTemplateSuggestions] = useState<MarketTemplate[]>([]);
    
    // Form data for custom markets
    const [customFormData, setCustomFormData] = useState({
        question: '',
        description: '',
        endDate: '',
        tags: [] as string[],
        newTag: ''
    });
    
    // Form data for crypto markets (existing functionality)
    const [cryptoFormData, setCryptoFormData] = useState({
        ticker: 'ETH',
        price: '',
        direction: 'above' as 'above' | 'below',
        endDate: '',
    });
    
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [loadingTokenData, setLoadingTokenData] = useState(false);
    const [marketQuestion, setMarketQuestion] = useState('');
    const [marketEndTime, setMarketEndTime] = useState<Date | null>(null);

    // Load template suggestions when category changes
    useEffect(() => {
        if (selectedCategory !== 'crypto') {
            const suggestions = getRandomMarketsFromCategory(selectedCategory, 5);
            setTemplateSuggestions(suggestions);
        }
    }, [selectedCategory]);

    // Fetch token data for crypto markets
    const fetchTokenData = async (ticker: string) => {
        const selectedToken = CRYPTO_TICKERS.find(t => t.value === ticker);
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
        if (selectedCategory === 'crypto') {
            fetchTokenData(cryptoFormData.ticker);
        }
    }, [selectedCategory, cryptoFormData.ticker]);

    // Generate question based on category and form data
    const generateQuestion = (): string => {
        if (selectedCategory === 'crypto') {
            if (!cryptoFormData.ticker || !cryptoFormData.price || !cryptoFormData.endDate) {
                return 'Please fill all fields';
            }
            const endDate = new Date(cryptoFormData.endDate).toLocaleDateString();
            const direction = cryptoFormData.direction === 'above' ? 'above' : 'below';
            return `Will ${cryptoFormData.ticker} be ${direction} $${cryptoFormData.price} by ${endDate}?`;
        } else if (selectedTemplate) {
            return selectedTemplate.question;
        } else if (createMode === 'custom') {
            return customFormData.question || 'Enter your market question';
        }
        return 'Select a template or create custom market';
    };

    const handleCategorySelect = (category: MarketCategory) => {
        setSelectedCategory(category);
        setStep('mode');
    };

    const handleModeSelect = (mode: CreateMode) => {
        setCreateMode(mode);
        if (mode === 'template' && selectedCategory !== 'crypto') {
            // For non-crypto categories, show template selection
            setStep('form');
        } else {
            setStep('form');
        }
    };

    const handleTemplateSelect = (template: MarketTemplate) => {
        setSelectedTemplate(template);
        // Auto-fill end date and description
        setCustomFormData({
            ...customFormData,
            question: template.question,
            description: template.description,
            endDate: template.endTime.slice(0, 16), // Convert ISO to datetime-local format
            tags: template.tags
        });
    };

    const addTag = () => {
        if (customFormData.newTag.trim() && !customFormData.tags.includes(customFormData.newTag.trim())) {
            setCustomFormData({
                ...customFormData,
                tags: [...customFormData.tags, customFormData.newTag.trim()],
                newTag: ''
            });
        }
    };

    const removeTag = (tag: string) => {
        setCustomFormData({
            ...customFormData,
            tags: customFormData.tags.filter(t => t !== tag)
        });
    };

    const handlePreview = () => {
        const question = generateQuestion();
        let endTime: Date;
        
        if (selectedCategory === 'crypto') {
            if (!cryptoFormData.price || !cryptoFormData.endDate) {
                toast.error('Please fill in all fields');
                return;
            }
            endTime = new Date(cryptoFormData.endDate);
        } else {
            if (!customFormData.question || !customFormData.endDate) {
                toast.error('Please fill in all fields');
                return;
            }
            endTime = new Date(customFormData.endDate);
        }

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
    const onTransactionStatus = (status: LifecycleStatus) => {
        if (status.statusName === 'success' && status.statusData && 'transactionReceipts' in status.statusData) {
            const txHash = status.statusData.transactionReceipts?.[0]?.transactionHash;
            if (txHash) {
                (async () => {
                    try {
                        const result = await processMarketCreation({
                            question: generateQuestion(),
                            category: selectedCategory,
                            endTime: marketEndTime!,
                            creatorAddress: address as Address,
                            transactionHash: txHash
                        });

                        if (!result.success) {
                            throw new Error(result.error || 'Failed to process market creation');
                        }

                        const supabaseMarket = await SupabaseService.getMarket(result.marketId!);
                        
                        const newMarket: UnifiedMarket = {
                            id: supabaseMarket.id,
                            question: supabaseMarket.question,
                            description: selectedCategory === 'crypto' 
                                ? `A prediction market for ${cryptoFormData.ticker} price`
                                : customFormData.description,
                            category: selectedCategory,
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
                            contractAddress: result.contractAddress!,
                            createdAt: supabaseMarket.created_at,
                            resolved: false,
                            outcome: null,
                            ticker: selectedCategory === 'crypto' ? cryptoFormData.ticker : undefined,
                            targetPrice: selectedCategory === 'crypto' ? parseFloat(cryptoFormData.price) : undefined,
                            direction: selectedCategory === 'crypto' ? cryptoFormData.direction : undefined,
                            tags: selectedCategory !== 'crypto' ? customFormData.tags : undefined,
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

                        // Reset and go back
                        resetForm();
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
                })();
            }
        }
        
        if (status.statusName === 'error' && status.statusData && 'message' in status.statusData) {
            toast.error(`Market creation failed: ${status.statusData.message}`, {
                style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #ef4444',
                },
            });
            setStep('preview');
        }
    };

    const resetForm = () => {
        setStep('category');
        setSelectedCategory('crypto');
        setCreateMode('template');
        setSelectedTemplate(null);
        setCustomFormData({
            question: '',
            description: '',
            endDate: '',
            tags: [],
            newTag: ''
        });
        setCryptoFormData({
            ticker: 'ETH',
            price: '',
            direction: 'above',
            endDate: '',
        });
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
                        onClick={() => {
                            if (step === 'category') {
                                onBack();
                            } else if (step === 'mode') {
                                setStep('category');
                            } else if (step === 'form') {
                                setStep('mode');
                            } else if (step === 'preview') {
                                setStep('form');
                            }
                        }}
                        className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>
                    <h1 className="text-2xl font-bold text-white">Create Market</h1>
                    <div className="w-20" />
                </div>

                {/* Category Selection */}
                {step === 'category' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-white mb-4">Choose Market Category</h2>
                            <p className="text-slate-400 text-lg">Select the type of prediction market you want to create</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {CATEGORIES.map((category) => {
                                const Icon = category.icon;
                                return (
                                    <motion.button
                                        key={category.value}
                                        onClick={() => handleCategorySelect(category.value)}
                                        className="p-8 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 text-left group hover:scale-105"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center mb-4`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-base-400 transition-colors">
                                            {category.label}
                                        </h3>
                                        <p className="text-slate-400 leading-relaxed">
                                            {category.description}
                                        </p>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Mode Selection */}
                {step === 'mode' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">
                                Create {CATEGORIES.find(c => c.value === selectedCategory)?.label} Market
                            </h2>
                            <p className="text-slate-400">Choose how you want to create your market</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <motion.button
                                onClick={() => handleModeSelect('template')}
                                className="p-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 text-center group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-4 mx-auto">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Use Template</h3>
                                <p className="text-slate-400 text-sm">
                                    {selectedCategory === 'crypto' 
                                        ? 'Create price prediction markets with built-in token data'
                                        : 'Choose from popular market templates'
                                    }
                                </p>
                            </motion.button>

                            <motion.button
                                onClick={() => handleModeSelect('custom')}
                                className="p-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 text-center group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mb-4 mx-auto">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Create Custom</h3>
                                <p className="text-slate-400 text-sm">
                                    Build your own unique prediction market from scratch
                                </p>
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {/* Form Step - Different forms based on category and mode */}
                {step === 'form' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto"
                    >
                        {selectedCategory === 'crypto' && createMode === 'template' && (
                            // Crypto Template Form (existing functionality)
                            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50">
                                <h2 className="text-xl font-bold text-white">Create Crypto Price Market</h2>
                                
                                {/* Token Selection */}
                                <div>
                                    <label className="block text-white mb-2 font-medium">Select Token</label>
                                    <select
                                        value={cryptoFormData.ticker}
                                        onChange={(e) => setCryptoFormData({ ...cryptoFormData, ticker: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                    >
                                        {CRYPTO_TICKERS.map(ticker => (
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
                                            onClick={() => setCryptoFormData({ ...cryptoFormData, direction: 'above' })}
                                            className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${cryptoFormData.direction === 'above'
                                                ? 'bg-green-500 text-white shadow-lg'
                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
                                                }`}
                                        >
                                            <TrendingUp className="w-5 h-5" />
                                            Above
                                        </button>
                                        <button
                                            onClick={() => setCryptoFormData({ ...cryptoFormData, direction: 'below' })}
                                            className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${cryptoFormData.direction === 'below'
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
                                        value={cryptoFormData.price}
                                        onChange={(e) => setCryptoFormData({ ...cryptoFormData, price: e.target.value })}
                                        placeholder="Enter target price"
                                        className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                    />
                                </div>

                                {/* End Date */}
                                <div>
                                    <label className="block text-white mb-2 font-medium">End Date</label>
                                    <input
                                        type="datetime-local"
                                        value={cryptoFormData.endDate}
                                        onChange={(e) => setCryptoFormData({ ...cryptoFormData, endDate: e.target.value })}
                                        min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                                        className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                    />
                                </div>

                                <button
                                    onClick={handlePreview}
                                    className="w-full py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25"
                                >
                                    Preview Market
                                </button>
                            </div>
                        )}

                        {(selectedCategory !== 'crypto' && createMode === 'template') && (
                            // Template Selection for non-crypto categories
                            <div className="space-y-6">
                                <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                                    <h2 className="text-xl font-bold text-white mb-4">
                                        Choose {CATEGORIES.find(c => c.value === selectedCategory)?.label} Template
                                    </h2>
                                    <p className="text-slate-400 mb-6">Select a popular market template to customize</p>
                                    
                                    <div className="space-y-3">
                                        {templateSuggestions.map((template, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleTemplateSelect(template)}
                                                className={`w-full p-4 rounded-xl text-left transition-all border ${
                                                    selectedTemplate?.question === template.question
                                                        ? 'bg-base-500/20 border-base-500/50 text-white'
                                                        : 'bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/30'
                                                }`}
                                            >
                                                <div className="font-medium text-white mb-1">{template.question}</div>
                                                <div className="text-sm text-slate-400">{template.description}</div>
                                                <div className="flex gap-2 mt-2">
                                                    {template.tags.slice(0, 3).map(tag => (
                                                        <span key={tag} className="text-xs px-2 py-1 bg-slate-600/50 rounded-full">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedTemplate && (
                                    <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                                        <h3 className="text-lg font-bold text-white mb-4">Customize Your Market</h3>
                                        
                                        {/* Question */}
                                        <div className="mb-4">
                                            <label className="block text-white mb-2 font-medium">Question</label>
                                            <input
                                                type="text"
                                                value={customFormData.question}
                                                onChange={(e) => setCustomFormData({ ...customFormData, question: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="mb-4">
                                            <label className="block text-white mb-2 font-medium">Description</label>
                                            <textarea
                                                value={customFormData.description}
                                                onChange={(e) => setCustomFormData({ ...customFormData, description: e.target.value })}
                                                rows={3}
                                                className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                            />
                                        </div>

                                        {/* End Date */}
                                        <div className="mb-4">
                                            <label className="block text-white mb-2 font-medium">End Date</label>
                                            <input
                                                type="datetime-local"
                                                value={customFormData.endDate}
                                                onChange={(e) => setCustomFormData({ ...customFormData, endDate: e.target.value })}
                                                min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                                                className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                            />
                                        </div>

                                        {/* Tags */}
                                        <div className="mb-6">
                                            <label className="block text-white mb-2 font-medium">Tags</label>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={customFormData.newTag}
                                                    onChange={(e) => setCustomFormData({ ...customFormData, newTag: e.target.value })}
                                                    placeholder="Add tag"
                                                    className="flex-1 px-4 py-2 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                                />
                                                <button
                                                    onClick={addTag}
                                                    className="px-4 py-2 bg-base-500 hover:bg-base-600 text-white rounded-xl transition-colors"
                                                >
                                                    <Tag className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {customFormData.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        onClick={() => removeTag(tag)}
                                                        className="px-3 py-1 bg-base-500/20 text-base-400 rounded-full text-sm cursor-pointer hover:bg-base-500/30 transition-colors"
                                                    >
                                                        {tag} ×
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={handlePreview}
                                            className="w-full py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25"
                                        >
                                            Preview Market
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {createMode === 'custom' && (
                            // Custom Market Form
                            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50">
                                <h2 className="text-xl font-bold text-white">
                                    Create Custom {CATEGORIES.find(c => c.value === selectedCategory)?.label} Market
                                </h2>
                                
                                {/* Question */}
                                <div>
                                    <label className="block text-white mb-2 font-medium">Question</label>
                                    <input
                                        type="text"
                                        value={customFormData.question}
                                        onChange={(e) => setCustomFormData({ ...customFormData, question: e.target.value })}
                                        placeholder="Will [event] happen by [date]?"
                                        className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-white mb-2 font-medium">Description</label>
                                    <textarea
                                        value={customFormData.description}
                                        onChange={(e) => setCustomFormData({ ...customFormData, description: e.target.value })}
                                        placeholder="Provide context and details about this prediction market..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                    />
                                </div>

                                {/* End Date */}
                                <div>
                                    <label className="block text-white mb-2 font-medium">End Date</label>
                                    <input
                                        type="datetime-local"
                                        value={customFormData.endDate}
                                        onChange={(e) => setCustomFormData({ ...customFormData, endDate: e.target.value })}
                                        min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                                        className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-white mb-2 font-medium">Tags</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={customFormData.newTag}
                                            onChange={(e) => setCustomFormData({ ...customFormData, newTag: e.target.value })}
                                            placeholder="Add relevant tags..."
                                            className="flex-1 px-4 py-2 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"
                                            onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                        />
                                        <button
                                            onClick={addTag}
                                            className="px-4 py-2 bg-base-500 hover:bg-base-600 text-white rounded-xl transition-colors"
                                        >
                                            <Tag className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {customFormData.tags.map(tag => (
                                            <span
                                                key={tag}
                                                onClick={() => removeTag(tag)}
                                                className="px-3 py-1 bg-base-500/20 text-base-400 rounded-full text-sm cursor-pointer hover:bg-base-500/30 transition-colors"
                                            >
                                                {tag} ×
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handlePreview}
                                    className="w-full py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25"
                                >
                                    Preview Market
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Preview Step */}
                {step === 'preview' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-lg mx-auto"
                    >
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50">
                            <h2 className="text-xl font-bold text-white">Market Preview</h2>

                            <div className="bg-slate-700/30 rounded-xl p-4 space-y-3 border border-slate-600/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${
                                        CATEGORIES.find(c => c.value === selectedCategory)?.color
                                    } text-white`}>
                                        {CATEGORIES.find(c => c.value === selectedCategory)?.label}
                                    </span>
                                </div>
                                
                                <p className="text-white text-lg font-semibold">{marketQuestion}</p>
                                
                                {selectedCategory !== 'crypto' && customFormData.description && (
                                    <p className="text-slate-300 text-sm">{customFormData.description}</p>
                                )}
                                
                                <div className="space-y-2 text-slate-300">
                                    <p className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        End Date: {marketEndTime?.toLocaleString()}
                                    </p>
                                    <p>Initial Liquidity: 10 USDC each side</p>
                                    <p>Transaction: Gasless (sponsored)</p>
                                </div>

                                {selectedCategory !== 'crypto' && customFormData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {customFormData.tags.map(tag => (
                                            <span key={tag} className="text-xs px-2 py-1 bg-slate-600/50 rounded-full text-slate-300">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* OnchainKit Transaction */}
                            <Transaction
                                isSponsored={true}
                                calls={generateCreateMarketCalls({
                                    question: marketQuestion,
                                    endTime: marketEndTime!,
                                    resolverAddress: address as Address
                                })}
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