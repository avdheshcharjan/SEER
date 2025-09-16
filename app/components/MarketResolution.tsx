"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Shield,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Info
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import toast from 'react-hot-toast';
import {
    Transaction,
    TransactionButton,
    TransactionSponsor,
    TransactionStatusAction,
    TransactionStatusLabel
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import {
    MarketType,
    OracleState,
    getMarketTypeLabel,
    getOracleStateLabel
} from '@/lib/market-resolver';
import { ParimutuelSupabaseService } from '@/lib/supabase-parimutuel';
import {
    generateRequestPlatformResolutionCalls,
    generateSettlePlatformResolutionCalls,
    generateResolveUserMarketCalls
} from '@/lib/market-resolution-calls';

interface MarketResolutionProps {
    onBack: () => void;
}

interface MarketInfo {
    id: string;
    contract_address: string;
    question: string;
    end_time: string;
    category: string;
    resolved: boolean;
    outcome?: boolean;
}

interface ResolutionInfo {
    marketType: MarketType;
    canResolve: boolean;
    oracleState?: OracleState;
    isAuthorized: boolean;
    pendingResolution?: {
        requested: boolean;
        timestamp: number;
    };
}

export function MarketResolution({ onBack }: MarketResolutionProps) {
    const { address } = useAccount();
    const [markets, setMarkets] = useState<MarketInfo[]>([]);
    const [selectedMarket, setSelectedMarket] = useState<MarketInfo | null>(null);
    const [resolutionInfo, setResolutionInfo] = useState<ResolutionInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentTransaction, setCurrentTransaction] = useState<{
        type: 'request' | 'settle' | 'resolve';
        calls: Array<{
            to: Address;
            data: `0x${string}`;
            value: bigint;
        }>;
    } | null>(null);
    const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);

    // Load expired markets that can be resolved
    useEffect(() => {
        const loadExpiredMarkets = async () => {
            try {
                setLoading(true);

                // Get all markets from Supabase
                const allMarkets = await ParimutuelSupabaseService.getMarketsWithInfluencers();

                // Filter for expired but unresolved markets
                const now = new Date();
                const expiredMarkets = allMarkets.filter(market =>
                    !market.resolved && new Date(market.end_time) <= now
                );

                setMarkets(expiredMarkets);
            } catch (error) {
                console.error('Error loading expired markets:', error);
                toast.error('Failed to load markets');
            } finally {
                setLoading(false);
            }
        };

        if (address) {
            loadExpiredMarkets();
        }
    }, [address]);

    // Load resolution info for selected market
    const loadResolutionInfo = useCallback(async (market: MarketInfo) => {
        if (!market.contract_address) return;

        try {
            setLoading(true);

            // This would typically call the smart contract to get resolution info
            // For now, we'll simulate the data based on market properties

            // Simulate contract calls to get market info
            // In real implementation, use wagmi/viem to call:
            // - marketResolver.marketTypes(market.contract_address)
            // - marketResolver.canResolveMarket(market.contract_address)
            // - marketResolver.getOracleState(market.contract_address)
            // - marketResolver.authorizedCreators(address)

            const mockResolutionInfo: ResolutionInfo = {
                marketType: market.id.includes('platform') ? MarketType.PLATFORM : MarketType.USER,
                canResolve: true,
                oracleState: market.id.includes('platform') ? OracleState.Invalid : undefined,
                isAuthorized: true, // In real app, check if user is authorized
                pendingResolution: undefined
            };

            setResolutionInfo(mockResolutionInfo);

        } catch (error) {
            console.error('Error loading resolution info:', error);
            toast.error('Failed to load resolution info');
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle market selection
    const handleSelectMarket = (market: MarketInfo) => {
        setSelectedMarket(market);
        setSelectedOutcome(null);
        loadResolutionInfo(market);
    };

    // Generate transaction calls based on resolution type
    const generateResolutionCalls = (type: 'request' | 'settle' | 'resolve', outcome?: boolean) => {
        if (!selectedMarket?.contract_address) return [];

        const marketAddress = selectedMarket.contract_address as Address;

        switch (type) {
            case 'request':
                return generateRequestPlatformResolutionCalls(marketAddress);

            case 'settle':
                return generateSettlePlatformResolutionCalls(marketAddress);

            case 'resolve':
                return generateResolveUserMarketCalls(marketAddress, outcome!);

            default:
                return [];
        }
    };

    // Handle resolution actions
    const handleRequestResolution = () => {
        if (!selectedMarket || !resolutionInfo) return;

        const calls = generateResolutionCalls('request');
        setCurrentTransaction({ type: 'request', calls });
    };

    const handleSettleResolution = () => {
        if (!selectedMarket || !resolutionInfo) return;

        const calls = generateResolutionCalls('settle');
        setCurrentTransaction({ type: 'settle', calls });
    };

    const handleResolveMarket = (outcome: boolean) => {
        if (!selectedMarket || !resolutionInfo) return;

        setSelectedOutcome(outcome);
        const calls = generateResolutionCalls('resolve', outcome);
        setCurrentTransaction({ type: 'resolve', calls });
    };

    // Handle successful transaction
    const handleSuccessfulTransaction = useCallback(async (txHash: string) => {
        console.log('🎉 Resolution transaction successful:', txHash);

        try {
            if (selectedMarket && currentTransaction) {
                // Update market resolution status in database (reuse generic resolver path)
                if (currentTransaction.type === 'resolve') {
                    await ParimutuelSupabaseService.updateMarket(
                        selectedMarket.id,
                        { resolved: true, outcome: selectedOutcome!, resolution_time: new Date().toISOString() }
                    );
                }

                toast.success(
                    <div className="flex items-center space-x-2">
                        <CheckCircle size={20} className="text-green-400" />
                        <div>
                            <div className="font-semibold">
                                {currentTransaction.type === 'request' && 'Resolution Requested'}
                                {currentTransaction.type === 'settle' && 'Resolution Settled'}
                                {currentTransaction.type === 'resolve' && 'Market Resolved'}
                            </div>
                            <div className="text-sm opacity-90">Transaction confirmed</div>
                        </div>
                    </div>,
                    { duration: 5000 }
                );

                // Refresh market list
                setSelectedMarket(null);
                setResolutionInfo(null);
            }
        } catch (error) {
            console.error('Error updating resolution status:', error);
        }

        setCurrentTransaction(null);
    }, [selectedMarket, currentTransaction, selectedOutcome]);

    // Handle failed transaction
    const handleFailedTransaction = useCallback((error: string) => {
        console.error('💥 Resolution transaction failed:', error);
        toast.error('Transaction failed. Please try again.');
        setCurrentTransaction(null);
    }, []);

    // Transaction status handler
    const onStatus = useCallback((status: LifecycleStatus) => {
        console.log('Resolution transaction status:', status.statusName);

        const receipts = (status as unknown as { transactionReceipts?: Array<{ transactionHash: string }>; error?: { message?: string } }).transactionReceipts;
        if (status.statusName === 'success' && receipts?.[0]?.transactionHash) {
            handleSuccessfulTransaction(receipts[0].transactionHash);
        } else if (status.statusName === 'error') {
            const err = (status as unknown as { error?: { message?: string } }).error;
            handleFailedTransaction(err?.message || 'Transaction failed');
        }
    }, [handleSuccessfulTransaction, handleFailedTransaction]);

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 text-slate-300 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1 className="text-2xl font-bold text-white">Market Resolution</h1>
                <div className="w-20" />
            </div>

            {!address ? (
                <div className="text-center py-12">
                    <AlertCircle size={48} className="text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Wallet Not Connected</h3>
                    <p className="text-slate-400">Please connect your wallet to resolve markets</p>
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Markets List */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Expired Markets</h3>

                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="bg-slate-800/30 rounded-xl p-4 animate-pulse">
                                        <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                                        <div className="h-3 bg-slate-700 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : markets.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                                <h4 className="text-lg font-semibold text-white mb-2">No Markets to Resolve</h4>
                                <p className="text-slate-400">All markets are either active or already resolved</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {markets.map((market) => (
                                    <motion.div
                                        key={market.id}
                                        whileHover={{ scale: 1.02 }}
                                        onClick={() => handleSelectMarket(market)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMarket?.id === market.id
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${market.category === 'crypto' ? 'bg-orange-500/20 text-orange-300' :
                                                    market.category === 'tech' ? 'bg-blue-500/20 text-blue-300' :
                                                        market.category === 'celebrity' ? 'bg-pink-500/20 text-pink-300' :
                                                            market.category === 'sports' ? 'bg-green-500/20 text-green-300' :
                                                                'bg-purple-500/20 text-purple-300'
                                                }`}>
                                                {market.category.toUpperCase()}
                                            </span>
                                            <Clock size={14} className="text-slate-400" />
                                        </div>

                                        <h4 className="text-white font-medium mb-2 line-clamp-2">
                                            {market.question}
                                        </h4>

                                        <div className="text-sm text-slate-400">
                                            Expired: {new Date(market.end_time).toLocaleDateString()}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Resolution Panel */}
                    <div>
                        {selectedMarket && resolutionInfo ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Resolution Details</h3>

                                    {/* Market Info */}
                                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-600 mb-4">
                                        <h4 className="text-white font-medium mb-2">{selectedMarket.question}</h4>
                                        <div className="space-y-2 text-sm text-slate-400">
                                            <div className="flex items-center justify-between">
                                                <span>Market Type:</span>
                                                <span className="text-white">{getMarketTypeLabel(resolutionInfo.marketType)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Expired:</span>
                                                <span className="text-white">{new Date(selectedMarket.end_time).toLocaleString()}</span>
                                            </div>
                                            {resolutionInfo.oracleState !== undefined && (
                                                <div className="flex items-center justify-between">
                                                    <span>Oracle State:</span>
                                                    <span className="text-white">{getOracleStateLabel(resolutionInfo.oracleState)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Resolution Actions */}
                                    {resolutionInfo.marketType === MarketType.PLATFORM ? (
                                        <div className="space-y-4">
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <Shield size={20} className="text-blue-400 mt-0.5" />
                                                    <div>
                                                        <h5 className="text-blue-300 font-medium mb-1">UMA Oracle Resolution</h5>
                                                        <p className="text-blue-200/80 text-sm mb-3">
                                                            This market will be resolved by UMA&apos;s Optimistic Oracle with a 2-hour challenge period.
                                                        </p>

                                                        {resolutionInfo.oracleState === OracleState.Invalid ? (
                                                            <button
                                                                onClick={handleRequestResolution}
                                                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                                            >
                                                                Request Oracle Resolution (1000 USDC Bond)
                                                            </button>
                                                        ) : resolutionInfo.oracleState === OracleState.Expired ? (
                                                            <button
                                                                onClick={handleSettleResolution}
                                                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                                                            >
                                                                Settle Oracle Resolution
                                                            </button>
                                                        ) : (
                                                            <div className="text-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                                <Clock size={16} className="text-amber-400 mx-auto mb-1" />
                                                                <p className="text-amber-300 text-sm">
                                                                    Oracle resolution in progress...
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <Users size={20} className="text-green-400 mt-0.5" />
                                                    <div className="flex-1">
                                                        <h5 className="text-green-300 font-medium mb-1">Creator Resolution</h5>
                                                        <p className="text-green-200/80 text-sm mb-4">
                                                            As the market creator, you can resolve this market immediately.
                                                        </p>

                                                        {resolutionInfo.isAuthorized ? (
                                                            <div className="space-y-3">
                                                                <p className="text-white font-medium">Select the outcome:</p>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <button
                                                                        onClick={() => handleResolveMarket(true)}
                                                                        className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                                                                    >
                                                                        <CheckCircle size={16} />
                                                                        YES
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleResolveMarket(false)}
                                                                        className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                                                                    >
                                                                        <XCircle size={16} />
                                                                        NO
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                                <AlertCircle size={16} className="text-red-400 mx-auto mb-1" />
                                                                <p className="text-red-300 text-sm">
                                                                    You are not authorized to resolve this market
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Info size={48} className="text-slate-400 mx-auto mb-4" />
                                <h4 className="text-lg font-semibold text-white mb-2">Select a Market</h4>
                                <p className="text-slate-400">Choose a market from the list to view resolution options</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transaction Modal */}
            {currentTransaction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full"
                    >
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2">
                                {currentTransaction.type === 'request' && 'Request Oracle Resolution'}
                                {currentTransaction.type === 'settle' && 'Settle Oracle Resolution'}
                                {currentTransaction.type === 'resolve' && 'Resolve Market'}
                            </h3>
                            <p className="text-slate-300 mb-6">
                                {currentTransaction.type === 'resolve' && selectedOutcome !== null && (
                                    <span className={selectedOutcome ? 'text-green-400' : 'text-red-400'}>
                                        Outcome: {selectedOutcome ? 'YES' : 'NO'}
                                    </span>
                                )}
                            </p>

                            <Transaction
                                isSponsored={true}
                                calls={currentTransaction.calls}
                                chainId={baseSepolia.id}
                                onStatus={onStatus}
                            >
                                <TransactionButton className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium" />
                                <TransactionSponsor />
                                <div className="mt-4 text-center">
                                    <TransactionStatusLabel />
                                    <TransactionStatusAction />
                                </div>
                            </Transaction>

                            <button
                                onClick={() => setCurrentTransaction(null)}
                                className="mt-4 text-slate-400 hover:text-white text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}