// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UMAEventBasedParimutuelMarketMinimal.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UMAParimutuelMarketFactoryV2 is Ownable, ReentrancyGuard {
    address public immutable optimisticOracle;
    address public immutable collateralToken;

    UMAEventBasedParimutuelMarketMinimal[] public markets;
    mapping(address => uint256) public creatorMarketCount;

    uint256 public constant PROPOSER_REWARD = 10e6;

    bool public paused;

    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        uint256 endTime,
        uint256 marketIndex
    );

    event MarketInitialized(address indexed market, address indexed creator);

    error InvalidEndTime();
    error InvalidAddressError();
    error InsufficientBalance();
    error MarketPausedError();

    modifier notPaused() {
        if (paused) revert MarketPausedError();
        _;
    }

    constructor(
        address _optimisticOracle,
        address _collateralToken
    ) Ownable(msg.sender) {
        if (_optimisticOracle == address(0)) revert InvalidAddressError();
        if (_collateralToken == address(0)) revert InvalidAddressError();

        optimisticOracle = _optimisticOracle;
        collateralToken = _collateralToken;
    }

    function createMarket(
        string memory question,
        uint256 endTime,
        bool autoInitialize
    )
        external
        notPaused
        nonReentrant
        returns (UMAEventBasedParimutuelMarketMinimal market)
    {
        if (endTime <= block.timestamp + 1 hours) revert InvalidEndTime();
        if (endTime > block.timestamp + 365 days) revert InvalidEndTime();

        address creator = msg.sender;

        market = new UMAEventBasedParimutuelMarketMinimal(
            optimisticOracle,
            collateralToken,
            question,
            endTime
        );

        market.transferOwnership(creator);

        markets.push(market);
        creatorMarketCount[creator]++;

        emit MarketCreated(
            address(market),
            creator,
            question,
            endTime,
            markets.length - 1
        );

        if (autoInitialize) {
            IERC20 token = IERC20(collateralToken);

            if (token.balanceOf(creator) < PROPOSER_REWARD)
                revert InsufficientBalance();
            if (token.allowance(creator, address(this)) < PROPOSER_REWARD)
                revert InsufficientBalance();

            token.transferFrom(creator, address(this), PROPOSER_REWARD);
            token.approve(address(market), PROPOSER_REWARD);

            market.initializeMarket();

            emit MarketInitialized(address(market), creator);
        }
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    function getMarkets(
        uint256 start,
        uint256 limit
    )
        external
        view
        returns (UMAEventBasedParimutuelMarketMinimal[] memory result)
    {
        if (limit > 100) limit = 100;
        if (start >= markets.length) {
            return new UMAEventBasedParimutuelMarketMinimal[](0);
        }

        uint256 end = start + limit;
        if (end > markets.length) {
            end = markets.length;
        }

        result = new UMAEventBasedParimutuelMarketMinimal[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = markets[i];
        }
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }
}
