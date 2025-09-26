// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ParimutuelPredictionMarket.sol";
import "./MarketResolver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ParimutuelMarketFactory
/// @notice Factory contract for creating ParimutuelPredictionMarket instances
/// @dev Simplified factory for pari-mutuel betting markets
contract ParimutuelMarketFactory is Context, Ownable, ReentrancyGuard {
    
    address public immutable usdc;
    address public defaultResolver;
    MarketResolver public marketResolver;
    
    ParimutuelPredictionMarket[] public markets;
    mapping(address => ParimutuelPredictionMarket[]) public creatorMarkets;
    
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789; // ERC-4337 EntryPoint on Base
    
    uint256 public constant MAX_MARKETS_PER_QUERY = 100; // Limit for gas safety
    uint256 public constant MINIMUM_END_TIME_BUFFER = 1 hours;
    uint256 public constant MAXIMUM_END_TIME_BUFFER = 365 days;
    
    mapping(address => uint256) public creatorMarketCount; // Track count separately for gas efficiency
    
    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        uint256 endTime,
        uint256 marketIndex,
        MarketResolver.MarketType marketType
    );
    
    error InvalidEndTime();
    error InvalidResolver();
    error InvalidAddressError();
    error QueryLimitExceededError();
    
    constructor(
        address _usdc, 
        address _defaultResolver,
        address _marketResolver
    ) Ownable(_msgSender()) {
        if (_usdc == address(0)) revert InvalidAddressError();
        if (_defaultResolver == address(0)) revert InvalidAddressError();
        if (_marketResolver == address(0)) revert InvalidAddressError();
        
        usdc = _usdc;
        defaultResolver = _defaultResolver;
        marketResolver = MarketResolver(_marketResolver);
    }
    
    /// @notice Create a new pari-mutuel prediction market
    /// @param question The prediction question
    /// @param endTime When the market should end (timestamp)
    /// @param isPlatformMarket True for platform markets (UMA resolution), false for user markets
    /// @return market The deployed market contract
    function createMarket(
        string memory question,
        uint256 endTime,
        bool isPlatformMarket
    ) external notPaused nonReentrant returns (ParimutuelPredictionMarket market) {
        if (endTime <= block.timestamp + MINIMUM_END_TIME_BUFFER) revert InvalidEndTime();
        if (endTime > block.timestamp + MAXIMUM_END_TIME_BUFFER) revert InvalidEndTime();
        
        // Use market resolver for all markets
        address actualResolver = address(marketResolver);
        
        market = new ParimutuelPredictionMarket(
            usdc,
            question,
            endTime,
            actualResolver
        );
        
        address creator = _msgSender();
        MarketResolver.MarketType marketType = isPlatformMarket 
            ? MarketResolver.MarketType.PLATFORM 
            : MarketResolver.MarketType.USER;
        
        // Register market with resolver
        marketResolver.registerMarket(address(market), marketType, creator);
        
        markets.push(market);
        creatorMarkets[creator].push(market);
        creatorMarketCount[creator]++;
        
        emit MarketCreated(
            address(market),
            creator,
            question,
            endTime,
            markets.length - 1,
            marketType
        );
    }
    
    /// @notice Get total number of markets created
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }
    
    /// @notice Get markets created by a specific user
    function getCreatorMarkets(address creator) external view returns (ParimutuelPredictionMarket[] memory) {
        return creatorMarkets[creator];
    }
    
    /// @notice Get a batch of markets (for pagination)
    /// @param start Starting index
    /// @param limit Maximum number of markets to return
    function getMarkets(uint256 start, uint256 limit) 
        external 
        view 
        returns (ParimutuelPredictionMarket[] memory result) 
    {
        if (limit > MAX_MARKETS_PER_QUERY) revert QueryLimitExceededError();
        if (start >= markets.length) {
            return new ParimutuelPredictionMarket[](0);
        }
        
        uint256 end = start + limit;
        if (end > markets.length) {
            end = markets.length;
        }
        
        result = new ParimutuelPredictionMarket[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = markets[i];
        }
    }
    
    /// @notice Get active markets (not yet ended) with pagination
    /// @param start Starting index
    /// @param limit Maximum number of markets to return
    function getActiveMarkets(uint256 start, uint256 limit) 
        external 
        view 
        returns (ParimutuelPredictionMarket[] memory result) 
    {
        if (limit > MAX_MARKETS_PER_QUERY) revert QueryLimitExceededError();
        if (start >= markets.length) {
            return new ParimutuelPredictionMarket[](0);
        }
        
        uint256 end = start + limit;
        if (end > markets.length) {
            end = markets.length;
        }
        
        // First pass: count active markets in range
        uint256 activeCount = 0;
        for (uint256 i = start; i < end; i++) {
            if (markets[i].endTime() > block.timestamp && !markets[i].resolved()) {
                activeCount++;
            }
        }
        
        if (activeCount == 0) {
            return new ParimutuelPredictionMarket[](0);
        }
        
        // Second pass: collect active markets
        result = new ParimutuelPredictionMarket[](activeCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = start; i < end && resultIndex < activeCount; i++) {
            if (markets[i].endTime() > block.timestamp && !markets[i].resolved()) {
                result[resultIndex] = markets[i];
                resultIndex++;
            }
        }
    }
    
    /// @notice Update default resolver (owner only)
    function setDefaultResolver(address _resolver) external onlyOwner {
        if (_resolver == address(0)) revert InvalidResolver();
        defaultResolver = _resolver;
    }
    
    /// @notice Emergency pause all future market creation (owner only)
    bool public paused;
    
    modifier notPaused() {
        require(!paused, "Factory is paused");
        _;
    }
    
    
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
    
    /// @notice Get estimated gas for creating a market (helpful for ERC-4337 gas estimation)
    /// @return gasEstimate Estimated gas units for the transaction
    function estimateGasForCreateMarket(
        string memory /* question */,
        uint256 /* endTime */,
        bool /* isPlatformMarket */
    ) external view returns (uint256 gasEstimate) {
        // Base gas for contract deployment with security improvements: ~1.6M
        // Storage writes for arrays and mappings: ~150k
        // Buffer for safety: ~100k
        gasEstimate = 1850000;
        
        // Add extra gas if this is the first market for the creator
        address creator = _msgSender();
        if (creatorMarketCount[creator] == 0) {
            gasEstimate += 75000; // Extra gas for new creator mapping
        }
    }
    
    /// @notice Check if caller is a smart wallet (ERC-4337 compatible)
    /// @return true if caller appears to be a smart wallet
    function isSmartWallet() external view returns (bool) {
        address user = _msgSender();
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(user)
        }
        return codeSize > 0;
    }
    
    /// @notice Get creator statistics for gas optimization
    /// @param creator Address to check
    /// @return marketCount Number of markets created by this address
    /// @return isNewCreator true if this would be their first market
    function getCreatorStats(address creator) external view returns (uint256 marketCount, bool isNewCreator) {
        marketCount = creatorMarketCount[creator];
        isNewCreator = marketCount == 0;
    }
}