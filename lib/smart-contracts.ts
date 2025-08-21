"use client";

import {
    USDC_CONTRACT_ADDRESS,
    MARKET_FACTORY_ADDRESS,
    DEMO_MARKET_ADDRESS,
    USDC_ABI,
    PREDICTION_MARKET_ABI,
    MARKET_FACTORY_ABI,
    generateBuySharesTransaction,
    generateUSDCApprovalTransaction,
    generateFaucetTransaction,
    generateCreateMarketTransaction
} from './blockchain';
import { Address, parseUnits, formatUnits } from 'viem';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

export interface MarketData {
    address: Address;
    question: string;
    endTime: number;
    resolved: boolean;
    outcome?: boolean;
    yesPool: number;
    noPool: number;
    yesPrice: number;
    noPrice: number;
}

export interface UserPosition {
    yesShares: number;
    noShares: number;
}

/**
 * Smart Contract Service for interacting with prediction markets
 */
export class SmartContractService {

    /**
     * Get USDC balance for a user
     */
    static useUSDCBalance(address?: Address) {
        return useReadContract({
            address: USDC_CONTRACT_ADDRESS,
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: address ? [address] : undefined,
            query: {
                enabled: !!address,
            },
        });
    }

    /**
     * Get USDC allowance for a spender
     */
    static useUSDCAllowance(owner?: Address, spender?: Address) {
        return useReadContract({
            address: USDC_CONTRACT_ADDRESS,
            abi: USDC_ABI,
            functionName: 'allowance',
            args: owner && spender ? [owner, spender] : undefined,
            query: {
                enabled: !!(owner && spender),
            },
        });
    }

    /**
     * Get market data from a prediction market contract
     */
    static useMarketData(marketAddress?: Address) {
        const { data: question } = useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'question',
            query: { enabled: !!marketAddress },
        });

        const { data: endTime } = useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'endTime',
            query: { enabled: !!marketAddress },
        });

        const { data: resolved } = useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'resolved',
            query: { enabled: !!marketAddress },
        });

        const { data: outcome } = useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'outcome',
            query: { enabled: !!marketAddress },
        });

        const { data: marketStats } = useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getMarketStats',
            query: { enabled: !!marketAddress },
        });

        const { data: yesPrice } = useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getYesPrice',
            query: { enabled: !!marketAddress },
        });

        const { data: noPrice } = useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getNoPrice',
            query: { enabled: !!marketAddress },
        });

        if (!marketAddress) {
            return { data: null, isLoading: false, error: null };
        }

        const isLoading = !question || !endTime || resolved === undefined || !marketStats || !yesPrice || !noPrice;

        if (isLoading) {
            return { data: null, isLoading: true, error: null };
        }

        const [yesPool, noPool] = marketStats as [bigint, bigint, bigint];

        const marketData: MarketData = {
            address: marketAddress,
            question: question as string,
            endTime: Number(endTime),
            resolved: resolved as boolean,
            outcome: outcome as boolean | undefined,
            yesPool: Number(formatUnits(yesPool, 6)),
            noPool: Number(formatUnits(noPool, 6)),
            yesPrice: Number(yesPrice) / 1e18, // Convert from wei to decimal
            noPrice: Number(noPrice) / 1e18,
        };

        return { data: marketData, isLoading: false, error: null };
    }

    /**
     * Get user's position in a market
     */
    static useUserPosition(marketAddress?: Address, userAddress?: Address) {
        const { data: userShares } = useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getUserShares',
            args: userAddress ? [userAddress] : undefined,
            query: {
                enabled: !!(marketAddress && userAddress),
            },
        });

        if (!userShares) {
            return { data: null, isLoading: !!(marketAddress && userAddress), error: null };
        }

        const [yesShares, noShares] = userShares as [bigint, bigint];

        const position: UserPosition = {
            yesShares: Number(formatUnits(yesShares, 6)),
            noShares: Number(formatUnits(noShares, 6)),
        };

        return { data: position, isLoading: false, error: null };
    }

    /**
     * Calculate shares that would be received for a given USDC amount
     */
    static useCalculateShares(marketAddress?: Address, amount?: number, side?: boolean) {
        const amountWei = amount ? parseUnits(amount.toString(), 6) : undefined;

        return useReadContract({
            address: marketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'calculateSharesOut',
            args: marketAddress && amountWei && side !== undefined ? [amountWei, side] : undefined,
            query: {
                enabled: !!(marketAddress && amountWei && side !== undefined),
            },
        });
    }

    /**
     * Get active markets from the factory
     */
    static useActiveMarkets(limit: number = 10) {
        return useReadContract({
            address: MARKET_FACTORY_ADDRESS,
            abi: MARKET_FACTORY_ABI,
            functionName: 'getActiveMarkets',
            args: [BigInt(limit)],
        });
    }

    /**
     * Get markets created by a user
     */
    static useCreatorMarkets(creator?: Address) {
        return useReadContract({
            address: MARKET_FACTORY_ADDRESS,
            abi: MARKET_FACTORY_ABI,
            functionName: 'getCreatorMarkets',
            args: creator ? [creator] : undefined,
            query: {
                enabled: !!creator,
            },
        });
    }
}

