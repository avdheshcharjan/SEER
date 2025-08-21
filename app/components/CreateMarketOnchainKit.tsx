"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { UnifiedMarket } from '@/lib/types';
import { SupabaseService } from '@/lib/supabase';
import { 
    generateCreateMarketCalls, 
    validateMarketCreation,
    processMarketCreation 
} from '@/lib/market-factory-onchainkit';
import { Address, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import toast from 'react-hot-toast';
import { 
    Transaction, 
    TransactionButton, 
    TransactionSponsor,
    TransactionStatus,
    TransactionStatusAction,
    TransactionStatusLabel,
    type LifecycleStatus 
} from '@coinbase/onchainkit/transaction';
import { useAccount } from 'wagmi';

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
    const { user, addCreatedMarket } = useAppStore();
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
    const [transactionCalls, setTransactionCalls] = useState<any[]>([]);
    const [marketQuestion, setMarketQuestion] = useState('');
    const [marketEndTime, setMarketEndTime] = useState<Date | null>(null);
    const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
    const txCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Create public client for checking transaction status
    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http('https://sepolia.base.org')
    });

    // Manually check transaction status if it gets stuck
    const checkTransactionStatus = async (txHash: string) => {
        try {
            const receipt = await publicClient.getTransactionReceipt({ 
                hash: txHash as `0x${string}` 
            });
            
            if (receipt && receipt.status === 'success') {
                console.log('Transaction confirmed manually:', receipt);
                
                // Clear the interval
                if (txCheckIntervalRef.current) {
                    clearInterval(txCheckIntervalRef.current);
                    txCheckIntervalRef.current = null;
                }
                
                // Process the market creation
                const result = await processMarketCreation({
                    question: marketQuestion,
                    category: 'crypto',
                    endTime: marketEndTime!,
                    creatorAddress: address as Address,
                    transactionHash: txHash
                });
                
                if (result.success && result.marketId) {
                    toast.dismiss('market-creation');
                    toast.success('Market created successfully!');
                    
                    // Get the created market from database
                    const supabaseMarket = await SupabaseService.getMarket(result.marketId);
                    
                    // Create unified market object
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
                        contractAddress: result.contractAddress || supabaseMarket.contract_address as Address,
                        createdAt: supabaseMarket.created_at,
                        resolved: supabaseMarket.resolved,
                        outcome: supabaseMarket.outcome,
                        ticker: formData.ticker,
                        targetPrice: parseFloat(formData.price),
                        direction: formData.direction,
                    };
                    
                    // Add to store
                    addCreatedMarket(newMarket);
                    
                    // Navigate back after a short delay
                    setTimeout(() => {
                        onBack();
                    }, 2000);
                    
                    setPendingTxHash(null);
                }
            } else if (receipt && receipt.status === 'reverted') {
                console.error('Transaction reverted');
                toast.dismiss('market-creation');
                toast.error('Transaction failed - reverted');
                setStep('preview');
                setPendingTxHash(null);
                
                if (txCheckIntervalRef.current) {
                    clearInterval(txCheckIntervalRef.current);
                    txCheckIntervalRef.current = null;
                }
            }
        } catch (error) {
            console.log('Transaction still pending or error checking status:', error);
        }
    };

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            if (txCheckIntervalRef.current) {
                clearInterval(txCheckIntervalRef.current);
            }
        };
    }, []);

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

    const handlePreview = () => {
        if (!formData.price || !formData.endDate) {
            toast.error('Please fill in all fields');
            return;
        }

        const question = `Will ${formData.ticker} be ${formData.direction} $${formData.price} by ${new Date(formData.endDate).toLocaleDateString()}?`;
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
        
        // Generate transaction calls for OnchainKit
        const calls = generateCreateMarketCalls({
            question,
            endTime
        });
        
        setTransactionCalls(calls);
        setStep('preview');
    };

    const handleTransactionStatus = async (status: LifecycleStatus) => {
        console.log('Market creation status:', status);
        
        switch (status.statusName) {
            case 'init':
                console.log('Transaction initialized');
                break;
                
            case 'transactionIdle':
                console.log('Transaction idle');
                break;
                
            case 'buildingTransaction':
                console.log('Building transaction...');
                toast.loading('Preparing market creation...');
                break;
            
            case 'transactionPending':
                console.log('Transaction pending...', status.statusData);
                setStep('creating');
                toast.loading('Creating market (gasless)...', { id: 'market-creation' });
                
                // Sometimes the hash is available in pending state
                if (status.statusData?.transactionHash && !pendingTxHash) {
                    const txHash = status.statusData.transactionHash;
                    setPendingTxHash(txHash);
                    console.log('Got transaction hash in pending state:', txHash);
                    
                    // Start monitoring
                    txCheckIntervalRef.current = setInterval(() => {
                        checkTransactionStatus(txHash);
                    }, 3000);
                }
                break;
            
            case 'transactionLegacyExecuted':
                console.log('Legacy transaction executed:', status.statusData);
                // For legacy transactions, we get the hash here
                if (status.statusData?.transactionHashList?.[0]) {
                    const txHash = status.statusData.transactionHashList[0];
                    toast.loading('Transaction submitted, waiting for confirmation...', { id: 'market-creation' });
                    setPendingTxHash(txHash);
                    
                    // Start checking transaction status manually
                    // OnchainKit sometimes doesn't properly transition to success
                    console.log('Starting manual transaction monitoring for:', txHash);
                    txCheckIntervalRef.current = setInterval(() => {
                        checkTransactionStatus(txHash);
                    }, 3000); // Check every 3 seconds
                }
                break;
            
            case 'success':
                console.log('Transaction success!', status.statusData);
                toast.dismiss('market-creation');
                
                // Try to get transaction hash from different possible locations
                let txHash: string | undefined;
                
                // Check for transaction receipts (standard)
                if (status.statusData?.transactionReceipts?.[0]) {
                    txHash = status.statusData.transactionReceipts[0].transactionHash;
                }
                // Check for transaction hash list (legacy)
                else if (status.statusData?.transactionHashList?.[0]) {
                    txHash = status.statusData.transactionHashList[0];
                }
                // Check for direct transactionHash
                else if (status.statusData?.transactionHash) {
                    txHash = status.statusData.transactionHash;
                }
                
                if (txHash) {
                    console.log('Processing market creation with tx hash:', txHash);
                    
                    // Process the successful transaction
                    const result = await processMarketCreation({
                        question: marketQuestion,
                        category: 'crypto',
                        endTime: marketEndTime!,
                        creatorAddress: address as Address,
                        transactionHash: txHash
                    });
                    
                    if (result.success && result.marketId) {
                        toast.success('Market created successfully!');
                        
                        // Get the created market from database
                        const supabaseMarket = await SupabaseService.getMarket(result.marketId);
                        
                        // Create unified market object
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
                            contractAddress: result.contractAddress || supabaseMarket.contract_address as Address,
                            createdAt: supabaseMarket.created_at,
                            resolved: supabaseMarket.resolved,
                            outcome: supabaseMarket.outcome,
                            ticker: formData.ticker,
                            targetPrice: parseFloat(formData.price),
                            direction: formData.direction,
                        };
                        
                        // Add to store
                        addCreatedMarket(newMarket);
                        
                        // Navigate back after a short delay
                        setTimeout(() => {
                            onBack();
                        }, 2000);
                    } else {
                        toast.error(result.error || 'Failed to process market creation');
                        setStep('preview');
                    }
                } else {
                    console.error('No transaction hash found in success status');
                    toast.error('Transaction succeeded but could not extract transaction hash');
                    setStep('preview');
                }
                break;
            
            case 'error':
                console.error('Transaction error:', status.statusData);
                toast.dismiss('market-creation');
                setStep('preview');
                toast.error(`Market creation failed: ${status.statusData?.message || 'Unknown error'}`);
                break;
                
            default:
                console.log(`Unknown status: ${status.statusName}`, status.statusData);
        }
    };

    if (!address) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Please connect your wallet to create a market</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
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
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-6">
                            {/* Ticker Selection */}
                            <div>
                                <label className="block text-white mb-2">Select Token</label>
                                <select 
                                    value={formData.ticker}
                                    onChange={(e) => setFormData({...formData, ticker: e.target.value})}
                                    className="w-full px-4 py-3 bg-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
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
                                <div className="bg-white/10 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Current Price</span>
                                        <span className="text-white font-bold">${tokenData.currentPrice}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">24h Change</span>
                                        <span className={`font-bold ${tokenData.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {tokenData.priceChange >= 0 ? '+' : ''}{tokenData.priceChange.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Direction Selection */}
                            <div>
                                <label className="block text-white mb-2">Price Direction</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData({...formData, direction: 'above'})}
                                        className={`py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                                            formData.direction === 'above' 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-white/20 text-white/60 hover:bg-white/30'
                                        }`}
                                    >
                                        <TrendingUp className="w-5 h-5" />
                                        Above
                                    </button>
                                    <button
                                        onClick={() => setFormData({...formData, direction: 'below'})}
                                        className={`py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                                            formData.direction === 'below' 
                                                ? 'bg-red-500 text-white' 
                                                : 'bg-white/20 text-white/60 hover:bg-white/30'
                                        }`}
                                    >
                                        <TrendingDown className="w-5 h-5" />
                                        Below
                                    </button>
                                </div>
                            </div>

                            {/* Target Price */}
                            <div>
                                <label className="block text-white mb-2">Target Price ($)</label>
                                <input 
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                                    placeholder="Enter target price"
                                    className="w-full px-4 py-3 bg-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-white mb-2">End Date</label>
                                <input 
                                    type="datetime-local"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                                    className="w-full px-4 py-3 bg-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>

                            {/* Preview Button */}
                            <button
                                onClick={handlePreview}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
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
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-6">
                            <h2 className="text-xl font-bold text-white">Market Preview</h2>
                            
                            <div className="bg-white/10 rounded-lg p-4 space-y-3">
                                <p className="text-white text-lg font-semibold">{marketQuestion}</p>
                                <div className="space-y-2 text-white/80">
                                    <p>End Date: {marketEndTime?.toLocaleString()}</p>
                                    <p>Initial Liquidity: 10 USDC each side</p>
                                    <p>Transaction: Gasless (sponsored)</p>
                                </div>
                            </div>

                            {/* OnchainKit Transaction Component */}
                            <Transaction
                                isSponsored={true}
                                calls={transactionCalls}
                                onStatus={handleTransactionStatus}
                                chainId={84532} // Base Sepolia
                            >
                                <TransactionButton 
                                    text="Create Market"
                                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                                />
                                <TransactionSponsor />
                                <TransactionStatus>
                                    <TransactionStatusLabel />
                                    <TransactionStatusAction />
                                </TransactionStatus>
                            </Transaction>

                            <button
                                onClick={() => setStep('form')}
                                className="w-full py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors"
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