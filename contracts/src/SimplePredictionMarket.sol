// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SimplePredictionMarket
/// @notice A minimal prediction market for binary outcomes with fixed USDC settlement
/// @dev Implements basic AMM pricing: YES price = YES pool / (YES pool + NO pool)
contract SimplePredictionMarket is ReentrancyGuard, Ownable {
    
    // State variables
    IERC20 public immutable usdc;
    
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;
    
    uint256 public yesPool;
    uint256 public noPool;
    
    string public question;
    uint256 public endTime;
    bool public resolved;
    bool public outcome; // true = YES wins, false = NO wins
    
    address public resolver;
    uint256 public constant MINIMUM_LIQUIDITY = 10e6; // 10 USDC in 6 decimals
    uint256 public constant RESOLUTION_BUFFER = 1 hours; // Time after endTime before manual resolution
    
    // Events
    event SharesPurchased(address indexed buyer, bool side, uint256 amount, uint256 shares);
    event SharesSold(address indexed seller, bool side, uint256 shares, uint256 amount);
    event MarketResolved(bool outcome, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    // Errors
    error MarketResolvedError();
    error MarketNotResolvedError();
    error MarketNotEndedError();
    error MarketEndedError();
    error InsufficientSharesError();
    error InsufficientLiquidityError();
    error UnauthorizedResolverError();
    error InvalidAmountError();
    
    modifier onlyBeforeEnd() {
        if (block.timestamp >= endTime) revert MarketEndedError();
        _;
    }
    
    modifier onlyAfterEnd() {
        if (block.timestamp < endTime) revert MarketNotEndedError();
        _;
    }
    
    modifier notResolved() {
        if (resolved) revert MarketResolvedError();
        _;
    }
    
    modifier onlyResolved() {
        if (!resolved) revert MarketNotResolvedError();
        _;
    }
    
    constructor(
        address _usdc,
        string memory _question,
        uint256 _endTime,
        address _resolver
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        question = _question;
        endTime = _endTime;
        resolver = _resolver;
        
        // Initialize with minimal liquidity to avoid division by zero
        yesPool = MINIMUM_LIQUIDITY;
        noPool = MINIMUM_LIQUIDITY;
    }
    
    /// @notice Buy shares for a specific side (YES or NO)
    /// @param side true for YES shares, false for NO shares
    /// @param amount Amount of USDC to spend (in USDC decimals)
    /// @return shares Number of shares received
    function buyShares(bool side, uint256 amount) 
        external 
        onlyBeforeEnd 
        notResolved 
        nonReentrant 
        returns (uint256 shares) 
    {
        if (amount == 0) revert InvalidAmountError();
        
        // Transfer USDC from user
        usdc.transferFrom(msg.sender, address(this), amount);
        
        // Calculate shares to mint based on AMM formula
        shares = calculateSharesOut(amount, side);
        
        if (side) {
            yesShares[msg.sender] += shares;
            yesPool += amount;
        } else {
            noShares[msg.sender] += shares;
            noPool += amount;
        }
        
        emit SharesPurchased(msg.sender, side, amount, shares);
    }
    
    /// @notice Sell shares back to the pool
    /// @param side true for YES shares, false for NO shares
    /// @param sharesToSell Number of shares to sell
    /// @return usdcOut Amount of USDC received
    function sellShares(bool side, uint256 sharesToSell) 
        external 
        onlyBeforeEnd 
        notResolved 
        nonReentrant 
        returns (uint256 usdcOut) 
    {
        if (sharesToSell == 0) revert InvalidAmountError();
        
        uint256 userShares = side ? yesShares[msg.sender] : noShares[msg.sender];
        if (userShares < sharesToSell) revert InsufficientSharesError();
        
        // Calculate USDC to return based on current pool ratios
        usdcOut = calculateUsdcOut(sharesToSell, side);
        
        // Ensure we don't drain the pool completely
        uint256 poolSize = side ? yesPool : noPool;
        if (usdcOut >= poolSize - MINIMUM_LIQUIDITY) revert InsufficientLiquidityError();
        
        // Update state
        if (side) {
            yesShares[msg.sender] -= sharesToSell;
            yesPool -= usdcOut;
        } else {
            noShares[msg.sender] -= sharesToSell;
            noPool -= usdcOut;
        }
        
        // Transfer USDC to user
        usdc.transfer(msg.sender, usdcOut);
        
        emit SharesSold(msg.sender, side, sharesToSell, usdcOut);
    }
    
    /// @notice Resolve the market (only callable by resolver after end time)
    /// @param _outcome true if YES wins, false if NO wins
    function resolveMarket(bool _outcome) external onlyAfterEnd notResolved {
        if (msg.sender != resolver && msg.sender != owner()) revert UnauthorizedResolverError();
        
        resolved = true;
        outcome = _outcome;
        
        emit MarketResolved(_outcome, block.timestamp);
    }
    
    /// @notice Emergency resolve (only owner, any time)
    /// @param _outcome true if YES wins, false if NO wins
    function emergencyResolve(bool _outcome) external onlyOwner notResolved {
        resolved = true;
        outcome = _outcome;
        
        emit MarketResolved(_outcome, block.timestamp);
    }
    
    /// @notice Claim winnings after market resolution
    /// @return payout Amount of USDC claimed
    function claimRewards() external onlyResolved nonReentrant returns (uint256 payout) {
        uint256 winningShares = outcome ? yesShares[msg.sender] : noShares[msg.sender];
        
        if (winningShares == 0) return 0;
        
        // Each winning share is worth exactly 1 USDC
        payout = winningShares;
        
        // Clear user's shares
        if (outcome) {
            yesShares[msg.sender] = 0;
        } else {
            noShares[msg.sender] = 0;
        }
        
        // Transfer payout (1 USDC per winning share)
        usdc.transfer(msg.sender, payout);
        
        emit RewardsClaimed(msg.sender, payout);
    }
    
    /// @notice Calculate shares received for a given USDC amount
    /// @param usdcIn Amount of USDC to spend
    /// @param side true for YES, false for NO
    /// @return shares Number of shares that would be received
    function calculateSharesOut(uint256 usdcIn, bool side) public view returns (uint256 shares) {
        if (side) {
            // YES shares: shares = usdcIn * noPool / (yesPool + usdcIn)
            shares = (usdcIn * noPool) / (yesPool + usdcIn);
        } else {
            // NO shares: shares = usdcIn * yesPool / (noPool + usdcIn)
            shares = (usdcIn * yesPool) / (noPool + usdcIn);
        }
    }
    
    /// @notice Calculate USDC received for selling shares
    /// @param sharesToSell Number of shares to sell
    /// @param side true for YES, false for NO
    /// @return usdcOut Amount of USDC that would be received
    function calculateUsdcOut(uint256 sharesToSell, bool side) public view returns (uint256 usdcOut) {
        if (side) {
            // Selling YES shares
            usdcOut = (sharesToSell * yesPool) / (yesPool + noPool);
        } else {
            // Selling NO shares
            usdcOut = (sharesToSell * noPool) / (yesPool + noPool);
        }
    }
    
    /// @notice Get current price of YES shares (0-1 scaled to 0-1e18)
    /// @return price Current YES share price
    function getYesPrice() external view returns (uint256 price) {
        uint256 total = yesPool + noPool;
        price = (yesPool * 1e18) / total;
    }
    
    /// @notice Get current price of NO shares (0-1 scaled to 0-1e18)
    /// @return price Current NO share price  
    function getNoPrice() external view returns (uint256 price) {
        uint256 total = yesPool + noPool;
        price = (noPool * 1e18) / total;
    }
    
    /// @notice Get user's share balances
    /// @param user Address to query
    /// @return yesBalance User's YES shares
    /// @return noBalance User's NO shares
    function getUserShares(address user) external view returns (uint256 yesBalance, uint256 noBalance) {
        yesBalance = yesShares[user];
        noBalance = noShares[user];
    }
    
    /// @notice Get market statistics
    /// @return _yesPool Total USDC in YES pool
    /// @return _noPool Total USDC in NO pool
    /// @return totalVolume Total USDC volume (approximation)
    function getMarketStats() external view returns (uint256 _yesPool, uint256 _noPool, uint256 totalVolume) {
        _yesPool = yesPool;
        _noPool = noPool;
        totalVolume = _yesPool + _noPool - (2 * MINIMUM_LIQUIDITY); // Subtract initial liquidity
    }
    
    /// @notice Check if market can be resolved
    /// @return resolvable true if market can be resolved
    function canResolve() external view returns (bool resolvable) {
        resolvable = block.timestamp >= endTime && !resolved;
    }
    
    /// @notice Emergency withdraw (owner only, after resolution + 30 days)
    /// @dev Safety mechanism to recover any stuck funds
    function emergencyWithdraw() external onlyOwner {
        require(resolved && block.timestamp > endTime + 30 days, "Too early for emergency withdrawal");
        
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            usdc.transfer(owner(), balance);
        }
    }
}