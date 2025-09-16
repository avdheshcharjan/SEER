import { Address } from 'viem';

// Market Resolver contract address (updated with latest deployment)
export const MARKET_RESOLVER_ADDRESS = '0x9dd909cD9F79B1618d9C797dC1b63DA9c9D77cBd' as Address;

// UMA Optimistic Oracle V2 address on Base Sepolia (updated for testnet)
export const UMA_OPTIMISTIC_ORACLE_V2_ADDRESS = '0x5953f2538F613E05bAeD8a5aEf8b796c9AE2Df85' as Address;

// Market types enum
export enum MarketType {
    UNREGISTERED = 0,
    PLATFORM = 1,
    USER = 2
}

// Market Resolver ABI
export const MARKET_RESOLVER_ABI = [
    {
        name: 'registerMarket',
        type: 'function',
        inputs: [
            { name: 'market', type: 'address' },
            { name: 'marketType', type: 'uint8' }, // 1 = PLATFORM, 2 = USER
            { name: 'creator', type: 'address' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'requestPlatformResolution',
        type: 'function',
        inputs: [{ name: 'market', type: 'address' }],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'settlePlatformResolution',
        type: 'function',
        inputs: [{ name: 'market', type: 'address' }],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'resolveUserMarket',
        type: 'function',
        inputs: [
            { name: 'market', type: 'address' },
            { name: 'outcome', type: 'bool' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'setCreatorAuthorization',
        type: 'function',
        inputs: [
            { name: 'creator', type: 'address' },
            { name: 'authorized', type: 'bool' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    },
    {
        name: 'canResolveMarket',
        type: 'function',
        inputs: [{ name: 'market', type: 'address' }],
        outputs: [
            { name: 'canResolve', type: 'bool' },
            { name: 'resolutionType', type: 'uint8' }
        ],
        stateMutability: 'view'
    },
    {
        name: 'getOracleState',
        type: 'function',
        inputs: [{ name: 'market', type: 'address' }],
        outputs: [{ name: 'state', type: 'uint8' }],
        stateMutability: 'view'
    },
    {
        name: 'marketTypes',
        type: 'function',
        inputs: [{ name: 'market', type: 'address' }],
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view'
    },
    {
        name: 'authorizedCreators',
        type: 'function',
        inputs: [{ name: 'creator', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
    },
    {
        name: 'pendingResolutions',
        type: 'function',
        inputs: [{ name: 'market', type: 'address' }],
        outputs: [
            { name: 'market', type: 'address' },
            { name: 'timestamp', type: 'uint256' },
            { name: 'ancillaryData', type: 'bytes' },
            { name: 'marketType', type: 'uint8' },
            { name: 'resolved', type: 'bool' }
        ],
        stateMutability: 'view'
    },
    // Events
    {
        name: 'MarketRegistered',
        type: 'event',
        anonymous: false,
        inputs: [
            { name: 'market', type: 'address', indexed: true },
            { name: 'marketType', type: 'uint8', indexed: false },
            { name: 'creator', type: 'address', indexed: true }
        ]
    },
    {
        name: 'ResolutionRequested',
        type: 'event',
        anonymous: false,
        inputs: [
            { name: 'market', type: 'address', indexed: true },
            { name: 'timestamp', type: 'uint256', indexed: false },
            { name: 'ancillaryData', type: 'bytes', indexed: false }
        ]
    },
    {
        name: 'MarketResolved',
        type: 'event',
        anonymous: false,
        inputs: [
            { name: 'market', type: 'address', indexed: true },
            { name: 'outcome', type: 'bool', indexed: false },
            { name: 'resolutionType', type: 'uint8', indexed: false }
        ]
    }
] as const;

// Oracle states enum (from UMA)
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
export const getOracleStateLabel = (state: OracleState): string => {
    switch (state) {
        case OracleState.Invalid: return 'Not Requested';
        case OracleState.Requested: return 'Awaiting Proposal';
        case OracleState.Proposed: return 'Proposal Submitted';
        case OracleState.Expired: return 'Ready to Settle';
        case OracleState.Disputed: return 'Under Dispute';
        case OracleState.Resolved: return 'Dispute Resolved';
        case OracleState.Settled: return 'Settled';
        default: return 'Unknown';
    }
};

export const getMarketTypeLabel = (type: MarketType): string => {
    switch (type) {
        case MarketType.PLATFORM: return 'Platform Market (UMA Oracle)';
        case MarketType.USER: return 'User Market (Creator Resolved)';
        case MarketType.UNREGISTERED: return 'Unregistered';
        default: return 'Unknown';
    }
};

export const isMarketResolvable = (canResolve: boolean, marketType: MarketType): { canResolve: boolean; reason?: string } => {
    if (!canResolve) {
        return { canResolve: false, reason: 'Market has not expired yet or is already resolved' };
    }

    if (marketType === MarketType.PLATFORM) {
        return { canResolve: true, reason: 'Ready for UMA Oracle resolution' };
    }

    if (marketType === MarketType.USER) {
        return { canResolve: true, reason: 'Ready for creator resolution' };
    }

    return { canResolve: false, reason: 'Invalid market type' };
};

const MarketResolver = {
    MARKET_RESOLVER_ADDRESS,
    UMA_OPTIMISTIC_ORACLE_V2_ADDRESS,
    MARKET_RESOLVER_ABI,
    MarketType,
    OracleState,
    getOracleStateLabel,
    getMarketTypeLabel,
    isMarketResolvable
};

export default MarketResolver;