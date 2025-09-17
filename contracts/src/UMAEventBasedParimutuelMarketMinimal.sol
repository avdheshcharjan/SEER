// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOptimisticOracleV2.sol";

contract UMAEventBasedParimutuelMarketMinimal is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

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
    bool public resolved;
    uint256 public settlementPrice;

    uint256 public constant PROPOSER_REWARD = 10e6;
    uint256 public constant LIVENESS_TIME = 7200;
    uint256 public constant PROPOSER_BOND = 1000e6;
    uint256 public constant MINIMUM_BET = 1e6;

    bool public paused;

    event BetPlaced(address indexed bettor, bool side, uint256 amount);
    event PriceSettled(uint256 settlementPrice);
    event RewardsClaimed(address indexed user, uint256 amount);

    error MarketEndedError();
    error MarketResolvedError();
    error MarketNotResolvedError();
    error BetTooLowError();
    error MarketPausedError();
    error InvalidAddressError();
    error MarketNotInitializedError();
    error MarketAlreadyInitializedError();
    error UnauthorizedCallerError();
    error NothingToClaimError();

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

        optimisticOracle = IOptimisticOracleV2(_optimisticOracle);
        collateralToken = IERC20(_collateralToken);
        question = _question;
        endTime = _endTime;

        customAncillaryData = abi.encodePacked(
            "Market: ",
            _question,
            ". Answer 1 for YES, 0 for NO, 0.5 for TIE."
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
            LIVENESS_TIME
        );
        optimisticOracle.setBond(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            PROPOSER_BOND
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
    }

    function betYes(
        uint256 amount
    )
        external
        onlyBeforeEnd
        notResolved
        onlyInitialized
        nonReentrant
        notPaused
    {
        if (amount < MINIMUM_BET) revert BetTooLowError();

        // Check for overflow before updating state
        require(yesBets[msg.sender] + amount >= yesBets[msg.sender], "Overflow");
        require(totalYesBets + amount >= totalYesBets, "Overflow");

        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        yesBets[msg.sender] += amount;
        totalYesBets += amount;

        emit BetPlaced(msg.sender, true, amount);
    }

    function betNo(
        uint256 amount
    )
        external
        onlyBeforeEnd
        notResolved
        onlyInitialized
        nonReentrant
        notPaused
    {
        if (amount < MINIMUM_BET) revert BetTooLowError();

        // Check for overflow before updating state
        require(noBets[msg.sender] + amount >= noBets[msg.sender], "Overflow");
        require(totalNoBets + amount >= totalNoBets, "Overflow");

        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        noBets[msg.sender] += amount;
        totalNoBets += amount;

        emit BetPlaced(msg.sender, false, amount);
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
            if (payout > 0) collateralToken.safeTransfer(user, payout);
            emit RewardsClaimed(user, payout);
            return payout;
        } else {
            outcome = false;
        }

        uint256 userBet = outcome ? yesBets[user] : noBets[user];
        if (userBet == 0) revert NothingToClaimError();

        uint256 totalWinning = outcome ? totalYesBets : totalNoBets;
        uint256 totalLosing = outcome ? totalNoBets : totalYesBets;

        if (totalWinning == 0) {
            payout = userBet;
        } else {
            // Use safe math to prevent overflow and ensure precision
            uint256 winnings = (userBet * totalLosing) / totalWinning;
            payout = userBet + winnings;
        }

        yesBets[user] = 0;
        noBets[user] = 0;

        if (payout > 0) collateralToken.safeTransfer(user, payout);
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

        resolved = true;
        emit PriceSettled(settlementPrice);
    }

    function priceDisputed(
        bytes32 identifier,
        uint256 /* timestamp */,
        bytes memory ancillaryData,
        uint256 refund
    ) external {
        if (msg.sender != address(optimisticOracle))
            revert UnauthorizedCallerError();
        if (identifier != PRICE_IDENTIFIER) revert UnauthorizedCallerError();
        if (keccak256(ancillaryData) != keccak256(customAncillaryData))
            revert UnauthorizedCallerError();
        if (refund != PROPOSER_REWARD) revert UnauthorizedCallerError();

        requestTimestamp = block.timestamp;
        resolved = false;

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
            LIVENESS_TIME
        );
        optimisticOracle.setBond(
            PRICE_IDENTIFIER,
            requestTimestamp,
            customAncillaryData,
            PROPOSER_BOND
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
    }

    function getUserBets(
        address user
    ) external view returns (uint256 yesBet, uint256 noBet) {
        return (yesBets[user], noBets[user]);
    }

    function getMarketStats()
        external
        view
        returns (uint256, uint256, uint256)
    {
        return (totalYesBets, totalNoBets, totalYesBets + totalNoBets);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function emergencyWithdraw() external onlyOwner {
        require(resolved && block.timestamp > endTime + 365 days, "Too early");
        uint256 balance = collateralToken.balanceOf(address(this));
        if (balance > 0) collateralToken.safeTransfer(owner(), balance);
    }
}
