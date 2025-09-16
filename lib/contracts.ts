/**
 * 🚀 Centralized Contract Configuration
 * Updated with latest deployment from DeployUMAContracts.s.sol
 * 
 * Deployment Details:
 * - MarketResolver: 0x9dd909cD9F79B1618d9C797dC1b63DA9c9D77cBd
 * - UMAParimutuelMarketFactory: 0x317A5FAd4F52C147545E0A4A3240dcB560F486c4
 * - ParimutuelMarketFactory: 0x50ACC2590E8BB702C9A74327D208dE9a9EeF4c9a
 * - Sample UMA Market: 0xD5Fc3f213Fe89dF79740676beAaE872ee4bceF05
 * - Sample Traditional Market: 0xf538f10A2c073ee90e77C648C325a11e6B9Dc527
 */

import { Address } from 'viem';

// Import ABIs
import ParimutuelMarketFactoryABI from './abi/ParimutuelMarketFactory.json';
import UMAParimutuelMarketFactoryV2ABI from './abi/UMAParimutuelMarketFactoryV2.json';
import MarketResolverABI from './abi/MarketResolver.json';
import UMAEventBasedParimutuelMarketMinimalABI from './abi/UMAEventBasedParimutuelMarketMinimal.json';
import ParimutuelPredictionMarketABI from './abi/ParimutuelPredictionMarket.json';

// Contract Addresses (Base Sepolia)
export const CONTRACT_ADDRESSES = {
    // Core Factory Contracts
    PARIMUTUEL_MARKET_FACTORY: '0x50ACC2590E8BB702C9A74327D208dE9a9EeF4c9a' as Address,
    UMA_PARIMUTUEL_MARKET_FACTORY: '0x317A5FAd4F52C147545E0A4A3240dcB560F486c4' as Address,

    // Market Resolution
    MARKET_RESOLVER: '0x9dd909cD9F79B1618d9C797dC1b63DA9c9D77cBd' as Address,

    // Sample/Demo Markets
    DEMO_TRADITIONAL_MARKET: '0xf538f10A2c073ee90e77C648C325a11e6B9Dc527' as Address,
    DEMO_UMA_MARKET: '0xD5Fc3f213Fe89dF79740676beAaE872ee4bceF05' as Address,

    // External Contracts
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    UMA_OPTIMISTIC_ORACLE_V2: '0x5953f2538F613E05bAeD8a5aEf8b796c9AE2Df85' as Address, // Note: This is the deployed oracle address
} as const;

// Contract ABIs
export const CONTRACT_ABIS = {
    PARIMUTUEL_MARKET_FACTORY: ParimutuelMarketFactoryABI,
    UMA_PARIMUTUEL_MARKET_FACTORY: UMAParimutuelMarketFactoryV2ABI,
    MARKET_RESOLVER: MarketResolverABI,
    UMA_MARKET: UMAEventBasedParimutuelMarketMinimalABI,
    TRADITIONAL_MARKET: ParimutuelPredictionMarketABI,
} as const;

// Legacy exports for backward compatibility
export const MARKET_FACTORY_ADDRESS = CONTRACT_ADDRESSES.PARIMUTUEL_MARKET_FACTORY;
export const DEMO_MARKET_ADDRESS = CONTRACT_ADDRESSES.DEMO_TRADITIONAL_MARKET;
export const USDC_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.USDC;
export const MARKET_RESOLVER_ADDRESS = CONTRACT_ADDRESSES.MARKET_RESOLVER;
export const UMA_PARIMUTUEL_FACTORY_ADDRESS = CONTRACT_ADDRESSES.UMA_PARIMUTUEL_MARKET_FACTORY;

// ABI exports for backward compatibility
export const MARKET_FACTORY_ABI = CONTRACT_ABIS.PARIMUTUEL_MARKET_FACTORY;
export const PREDICTION_MARKET_ABI = CONTRACT_ABIS.TRADITIONAL_MARKET;
export const MARKET_RESOLVER_ABI_EXPORT = CONTRACT_ABIS.MARKET_RESOLVER;
export const UMA_MARKET_ABI = CONTRACT_ABIS.UMA_MARKET;

// Market Types
export enum MarketType {
    UNREGISTERED = 0,
    PLATFORM = 1,
    USER = 2
}

// Oracle States (from UMA)
export enum OracleState {
    Invalid = 0,
    Requested = 1,
    Proposed = 2,
    Expired = 3,
    Disputed = 4,
    Resolved = 5,
    Settled = 6
}

// Helper functions
export const getContractAddress = (contractName: keyof typeof CONTRACT_ADDRESSES): Address => {
    return CONTRACT_ADDRESSES[contractName];
};

export const getContractABI = (contractName: keyof typeof CONTRACT_ABIS) => {
    return CONTRACT_ABIS[contractName];
};

export const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Network configuration
export const NETWORK_CONFIG = {
    chainId: 84532, // Base Sepolia
    name: 'Base Sepolia',
    blockExplorer: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org',
} as const;

export const getBlockExplorerUrl = (hash: string): string => {
    return `${NETWORK_CONFIG.blockExplorer}/tx/${hash}`;
};

export const getAddressUrl = (address: string): string => {
    return `${NETWORK_CONFIG.blockExplorer}/address/${address}`;
};

// Deployment information
export const DEPLOYMENT_INFO = {
    timestamp: Date.now(),
    deployer: '0x7579c7457F4151B1ae7078fAf9D4A30Af953bDeE',
    network: 'Base Sepolia',
    verified: true,
} as const;

const contractsConfig = {
    CONTRACT_ADDRESSES,
    CONTRACT_ABIS,
    MarketType,
    OracleState,
    getContractAddress,
    getContractABI,
    isValidAddress,
    NETWORK_CONFIG,
    getBlockExplorerUrl,
    getAddressUrl,
    DEPLOYMENT_INFO,
};

export default contractsConfig;
