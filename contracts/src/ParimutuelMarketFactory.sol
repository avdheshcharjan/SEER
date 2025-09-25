// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ParimutuelPredictionMarket} from "./ParimutuelPredictionMarket.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/// @title ParimutuelMarketFactory
/// @notice Factory contract for creating ParimutuelPredictionMarket instances
/// @dev Simplified factory for parimutuel betting system
contract ParimutuelMarketFactory is Context, Ownable {
    address public immutable USDC;
    address public defaultResolver;

    ParimutuelPredictionMarket[] public markets;
    mapping(address => ParimutuelPredictionMarket[]) public creatorMarkets;

    // ERC-4337 support
    address public constant ENTRY_POINT =
        0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _entryPointReentrancyStatus;

    // Emergency controls
    bool public paused;

    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        uint256 endTime,
        uint256 marketIndex
    );

    event DefaultResolverChanged(
        address indexed oldResolver,
        address indexed newResolver
    );
    event FactoryPaused();
    event FactoryUnpaused();

    error InvalidResolver();
    error FactoryPausedError();

    constructor(address _usdc, address _defaultResolver) Ownable(_msgSender()) {
        USDC = _usdc;
        defaultResolver = _defaultResolver;

        // Initialize reentrancy protection for EntryPoint
        _entryPointReentrancyStatus = _NOT_ENTERED;
    }

    modifier notPaused() {
        if (paused) revert FactoryPausedError();
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

    /// @notice Create a new parimutuel prediction market
    /// @param question The prediction question
    /// @param resolver Who can resolve the market (use address(0) for default)
    /// @return market The deployed market contract
    function createMarket(
        string memory question,
        address resolver
    )
        external
        notPaused
        entryPointReentrancyGuard
        returns (ParimutuelPredictionMarket market)
    {
        address actualResolver = resolver == address(0)
            ? defaultResolver
            : resolver;
        if (actualResolver == address(0)) revert InvalidResolver();

        uint256 endTime = block.timestamp + 24 hours;

        address creator = _msgSender();

        market = new ParimutuelPredictionMarket(
            USDC,
            question,
            endTime,
            actualResolver,
            creator
        );

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

    /// @notice Batch create multiple markets (gas efficient for daily market creation)
    /// @param questions Array of prediction questions
    /// @param resolvers Array of resolvers (use address(0) for default)
    /// @return marketAddresses Array of deployed market contract addresses
    function createMarkets(
        string[] memory questions,
        address[] memory resolvers
    )
        external
        notPaused
        entryPointReentrancyGuard
        returns (address[] memory marketAddresses)
    {
        require(questions.length == resolvers.length, "Array length mismatch");
        require(
            questions.length > 0 && questions.length <= 20,
            "Invalid batch size"
        ); // Max 20 markets per batch

        marketAddresses = new address[](questions.length);
        address creator = _msgSender();

        for (uint256 i = 0; i < questions.length; i++) {
            address actualResolver = resolvers[i] == address(0)
                ? defaultResolver
                : resolvers[i];
            if (actualResolver == address(0)) revert InvalidResolver();

            uint256 endTime = block.timestamp + 24 hours;

            ParimutuelPredictionMarket market = new ParimutuelPredictionMarket(
                USDC,
                questions[i],
                endTime,
                actualResolver,
                creator
            );

            markets.push(market);
            creatorMarkets[creator].push(market);
            marketAddresses[i] = address(market);

            emit MarketCreated(
                address(market),
                creator,
                questions[i],
                endTime,
                markets.length - 1
            );
        }
    }

    /// @notice Get total number of markets created
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    /// @notice Get markets created by a specific user
    function getCreatorMarkets(
        address creator
    ) external view returns (ParimutuelPredictionMarket[] memory) {
        return creatorMarkets[creator];
    }

    /// @notice Get a batch of markets (for pagination)
    /// @param start Starting index
    /// @param limit Maximum number of markets to return
    function getMarkets(
        uint256 start,
        uint256 limit
    ) external view returns (ParimutuelPredictionMarket[] memory result) {
        if (start >= markets.length) {
            return new ParimutuelPredictionMarket[](0);
        }

        uint256 end = start + limit;
        if (end > markets.length) {
            end = markets.length;
        }

        result = new ParimutuelPredictionMarket[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = markets[i];
        }
    }

    /// @notice Update default resolver (owner only)
    function setDefaultResolver(address _resolver) external onlyOwner {
        if (_resolver == address(0)) revert InvalidResolver();

        address oldResolver = defaultResolver;
        defaultResolver = _resolver;

        emit DefaultResolverChanged(oldResolver, _resolver);
    }

    /// @notice Pause all future market creation (owner only)
    function pause() external onlyOwner {
        paused = true;
        emit FactoryPaused();
    }

    /// @notice Unpause market creation (owner only)
    function unpause() external onlyOwner {
        paused = false;
        emit FactoryUnpaused();
    }
}
