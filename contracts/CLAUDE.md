# Contracts Directory - Smart Contract Implementation

## Overview
This directory contains the smart contract implementation for TOMO's **pari-mutuel prediction markets**. This represents the **Phase 2+ transition** from the original AMM-based system to a simplified pari-mutuel betting system as outlined in the CLAUDE-README.md roadmap.

## Contract Architecture

### Core Contracts

#### `ParimutuelPredictionMarket.sol`
The main prediction market contract implementing pari-mutuel betting:

**Key Features:**
- **Binary Outcomes**: Simple YES/NO betting on prediction questions
- **Fixed Stakes**: Support for $1, $5, $10 USDC bet amounts
- **Winner-takes-all**: Winners split the losing pool proportionally
- **24-hour Resolution**: Markets resolve after specified end time
- **ERC-4337 Compatible**: Full Account Abstraction support for gasless transactions

**Core Functions:**
```solidity
function betYes(uint256 amount) external  // Bet on YES outcome
function betNo(uint256 amount) external   // Bet on NO outcome
function placeBet(bool side, uint256 amount) external // Generic bet function
function resolveMarket(bool outcome) external // Resolve market outcome
function claimRewards() external // Claim winnings after resolution
```

**Payout Calculation:**
```
User Payout = Original Bet + (User Bet / Total Winning Bets) × Total Losing Bets
```

#### `ParimutuelMarketFactory.sol`
Factory contract for deploying new prediction markets:

**Features:**
- **Market Creation**: Deploy new ParimutuelPredictionMarket instances
- **Access Control**: Configurable resolvers and permissions
- **Market Discovery**: Query active and historical markets
- **Batch Operations**: Efficient market management

**Core Functions:**
```solidity
function createMarket(string memory question, uint256 endTime, address resolver) external
function getActiveMarkets(uint256 limit) external view
function getMarkets(uint256 start, uint256 limit) external view
```

### Legacy Contracts (Reference)

#### `SimplePredictionMarket.sol`
Original AMM-based prediction market (Phase 1):
- **Complex Pricing**: Constant-product market maker formula
- **Dynamic Odds**: Real-time price discovery
- **Trading Features**: Buy/sell shares before resolution
- **Liquidity Pools**: Seeded liquidity for price stability

*Note: Kept for reference and potential future features*

#### `MarketFactory.sol`
Original factory for AMM-based markets

## Key Design Decisions (Phase 2+)

### Pari-mutuel vs AMM Choice
**Why Pari-mutuel was chosen:**

1. **User Experience**: No complex odds or pricing - users always know they win or lose their stake
2. **Simplicity**: Straightforward "winners split losers' pool" concept
3. **No Bad Outcomes**: Winners never receive less than their original bet (unlike AMM where you can bet correctly but still lose money due to odds)
4. **Gas Efficiency**: Simpler calculations and fewer edge cases
5. **24h Resolution**: Perfect for quick-turnaround markets

### ERC-4337 Integration
Full Account Abstraction support enables:
- **Gasless Transactions**: Users never pay gas fees
- **Batching**: Multiple bets in single transaction
- **Smart Wallets**: Enhanced UX with Coinbase OnchainKit
- **Session Keys**: Potential for auto-execution flows

### Security Features
- **Reentrancy Protection**: Both standard and ERC-4337 specific guards
- **Access Controls**: Role-based permissions for resolution
- **Emergency Functions**: Owner emergency resolve and fund recovery
- **Input Validation**: Comprehensive error handling

## Deployment Configuration

### Networks Supported
- **Base Sepolia** (Testnet): Development and testing
- **Base Mainnet** (Production): Live deployment target

### Contract Addresses
Deployment addresses tracked in:
- `DEPLOYED_CONTRACTS.md`: Original AMM system
- `PARIMUTUEL_DEPLOYED.md`: New pari-mutuel system
- `PARIMUTUEL_DEPLOYMENT.md`: Deployment documentation

### Environment Variables
```env
PRIVATE_KEY=                    # Deployer private key
RPC_URL_BASE_SEPOLIA=          # Base Sepolia RPC
RPC_URL_BASE_MAINNET=          # Base Mainnet RPC
ETHERSCAN_API_KEY=             # Contract verification
```

## Development Tools

### Foundry Framework
- **forge**: Smart contract compilation and testing
- **anvil**: Local blockchain for development
- **cast**: CLI for contract interaction

### Testing Suite (`/test`)
Comprehensive test coverage for:
- Betting mechanics and payout calculations
- Market resolution and edge cases
- Access controls and security
- Gas optimization and ERC-4337 compatibility

### Deployment Scripts (`/script`)
Automated deployment and configuration:
- `DeployParimutuel.s.sol`: Deploy pari-mutuel system
- Configuration for different networks
- Contract verification and setup

## Gas Optimization

### Batch Operations
- **Multiple Bets**: Single transaction for multiple markets
- **Efficient Storage**: Optimized state variable packing
- **Minimal Loops**: Avoid iteration in main betting functions

### ERC-4337 Considerations
- **Gas Estimation**: Built-in functions for UserOperation gas limits
- **Paymaster Integration**: Configured for Coinbase Developer Paymaster
- **Entry Point Compatibility**: Tested with standard EntryPoint contract

## Security Audit Considerations

### Common Vulnerabilities Addressed
- **Reentrancy**: Multiple protection layers
- **Integer Overflow**: Solidity 0.8+ safe math
- **Access Control**: Role-based function restrictions
- **Front-running**: Minimal impact due to pari-mutuel nature

### Best Practices Implemented
- **Checks-Effects-Interactions**: Consistent pattern usage
- **Emergency Stops**: Pause functionality for critical issues
- **Upgrade Safety**: Immutable contracts with emergency recovery
- **Event Logging**: Comprehensive event emission for tracking

## Integration Points

### Frontend Integration
Contracts integrate with frontend via:
- **OnchainKit Transaction**: Gasless transaction components
- **Batch Calls**: Multiple predictions in single transaction
- **Real-time Events**: Contract event monitoring

### Database Synchronization
Contract events trigger off-chain updates:
- **Bet Placement**: Update user statistics
- **Market Resolution**: Calculate final outcomes
- **Reward Claims**: Track user winnings

## Performance Metrics

### Target Specifications
- **Transaction Confirmation**: ~1-2 seconds on Base
- **Gas Usage**: ~85k gas per bet, ~1.35M gas per market creation
- **Batch Size**: Up to 50 bets per transaction
- **Resolution Time**: Manual resolution within 1 hour of market end

## Future Enhancements

### Planned Features
- **Automated Resolution**: Oracle integration for objective outcomes
- **Multi-outcome Markets**: Beyond binary YES/NO predictions
- **Advanced Betting**: Spread betting and conditional markets
- **Cross-chain Support**: Multi-chain market deployment

### Optimization Areas
- **Gas Efficiency**: Further optimization for large batches
- **Storage Costs**: IPFS integration for market metadata
- **Upgradeability**: Proxy patterns for future enhancements
- **Scaling**: Layer 2 and rollup compatibility