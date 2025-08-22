// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/// @title SimplePredictionMarket
/// @notice A minimal prediction market for binary outcomes with fixed USDC settlement
/// @dev Implements basic AMM pricing: YES price = YES pool / (YES pool + NO pool)
contract SimplePredictionMarket is Context, ReentrancyGuard, Ownable {
    
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
    
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789; // ERC-4337 EntryPoint on Base
    
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _entryPointReentrancyStatus;
    
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
    
    modifier entryPointReentrancyGuard() {
        if (_entryPointReentrancyStatus == _ENTERED) {
            revert("EntryPoint reentrancy");
        }
        _entryPointReentrancyStatus = _ENTERED;
        _;
        _entryPointReentrancyStatus = _NOT_ENTERED;
    }
    
    constructor(
        address _usdc,
        string memory _question,
        uint256 _endTime,
        address _resolver
    ) Ownable(_msgSender()) {
        usdc = IERC20(_usdc);
        question = _question;
        endTime = _endTime;
        resolver = _resolver;
        
        // Initialize reentrancy protection for EntryPoint
        _entryPointReentrancyStatus = _NOT_ENTERED;
        
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
        entryPointReentrancyGuard
        returns (uint256 shares) 
    {
        if (amount == 0) revert InvalidAmountError();
        
        // Transfer USDC from user (works with both EOAs and smart wallets)
        usdc.transferFrom(_msgSender(), address(this), amount);
        
        // Calculate shares to mint based on AMM formula
        shares = calculateSharesOut(amount, side);
        
        address user = _msgSender();
        if (side) {
            yesShares[user] += shares;
            yesPool += amount;
        } else {
            noShares[user] += shares;
            noPool += amount;
        }
        
        emit SharesPurchased(user, side, amount, shares);
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
        entryPointReentrancyGuard
        returns (uint256 usdcOut) 
    {
        if (sharesToSell == 0) revert InvalidAmountError();
        
        address user = _msgSender();
        uint256 userShares = side ? yesShares[user] : noShares[user];
        if (userShares < sharesToSell) revert InsufficientSharesError();
        
        // Calculate USDC to return based on current pool ratios
        usdcOut = calculateUsdcOut(sharesToSell, side);
        
        // Ensure we don't drain the pool completely
        uint256 poolSize = side ? yesPool : noPool;
        if (usdcOut >= poolSize - MINIMUM_LIQUIDITY) revert InsufficientLiquidityError();
        
        // Update state
        if (side) {
            yesShares[user] -= sharesToSell;
            yesPool -= usdcOut;
        } else {
            noShares[user] -= sharesToSell;
            noPool -= usdcOut;
        }
        
        // Transfer USDC to user
        usdc.transfer(user, usdcOut);
        
        emit SharesSold(user, side, sharesToSell, usdcOut);
    }
    
    /// @notice Resolve the market (only callable by resolver after end time)
    /// @param _outcome true if YES wins, false if NO wins
    function resolveMarket(bool _outcome) external onlyAfterEnd notResolved {
        address sender = _msgSender();
        if (sender != resolver && sender != owner()) revert UnauthorizedResolverError();
        
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
    function claimRewards() external onlyResolved nonReentrant entryPointReentrancyGuard returns (uint256 payout) {
        address user = _msgSender();
        uint256 winningShares = outcome ? yesShares[user] : noShares[user];
        
        if (winningShares == 0) return 0;
        
        // Each winning share is worth exactly 1 USDC
        payout = winningShares;
        
        // Clear user's shares
        if (outcome) {
            yesShares[user] = 0;
        } else {
            noShares[user] = 0;
        }
        
        // Transfer payout (1 USDC per winning share)
        usdc.transfer(user, payout);
        
        emit RewardsClaimed(user, payout);
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
    
    /// @notice Get estimated gas for buying shares (helpful for ERC-4337 gas estimation)
    /// @param side true for YES shares, false for NO shares
    /// @return gasEstimate Estimated gas units for the transaction
    function estimateGasForBuy(bool side, uint256 /* amount */) external view returns (uint256 gasEstimate) {
        // Base gas for storage writes and transfers: ~65k
        // Additional gas for calculations: ~5k
        // Buffer for ERC-4337 overhead: ~30k
        gasEstimate = 100000;
        
        // Add extra gas if this creates new user balances
        address user = _msgSender();
        if ((side && yesShares[user] == 0) || (!side && noShares[user] == 0)) {
            gasEstimate += 20000; // Extra gas for new storage slot
        }
    }
    
    /// @notice Get estimated gas for selling shares
    /// @param side true for YES shares, false for NO shares
    /// @param sharesToSell Number of shares to sell
    /// @return gasEstimate Estimated gas units for the transaction
    function estimateGasForSell(bool side, uint256 sharesToSell) external view returns (uint256 gasEstimate) {
        // Base gas similar to buy, but potentially less storage writes
        gasEstimate = 80000;
        
        address user = _msgSender();
        uint256 userShares = side ? yesShares[user] : noShares[user];
        if (userShares >= sharesToSell && (userShares - sharesToSell) == 0) {
            gasEstimate += 15000; // Gas refund for clearing storage
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
}