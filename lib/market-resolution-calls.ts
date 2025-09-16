import { Address, encodeFunctionData } from 'viem';
import { MARKET_RESOLVER_ADDRESS, MARKET_RESOLVER_ABI } from './market-resolver';

/**
 * Generate transaction calls for requesting platform resolution via UMA Oracle
 */
export function generateRequestPlatformResolutionCalls(marketAddress: Address) {
    const data = encodeFunctionData({
        abi: MARKET_RESOLVER_ABI,
        functionName: 'requestPlatformResolution',
        args: [marketAddress]
    });

    return [{
        to: MARKET_RESOLVER_ADDRESS,
        data: data as `0x${string}`,
        value: BigInt(0)
    }];
}

/**
 * Generate transaction calls for settling platform resolution from UMA Oracle
 */
export function generateSettlePlatformResolutionCalls(marketAddress: Address) {
    const data = encodeFunctionData({
        abi: MARKET_RESOLVER_ABI,
        functionName: 'settlePlatformResolution',
        args: [marketAddress]
    });

    return [{
        to: MARKET_RESOLVER_ADDRESS,
        data: data as `0x${string}`,
        value: BigInt(0)
    }];
}

/**
 * Generate transaction calls for resolving user market by creator
 */
export function generateResolveUserMarketCalls(marketAddress: Address, outcome: boolean) {
    const data = encodeFunctionData({
        abi: MARKET_RESOLVER_ABI,
        functionName: 'resolveUserMarket',
        args: [marketAddress, outcome]
    });

    return [{
        to: MARKET_RESOLVER_ADDRESS,
        data: data as `0x${string}`,
        value: BigInt(0)
    }];
}

/**
 * Generate transaction calls for authorizing a creator (admin only)
 */
export function generateSetCreatorAuthorizationCalls(creator: Address, authorized: boolean) {
    const data = encodeFunctionData({
        abi: MARKET_RESOLVER_ABI,
        functionName: 'setCreatorAuthorization',
        args: [creator, authorized]
    });

    return [{
        to: MARKET_RESOLVER_ADDRESS,
        data: data as `0x${string}`,
        value: BigInt(0)
    }];
}

/**
 * Utility to get readable resolution type from transaction type
 */
export function getResolutionTypeLabel(type: 'request' | 'settle' | 'resolve'): string {
    switch (type) {
        case 'request':
            return 'Request Oracle Resolution';
        case 'settle':
            return 'Settle Oracle Resolution';
        case 'resolve':
            return 'Resolve Market';
        default:
            return 'Unknown';
    }
}

const MarketResolutionCalls = {
    generateRequestPlatformResolutionCalls,
    generateSettlePlatformResolutionCalls,
    generateResolveUserMarketCalls,
    generateSetCreatorAuthorizationCalls,
    getResolutionTypeLabel
};

export default MarketResolutionCalls;