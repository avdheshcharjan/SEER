// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/// @title ParimutuelPredictionMarket
/// @notice A pari-mutuel prediction market for binary outcomes with fixed USDC settlement
/// @dev Winners split the losers' pool proportional to their bet size
contract ParimutuelPredictionMarket is Context, ReentrancyGuard, Ownable {
    
    // State variables
    IERC20 public immutable usdc;
    
    mapping(address => uint256) public yesBets;
    mapping(address => uint256) public noBets;
    
    uint256 public totalYesBets;
    uint256 public totalNoBets;
    
    string public question;
    uint256 public endTime;
    bool public resolved;
    bool public outcome; // true = YES wins, false = NO wins
    
    address public resolver;
    uint256 public constant RESOLUTION_BUFFER = 1 hours; // Time after endTime before manual resolution
    
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789; // ERC-4337 EntryPoint on Base
    
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _entryPointReentrancyStatus;
    
    // Events
    event BetPlaced(address indexed bettor, bool side, uint256 amount);
    event MarketResolved(bool outcome, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    // Errors
    error MarketResolvedError();
    error MarketNotResolvedError();
    error MarketNotEndedError();
    error MarketEndedError();
    error UnauthorizedResolverError();
    error InvalidAmountError();
    error NothingToClaimError();
    
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
    }
    
    /// @notice Place a bet on YES
    /// @param amount Amount of USDC to bet (in USDC decimals)
    function betYes(uint256 amount) 
        external 
        onlyBeforeEnd 
        notResolved 
        nonReentrant 
        entryPointReentrancyGuard
    {
        if (amount == 0) revert InvalidAmountError();
        
        // Transfer USDC from user (works with both EOAs and smart wallets)
        usdc.transferFrom(_msgSender(), address(this), amount);
        
        address user = _msgSender();
        yesBets[user] += amount;
        totalYesBets += amount;
        
        emit BetPlaced(user, true, amount);
    }
    
    /// @notice Place a bet on NO
    /// @param amount Amount of USDC to bet (in USDC decimals)
    function betNo(uint256 amount) 
        external 
        onlyBeforeEnd 
        notResolved 
        nonReentrant 
        entryPointReentrancyGuard
    {
        if (amount == 0) revert InvalidAmountError();
        
        // Transfer USDC from user (works with both EOAs and smart wallets)
        usdc.transferFrom(_msgSender(), address(this), amount);
        
        address user = _msgSender();
        noBets[user] += amount;
        totalNoBets += amount;
        
        emit BetPlaced(user, false, amount);
    }
    
    /// @notice Generic bet function that takes a side parameter
    /// @param side true for YES, false for NO
    /// @param amount Amount of USDC to bet
    function placeBet(bool side, uint256 amount) 
        external 
        onlyBeforeEnd 
        notResolved 
        nonReentrant 
        entryPointReentrancyGuard
    {
        if (amount == 0) revert InvalidAmountError();
        
        // Transfer USDC from user (works with both EOAs and smart wallets)
        usdc.transferFrom(_msgSender(), address(this), amount);
        
        address user = _msgSender();
        if (side) {
            yesBets[user] += amount;
            totalYesBets += amount;
        } else {
            noBets[user] += amount;
            totalNoBets += amount;
        }
        
        emit BetPlaced(user, side, amount);
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
        uint256 userBet = outcome ? yesBets[user] : noBets[user];
        
        if (userBet == 0) revert NothingToClaimError();
        
        // Calculate payout: user's bet + their share of the losing pool
        uint256 totalWinningBets = outcome ? totalYesBets : totalNoBets;
        uint256 totalLosingBets = outcome ? totalNoBets : totalYesBets;
        
        if (totalWinningBets == 0) {
            // Edge case: no winning bets (shouldn't happen in practice)
            payout = 0;
        } else {
            // Payout = original bet + (user's bet / total winning bets) * total losing bets
            payout = userBet + (userBet * totalLosingBets) / totalWinningBets;
        }
        
        // Clear user's bet
        if (outcome) {
            yesBets[user] = 0;
        } else {
            noBets[user] = 0;
        }
        
        // Transfer payout
        if (payout > 0) {
            usdc.transfer(user, payout);
        }
        
        emit RewardsClaimed(user, payout);
    }
    
    /// @notice Calculate potential payout for a user
    /// @param user Address to calculate payout for
    /// @return potentialPayout What the user would receive if they won
    function calculatePotentialPayout(address user) external view returns (uint256 potentialPayout) {
        if (!resolved) {
            // Before resolution, calculate potential payout for both sides
            uint256 userYesBet = yesBets[user];
            uint256 userNoBet = noBets[user];
            
            uint256 yesPayout = 0;
            uint256 noPayout = 0;
            
            if (userYesBet > 0 && totalYesBets > 0) {
                yesPayout = userYesBet + (userYesBet * totalNoBets) / totalYesBets;
            }
            
            if (userNoBet > 0 && totalNoBets > 0) {
                noPayout = userNoBet + (userNoBet * totalYesBets) / totalNoBets;
            }
            
            // Return the higher potential payout (user's best case)
            potentialPayout = yesPayout > noPayout ? yesPayout : noPayout;
        } else {
            // After resolution, calculate actual payout
            uint256 userBet = outcome ? yesBets[user] : noBets[user];
            if (userBet == 0) return 0;
            
            uint256 totalWinningBets = outcome ? totalYesBets : totalNoBets;
            uint256 totalLosingBets = outcome ? totalNoBets : totalYesBets;
            
            if (totalWinningBets == 0) {
                potentialPayout = 0;
            } else {
                potentialPayout = userBet + (userBet * totalLosingBets) / totalWinningBets;
            }
        }
    }
    
    /// @notice Get user's bet amounts
    /// @param user Address to query
    /// @return yesBet User's YES bet amount
    /// @return noBet User's NO bet amount
    function getUserBets(address user) external view returns (uint256 yesBet, uint256 noBet) {
        yesBet = yesBets[user];
        noBet = noBets[user];
    }
    
    /// @notice Get market statistics
    /// @return _totalYesBets Total USDC bet on YES
    /// @return _totalNoBets Total USDC bet on NO
    /// @return totalVolume Total USDC volume
    function getMarketStats() external view returns (uint256 _totalYesBets, uint256 _totalNoBets, uint256 totalVolume) {
        _totalYesBets = totalYesBets;
        _totalNoBets = totalNoBets;
        totalVolume = _totalYesBets + _totalNoBets;
    }
    
    /// @notice Get current odds (for display purposes)
    /// @return yesOdds Implied odds for YES (scaled by 1e18)
    /// @return noOdds Implied odds for NO (scaled by 1e18)
    function getCurrentOdds() external view returns (uint256 yesOdds, uint256 noOdds) {
        uint256 totalBets = totalYesBets + totalNoBets;
        if (totalBets == 0) {
            yesOdds = 5e17; // 50% if no bets
            noOdds = 5e17;  // 50% if no bets
        } else {
            yesOdds = (totalYesBets * 1e18) / totalBets;
            noOdds = (totalNoBets * 1e18) / totalBets;
        }
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
    
    /// @notice Get estimated gas for placing a bet (helpful for ERC-4337 gas estimation)
    /// @param side true for YES bet, false for NO bet
    /// @return gasEstimate Estimated gas units for the transaction
    function estimateGasForBet(bool side, uint256 /* amount */) external view returns (uint256 gasEstimate) {
        // Base gas for storage writes and transfers: ~50k
        // Additional gas for calculations: ~3k
        // Buffer for ERC-4337 overhead: ~30k
        gasEstimate = 85000;
        
        // Add extra gas if this is user's first bet on this side
        address user = _msgSender();
        if ((side && yesBets[user] == 0) || (!side && noBets[user] == 0)) {
            gasEstimate += 20000; // Extra gas for new storage slot
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