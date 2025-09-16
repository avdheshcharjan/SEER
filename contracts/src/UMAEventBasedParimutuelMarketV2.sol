// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IOptimisticOracleV2.sol";

contract UMAEventBasedParimutuelMarketV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    IOptimisticOracleV2 public immutable optimisticOracle;
    bytes32 public constant PRICE_IDENTIFIER = bytes32("YES_OR_NO_QUERY");

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
    uint256 public settlementPrice;

    uint256 public constant PROPOSER_REWARD = 10e6;
    uint256 public constant OPTIMISTIC_ORACLE_LIVENESS_TIME = 7200;
    uint256 public constant OPTIMISTIC_ORACLE_PROPOSER_BOND = 1000e6;
    uint256 public constant MINIMUM_BET = 1e6;
    uint256 public constant MAXIMUM_BET = 1000000e6;
    uint256 public constant MINIMUM_MARKET_DURATION = 1 hours;
    uint256 public constant MAXIMUM_MARKET_DURATION = 365 days;

    bool public paused;

    event BetPlaced(address indexed bettor, bool side, uint256 amount);
    event MarketInitialized(uint256 timestamp, bytes ancillaryData);
    event PriceRequested(uint256 timestamp, bytes ancillaryData);
    event PriceSettled(uint256 settlementPrice, bool outcome);
    event PriceDisputed(uint256 timestamp, uint256 refund);
    event RewardsClaimed(address indexed user, uint256 amount);

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
    error UnauthorizedCallerError();

    modifier onlyBeforeEnd() {
        if (block.timestamp >= endTime) revert MarketEndedError();
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
    ) Ownable(msg.sender) {
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

        customAncillaryData = abi.encodePacked(
            "Market: ",
            _question,
            ". Resolution: Should this market resolve to YES (1) or NO (0)? Answer 1 for YES, 0 for NO, 0.5 for INVALID/TIE."
        );
    }

    function initializeMarket() external onlyOwner notResolved {
        if (priceRequested) revert MarketAlreadyInitializedError();

        collateralToken.safeTransferFrom(
            owner(),
            address(this),
            PROPOSER_REWARD
        );

        requestTimestamp = endTime;
        _requestOraclePrice();

        emit MarketInitialized(requestTimestamp, customAncillaryData);
    }

    function _requestOraclePrice() internal {
        collateralToken.forceApprove(
            address(optimisticOracle),
            PROPOSER_REWARD
        );

        optimisticOracle.requestPrice(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            address(collateralToken),
            PROPOSER_REWARD
        );

        optimisticOracle.setCustomLiveness(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            OPTIMISTIC_ORACLE_LIVENESS_TIME
        );

        optimisticOracle.setBond(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            OPTIMISTIC_ORACLE_PROPOSER_BOND
        );

        optimisticOracle.setEventBased(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData
        );

        optimisticOracle.setCallbacks(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            false,
            true,
            true
        );

        priceRequested = true;
        emit PriceRequested(requestTimestamp, customAncillaryData);
    }

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

    function _placeBet(bool side, uint256 amount) internal {
        address user = msg.sender;

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

    function claimRewards()
        external
        onlyResolved
        nonReentrant
        notPaused
        returns (uint256 payout)
    {
        address user = msg.sender;

        bool outcome;
        if (settlementPrice >= 1e18) {
            outcome = true;
        } else if (settlementPrice == 5e17) {
            payout = yesBets[user] + noBets[user];
            yesBets[user] = 0;
            noBets[user] = 0;

            if (payout > 0) {
                collateralToken.safeTransfer(user, payout);
            }

            emit RewardsClaimed(user, payout);
            return payout;
        } else {
            outcome = false;
        }

        uint256 userBet = outcome ? yesBets[user] : noBets[user];

        if (userBet == 0) revert NothingToClaimError();

        uint256 totalWinningBets = outcome ? totalYesBets : totalNoBets;
        uint256 totalLosingBets = outcome ? totalNoBets : totalYesBets;

        if (totalWinningBets == 0) {
            payout = userBet;
        } else {
            uint256 shareOfLosingPool;
            if (totalLosingBets > 0) {
                shareOfLosingPool = Math.mulDiv(
                    userBet,
                    totalLosingBets,
                    totalWinningBets
                );
            }

            if (userBet > type(uint256).max - shareOfLosingPool)
                revert MathOverflowError();
            payout = userBet + shareOfLosingPool;
        }

        yesBets[user] = 0;
        noBets[user] = 0;

        if (payout > 0) {
            collateralToken.safeTransfer(user, payout);
        }

        emit RewardsClaimed(user, payout);
    }

    function priceSettled(
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        int256 price
    ) external {
        if (msg.sender != address(optimisticOracle))
            revert UnauthorizedCallerError();
        if (identifier != PRICE_IDENTIFIER) revert UnauthorizedCallerError();
        if (keccak256(ancillaryData) != keccak256(customAncillaryData))
            revert UnauthorizedCallerError();
        if (timestamp != requestTimestamp) return;

        if (price >= 1e18) {
            settlementPrice = 1e18;
        } else if (price == 5e17) {
            settlementPrice = 5e17;
        } else {
            settlementPrice = 0;
        }

        receivedSettlementPrice = true;
        resolved = true;

        emit PriceSettled(settlementPrice, settlementPrice >= 1e18);
    }

    function priceDisputed(
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        uint256 refund
    ) external {
        if (msg.sender != address(optimisticOracle))
            revert UnauthorizedCallerError();
        if (identifier != PRICE_IDENTIFIER) revert UnauthorizedCallerError();
        if (keccak256(ancillaryData) != keccak256(customAncillaryData))
            revert UnauthorizedCallerError();
        if (timestamp <= requestTimestamp) revert UnauthorizedCallerError();
        if (refund != PROPOSER_REWARD) revert UnauthorizedCallerError();

        requestTimestamp = block.timestamp;
        receivedSettlementPrice = false;
        resolved = false;

        _requestOraclePrice();

        emit PriceDisputed(requestTimestamp, refund);
    }

    function calculatePotentialPayout(
        address user
    ) external view returns (uint256 potentialPayout) {
        if (!resolved) {
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

            potentialPayout = yesPayout > noPayout ? yesPayout : noPayout;
        } else {
            if (settlementPrice == 5e17) {
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

    function getUserBets(
        address user
    ) external view returns (uint256 yesBet, uint256 noBet) {
        yesBet = yesBets[user];
        noBet = noBets[user];
    }

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

    function getCurrentOdds()
        external
        view
        returns (uint256 yesOdds, uint256 noOdds)
    {
        uint256 totalBets = totalYesBets + totalNoBets;
        if (totalBets == 0) {
            yesOdds = 5e17;
            noOdds = 5e17;
        } else {
            yesOdds = (totalYesBets * 1e18) / totalBets;
            noOdds = (totalNoBets * 1e18) / totalBets;
        }
    }

    function canResolve() external view returns (bool resolvable) {
        resolvable = block.timestamp >= endTime && priceRequested && !resolved;
    }

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

    function emergencyWithdraw() external onlyOwner {
        require(resolved && block.timestamp > endTime + 365 days, "Too early");
        uint256 balance = collateralToken.balanceOf(address(this));
        if (balance > 0) collateralToken.safeTransfer(owner(), balance);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
}
