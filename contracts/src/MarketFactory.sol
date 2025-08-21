// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./SimplePredictionMarket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MarketFactory
/// @notice Factory contract for creating SimplePredictionMarket instances
/// @dev Simplified factory for MVP - no complex features
contract MarketFactory is Ownable {
    
    address public immutable usdc;
    address public defaultResolver;
    
    SimplePredictionMarket[] public markets;
    mapping(address => SimplePredictionMarket[]) public creatorMarkets;
    
    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        uint256 endTime,
        uint256 marketIndex
    );
    
    error InvalidEndTime();
    error InvalidResolver();
    
    constructor(address _usdc, address _defaultResolver) Ownable(msg.sender) {
        usdc = _usdc;
        defaultResolver = _defaultResolver;
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
    ) external returns (SimplePredictionMarket market) {
        if (endTime <= block.timestamp + 1 hours) revert InvalidEndTime();
        
        address actualResolver = resolver == address(0) ? defaultResolver : resolver;
        if (actualResolver == address(0)) revert InvalidResolver();
        
        market = new SimplePredictionMarket(
            usdc,
            question,
            endTime,
            actualResolver
        );
        
        markets.push(market);
        creatorMarkets[msg.sender].push(market);
        
        emit MarketCreated(
            address(market),
            msg.sender,
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
    
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
}