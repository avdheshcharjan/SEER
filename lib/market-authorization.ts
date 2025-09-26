/**
 * Market Authorization Utilities
 * Centralizes logic for determining market resolution authorization
 */

import { Address } from 'viem';
import { MarketType } from './market-resolver';

// Hardcoded authorized creator addresses (can be made configurable later)
export const AUTHORIZED_CREATORS = [
    '0x7579c7457F4151B1ae7078fAf9D4A30Af953bDeE',
    '0x88eBc2a2BCD44947c78DD80407F6Dc5b00049C1E'
] as const;

/**
 * Check if an address is an authorized creator for platform markets
 */
export function isAuthorizedCreator(address: Address): boolean {
    return AUTHORIZED_CREATORS.includes(address.toLowerCase() as typeof AUTHORIZED_CREATORS[number]);
}

/**
 * Determine if a user can resolve a market and what type of resolution
 */
export function getMarketResolutionInfo(
    userAddress: Address,
    marketCreatorAddress: Address,
    marketEndTime: Date,
    resolutionMethod?: 'vote' | 'creator'
): {
    marketType: MarketType;
    canResolve: boolean;
    isAuthorized: boolean;
    hoursUntilResolution?: number;
} {
    const now = new Date();
    const hoursExpired = (now.getTime() - marketEndTime.getTime()) / (1000 * 60 * 60);

    const isUserAuthorizedCreator = isAuthorizedCreator(userAddress);
    const isUserMarketCreator = marketCreatorAddress.toLowerCase() === userAddress.toLowerCase();

    // Authorized creators can use UMA oracle for platform markets (if they chose vote resolution)
    if (isUserAuthorizedCreator && resolutionMethod === 'vote') {
        return {
            marketType: MarketType.PLATFORM,
            canResolve: hoursExpired >= 0, // Can resolve immediately after market ends
            isAuthorized: true
        };
    }

    // Market creators can resolve their own markets after 24 hours
    if (isUserMarketCreator) {
        if (hoursExpired >= 24) {
            return {
                marketType: MarketType.USER,
                canResolve: true,
                isAuthorized: true
            };
        } else {
            return {
                marketType: MarketType.USER,
                canResolve: false,
                isAuthorized: false,
                hoursUntilResolution: Math.ceil(24 - hoursExpired)
            };
        }
    }

    // Not authorized
    return {
        marketType: MarketType.USER,
        canResolve: false,
        isAuthorized: false
    };
}

/**
 * Determine market type for creation based on creator and resolution method
 */
export function getMarketTypeForCreation(
    creatorAddress: Address,
    resolutionMethod: 'vote' | 'creator'
): MarketType {
    const isAuthorized = isAuthorizedCreator(creatorAddress);

    if (isAuthorized && resolutionMethod === 'vote') {
        return MarketType.PLATFORM;
    }

    return MarketType.USER;
}

/**
 * Get human-readable description of resolution authorization
 */
export function getResolutionDescription(
    userAddress: Address,
    marketCreatorAddress: Address,
    marketEndTime: Date,
    resolutionMethod?: 'vote' | 'creator'
): string {
    const info = getMarketResolutionInfo(userAddress, marketCreatorAddress, marketEndTime, resolutionMethod);

    if (info.marketType === MarketType.PLATFORM && info.isAuthorized) {
        return 'This market will be resolved using UMA Oracle (decentralized resolution)';
    }

    if (info.isAuthorized && info.canResolve) {
        return 'You can resolve this market as the creator';
    }

    if (info.isAuthorized && !info.canResolve && info.hoursUntilResolution) {
        return `You can resolve this market in ${info.hoursUntilResolution} hours (24h waiting period)`;
    }

    if (userAddress.toLowerCase() === marketCreatorAddress.toLowerCase()) {
        return 'You created this market but must wait 24 hours after expiration to resolve it';
    }

    return 'You are not authorized to resolve this market';
}
