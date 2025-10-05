"use client"; "use client";



import { getRandomMarketsFromCategory, type MarketTemplate } from '@/lib/expanded-markets'; import { getRandomMarketsFromCategory, type MarketTemplate } from '@/lib/expanded-markets';

import { generateCreateMarketCalls, processMarketCreation, validateMarketCreation } from '@/lib/market-factory-onchainkit'; import { generateCreateMarketCalls, processMarketCreation, validateMarketCreation } from '@/lib/market-factory-onchainkit';

import { useAppStore } from '@/lib/store'; import { useAppStore } from '@/lib/store';

import { SupabaseService } from '@/lib/supabase'; import { SupabaseService } from '@/lib/supabase';

import { UnifiedMarket } from '@/lib/types'; import { UnifiedMarket } from '@/lib/types';

import type { LifecycleStatus } from '@coinbase/onchainkit/transaction'; import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

import { Transaction, TransactionButton, TransactionSponsor, TransactionStatusAction, TransactionStatusLabel } from '@coinbase/onchainkit/transaction'; import { Transaction, TransactionButton, TransactionSponsor, TransactionStatusAction, TransactionStatusLabel } from '@coinbase/onchainkit/transaction';

import { motion } from 'framer-motion'; import { motion } from 'framer-motion';

import { ArrowLeft, Calendar, Sparkles, Tag, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react'; import { ArrowLeft, Calendar, Sparkles, Tag, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react';

import { useEffect, useState } from 'react'; import { useEffect, useState } from 'react';

import toast from 'react-hot-toast'; import toast from 'react-hot-toast';

import { Address } from 'viem'; import { Address } from 'viem';

import { useAccount } from 'wagmi'; import { useAccount } from 'wagmi';

import { BackButton } from './BackButton'; import { BackButton } from './BackButton';



type MarketCategory = 'crypto' | 'tech' | 'celebrity' | 'sports'; export function CreateMarketEnhanced() {

    type CreateMode = 'template' | 'custom'; description: 'Championships, records, and athletic achievements'

}

const CATEGORIES = [];

{

    value: 'crypto' as MarketCategory,const CRYPTO_TICKERS = [

        label: 'Crypto', { value: 'ETH', label: 'Ethereum (ETH)', symbol: 'ETH', coinGeckoId: 'ethereum' },

        icon: TrendingUp, { value: 'BTC', label: 'Bitcoin (BTC)', symbol: 'BTC', coinGeckoId: 'bitcoin' },

        color: 'from-orange-500 to-yellow-500', { value: 'SOL', label: 'Solana (SOL)', symbol: 'SOL', coinGeckoId: 'solana' },

        description: 'Cryptocurrency prices and blockchain events'    { value: 'BASE', label: 'Base Token (BASE)', symbol: 'BASE', coinGeckoId: 'base' },

    },];

{

    value: 'tech' as MarketCategory, interface TokenData {

        label: 'Tech', currentPrice: number;

        icon: Sparkles, priceChange: number;

        color: 'from-blue-500 to-purple-500', marketCap: string;

        description: 'Technology companies, products, and innovation'    volume: string;

    },
}

{

    value: 'celebrity' as MarketCategory, "use client";

    label: 'Celebrity',

        icon: Users,import { getRandomMarketsFromCategory, type MarketTemplate } from '@/lib/expanded-markets';

    color: 'from-pink-500 to-rose-500',import { generateCreateMarketCalls, processMarketCreation, validateMarketCreation } from '@/lib/market-factory-onchainkit';

    description: 'Celebrity news, relationships, and career moves'import { useAppStore } from '@/lib/store';

}, import { SupabaseService } from '@/lib/supabase';

{
    import { UnifiedMarket } from '@/lib/types';

    value: 'sports' as MarketCategory,import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

    label: 'Sports',import { Transaction, TransactionButton, TransactionSponsor, TransactionStatusAction, TransactionStatusLabel } from '@coinbase/onchainkit/transaction';

    icon: Trophy,import { motion } from 'framer-motion';

    color: 'from-green-500 to-emerald-500',import { ArrowLeft, Calendar, Sparkles, Tag, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react';

    description: 'Championships, records, and athletic achievements'import { useEffect, useState } from 'react';

} import toast from 'react-hot-toast';

]; import { Address } from 'viem';

import { useAccount } from 'wagmi';

const CRYPTO_TICKERS = [import { BackButton } from './BackButton';

{ value: 'ETH', label: 'Ethereum (ETH)', symbol: 'ETH', coinGeckoId: 'ethereum' },

{ value: 'BTC', label: 'Bitcoin (BTC)', symbol: 'BTC', coinGeckoId: 'bitcoin' }, type MarketCategory = 'crypto' | 'tech' | 'celebrity' | 'sports';

{ value: 'SOL', label: 'Solana (SOL)', symbol: 'SOL', coinGeckoId: 'solana' }, type CreateMode = 'template' | 'custom';

{ value: 'BASE', label: 'Base Token (BASE)', symbol: 'BASE', coinGeckoId: 'base' },

]; const CATEGORIES = [

    {

        interface TokenData {
            value: 'crypto' as MarketCategory,

        currentPrice: number; label: 'Crypto',

        priceChange: number; icon: TrendingUp,

        marketCap: string; color: 'from-orange-500 to-yellow-500',

        volume: string; description: 'Cryptocurrency prices and blockchain events'

    }    },

{

    export function CreateMarketEnhanced() {
        value: 'tech' as MarketCategory,

    const { addCreatedMarket } = useAppStore(); label: 'Tech',

    const { address } = useAccount(); icon: Sparkles,

    const [step, setStep] = useState<'category' | 'mode' | 'form' | 'preview'>('category'); color: 'from-blue-500 to-purple-500',

    const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('crypto'); description: 'Technology companies, products, and innovation'

        const [createMode, setCreateMode] = useState<CreateMode>('template');
    },

    const [selectedTemplate, setSelectedTemplate] = useState<MarketTemplate | null>(null); {

        const [templateSuggestions, setTemplateSuggestions] = useState<MarketTemplate[]>([]); value: 'celebrity' as MarketCategory,

            label: 'Celebrity',

    // Form data for custom markets        icon: Users,

    const [customFormData, setCustomFormData] = useState({
                color: 'from-pink-500 to-rose-500',

                question: '', description: 'Celebrity news, relationships, and career moves'

        description: '',
            },

                endDate: '', {

                category: '', value: 'sports' as MarketCategory,

                tags: [] as string[], label: 'Sports',

                priceTarget: '', icon: Trophy,

                ticker: '', color: 'from-green-500 to-emerald-500',

                tokenData: null as TokenData | null        description: 'Championships, records, and athletic achievements'

            });
    }

];

    // Market creation state

    const [transactionStatus, setTransactionStatus] = useState<LifecycleStatus>('init'); const CRYPTO_TICKERS = [

    const [createdMarket, setCreatedMarket] = useState<UnifiedMarket | null>(null); { value: 'ETH', label: 'Ethereum (ETH)', symbol: 'ETH', coinGeckoId: 'ethereum' },

    const [isSubmitting, setIsSubmitting] = useState(false); { value: 'BTC', label: 'Bitcoin (BTC)', symbol: 'BTC', coinGeckoId: 'bitcoin' },

    { value: 'SOL', label: 'Solana (SOL)', symbol: 'SOL', coinGeckoId: 'solana' },

    // Price data for crypto markets    { value: 'BASE', label: 'Base Token (BASE)', symbol: 'BASE', coinGeckoId: 'base' },

    const [priceData, setPriceData] = useState<{ [key: string]: TokenData }>({});];



    useEffect(() => {
        interface TokenData {

            if(selectedCategory === 'crypto') {
                currentPrice: number;

        fetchPriceData(); priceChange: number;

    } marketCap: string;

}, [selectedCategory]); volume: string;

}

useEffect(() => {

    if (step === 'form' && createMode === 'template') {
        export function CreateMarketEnhanced() {

            loadTemplateSuggestions(); const { addCreatedMarket } = useAppStore();

        } const { address } = useAccount();

    }, [step, createMode, selectedCategory]); const [step, setStep] = useState<'category' | 'mode' | 'form' | 'preview'>('category');

const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('crypto');

const fetchPriceData = async () => {
    const [createMode, setCreateMode] = useState<CreateMode>('template');

    try {
        const [selectedTemplate, setSelectedTemplate] = useState<MarketTemplate | null>(null);

        const response = await fetch('/api/coingecko/price'); const [templateSuggestions, setTemplateSuggestions] = useState<MarketTemplate[]>([]);

        const data = await response.json();

        setPriceData(data);    // Form data for custom markets

    } catch (error) {
        const [customFormData, setCustomFormData] = useState({

            console.error('Failed to fetch price data:', error); question: '',

        }        description: '',

    }; endDate: '',

        tags: [] as string[],

    const loadTemplateSuggestions = () => {
        newTag: ''

        const suggestions = getRandomMarketsFromCategory(selectedCategory, 6);
    });

    setTemplateSuggestions(suggestions);

};    // Form data for crypto markets (existing functionality)

const [cryptoFormData, setCryptoFormData] = useState({

    const handleTransactionError = (error: Error) => {
        ticker: 'ETH',

            console.error('Transaction failed:', error); price: '',

                toast.error(`Transaction failed: ${error.message}`); direction: 'above' as 'above' | 'below',

                    setTransactionStatus('error'); endDate: '',

    };
});



const handleTransactionSuccess = async (response: any) => {
    const [tokenData, setTokenData] = useState<TokenData | null>(null);

    console.log('Transaction successful:', response); const [loadingTokenData, setLoadingTokenData] = useState(false);

    const [marketQuestion, setMarketQuestion] = useState('');

    try {
        const [marketEndTime, setMarketEndTime] = useState<Date | null>(null);

        // Process the market creation response

        const processedMarket = await processMarketCreation(response, address as Address);    // Load template suggestions when category changes

        useEffect(() => {

            if (processedMarket) {
                if (selectedCategory !== 'crypto') {

                    setCreatedMarket(processedMarket); const suggestions = getRandomMarketsFromCategory(selectedCategory, 5);

                    addCreatedMarket(processedMarket); setTemplateSuggestions(suggestions);

                    toast.success('Market created successfully!');
                }

                setTransactionStatus('success');
            }, [selectedCategory]);



        // Add to Supabase    // Fetch token data for crypto markets

        const supabase = new SupabaseService(); const fetchTokenData = async (ticker: string) => {

            await supabase.insertMarket(processedMarket); const selectedToken = CRYPTO_TICKERS.find(t => t.value === ticker);

            if (!selectedToken) return;

            setStep('preview');

        }        setLoadingTokenData(true);

    } catch (error) {
        try {

            console.error('Failed to process market creation:', error); const response = await fetch(

                toast.error('Failed to save market data'); `https://api.coingecko.com/api/v3/simple/price?ids=${selectedToken.coinGeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&include_24hr_vol=true`

            handleTransactionError(error as Error);            );

        }            const data = await response.json();

    }; const tokenInfo = data[selectedToken.coinGeckoId];



    const handleCategorySelect = (category: MarketCategory) => {
        if (tokenInfo) {

            setSelectedCategory(category); setTokenData({

                setStep('mode');                    currentPrice: tokenInfo.usd,

            }; priceChange: tokenInfo.usd_24h_change,

                marketCap: tokenInfo.usd_market_cap?.toLocaleString() || 'N/A',

    const handleModeSelect = (mode: CreateMode) => {
                volume: tokenInfo.usd_24h_vol?.toLocaleString() || 'N/A',

                    setCreateMode(mode);
            });

            setStep('form');
        }

    };
} catch (error) {

    console.error('Failed to fetch token data:', error);

    const handleTemplateSelect = (template: MarketTemplate) => { } finally {

        setSelectedTemplate(template); setLoadingTokenData(false);

    }

    // Pre-populate form with template data    };

    setCustomFormData({

        question: template.question, useEffect(() => {

            description: template.description || '', if(selectedCategory === 'crypto') {

        endDate: template.endDate || '', fetchTokenData(cryptoFormData.ticker);

        category: template.category,        }

    tags: template.tags || [],    }, [selectedCategory, cryptoFormData.ticker]);

priceTarget: template.priceTarget || '',

    ticker: template.ticker || '',    // Generate question based on category and form data

        tokenData: template.ticker && priceData[template.ticker.toLowerCase()] || null    const generateQuestion = (): string => {

        }); if (selectedCategory === 'crypto') {

            if (!cryptoFormData.ticker || !cryptoFormData.price || !cryptoFormData.endDate) {

                setStep('preview'); return 'Please fill all fields';

            };
        }

const endDate = new Date(cryptoFormData.endDate).toLocaleDateString();

const handleCustomFormSubmit = () => {
    const direction = cryptoFormData.direction === 'above' ? 'above' : 'below';

    // Validate form data            return `Will ${cryptoFormData.ticker} be ${direction} $${cryptoFormData.price} by ${endDate}?`;

    if (!customFormData.question || !customFormData.endDate) { } else if (selectedTemplate) {

        toast.error('Please fill in all required fields'); return selectedTemplate.question;

        return;
    } else if (createMode === 'custom') {

    } return customFormData.question || 'Enter your market question';

}

// Validate end date is in the future        return 'Select a template or create custom market';

const endDate = new Date(customFormData.endDate);    };

if (endDate <= new Date()) {

    toast.error('End date must be in the future'); const handleCategorySelect = (category: MarketCategory) => {

        return; setSelectedCategory(category);

    }        setStep('mode');

};

setStep('preview');

    }; const handleModeSelect = (mode: CreateMode) => {

    setCreateMode(mode);

    const getMarketDataForTransaction = () => {
        if (mode === 'template' && selectedCategory !== 'crypto') {

            const baseData = createMode === 'template' && selectedTemplate ? {            // For non-crypto categories, show template selection

                question: selectedTemplate.question, setStep('form');

            description: selectedTemplate.description || '',
            } else {

                category: selectedTemplate.category, setStep('form');

            endDate: selectedTemplate.endDate || customFormData.endDate,        }

        tags: selectedTemplate.tags || [],    };

    priceTarget: selectedTemplate.priceTarget,

        ticker: selectedTemplate.ticker    const handleTemplateSelect = (template: MarketTemplate) => {

        } : customFormData; setSelectedTemplate(template);

    // Auto-fill end date and description

    return {
        setCustomFormData({

            ...baseData, ...customFormData,

            creator: address as Address, question: template.question,

        createdAt: new Date().toISOString(), description: template.description,

    }; endDate: template.endTime.slice(0, 16), // Convert ISO to datetime-local format

    }; tags: template.tags

        });

const generateTransactionCalls = () => { };

const marketData = getMarketDataForTransaction();

const validation = validateMarketCreation(marketData); const addTag = () => {

    if (customFormData.newTag.trim() && !customFormData.tags.includes(customFormData.newTag.trim())) {

        if (!validation.isValid) {
            setCustomFormData({

                throw new Error(validation.errors.join(', ')); ...customFormData,

            }                tags: [...customFormData.tags, customFormData.newTag.trim()],

                newTag: ''

        return generateCreateMarketCalls(marketData);
        });

    };
}

    };

const renderCategorySelection = () => (

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 static-bg">    const removeTag = (tag: string) => {

        <div className="container mx-auto px-4 py-8">        setCustomFormData({

            <BackButton />            ...customFormData,

                            tags: customFormData.tags.filter(t => t !== tag)

            <div className="text-center mb-8">        });

                <h1 className="text-4xl font-bold text-white mb-4">Create a Prediction Market</h1>    };

                <p className="text-gray-300 text-lg">Choose a category to get started</p>

            </div>    const handlePreview = () => {

        const question = generateQuestion();

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">        let endTime: Date;

                {CATEGORIES.map((category) => {

                    const IconComponent = category.icon; if (selectedCategory === 'crypto') {

                        return (            if (!cryptoFormData.price || !cryptoFormData.endDate) {

                            <motion.div toast.error('Please fill in all fields');

                key={category.value}                return;

                initial={{ opacity: 0, y: 20 }}            }

                animate={{ opacity: 1, y: 0 }}            endTime = new Date(cryptoFormData.endDate);

                whileHover={{ scale: 1.05 }}        } else {

                    whileTap = {{scale: 0.95 }}            if (!customFormData.question || !customFormData.endDate) {

                    className = "liquid-glass rounded-xl p-6 cursor-pointer group"                toast.error('Please fill in all fields');

                onClick={() => handleCategorySelect(category.value)}                return;

                            >            }

                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${category.color} flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>            endTime = new Date(customFormData.endDate);

                    <IconComponent className="w-8 h-8 text-white" />        }

                </div>

                <h3 className="text-xl font-semibold text-white text-center mb-2">{category.label}</h3>        setMarketQuestion(question);

                <p className="text-gray-300 text-center text-sm">{category.description}</p>        setMarketEndTime(endTime);

            </motion.div>

            );        // Validate parameters

                    })}        const validation = validateMarketCreation({

                </div>            question,

    </div>            endTime,

        </div > creatorAddress: address as Address

    );        });



const renderModeSelection = () => (        if (!validation.valid) {

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 static-bg">            toast.error(validation.errors.join(', '));

        <div className="container mx-auto px-4 py-8">            return;

            <div className="flex items-center mb-8">        }

                <button

                    onClick={() => setStep('category')} setStep('preview');

                        className="flex items-center text-gray-300 hover:text-white transition-colors"    };

                    >

                <ArrowLeft className="w-5 h-5 mr-2" />    // Handle transaction status updates from OnchainKit

                        Back to Categories    const onTransactionStatus = (status: LifecycleStatus) => {

                    </button>        if (status.statusName === 'success' && status.statusData && 'transactionReceipts' in status.statusData) {

                </div>            const txHash = status.statusData.transactionReceipts?.[0]?.transactionHash;

        if (txHash) {

            <div className="text-center mb-8">                (async () => {

                <h1 className="text-4xl font-bold text-white mb-4">                    try {

                    Create {CATEGORIES.find(c => c.value === selectedCategory)?.label} Market                        const result = await processMarketCreation({

                    </h1>                            question: generateQuestion(),

                <p className="text-gray-300 text-lg">Choose how you'd like to create your market</p>                            category: selectedCategory,

            </div>                            endTime: marketEndTime!,

        creatorAddress: address as Address,

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">                            transactionHash: txHash

            <motion.div                        });

            initial={{ opacity: 0, x: -20 }}

            animate={{ opacity: 1, x: 0 }}                        if (!result.success) {

                whileHover = {{scale: 1.05 }}                            throw new Error(result.error || 'Failed to process market creation');

            whileTap={{ scale: 0.95 }}                        }

            className="liquid-glass rounded-xl p-8 cursor-pointer group"

            onClick={() => handleModeSelect('template')}                        const supabaseMarket = await SupabaseService.getMarket(result.marketId!);

                    >

            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">                        const newMarket: UnifiedMarket = {

                <Sparkles className="w-8 h-8 text-white" />                            id: supabaseMarket.id,

            </div>                            question: supabaseMarket.question,

            <h3 className="text-xl font-semibold text-white text-center mb-2">Use Template</h3>                            description: selectedCategory === 'crypto'

            <p className="text-gray-300 text-center text-sm mb-4">Start with a pre-made template and customize as needed</p>                                ? `A prediction market for ${cryptoFormData.ticker} price`

            <div className="text-center">                                : customFormData.description,

                <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Recommended</span>                            category: selectedCategory,

            </div>                            endTime: supabaseMarket.end_time,

        </motion.div>                            totalVolume: 0,

        yesPrice: 0.5,

        <motion.div noPrice: 0.5,

        initial={{ opacity: 0, x: 20 }}                            yesOdds: 50,

        animate={{ opacity: 1, x: 0 }}                            noOdds: 50,

        whileHover={{ scale: 1.05 }}                            yesPool: supabaseMarket.yes_pool,

        whileTap={{ scale: 0.95 }}                            noPool: supabaseMarket.no_pool,

        className="liquid-glass rounded-xl p-8 cursor-pointer group"                            totalYesShares: supabaseMarket.total_yes_shares,

        onClick={() => handleModeSelect('custom')}                            totalNoShares: supabaseMarket.total_no_shares,

                    >                            yesShares: 0,

        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">                            noShares: 0,

            <Tag className="w-8 h-8 text-white" />                            creatorAddress: supabaseMarket.creator_address,

        </div>                            contractAddress: result.contractAddress!,

        <h3 className="text-xl font-semibold text-white text-center mb-2">Create Custom</h3>                            createdAt: supabaseMarket.created_at,

        <p className="text-gray-300 text-center text-sm mb-4">Build your market from scratch with full control</p>                            resolved: false,

        <div className="text-center">                            outcome: null,

            <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Advanced</span>                            ticker: selectedCategory === 'crypto' ? cryptoFormData.ticker : undefined,

        </div>                            targetPrice: selectedCategory === 'crypto' ? parseFloat(cryptoFormData.price) : undefined,

    </motion.div>                            direction: selectedCategory === 'crypto' ? cryptoFormData.direction : undefined,

                </div > tags: selectedCategory !== 'crypto' ? customFormData.tags : undefined,

            </div > transactionHash: txHash,

        </div >                        };

    );

addCreatedMarket(newMarket);

const renderTemplateSelection = () => (

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 static-bg">                        toast.success(`Market created successfully! 🎉\nTransaction: ${txHash}`, {

        <div className="container mx-auto px-4 py-8">                            duration: 8000,

            <div className="flex items-center mb-8">                            style: {

                <button borderRadius: '12px',

                onClick={() => setStep('mode')}                                background: '#1e293b',

                className="flex items-center text-gray-300 hover:text-white transition-colors"                                color: '#f1f5f9',

                    >                                border: '1px solid #10b981',

                <ArrowLeft className="w-5 h-5 mr-2" />                            },

                        Back to Mode Selection                        });

            </button>

        </div>                        // Reset and go back

                        resetForm();

        <div className="text-center mb-8">                        onBack();

            <h1 className="text-4xl font-bold text-white mb-4">

                Choose {CATEGORIES.find(c => c.value === selectedCategory)?.label} Template                    } catch (error) {

                    </h1>                        console.error('Market creation failed:', error);

            <p className="text-gray-300 text-lg">Select a template to customize</p>                        toast.error(`Failed to save market: ${error instanceof Error ? error.message : 'Unknown error'}`, {

                </div>                            style: {

            borderRadius: '12px',

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">                                background: '#1e293b',

            {templateSuggestions.map((template, index) => (color: '#f1f5f9',

                        <motion.div                                border: '1px solid #ef4444',

            key={index}                            },

            initial={{ opacity: 0, y: 20 }}                        });

            animate={{ opacity: 1, y: 0 }}                    }

            transition={{ delay: index * 0.1 }}                })();

            whileHover={{ scale: 1.02 }}            }

            whileTap={{ scale: 0.98 }}        }

            className="liquid-glass rounded-xl p-6 cursor-pointer group"

            onClick={() => handleTemplateSelect(template)}        if (status.statusName === 'error' && status.statusData && 'message' in status.statusData) {

                        > toast.error(`Market creation failed: ${status.statusData.message}`, {

                            < div className = "mb-4" > style: {

                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">                    borderRadius: '12px',

                    {template.question}                    background: '#1e293b',

                </h3>                    color: '#f1f5f9',

            {template.description && (border: '1px solid #ef4444',

            <p className="text-gray-400 text-sm mb-3">{template.description}</p>                },

                                )}            });

            <div className="flex flex-wrap gap-2 mb-3">            setStep('preview');

                {template.tags?.map((tag, tagIndex) => (        }

                <span key={tagIndex} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">    };

                    {tag}

                </span>    const resetForm = () => {

                                    ))}        setStep('category');

            </div>        setSelectedCategory('crypto');

            {template.endDate && (setCreateMode('template');

            <div className="flex items-center text-gray-400 text-sm">        setSelectedTemplate(null);

                <Calendar className="w-4 h-4 mr-2" />        setCustomFormData({

                    { new Date(template.endDate).toLocaleDateString() }            question: '',

            </div>            description: '',

                                )}            endDate: '',

        </div>            tags: [],

    </motion.div>            newTag: ''

                    ))}        });

                </div > setCryptoFormData({

            </div> ticker: 'ETH',

        </div > price: '',

    ); direction: 'above',

        endDate: '',

    const renderCustomForm = () => (        });

<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 static-bg">    };

    <div className="container mx-auto px-4 py-8">

        <div className="flex items-center mb-8">    if (!address) {

            <button return (

            onClick={() => setStep('mode')}            <div className="flex items-center justify-center h-screen">

                className="flex items-center text-gray-300 hover:text-white transition-colors"                <p className="text-white text-lg">Please connect your wallet to create a market</p>

                    >            </div>

            <ArrowLeft className="w-5 h-5 mr-2" />        );

                        Back to Mode Selection    }

        </button>

    </div>    return (

    <div className="min-h-screen">

        <div className="text-center mb-8">            <div className="container mx-auto px-4 py-6">

            <h1 className="text-4xl font-bold text-white mb-4">                {/* Header */}

                Create Custom {CATEGORIES.find(c => c.value === selectedCategory)?.label} Market                <div className="flex items-center justify-between mb-8">

            </h1>                    <button

                <p className="text-gray-300 text-lg">Fill in the details for your prediction market</p>                        onClick={() => {

                </div>                            if (step === 'category') {

                onBack();

            <div className="max-w-2xl mx-auto">                            } else if (step === 'mode') {

                    <div className="liquid-glass rounded-xl p-8">                                setStep('category');

                        <form onSubmit={(e) => { e.preventDefault(); handleCustomFormSubmit(); }} className="space-y-6">                            } else if (step === 'form') {

                            <div>                                setStep('mode');

                                <label className="block text-white font-medium mb-2">Market Question *</label>                            } else if (step === 'preview') {

                                <input                                setStep('form');

                                    type="text"                            }

                                    value={customFormData.question}                        }}

                                    onChange={(e) => setCustomFormData(prev => ({ ...prev, question: e.target.value }))}                        className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors"

                                    placeholder="e.g., Will Bitcoin reach $100,000 by end of 2024?"                    >

                                    className="w-full px-4 py-3 bg-black/20 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"                        <ArrowLeft className="w-5 h-5" />

                                    required                        <span>Back</span>

                                />                    </button>

                            </div>                    <h1 className="text-2xl font-bold text-white">Create Market</h1>

                    <div className="w-20" />

                            <div>                </div>

                                <label className="block text-white font-medium mb-2">Description</label>

                                <textarea                {/* Category Selection */}

                                    value={customFormData.description}                {step === 'category' && (

                                    onChange={(e) => setCustomFormData(prev => ({...prev, description: e.target.value }))}                    <motion.div

                    placeholder="Provide additional context and resolution criteria..." initial={{ opacity: 0, y: 20 }}

                    rows={4} animate={{ opacity: 1, y: 0 }}

                    className="w-full px-4 py-3 bg-black/20 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none" className="max-w-4xl mx-auto"

                />                    >

            </div>                        <div className="text-center mb-8">

                <h2 className="text-3xl font-bold text-white mb-4">Choose Market Category</h2>

                <div>                            <p className="text-slate-400 text-lg">Select the type of prediction market you want to create</p>

                    <label className="block text-white font-medium mb-2">End Date *</label>                        </div>

                <input

                    type="datetime-local"                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    value={customFormData.endDate}                            {CATEGORIES.map((category) => {

                        onChange = {(e) => setCustomFormData(prev => ({...prev, endDate: e.target.value }))}                                const Icon = category.icon;

                    min={new Date().toISOString().slice(0, 16)}                                return (

                    className="w-full px-4 py-3 bg-black/20 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"                                    <motion.button

                        required key={category.value}

                    />                                        onClick={() => handleCategorySelect(category.value)}

                </div>                                        className="p-8 liquid-glass-card rounded-2xl transition-all duration-300 text-left group hover:scale-105 bg-slate-800/20"

                whileHover={{ scale: 1.02 }}

                {selectedCategory === 'crypto' && (whileTap = {{scale: 0.98 }}

                <>                                    >

                    <div>                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center mb-4`}>

                        <label className="block text-white font-medium mb-2">Cryptocurrency</label>                                            <Icon className="w-8 h-8 text-white" />

                        <select                                        </div>

                        value={customFormData.ticker}                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-base-400 transition-colors">

                            onChange={(e) => {
                                { category.label }

                                const ticker = e.target.value;                                        </h3>

                                                setCustomFormData(prev => ({<p className="text-slate-400 leading-relaxed">

                            ...prev,                                            {category.description}

                            ticker,                                        </p>

                                                    tokenData: ticker ? priceData[ticker.toLowerCase()] || null : null                                    </motion.button>

                                                }));                                );

                                            }}                            })}

                    className="w-full px-4 py-3 bg-black/20 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"                        </div>

                                        >                    </motion.div>

            <option value="">Select a cryptocurrency</option>                )}

            {CRYPTO_TICKERS.map(crypto => (

                                                <option key={crypto.value} value={crypto.value}>                {/* Mode Selection */}

                                                    {crypto.label}                {step === 'mode' && (

                                                </option>                    <motion.div

                                            ))}                        initial={{ opacity: 0, y: 20 }}

        </select>                        animate={{ opacity: 1, y: 0 }}

    </div>                        className="max-w-2xl mx-auto"

                    >

    {customFormData.ticker && customFormData.tokenData && (                        <div className="text-center mb-8">

                                        <div className="liquid-glass-light rounded-lg p-4">                            <h2 className="text-2xl font-bold text-white mb-4">

                                            <h4 className="text-white font-medium mb-2">Current Market Data</h4>                                Create {CATEGORIES.find(c => c.value === selectedCategory)?.label} Market

                                            <div className="grid grid-cols-2 gap-4 text-sm">                            </h2>

                                                <div>                            <p className="text-slate-400">Choose how you want to create your market</p>

                                                    <span className="text-gray-400">Price:</span>                        </div>

                                                    <span className="text-white ml-2">${customFormData.tokenData.currentPrice.toLocaleString()}</span>

                                                </div>                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                <div>                            <motion.button

                                                    <span className="text-gray-400">24h Change:</span>                                onClick={() => handleModeSelect('template')}

                                                    <span className={`ml-2 ${customFormData.tokenData.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>                                className="p-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 text-center group"

                                                        {customFormData.tokenData.priceChange > 0 ? '+' : ''}{customFormData.tokenData.priceChange.toFixed(2)}%                                whileHover={{ scale: 1.02 }}

                                                    </span>                                whileTap={{ scale: 0.98 }}

                                                </div>                            >

                                            </div>                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-4 mx-auto">

                                        </div>                                    <Sparkles className="w-6 h-6 text-white" />

                                    )}                                </div>

                                <h3 className="text-lg font-bold text-white mb-2">Use Template</h3>

                                    <div>                                <p className="text-slate-400 text-sm">

                                        <label className="block text-white font-medium mb-2">Price Target</label>                                    {selectedCategory === 'crypto'

                                        <input                                        ? 'Create price prediction markets with built-in token data'

                                            type="number"                                        : 'Choose from popular market templates'

                                            value={customFormData.priceTarget}                                    }

                                            onChange={(e) => setCustomFormData(prev => ({ ...prev, priceTarget: e.target.value }))}                                </p>

                                            placeholder="e.g., 100000"                            </motion.button>

                                            step="0.01"

    className="w-full px-4 py-3 bg-black/20 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"                            <motion.button

    />                                onClick={() => handleModeSelect('custom')}

</div>                                className = "p-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 text-center group"

                                </> whileHover={ { scale: 1.02 } }

                            )}                                whileTap = {{ scale: 0.98 }}

                            >

    <div className="flex justify-end space-x-4">                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mb-4 mx-auto">

        <button                                    <Users className="w-6 h-6 text-white" />

        type="button"                                </div>

        onClick={() => setStep('mode')}                                <h3 className="text-lg font-bold text-white mb-2">Create Custom</h3>

        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"                                <p className="text-slate-400 text-sm">

                                >                                    Build your own unique prediction market from scratch

            Cancel                                </p>

    </button>                            </motion.button >

        <button                        </ div>

            type="submit"                    </motion.div>

className = "px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"                )}

                                >

    Preview Market                {/* Form Step - Different forms based on category and mode */ }

                                </button > { step === 'form' && (

                            </div > <motion.div

                        </ form>                        initial={{ opacity: 0, y: 20 }}

</div>                        animate = {{ opacity: 1, y: 0 }}

                </div > className="max-w-2xl mx-auto"

            </div >                    >

        </div > { selectedCategory === 'crypto' && createMode === 'template' && (

    );                            // Crypto Template Form (existing functionality)

                            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50">

    const renderPreview = () => {                                <h2 className="text-xl font-bold text-white">Create Crypto Price Market</h2>

        const marketData = getMarketDataForTransaction();

                                        {/* Token Selection */}

        return (                                <div>

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 static-bg">                                    <label className="block text-white mb-2 font-medium">Select Token</label>

                <div className="container mx-auto px-4 py-8">                                    <select

                    <div className="flex items-center mb-8">                                        value={cryptoFormData.ticker}

                        <button                                        onChange={(e) => setCryptoFormData({ ...cryptoFormData, ticker: e.target.value })}

                            onClick={() => setStep('form')}                                        className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"

                            className="flex items-center text-gray-300 hover:text-white transition-colors"                                    >

                        >                                        {CRYPTO_TICKERS.map(ticker => (

                            <ArrowLeft className="w-5 h-5 mr-2" />                                            <option key={ticker.value} value={ticker.value} className="text-black">

                            Back to {createMode === 'template' ? 'Templates' : 'Form'}                                                {ticker.label}

                        </button>                                            </option>

                    </div>                                        ))}

                                    </select>

                    <div className="text-center mb-8">                                </div>

                        <h1 className="text-4xl font-bold text-white mb-4">Preview Your Market</h1>

                        <p className="text-gray-300 text-lg">Review the details before creating your prediction market</p>                                {/* Token Info */}

                    </div>                                {tokenData && !loadingTokenData && (

                                    <div className="liquid-glass-subtle rounded-xl p-4 space-y-2 mb-6 bg-slate-700/20">

                    <div className="max-w-4xl mx-auto">                                        <div className="flex justify-between">

                        <div className="liquid-glass rounded-xl p-8 mb-8">                                            <span className="text-slate-400">Current Price</span>

                            <div className="flex items-start justify-between mb-6">                                            <span className="text-white font-bold">${tokenData.currentPrice}</span>

                                <div className="flex-1">                                        </div>

                                    <div className="flex items-center gap-3 mb-4">                                        <div className="flex justify-between">

                                        <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${CATEGORIES.find(c => c.value === selectedCategory)?.color                                            <span className="text-slate-400">24h Change</span>

                                            } text-white`}>                                            <span className={`font-bold ${tokenData.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>

                                            {CATEGORIES.find(c => c.value === selectedCategory)?.label}                                                {tokenData.priceChange >= 0 ? '+' : ''}{tokenData.priceChange.toFixed(2)}%

                                        </span>                                            </span>

                                        {createMode === 'template' && (                                        </div>

                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">                                        <div className="flex justify-between">

                                                Template                                            <span className="text-slate-400">Market Cap</span>

                                            </span>                                            <span className="text-white font-semibold">${tokenData.marketCap}</span>

                                        )}                                        </div>

                                    </div>                                        <div className="flex justify-between">

                                    <h2 className="text-2xl font-bold text-white mb-3">{marketData.question}</h2>                                            <span className="text-slate-400">24h Volume</span>

                                    {marketData.description && (                                            <span className="text-white font-semibold">${tokenData.volume}</span>

                                        <p className="text-gray-300 mb-4">{marketData.description}</p>                                        </div>

                                    )}                                    </div>

                                </div>                                )}

                            </div>

                                {/* Direction Selection */}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">                                <div>

                                <div className="liquid-glass-light rounded-lg p-4">                                    <label className="block text-white mb-2 font-medium">Price Direction</label>

                                    <h3 className="text-white font-medium mb-2 flex items-center">                                    <div className="grid grid-cols-2 gap-3">

                                        <Calendar className="w-5 h-5 mr-2" />                                        <button

                                        End Date                                            onClick={() => setCryptoFormData({ ...cryptoFormData, direction: 'below' })}

                                    </h3>                                            className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${cryptoFormData.direction === 'below'

                                    <p className="text-gray-300">                                                ? 'bg-red-500 text-white shadow-lg'

                                        {new Date(marketData.endDate).toLocaleDateString('en-US', {                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'

                                            weekday: 'long',                                                }`}

                                            year: 'numeric',                                        >

                                            month: 'long',                                            <TrendingDown className="w-5 h-5" />

                                            day: 'numeric',                                            Below

                                            hour: '2-digit',                                        </button>

                                            minute: '2-digit'                                        <button

                                        })}                                            onClick={() => setCryptoFormData({ ...cryptoFormData, direction: 'above' })}

                                    </p>                                            className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${cryptoFormData.direction === 'above'

                                </div>                                                ? 'bg-green-500 text-white shadow-lg'

                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'

                                {marketData.ticker && marketData.priceTarget && (                                                }`}

                                    <div className="liquid-glass-light rounded-lg p-4">                                        >

                                        <h3 className="text-white font-medium mb-2 flex items-center">                                            <TrendingUp className="w-5 h-5" />

                                            <TrendingUp className="w-5 h-5 mr-2" />                                            Above

                                            Price Target                                        </button>

                                        </h3>                                    </div>

                                        <p className="text-gray-300">                                </div>

{ marketData.ticker }: ${ Number(marketData.priceTarget).toLocaleString() }

                                        </p > {/* Target Price */ }

{
    customFormData.tokenData && (<div>

        <p className="text-sm text-gray-400 mt-1">                                    <label className="block text-white mb-2 font-medium">Target Price ($)</label>

            Current: ${customFormData.tokenData.currentPrice.toLocaleString()}                                    <input

                                            </p>                                        type="number"

                                        )}                                        value={cryptoFormData.price}

    </div>                                        onChange = {(e) => setCryptoFormData({ ...cryptoFormData, price: e.target.value })
}

                                )}                                        placeholder = "Enter target price"

                            </div > className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"

    />

    { transactionStatus === 'init' && (                                </div >

                                <Transaction

                                    calls={generateTransactionCalls()}                                {/* End Date */}

                                    onError={handleTransactionError}                                <div>

                                    onSuccess={handleTransactionSuccess}                                    <label className="block text-white mb-2 font-medium">End Date</label>

                                    onStatus={setTransactionStatus}                                    <input

                                >                                        type="datetime-local"

                                    <TransactionButton                                        value={cryptoFormData.endDate}

                                        text="Create Market"                                        onChange={(e) => setCryptoFormData({ ...cryptoFormData, endDate: e.target.value })}

                                        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 text-lg font-semibold"                                        min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}

                                    />                                        className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"

                                    <TransactionSponsor />                                    />

                                    <TransactionStatusLabel />                                </div>

                                    <TransactionStatusAction />

                                </Transaction > <button

                            )} onClick={handlePreview}

    className="w-full py-3 bg-gradient-to-r from-base-500 to-base-600 hover:from-base-600 hover:to-base-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-base-500/25"

    {transactionStatus === 'pending' && (                                >

                                <div className="text-center py-8">                                    Preview Market

                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>                                </button>

                                    <p className="text-white">Creating your market...</p>                            </ div>

</div>                        )}

                            )}

{
    (selectedCategory !== 'crypto' && createMode === 'template') && (

        { transactionStatus === 'success' && createdMarket && (                            // Template Selection for non-crypto categories

            <div className="text-center py-8">                            <div className="space-y-6">

                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">                                <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">

                    <Trophy className="w-8 h-8 text-white" />                                    <h2 className="text-xl font-bold text-white mb-4">

                </div>                                        Choose {CATEGORIES.find(c => c.value === selectedCategory)?.label} Template

                    <h3 className="text-2xl font-bold text-white mb-2">Market Created Successfully!</h3>                                    </h2>

                <p className="text-gray-300 mb-6">Your prediction market is now live and accepting predictions.</p>                                    <p className="text-slate-400 mb-6">Select a popular market template to customize</p>

                <div className="flex gap-4 justify-center">

                    <button                                    <div className="space-y-3">

                        onClick={() => {
                            {
                                templateSuggestions.map((template, index) => (

                                    // Reset form and go back to category selection                                            <button

                                    setStep('category'); key = { index }

                                setSelectedTemplate(null); onClick = {() => handleTemplateSelect(template)}

                        setCustomFormData({className = {`w-full p-4 rounded-xl text-left transition-all border ${selectedTemplate?.question === template.question

                                                    question: '',                                                    ? 'bg-base-500/20 border-base-500/50 text-white'

                        description: '',                                                    : 'bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/30'

                                                    endDate: '',                                                    }`}

                                                    category: '',                                            >

                        tags: [],                                                <div className="font-medium text-white mb-1">{template.question}</div>

                        priceTarget: '',                                                <div className="text-sm text-slate-400">{template.description}</div>

                        ticker: '',                                                <div className="flex gap-2 mt-2">

                            tokenData: null                                                    {template.tags.slice(0, 3).map(tag => (

                                                });                                                        <span key={tag} className="text-xs px-2 py-1 bg-slate-600/50 rounded-full">

                                setTransactionStatus('init');                                                            {tag}

                                setCreatedMarket(null);                                                        </span>

                                            }}                                                    ))}

                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"                                                </div>

                                        >                                            </button>

                                            Create Another                                        ))}

                </button>                                    </div>

                <button                                </div>

                                            onClick = {() => {

        // Navigate to the created market                                {selectedTemplate && (

        window.location.href = `/market/${createdMarket.id}`;                                    <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">

                                            }}                                        <h3 className="text-lg font-bold text-white mb-4">Customize Your Market</h3>

                                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105"

                                        >                                        {/* Question */}

                                            View Market                                        <div className="mb-4">

                                        </button>                                            <label className="block text-white mb-2 font-medium">Question</label>

                                    </div>                                            <input

                                </div>                                                type="text"

                            )}                                                value={customFormData.question}

                                                onChange={(e) => setCustomFormData({ ...customFormData, question: e.target.value })}

                            {transactionStatus === 'error' && (                                                className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"

                                <div className="text-center py-8">                                            />

                                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">                                        </div>

                                        <TrendingDown className="w-8 h-8 text-white" />

                                    </div>                                        {/* Description */ }

                                    <h3 className="text-2xl font-bold text-white mb-2">Transaction Failed</h3>                                        <div className="mb-4">

                                    <p className="text-gray-300 mb-6">There was an error creating your market. Please try again.</p>                                            <label className="block text-white mb-2 font-medium">Description</label>

                                    <button                                            <textarea

                                        onClick={() => setTransactionStatus('init')}                                                value={customFormData.description}

                                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"                                                onChange={(e) => setCustomFormData({ ...customFormData, description: e.target.value })}

                                    >                                                rows={3}

                                        Try Again                                                className="w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"

                                    </button>                                            />

                                </div>                                        </div >

                            )
    }

                        </div > {/* End Date */ }

                    </div >                                        <div className="mb-4">

                </div>                                            <label className="block text-white mb-2 font-medium">End Date</label>

            </div > <input

        ); type="datetime-local"

    }; value = { customFormData.endDate }

onChange = {(e) => setCustomFormData({ ...customFormData, endDate: e.target.value })}

// Render the appropriate step                                                min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}

switch (step) {                                                className = "w-full px-4 py-3 bg-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-base-500/50 border border-slate-600/50"

        case 'category':                                            />

return renderCategorySelection();                                        </div >

        case 'mode':

return renderModeSelection(); {/* Tags */ }

        case 'form':                                        <div className="mb-6">

            return createMode === 'template' ? renderTemplateSelection() : renderCustomForm();                                            <label className="block text-white mb-2 font-medium">Tags</label>

        case 'preview':                                            <div className="flex gap-2 mb-2">

            return renderPreview();                                                <input

        default:                                                    type="text"

            return renderCategorySelection();                                                    value={customFormData.newTag}

    }                                                    onChange={(e) => setCustomFormData({ ...customFormData, newTag: e.target.value })}

}                                                    placeholder="Add tag"
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
                                    </div >
                                )}
                            </div >
                        )}

{
    createMode === 'custom' && (
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
    )
}
                    </motion.div >
                )}

{/* Preview Step */ }
{
    step === 'preview' && (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
        >
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-slate-700/50">
                <h2 className="text-xl font-bold text-white">Market Preview</h2>

                <div className="bg-slate-700/30 rounded-xl p-4 space-y-3 border border-slate-600/50">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${CATEGORIES.find(c => c.value === selectedCategory)?.color
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
    )
}
            </div >
        </div >
    );
}