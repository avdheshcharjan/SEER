'use client';

/**
 * 🎯 Contract Integration Demo Component
 * 
 * This component demonstrates how to interact with the newly deployed contracts
 * in the frontend using the updated contract addresses and ABIs.
 */

import React, { useEffect, useState } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
    CONTRACT_ADDRESSES,
    CONTRACT_ABIS,
    getAddressUrl
} from '../../lib/contracts';

interface ContractInfo {
    name: string;
    address: string;
    data?: unknown;
    error?: string;
}

export default function ContractIntegrationDemo() {
    const { address: userAddress } = useAccount();
    const [contractsInfo, setContractsInfo] = useState<ContractInfo[]>([]);

    // Read market count from ParimutuelMarketFactory
    const { data: marketCount, error: marketCountError } = useReadContract({
        address: CONTRACT_ADDRESSES.PARIMUTUEL_MARKET_FACTORY,
        abi: CONTRACT_ABIS.PARIMUTUEL_MARKET_FACTORY,
        functionName: 'getMarketCount',
    });

    // Read collateral token from UMA factory
    const { data: collateralToken, error: collateralError } = useReadContract({
        address: CONTRACT_ADDRESSES.UMA_PARIMUTUEL_MARKET_FACTORY,
        abi: CONTRACT_ABIS.UMA_PARIMUTUEL_MARKET_FACTORY,
        functionName: 'collateralToken',
    });

    // Read bond amount from MarketResolver
    const { data: bondAmount, error: bondError } = useReadContract({
        address: CONTRACT_ADDRESSES.MARKET_RESOLVER,
        abi: CONTRACT_ABIS.MARKET_RESOLVER,
        functionName: 'BOND_AMOUNT',
    });

    // Read demo market question
    const { data: demoQuestion, error: questionError } = useReadContract({
        address: CONTRACT_ADDRESSES.DEMO_TRADITIONAL_MARKET,
        abi: CONTRACT_ABIS.TRADITIONAL_MARKET,
        functionName: 'question',
    });

    // Read UMA demo market question
    const { data: umaQuestion, error: umaQuestionError } = useReadContract({
        address: CONTRACT_ADDRESSES.DEMO_UMA_MARKET,
        abi: CONTRACT_ABIS.UMA_MARKET,
        functionName: 'question',
    });

    // Read user bets from demo market (if user is connected)
    const { data: userBets, error: userBetsError } = useReadContract({
        address: CONTRACT_ADDRESSES.DEMO_TRADITIONAL_MARKET,
        abi: CONTRACT_ABIS.TRADITIONAL_MARKET,
        functionName: 'getUserBets',
        args: userAddress ? [userAddress] : undefined,
    });

    useEffect(() => {
        const info: ContractInfo[] = [
            {
                name: 'Parimutuel Market Factory',
                address: CONTRACT_ADDRESSES.PARIMUTUEL_MARKET_FACTORY,
                data: { marketCount: marketCount?.toString() },
                error: marketCountError?.message,
            },
            {
                name: 'UMA Parimutuel Factory',
                address: CONTRACT_ADDRESSES.UMA_PARIMUTUEL_MARKET_FACTORY,
                data: { collateralToken },
                error: collateralError?.message,
            },
            {
                name: 'Market Resolver',
                address: CONTRACT_ADDRESSES.MARKET_RESOLVER,
                data: {
                    bondAmount: bondAmount ? `${formatUnits(bondAmount as bigint, 6)} USDC` : 'Loading...'
                },
                error: bondError?.message,
            },
            {
                name: 'Demo Traditional Market',
                address: CONTRACT_ADDRESSES.DEMO_TRADITIONAL_MARKET,
                data: {
                    question: demoQuestion,
                    userBets: userBets ? {
                        yesBet: formatUnits((userBets as [bigint, bigint])[0], 6),
                        noBet: formatUnits((userBets as [bigint, bigint])[1], 6),
                    } : null
                },
                error: questionError?.message || userBetsError?.message,
            },
            {
                name: 'Demo UMA Market',
                address: CONTRACT_ADDRESSES.DEMO_UMA_MARKET,
                data: { question: umaQuestion },
                error: umaQuestionError?.message,
            },
        ];

        setContractsInfo(info);
    }, [
        marketCount, marketCountError,
        collateralToken, collateralError,
        bondAmount, bondError,
        demoQuestion, questionError,
        umaQuestion, umaQuestionError,
        userBets, userBetsError,
    ]);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg mb-8">
                <h1 className="text-3xl font-bold mb-2">🚀 Contract Integration Demo</h1>
                <p className="text-blue-100">
                    Live integration with newly deployed contracts on Base Sepolia
                </p>
                {userAddress && (
                    <p className="text-sm text-blue-200 mt-2">
                        Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contractsInfo.map((contract, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {contract.name}
                            </h3>
                            <div className="flex space-x-2">
                                <a
                                    href={getAddressUrl(contract.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                    title="View on Block Explorer"
                                >
                                    🔗
                                </a>
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                                {contract.address}
                            </p>
                        </div>

                        {contract.error ? (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                <p className="text-red-600 dark:text-red-400 text-sm">
                                    ❌ Error: {contract.error}
                                </p>
                            </div>
                        ) : contract.data ? (
                            <div className="space-y-2">
                                {Object.entries(contract.data).map(([key, value]) => (
                                    <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                                        <p className="text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                {key}:
                                            </span>
                                            <span className="ml-2 text-gray-900 dark:text-white">
                                                {typeof value === 'object' ? (
                                                    <pre className="text-xs mt-1 whitespace-pre-wrap">
                                                        {JSON.stringify(value, null, 2)}
                                                    </pre>
                                                ) : (
                                                    value?.toString() || 'N/A'
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-3">
                    ✅ Integration Status
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-green-700 dark:text-green-300">
                            <strong>Deployed Contracts:</strong> 5 contracts successfully deployed
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                            <strong>Network:</strong> Base Sepolia (Chain ID: 84532)
                        </p>
                    </div>
                    <div>
                        <p className="text-green-700 dark:text-green-300">
                            <strong>Integration:</strong> Frontend successfully connected
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                            <strong>ABIs:</strong> Latest contract ABIs loaded
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                <p>
                    This demo shows live data from the deployed contracts.
                    {!userAddress && ' Connect your wallet to see personalized data.'}
                </p>
            </div>
        </div>
    );
}
