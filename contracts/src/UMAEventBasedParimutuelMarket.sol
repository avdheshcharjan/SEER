// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IOptimisticOracleV2.sol";

/// @title UMAEventBasedParimutuelMarket
/// @notice A pari-mutuel prediction market using UMA's Optimistic Oracle for event-based resolution
/// @dev Combines UMA's event-based oracle with parimutuel betting mechanics
contract UMAEventBasedParimutuelMarket is Context, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // UMA Oracle Integration
    IOptimisticOracleV2 public immutable optimisticOracle;
    bytes32 public constant PRICE_IDENTIFIER = bytes32("YES_OR_NO_QUERY");

    // State variables
    IERC20 public immutable collateralToken;

    mapping(address => uint256) public yesBets;
    mapping(address => uint256) public noBets;

    uint256 public totalYesBets;
    uint256 public totalNoBets;

    string public question;
    bytes public customAncillaryData;
    uint256 public endTime;
    uint256 public requestTimestamp;

    bool public priceRequested;
    bool public receivedSettlementPrice;
    bool public resolved;
    uint256 public settlementPrice; // 0 = NO, 0.5e18 = INVALID/TIE, 1e18 = YES

    // UMA Oracle Parameters
    uint256 public constant PROPOSER_REWARD = 10e6; // 10 USDC reward for proposer
    uint256 public constant OPTIMISTIC_ORACLE_LIVENESS_TIME = 7200; // 2 hours
    uint256 public constant OPTIMISTIC_ORACLE_PROPOSER_BOND = 1000e6; // 1000 USDC bond

    // Market Parameters
    uint256 public constant MINIMUM_BET = 1e6; // 1 USDC minimum bet
    uint256 public constant MAXIMUM_BET = 1000000e6; // 1M USDC maximum bet
    uint256 public constant MINIMUM_MARKET_DURATION = 1 hours;
    uint256 public constant MAXIMUM_MARKET_DURATION = 365 days;
    uint256 public constant RESOLUTION_BUFFER = 1 hours; // Time after endTime before resolution can be requested

    bool public paused;

    // Events
    event BetPlaced(address indexed bettor, bool side, uint256 amount);
    event MarketInitialized(uint256 timestamp, bytes ancillaryData);
    event PriceRequested(uint256 timestamp, bytes ancillaryData);
    event PriceSettled(uint256 settlementPrice, bool outcome);
    event PriceDisputed(uint256 timestamp, uint256 refund);
    event RewardsClaimed(address indexed user, uint256 amount);

    // Errors
    error MarketResolvedError();
    error MarketNotResolvedError();
    error MarketNotEndedError();
    error MarketEndedError();
    error InvalidAmountError();
    error NothingToClaimError();
    error InvalidAddressError();
    error InvalidMarketDurationError();
    error BetTooLowError();
    error BetTooHighError();
    error MathOverflowError();
    error MarketPausedError();
    error InvalidQuestionError();
    error MarketNotInitializedError();
    error MarketAlreadyInitializedError();
    error PriceAlreadyRequestedError();
    error PriceNotRequestedError();
    error UnauthorizedCallerError();
    error InvalidOracleResponseError();

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

    modifier validBetAmount(uint256 amount) {
        if (amount < MINIMUM_BET) revert BetTooLowError();
        if (amount > MAXIMUM_BET) revert BetTooHighError();
        _;
    }

    modifier notPaused() {
        if (paused) revert MarketPausedError();
        _;
    }

    modifier onlyInitialized() {
        if (!priceRequested) revert MarketNotInitializedError();
        _;
    }

    constructor(
        address _optimisticOracle,
        address _collateralToken,
        string memory _question,
        uint256 _endTime
    ) Ownable(_msgSender()) {
        if (_optimisticOracle == address(0)) revert InvalidAddressError();
        if (_collateralToken == address(0)) revert InvalidAddressError();
        if (_endTime <= block.timestamp + MINIMUM_MARKET_DURATION)
            revert InvalidMarketDurationError();
        if (_endTime > block.timestamp + MAXIMUM_MARKET_DURATION)
            revert InvalidMarketDurationError();
        if (bytes(_question).length < 10 || bytes(_question).length > 500)
            revert InvalidQuestionError();

        optimisticOracle = IOptimisticOracleV2(_optimisticOracle);
        collateralToken = IERC20(_collateralToken);
        question = _question;
        endTime = _endTime;

        // Create ancillary data for the oracle request
        customAncillaryData = abi.encodePacked(
            "Market: ",
            _question,
            ". Resolution: Should this market resolve to YES (1) or NO (0)? Answer 1 for YES, 0 for NO, 0.5 for INVALID/TIE."
        );
    }

    /// @notice Initialize the market by setting up the UMA oracle request
    /// @dev Must be called by owner after approving PROPOSER_REWARD tokens
    function initializeMarket() external onlyOwner notResolved {
        if (priceRequested) revert MarketAlreadyInitializedError();

        // Transfer proposer reward from owner
        collateralToken.safeTransferFrom(
            owner(),
            address(this),
            PROPOSER_REWARD
        );

        requestTimestamp = endTime; // Use endTime as the timestamp for the request
        _requestOraclePrice();

        emit MarketInitialized(requestTimestamp, customAncillaryData);
    }

    /// @notice Internal function to request price from UMA Oracle
    function _requestOraclePrice() internal {
        // Approve oracle to spend proposer reward
        collateralToken.forceApprove(
            address(optimisticOracle),
            PROPOSER_REWARD
        );

        // Request price from Oracle
        optimisticOracle.requestPrice(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            address(collateralToken),
            PROPOSER_REWARD
        );

        // Set custom liveness period
        optimisticOracle.setCustomLiveness(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            OPTIMISTIC_ORACLE_LIVENESS_TIME
        );

        // Set proposer bond
        optimisticOracle.setBond(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            OPTIMISTIC_ORACLE_PROPOSER_BOND
        );

        // Make the request event-based
        optimisticOracle.setEventBased(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData
        );

        // Enable callbacks for price settled and price disputed
        optimisticOracle.setCallbacks(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            false, // callbackOnPriceProposed
            true, // callbackOnPriceDisputed
            true // callbackOnPriceSettled
        );

        priceRequested = true;

        emit PriceRequested(requestTimestamp, customAncillaryData);
    }

    /// @notice Place a bet on YES
    /// @param amount Amount of collateral token to bet
    function betYes(
        uint256 amount
    )
        external
        onlyBeforeEnd
        notResolved
        onlyInitialized
        nonReentrant
        validBetAmount(amount)
        notPaused
    {
        _placeBet(true, amount);
    }

    /// @notice Place a bet on NO
    /// @param amount Amount of collateral token to bet
    function betNo(
        uint256 amount
    )
        external
        onlyBeforeEnd
        notResolved
        onlyInitialized
        nonReentrant
        validBetAmount(amount)
        notPaused
    {
        _placeBet(false, amount);
    }

    /// @notice Generic bet function that takes a side parameter
    /// @param side true for YES, false for NO
    /// @param amount Amount of collateral token to bet
    function placeBet(
        bool side,
        uint256 amount
    )
        external
        onlyBeforeEnd
        notResolved
        onlyInitialized
        nonReentrant
        validBetAmount(amount)
        notPaused
    {
        _placeBet(side, amount);
    }

    /// @notice Internal function to place a bet
    function _placeBet(bool side, uint256 amount) internal {
        address user = _msgSender();

        // Check for overflow before updating state
        if (side) {
            if (yesBets[user] > type(uint256).max - amount)
                revert MathOverflowError();
            if (totalYesBets > type(uint256).max - amount)
                revert MathOverflowError();
        } else {
            if (noBets[user] > type(uint256).max - amount)
                revert MathOverflowError();
            if (totalNoBets > type(uint256).max - amount)
                revert MathOverflowError();
        }

        // Transfer collateral from user
        collateralToken.safeTransferFrom(user, address(this), amount);

        if (side) {
            yesBets[user] += amount;
            totalYesBets += amount;
        } else {
            noBets[user] += amount;
            totalNoBets += amount;
        }

        emit BetPlaced(user, side, amount);
    }

    /// @notice Claim winnings after market resolution
    /// @return payout Amount of collateral claimed
    function claimRewards()
        external
        onlyResolved
        nonReentrant
        notPaused
        returns (uint256 payout)
    {
        address user = _msgSender();

        // Determine outcome from settlement price
        bool outcome;
        if (settlementPrice >= 1e18) {
            outcome = true; // YES wins
        } else if (settlementPrice == 5e17) {
            // TIE/INVALID - return original stakes
            payout = yesBets[user] + noBets[user];
            yesBets[user] = 0;
            noBets[user] = 0;

            if (payout > 0) {
                collateralToken.safeTransfer(user, payout);
            }

            emit RewardsClaimed(user, payout);
            return payout;
        } else {
            outcome = false; // NO wins
        }

        uint256 userBet = outcome ? yesBets[user] : noBets[user];

        if (userBet == 0) revert NothingToClaimError();

        // Calculate payout: user's bet + their share of the losing pool
        uint256 totalWinningBets = outcome ? totalYesBets : totalNoBets;
        uint256 totalLosingBets = outcome ? totalNoBets : totalYesBets;

        if (totalWinningBets == 0) {
            // If no winning bets, return the user's original stake
            payout = userBet;
        } else {
            // Safe multiplication and division to prevent overflow
            uint256 shareOfLosingPool;
            if (totalLosingBets > 0) {
                shareOfLosingPool = Math.mulDiv(
                    userBet,
                    totalLosingBets,
                    totalWinningBets
                );
            }

            // Check for overflow before adding
            if (userBet > type(uint256).max - shareOfLosingPool)
                revert MathOverflowError();
            payout = userBet + shareOfLosingPool;
        }

        // Clear user's bets on both sides (prevent double claiming)
        yesBets[user] = 0;
        noBets[user] = 0;

        // Transfer payout
        if (payout > 0) {
            collateralToken.safeTransfer(user, payout);
        }

        emit RewardsClaimed(user, payout);
    }

    /// @notice UMA Oracle callback when price is settled
    /// @param identifier Price identifier
    /// @param timestamp Request timestamp
    /// @param ancillaryData Ancillary data
    /// @param price Settled price from oracle
    function priceSettled(
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        int256 price
    ) external {
        if (msg.sender != address(optimisticOracle))
            revert UnauthorizedCallerError();
        if (identifier != PRICE_IDENTIFIER) revert InvalidOracleResponseError();
        if (keccak256(ancillaryData) != keccak256(customAncillaryData))
            revert InvalidOracleResponseError();
        if (timestamp != requestTimestamp) return; // Ignore if not for current request

        // Calculate settlement price using 0, 0.5e18, or 1e18
        if (price >= 1e18) {
            settlementPrice = 1e18; // YES wins
        } else if (price == 5e17) {
            settlementPrice = 5e17; // TIE/INVALID
        } else {
            settlementPrice = 0; // NO wins
        }

        receivedSettlementPrice = true;
        resolved = true;

        emit PriceSettled(settlementPrice, settlementPrice >= 1e18);
    }

    /// @notice UMA Oracle callback when price is disputed
    /// @param identifier Price identifier
    /// @param timestamp Request timestamp
    /// @param ancillaryData Ancillary data
    /// @param refund Refund amount
    function priceDisputed(
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        uint256 refund
    ) external {
        if (msg.sender != address(optimisticOracle))
            revert UnauthorizedCallerError();
        if (identifier != PRICE_IDENTIFIER) revert InvalidOracleResponseError();
        if (keccak256(ancillaryData) != keccak256(customAncillaryData))
            revert InvalidOracleResponseError();
        if (timestamp <= requestTimestamp) revert InvalidOracleResponseError();
        if (refund != PROPOSER_REWARD) revert InvalidOracleResponseError();

        // Reset state and request new price with updated timestamp
        requestTimestamp = block.timestamp;
        receivedSettlementPrice = false;
        resolved = false;

        _requestOraclePrice();

        emit PriceDisputed(requestTimestamp, refund);
    }

    /// @notice Calculate potential payout for a user
    /// @param user Address to calculate payout for
    /// @return potentialPayout What the user would receive if they won
    function calculatePotentialPayout(
        address user
    ) external view returns (uint256 potentialPayout) {
        if (!resolved) {
            // Before resolution, calculate potential payout for both sides
            uint256 userYesBet = yesBets[user];
            uint256 userNoBet = noBets[user];

            uint256 yesPayout = 0;
            uint256 noPayout = 0;

            if (userYesBet > 0 && totalYesBets > 0) {
                yesPayout =
                    userYesBet +
                    Math.mulDiv(userYesBet, totalNoBets, totalYesBets);
            }

            if (userNoBet > 0 && totalNoBets > 0) {
                noPayout =
                    userNoBet +
                    Math.mulDiv(userNoBet, totalYesBets, totalNoBets);
            }

            // Return the higher potential payout (user's best case)
            potentialPayout = yesPayout > noPayout ? yesPayout : noPayout;
        } else {
            // After resolution, calculate actual payout based on settlement price
            if (settlementPrice == 5e17) {
                // TIE/INVALID - return original stakes
                potentialPayout = yesBets[user] + noBets[user];
            } else {
                bool outcome = settlementPrice >= 1e18;
                uint256 userBet = outcome ? yesBets[user] : noBets[user];
                if (userBet == 0) return 0;

                uint256 totalWinningBets = outcome ? totalYesBets : totalNoBets;
                uint256 totalLosingBets = outcome ? totalNoBets : totalYesBets;

                if (totalWinningBets == 0) {
                    return 0;
                }

                potentialPayout =
                    userBet +
                    Math.mulDiv(userBet, totalLosingBets, totalWinningBets);
            }
        }
    }

    /// @notice Get user's bet amounts
    /// @param user Address to query
    /// @return yesBet User's YES bet amount
    /// @return noBet User's NO bet amount
    function getUserBets(
        address user
    ) external view returns (uint256 yesBet, uint256 noBet) {
        yesBet = yesBets[user];
        noBet = noBets[user];
    }

    /// @notice Get market statistics
    /// @return _totalYesBets Total collateral bet on YES
    /// @return _totalNoBets Total collateral bet on NO
    /// @return totalVolume Total collateral volume
    function getMarketStats()
        external
        view
        returns (
            uint256 _totalYesBets,
            uint256 _totalNoBets,
            uint256 totalVolume
        )
    {
        _totalYesBets = totalYesBets;
        _totalNoBets = totalNoBets;
        totalVolume = _totalYesBets + _totalNoBets;
    }

    /// @notice Get current odds (for display purposes)
    /// @return yesOdds Implied odds for YES (scaled by 1e18)
    /// @return noOdds Implied odds for NO (scaled by 1e18)
    function getCurrentOdds()
        external
        view
        returns (uint256 yesOdds, uint256 noOdds)
    {
        uint256 totalBets = totalYesBets + totalNoBets;
        if (totalBets == 0) {
            yesOdds = 5e17; // 50% if no bets
            noOdds = 5e17; // 50% if no bets
        } else {
            yesOdds = (totalYesBets * 1e18) / totalBets;
            noOdds = (totalNoBets * 1e18) / totalBets;
        }
    }

    /// @notice Check if market can be resolved
    /// @return resolvable true if market can be resolved
    function canResolve() external view returns (bool resolvable) {
        resolvable = block.timestamp >= endTime && priceRequested && !resolved;
    }

    /// @notice Get oracle state for this market
    /// @return state Current oracle state
    function getOracleState()
        external
        view
        returns (IOptimisticOracleV2.State state)
    {
        if (!priceRequested) {
            return IOptimisticOracleV2.State.Invalid;
        }

        return
            optimisticOracle.getState(
                address(this),
                PRICE_IDENTIFIER,
                requestTimestamp,
                customAncillaryData
            );
    }

    /// @notice Check if oracle has a price available
    /// @return hasPrice true if oracle has resolved the price
    function hasOraclePrice() external view returns (bool hasPrice) {
        if (!priceRequested) return false;

        return
            optimisticOracle.hasPrice(
                address(this),
                PRICE_IDENTIFIER,
                requestTimestamp,
                customAncillaryData
            );
    }

    /// @notice Emergency withdraw (owner only, after resolution + 1 year)
    /// @dev Safety mechanism to recover any stuck funds
    function emergencyWithdraw() external onlyOwner {
        require(
            resolved && block.timestamp > endTime + 365 days,
            "Too early for emergency withdrawal"
        );

        uint256 balance = collateralToken.balanceOf(address(this));
        if (balance > 0) {
            collateralToken.safeTransfer(owner(), balance);
        }
    }

    /// @notice Pause/unpause market (only owner)
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /// @notice Get estimated gas for placing a bet
    function estimateGasForBet(
        bool side,
        uint256
    ) external view returns (uint256) {
        address user = _msgSender();
        return
            ((side && yesBets[user] == 0) || (!side && noBets[user] == 0))
                ? 125000
                : 105000;
    }
}