/**
 * Hook for buying shares in a prediction market
 */
export function useBuyShares() {
    const { writeContract, data: hash, error, isPending } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const buyShares = async (
        marketAddress: Address,
        side: 'yes' | 'no',
        amount: number,
        userAddress: Address
    ) => {
        // First check/request USDC approval
        const approvalTx = generateUSDCApprovalTransaction(amount, marketAddress);

        try {
            // Execute approval transaction
            writeContract({
                address: approvalTx.to,
                abi: USDC_ABI,
                functionName: 'approve',
                args: [marketAddress, parseUnits(amount.toString(), 6)],
                chain: baseSepolia,
            });

            // Wait for approval confirmation before proceeding with buy
            // Note: In a production app, you'd want to wait for the approval tx to confirm
            // before executing the buy transaction

        } catch (error) {
            console.error('Approval failed:', error);
            throw new Error('Failed to approve USDC spending');
        }
    };

    const executeBuyShares = async (
        marketAddress: Address,
        side: 'yes' | 'no',
        amount: number
    ) => {
        try {
            writeContract({
                address: marketAddress,
                abi: PREDICTION_MARKET_ABI,
                functionName: 'buyShares',
                args: [side === 'yes', parseUnits(amount.toString(), 6)],
                chain: baseSepolia,
            });
        } catch (error) {
            console.error('Buy shares failed:', error);
            throw new Error('Failed to buy shares');
        }
    };

    return {
        buyShares,
        executeBuyShares,
        hash,
        error,
        isPending,
        isConfirming,
        isConfirmed,
    };
}

/**
 * Hook for getting test USDC from faucet
 */
export function useUSDCFaucet() {
    const { address } = useAccount();
    const { writeContract, data: hash, error, isPending } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    // Check if user can use faucet
    const { data: canUseFaucet } = useReadContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: 'canUseFaucet',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        }
    });

    // Get faucet cooldown remaining time
    const { data: faucetCooldown } = useReadContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: 'getFaucetCooldown',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        }
    });

    const claimFaucet = async () => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        if (!canUseFaucet) {
            const hoursRemaining = faucetCooldown ? Number(faucetCooldown) / 3600 : 0;
            throw new Error(`Faucet cooldown active. Try again in ${hoursRemaining.toFixed(1)} hours.`);
        }

        try {
            writeContract({
                address: USDC_CONTRACT_ADDRESS,
                abi: USDC_ABI,
                functionName: 'faucet',
                args: [],
                chain: baseSepolia,
            });
        } catch (error: any) {
            console.error('Faucet claim failed:', error);

            // Handle specific contract errors
            if (error?.message?.includes('FaucetCooldownActive')) {
                const hoursRemaining = faucetCooldown ? Number(faucetCooldown) / 3600 : 24;
                throw new Error(`Faucet cooldown active. Try again in ${hoursRemaining.toFixed(1)} hours.`);
            }

            throw new Error('Failed to claim from faucet. Please try again.');
        }
    };

    return {
        claimFaucet,
        hash,
        error,
        isPending,
        isConfirming,
        isConfirmed,
        canUseFaucet: !!canUseFaucet,
        faucetCooldown: faucetCooldown ? Number(faucetCooldown) : 0,
    };
}

/**
 * Hook for creating new markets
 */
export function useCreateMarket() {
    const { writeContract, data: hash, error, isPending } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const createMarket = async (
        question: string,
        endTime: Date,
        resolver?: Address
    ) => {
        try {
            const endTimeUnix = Math.floor(endTime.getTime() / 1000);

            writeContract({
                address: MARKET_FACTORY_ADDRESS,
                abi: MARKET_FACTORY_ABI,
                functionName: 'createMarket',
                args: [
                    question,
                    BigInt(endTimeUnix),
                    resolver || '0x0000000000000000000000000000000000000000'
                ],
                chain: baseSepolia,
            });
        } catch (error) {
            console.error('Create market failed:', error);
            throw new Error('Failed to create market');
        }
    };

    return {
        createMarket,
        hash,
        error,
        isPending,
        isConfirming,
        isConfirmed,
    };
}

/**
 * Utility functions
 */
export const SmartContractUtils = {
    /**
     * Format USDC amount from wei to human readable
     */
    formatUSDC: (amount: bigint): number => {
        return Number(formatUnits(amount, 6));
    },

    /**
     * Parse USDC amount from human readable to wei
     */
    parseUSDC: (amount: number): bigint => {
        return parseUnits(amount.toString(), 6);
    },

    /**
     * Format price from wei to percentage (0-1)
     */
    formatPrice: (price: bigint): number => {
        return Number(price) / 1e18;
    },

    /**
     * Get block explorer URL for transaction
     */
    getExplorerUrl: (hash: string): string => {
        return `https://sepolia.basescan.org/tx/${hash}`;
    },

    /**
     * Get block explorer URL for address
     */
    getAddressUrl: (address: string): string => {
        return `https://sepolia.basescan.org/address/${address}`;
    },
};
