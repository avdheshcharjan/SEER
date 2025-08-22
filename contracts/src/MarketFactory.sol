// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./SimplePredictionMarket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/// @title MarketFactory
/// @notice Factory contract for creating SimplePredictionMarket instances
/// @dev Simplified factory for MVP - no complex features
contract MarketFactory is Context, Ownable {
    
    address public immutable usdc;
    address public defaultResolver;
    
    SimplePredictionMarket[] public markets;
    mapping(address => SimplePredictionMarket[]) public creatorMarkets;
    
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789; // ERC-4337 EntryPoint on Base
    
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _entryPointReentrancyStatus;
    
    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        uint256 endTime,
        uint256 marketIndex
    );
    
    error InvalidEndTime();
    error InvalidResolver();
    
    constructor(address _usdc, address _defaultResolver) Ownable(_msgSender()) {
        usdc = _usdc;
        defaultResolver = _defaultResolver;
        
        // Initialize reentrancy protection for EntryPoint
        _entryPointReentrancyStatus = _NOT_ENTERED;
    }
    
    /// @notice Create a new prediction market
    /// @param question The prediction question
    /// @param endTime When the market should end (timestamp)
    /// @param resolver Who can resolve the market (use address(0) for default)
    /// @return market The deployed market contract
    function createMarket(
        string memory question,
        uint256 endTime,
        address resolver
    ) external notPaused entryPointReentrancyGuard returns (SimplePredictionMarket market) {
        if (endTime <= block.timestamp + 1 hours) revert InvalidEndTime();
        
        address actualResolver = resolver == address(0) ? defaultResolver : resolver;
        if (actualResolver == address(0)) revert InvalidResolver();
        
        market = new SimplePredictionMarket(
            usdc,
            question,
            endTime,
            actualResolver
        );
        
        address creator = _msgSender();
        markets.push(market);
        creatorMarkets[creator].push(market);
        
        emit MarketCreated(
            address(market),
            creator,
            question,
            endTime,
            markets.length - 1
        );
    }
    
    /// @notice Get total number of markets created
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }
    
    /// @notice Get markets created by a specific user
    function getCreatorMarkets(address creator) external view returns (SimplePredictionMarket[] memory) {
        return creatorMarkets[creator];
    }
    
    /// @notice Get a batch of markets (for pagination)
    /// @param start Starting index
    /// @param limit Maximum number of markets to return
    function getMarkets(uint256 start, uint256 limit) 
        external 
        view 
        returns (SimplePredictionMarket[] memory result) 
    {
        if (start >= markets.length) {
            return new SimplePredictionMarket[](0);
        }
        
        uint256 end = start + limit;
        if (end > markets.length) {
            end = markets.length;
        }
        
        result = new SimplePredictionMarket[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = markets[i];
        }
    }
    
    /// @notice Get active markets (not yet ended)
    /// @param limit Maximum number of markets to return
    function getActiveMarkets(uint256 limit) 
        external 
        view 
        returns (SimplePredictionMarket[] memory result) 
    {
        // Count active markets
        uint256 activeCount = 0;
        for (uint256 i = 0; i < markets.length && activeCount < limit; i++) {
            if (markets[i].endTime() > block.timestamp && !markets[i].resolved()) {
                activeCount++;
            }
        }
        
        if (activeCount == 0) {
            return new SimplePredictionMarket[](0);
        }
        
        result = new SimplePredictionMarket[](activeCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < markets.length && resultIndex < activeCount; i++) {
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
    
    modifier entryPointReentrancyGuard() {
        if (_entryPointReentrancyStatus == _ENTERED) {
            revert("EntryPoint reentrancy");
        }
        _entryPointReentrancyStatus = _ENTERED;
        _;
        _entryPointReentrancyStatus = _NOT_ENTERED;
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
        address /* resolver */
    ) external view returns (uint256 gasEstimate) {
        // Base gas for contract deployment: ~1.5M
        // Storage writes for arrays and mappings: ~100k
        // Buffer for ERC-4337 overhead: ~50k
        gasEstimate = 1650000;
        
        // Add extra gas if this is the first market for the creator
        address creator = _msgSender();
        if (creatorMarkets[creator].length == 0) {
            gasEstimate += 50000; // Extra gas for new creator mapping
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
        marketCount = creatorMarkets[creator].length;
        isNewCreator = marketCount == 0;
    }
}