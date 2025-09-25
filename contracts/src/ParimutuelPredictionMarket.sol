// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/// @title ParimutuelPredictionMarket
/// @notice A parimutuel betting system for binary outcomes with fixed USDC bets
/// @dev Winners split the losers' stakes proportionally. Simple pool-based betting.
contract ParimutuelPredictionMarket is Context, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public immutable USDC;

    // Pool totals
    uint256 public yesPool;
    uint256 public noPool;

    // Individual user bets - users can only bet once per side
    mapping(address => uint256) public yesBets;
    mapping(address => uint256) public noBets;

    // Market configuration
    string public question;
    uint256 public endTime;
    bool public resolved;
    bool public outcome; // true = YES wins, false = NO wins

    address public resolver;
    uint256 public constant MINIMUM_BET = 1e6; // 1 USDC (6 decimals)
    uint256 public constant MAXIMUM_BET = 10e6; // 10 USDC (6 decimals)

    // Tracking for payouts
    mapping(address => bool) public hasClaimed;
    uint256 public totalClaimed;

    // ERC-4337 support
    address public constant ENTRY_POINT =
        0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _entryPointReentrancyStatus;

    // Events
    event BetPlaced(address indexed bettor, bool side, uint256 amount);
    event MarketResolved(bool outcome, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount);
    event BetRefunded(address indexed user, bool side, uint256 amount);

    // Errors
    error MarketResolvedError();
    error MarketNotResolvedError();
    error MarketNotEndedError();
    error MarketEndedError();
    error InvalidBetAmountError();
    error AlreadyBetOnSideError();
    error UnauthorizedResolverError();
    error AlreadyClaimedError();
    error NoWinningsToClaimError();
    error RefundNotAllowedError();

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
        USDC = IERC20(_usdc);
        question = _question;
        endTime = _endTime;
        resolver = _resolver;

        // Initialize reentrancy protection for EntryPoint
        _entryPointReentrancyStatus = _NOT_ENTERED;
    }

    /// @notice Place a bet on YES outcome
    /// @param amount Amount of USDC to bet (must be 1, 5, or 10 USDC)
    function betYes(
        uint256 amount
    )
        external
        onlyBeforeEnd
        notResolved
        nonReentrant
        entryPointReentrancyGuard
    {
        _placeBet(true, amount);
    }

    /// @notice Place a bet on NO outcome
    /// @param amount Amount of USDC to bet (must be 1, 5, or 10 USDC)
    function betNo(
        uint256 amount
    )
        external
        onlyBeforeEnd
        notResolved
        nonReentrant
        entryPointReentrancyGuard
    {
        _placeBet(false, amount);
    }

    /// @notice Internal function to place bets
    /// @param side true for YES, false for NO
    /// @param amount Amount of USDC to bet
    function _placeBet(bool side, uint256 amount) internal {
        // Validate bet amount (1, 5, or 10 USDC)
        if (amount != 1e6 && amount != 5e6 && amount != 10e6) {
            revert InvalidBetAmountError();
        }

        address bettor = _msgSender();

        // Check if user has already bet on this side
        if (side && yesBets[bettor] > 0) revert AlreadyBetOnSideError();
        if (!side && noBets[bettor] > 0) revert AlreadyBetOnSideError();

        // Transfer USDC from user
        USDC.safeTransferFrom(bettor, address(this), amount);

        // Update pools and user bets
        if (side) {
            yesPool += amount;
            yesBets[bettor] = amount;
        } else {
            noPool += amount;
            noBets[bettor] = amount;
        }

        emit BetPlaced(bettor, side, amount);
    }

    /// @notice Resolve the market (only callable by resolver after end time)
    /// @param _outcome true if YES wins, false if NO wins
    function resolveMarket(bool _outcome) external onlyAfterEnd notResolved {
        address sender = _msgSender();
        if (sender != resolver && sender != owner())
            revert UnauthorizedResolverError();

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
    function claimRewards()
        external
        onlyResolved
        nonReentrant
        entryPointReentrancyGuard
        returns (uint256 payout)
    {
        address user = _msgSender();

        if (hasClaimed[user]) revert AlreadyClaimedError();

        uint256 userWinningBet = outcome ? yesBets[user] : noBets[user];
        if (userWinningBet == 0) revert NoWinningsToClaimError();

        // Calculate payout using parimutuel formula
        payout = _calculatePayout(userWinningBet);

        // Mark as claimed
        hasClaimed[user] = true;
        totalClaimed += payout;

        // Transfer payout
        USDC.safeTransfer(user, payout);

        emit RewardsClaimed(user, payout);
    }

    /// @notice Calculate payout for a winning bet
    /// @param winningBet Amount the user bet on the winning side
    /// @return payout Total payout (original bet + share of losing pool)
    function _calculatePayout(
        uint256 winningBet
    ) internal view returns (uint256 payout) {
        uint256 winningPool = outcome ? yesPool : noPool;
        uint256 losingPool = outcome ? noPool : yesPool;

        // If no losing bets, winners just get their money back
        if (losingPool == 0) {
            return winningBet;
        }

        // Payout = original bet + (user's share of losing pool)
        // Share = (user's bet / total winning bets) * total losing bets
        uint256 winnerShare = (winningBet * losingPool) / winningPool;
        payout = winningBet + winnerShare;
    }

    /// @notice Get potential payout for a user (before resolution)
    /// @param user Address to check
    /// @return yesPayout Potential payout if YES wins
    /// @return noPayout Potential payout if NO wins
    function getPotentialPayouts(
        address user
    ) external view returns (uint256 yesPayout, uint256 noPayout) {
        uint256 userYesBet = yesBets[user];
        uint256 userNoBet = noBets[user];

        if (userYesBet > 0) {
            if (noPool == 0) {
                yesPayout = userYesBet; // Just get money back if no opposition
            } else {
                uint256 yesShare = (userYesBet * noPool) / yesPool;
                yesPayout = userYesBet + yesShare;
            }
        }

        if (userNoBet > 0) {
            if (yesPool == 0) {
                noPayout = userNoBet; // Just get money back if no opposition
            } else {
                uint256 noShare = (userNoBet * yesPool) / noPool;
                noPayout = userNoBet + noShare;
            }
        }
    }

    /// @notice Emergency refund (only if market has no bets on one side and hasn't resolved)
    /// @dev Allows users to get refunds if market is unbalanced
    function emergencyRefund() external onlyAfterEnd notResolved nonReentrant {
        // Only allow refunds if one side has no bets
        if (yesPool > 0 && noPool > 0) revert RefundNotAllowedError();

        address user = _msgSender();
        uint256 refundAmount;
        bool refundSide;

        if (yesBets[user] > 0) {
            refundAmount = yesBets[user];
            yesBets[user] = 0;
            yesPool -= refundAmount;
            refundSide = true;
        } else if (noBets[user] > 0) {
            refundAmount = noBets[user];
            noBets[user] = 0;
            noPool -= refundAmount;
            refundSide = false;
        } else {
            revert NoWinningsToClaimError();
        }

        USDC.safeTransfer(user, refundAmount);
        emit BetRefunded(user, refundSide, refundAmount);
    }

    /// @notice Get current market odds (for UI display)
    /// @return yesImpliedOdds YES implied probability (0-1e18)
    /// @return noImpliedOdds NO implied probability (0-1e18)
    function getCurrentOdds()
        external
        view
        returns (uint256 yesImpliedOdds, uint256 noImpliedOdds)
    {
        uint256 totalPool = yesPool + noPool;

        if (totalPool == 0) {
            yesImpliedOdds = 5e17; // 50%
            noImpliedOdds = 5e17; // 50%
        } else {
            yesImpliedOdds = (yesPool * 1e18) / totalPool;
            noImpliedOdds = (noPool * 1e18) / totalPool;
        }
    }

    /// @notice Get user's bet information
    /// @param user Address to query
    /// @return userYesBet Amount user bet on YES
    /// @return userNoBet Amount user bet on NO
    /// @return claimStatus Whether user has claimed rewards
    function getUserBets(
        address user
    )
        external
        view
        returns (uint256 userYesBet, uint256 userNoBet, bool claimStatus)
    {
        userYesBet = yesBets[user];
        userNoBet = noBets[user];
        claimStatus = hasClaimed[user];
    }

    /// @notice Get market statistics
    /// @return _yesPool Total USDC bet on YES
    /// @return _noPool Total USDC bet on NO
    /// @return totalVolume Total betting volume
    /// @return uniqueBettors Approximate number of unique bettors
    function getMarketStats()
        external
        view
        returns (
            uint256 _yesPool,
            uint256 _noPool,
            uint256 totalVolume,
            uint256 uniqueBettors
        )
    {
        _yesPool = yesPool;
        _noPool = noPool;
        totalVolume = _yesPool + _noPool;

        // Note: uniqueBettors is an approximation since we don't track it exactly
        // This would need to be tracked properly in a more advanced implementation
        uniqueBettors = 0; // Placeholder - would need separate tracking
    }

    /// @notice Check if market can be resolved
    /// @return resolvable true if market can be resolved
    function canResolve() external view returns (bool resolvable) {
        resolvable = block.timestamp >= endTime && !resolved;
    }

    /// @notice Emergency withdraw unclaimed funds (owner only, after resolution + 30 days)
    /// @dev Safety mechanism to recover any unclaimed rewards
    function emergencyWithdraw() external onlyOwner {
        require(
            resolved && block.timestamp > endTime + 30 days,
            "Too early for emergency withdrawal"
        );

        uint256 balance = USDC.balanceOf(address(this));
        if (balance > 0) {
            USDC.safeTransfer(owner(), balance);
        }
    }

    /// @notice Get estimated gas for betting (helpful for ERC-4337 gas estimation)
    /// @param side true for YES bet, false for NO bet
    /// @return gasEstimate Estimated gas units for the transaction
    function estimateGasForBet(
        bool side
    ) external view returns (uint256 gasEstimate) {
        // Base gas for storage writes and transfers: ~45k
        // ERC-4337 overhead: ~25k
        gasEstimate = 70000;

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

    /// @notice Get detailed payout information for resolved market
    /// @return winningPool Total amount bet on winning side
    /// @return losingPool Total amount bet on losing side
    /// @return totalPayouts Total amount that should be paid out
    /// @return remainingToClaim Amount remaining to be claimed
    function getPayoutInfo()
        external
        view
        onlyResolved
        returns (
            uint256 winningPool,
            uint256 losingPool,
            uint256 totalPayouts,
            uint256 remainingToClaim
        )
    {
        winningPool = outcome ? yesPool : noPool;
        losingPool = outcome ? noPool : yesPool;
        totalPayouts = winningPool + losingPool; // In parimutuel, all money gets paid out
        remainingToClaim = totalPayouts - totalClaimed;
    }
}
