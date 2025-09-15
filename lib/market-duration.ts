/**
 * Utility functions for managing fixed 24-hour market duration
 */

/**
 * Get the end time for a new market (always 24 hours from creation)
 */
export function getMarketEndTime(): Date {
    const now = new Date();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    return endTime;
}

/**
 * Get the end time as a Unix timestamp for a new market
 */
export function getMarketEndTimeTimestamp(): number {
    return Math.floor(getMarketEndTime().getTime() / 1000);
}

/**
 * Check if a timestamp represents a valid 24-hour duration market
 * @param endTimeTimestamp - The market end time in Unix timestamp
 * @param tolerance - Tolerance in seconds for processing delays (default: 60 seconds)
 */
export function isValidMarketDuration(endTimeTimestamp: number, tolerance: number = 60): boolean {
    const now = Math.floor(Date.now() / 1000);
    const expectedEndTime = now + (24 * 60 * 60); // 24 hours from now
    
    return Math.abs(endTimeTimestamp - expectedEndTime) <= tolerance;
}

/**
 * Get the remaining time until market expiry
 * @param endTimeTimestamp - The market end time in Unix timestamp
 * @returns Object with hours, minutes, and seconds remaining
 */
export function getTimeRemaining(endTimeTimestamp: number): {
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
} {
    const now = Math.floor(Date.now() / 1000);
    const total = endTimeTimestamp - now;
    
    if (total <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }
    
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    
    return { hours, minutes, seconds, total };
}

/**
 * Format time remaining as a human-readable string
 */
export function formatTimeRemaining(endTimeTimestamp: number): string {
    const remaining = getTimeRemaining(endTimeTimestamp);
    
    if (remaining.total <= 0) {
        return 'Expired';
    }
    
    if (remaining.hours > 0) {
        return `${remaining.hours}h ${remaining.minutes}m remaining`;
    } else if (remaining.minutes > 0) {
        return `${remaining.minutes}m ${remaining.seconds}s remaining`;
    } else {
        return `${remaining.seconds}s remaining`;
    }
}

/**
 * Constants for the 24-hour market system
 */
export const MARKET_DURATION = {
    HOURS: 24,
    SECONDS: 24 * 60 * 60,
    MILLISECONDS: 24 * 60 * 60 * 1000,
} as const;

export default {
    getMarketEndTime,
    getMarketEndTimeTimestamp,
    isValidMarketDuration,
    getTimeRemaining,
    formatTimeRemaining,
    MARKET_DURATION
};