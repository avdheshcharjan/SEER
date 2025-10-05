/**
 * Utility functions for the application
 */

/**
 * Truncates an Ethereum address to show first 6 and last 4 characters
 * @param address - The full ethereum address
 * @param startChars - Number of characters to show at the start (default: 6)
 * @param endChars - Number of characters to show at the end (default: 4)
 * @returns Truncated address string like "0x742E...8e8e"
 */
export function truncateAddress(
    address: string,
    startChars: number = 6,
    endChars: number = 4
): string {
    if (!address) return '';
    if (address.length <= startChars + endChars) return address;

    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Checks if a string is a valid Ethereum address
 * @param address - The address string to validate
 * @returns true if valid ethereum address format
 */
export function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}