// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IOptimisticOracleV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IResolvableMarket {
    function resolveMarketExternal(bool outcome) external;
    function endTime() external view returns (uint256);
    function question() external view returns (string memory);
    function resolved() external view returns (bool);
}

contract MarketResolver is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IOptimisticOracleV2 public immutable optimisticOracle;
    IERC20 public immutable bondCurrency;
    bytes32 public constant YES_OR_NO_IDENTIFIER = bytes32("YES_OR_NO_QUERY");
    
    uint256 public constant LIVENESS_PERIOD = 7200; // 2 hours
    uint256 public constant BOND_AMOUNT = 1000e6; // 1000 USDC bond
    uint256 public constant REWARD_AMOUNT = 0; // No reward for platform markets
    uint256 public constant EMERGENCY_RESOLUTION_DELAY = 7 days; // Additional delay for emergency resolution
    
    mapping(address => uint256) public emergencyResolutionRequests;
    
    enum MarketType {
        UNREGISTERED, // Default value 
        PLATFORM,     // Resolved by UMA Oracle
        USER          // Resolved by market creator
    }
    
    struct PendingResolution {
        address market;
        uint256 timestamp;
        bytes ancillaryData;
        MarketType marketType;
        bool resolved;
    }
    
    mapping(address => MarketType) public marketTypes;
    mapping(address => PendingResolution) public pendingResolutions;
    mapping(address => bool) public authorizedCreators;
    mapping(address => address) public marketCreators; // market => creator mapping
    
    event MarketRegistered(address indexed market, MarketType marketType, address indexed creator);
    event ResolutionRequested(address indexed market, uint256 timestamp, bytes ancillaryData);
    event MarketResolved(address indexed market, bool outcome, MarketType resolutionType);
    event CreatorAuthorized(address indexed creator, bool authorized);
    
    error MarketAlreadyRegistered();
    error MarketNotRegistered();
    error MarketAlreadyResolved();
    error MarketNotExpired();
    error UnauthorizedResolver();
    error InvalidResolutionType();
    error PendingOracleResolution();
    error NoActiveResolution();
    error InvalidOutcome();
    error EmergencyResolutionTooEarly();
    error InvalidOracleResponse();
    
    modifier onlyRegisteredMarket(address market) {
        if (marketTypes[market] == MarketType.UNREGISTERED) {
            revert MarketNotRegistered();
        }
        _;
    }
    
    modifier onlyUnresolvedMarket(address market) {
        if (IResolvableMarket(market).resolved()) {
            revert MarketAlreadyResolved();
        }
        _;
    }
    
    constructor(
        address _optimisticOracle,
        address _bondCurrency,
        address _owner
    ) Ownable(_owner) {
        require(_optimisticOracle != address(0), "Invalid oracle address");
        require(_bondCurrency != address(0), "Invalid currency address");
        require(_owner != address(0), "Invalid owner address");

        optimisticOracle = IOptimisticOracleV2(_optimisticOracle);
        bondCurrency = IERC20(_bondCurrency);

        // Authorize contract deployer as platform creator
        authorizedCreators[_owner] = true;
    }
    
    /// @notice Register a market for resolution
    /// @param market Address of the market contract
    /// @param marketType Type of market (PLATFORM or USER)
    /// @param creator Address of the market creator (for USER markets)
    function registerMarket(
        address market,
        MarketType marketType,
        address creator
    ) external onlyOwner {
        require(market != address(0), "Invalid market address");
        require(marketType != MarketType.UNREGISTERED, "Invalid market type");
        if (marketType == MarketType.USER) {
            require(creator != address(0), "Invalid creator address");
        }

        if (marketTypes[market] != MarketType.UNREGISTERED) {
            revert MarketAlreadyRegistered();
        }

        marketTypes[market] = marketType;

        if (marketType == MarketType.USER) {
            authorizedCreators[creator] = true;
            marketCreators[market] = creator;
        }

        emit MarketRegistered(market, marketType, creator);
    }
    
    /// @notice Request resolution for a platform market via UMA Oracle
    /// @param market Address of the market to resolve
    function requestPlatformResolution(address market) 
        external 
        onlyRegisteredMarket(market)
        onlyUnresolvedMarket(market)
        nonReentrant
    {
        if (marketTypes[market] != MarketType.PLATFORM) {
            revert InvalidResolutionType();
        }
        
        IResolvableMarket resolvableMarket = IResolvableMarket(market);
        
        // Check if market has ended
        if (block.timestamp < resolvableMarket.endTime()) {
            revert MarketNotExpired();
        }
        
        // Check if there's already a pending resolution
        if (pendingResolutions[market].market != address(0) && !pendingResolutions[market].resolved) {
            revert PendingOracleResolution();
        }
        
        uint256 timestamp = resolvableMarket.endTime();
        string memory question = resolvableMarket.question();
        
        // Create ancillary data with market question
        bytes memory ancillaryData = abi.encodePacked(
            "Market: ",
            question,
            ". Resolution: Should this market resolve to YES (1) or NO (0)?"
        );
        
        // Transfer bond from caller
        bondCurrency.safeTransferFrom(msg.sender, address(this), BOND_AMOUNT);
        
        // Approve oracle to spend bond
        bondCurrency.forceApprove(address(optimisticOracle), BOND_AMOUNT);
        
        // Request price from Oracle
        optimisticOracle.requestPrice(
            YES_OR_NO_IDENTIFIER,
            timestamp,
            ancillaryData,
            address(bondCurrency),
            REWARD_AMOUNT
        );
        
        // Set custom liveness and bond
        optimisticOracle.setCustomLiveness(
            YES_OR_NO_IDENTIFIER,
            timestamp,
            ancillaryData,
            LIVENESS_PERIOD
        );
        
        optimisticOracle.setBond(
            YES_OR_NO_IDENTIFIER,
            timestamp,
            ancillaryData,
            BOND_AMOUNT
        );
        
        // Store pending resolution
        pendingResolutions[market] = PendingResolution({
            market: market,
            timestamp: timestamp,
            ancillaryData: ancillaryData,
            marketType: MarketType.PLATFORM,
            resolved: false
        });
        
        emit ResolutionRequested(market, timestamp, ancillaryData);
    }
    
    /// @notice Settle a platform market resolution from UMA Oracle
    /// @param market Address of the market to settle
    function settlePlatformResolution(address market) 
        external 
        onlyRegisteredMarket(market)
        onlyUnresolvedMarket(market)
        nonReentrant
    {
        PendingResolution storage resolution = pendingResolutions[market];
        
        if (resolution.market == address(0)) {
            revert NoActiveResolution();
        }
        
        if (resolution.resolved) {
            revert MarketAlreadyResolved();
        }
        
        // Check if oracle has a price
        if (!optimisticOracle.hasPrice(
            address(this),
            YES_OR_NO_IDENTIFIER,
            resolution.timestamp,
            resolution.ancillaryData
        )) {
            revert NoActiveResolution();
        }
        
        // Get the settled price from oracle
        int256 settledPrice = optimisticOracle.settle(
            address(this),
            YES_OR_NO_IDENTIFIER,
            resolution.timestamp,
            resolution.ancillaryData
        );
        
        // Convert oracle response to boolean outcome with additional validation
        bool outcome;
        if (settledPrice == 1e18) {
            outcome = true; // YES
        } else if (settledPrice == 0) {
            outcome = false; // NO
        } else {
            // For invalid outcomes, allow emergency resolution after delay
            if (emergencyResolutionRequests[market] == 0) {
                emergencyResolutionRequests[market] = block.timestamp;
                revert InvalidOracleResponse();
            }
            
            if (block.timestamp < emergencyResolutionRequests[market] + EMERGENCY_RESOLUTION_DELAY) {
                revert EmergencyResolutionTooEarly();
            }
            
            // After delay, default to NO outcome for safety
            outcome = false;
        }
        
        // Mark as resolved
        resolution.resolved = true;
        
        // Resolve the market
        IResolvableMarket(market).resolveMarketExternal(outcome);
        
        emit MarketResolved(market, outcome, MarketType.PLATFORM);
    }
    
    /// @notice Resolve a user market (only callable by authorized creator)
    /// @param market Address of the market to resolve
    /// @param outcome True for YES, false for NO
    function resolveUserMarket(address market, bool outcome) 
        external 
        onlyUnresolvedMarket(market)
        nonReentrant
    {
        if (marketTypes[market] != MarketType.USER) {
            revert InvalidResolutionType();
        }
        
        if (!authorizedCreators[msg.sender]) {
            revert UnauthorizedResolver();
        }

        // Verify msg.sender is the actual creator of this specific market
        if (marketCreators[market] != msg.sender) {
            revert UnauthorizedResolver();
        }

        IResolvableMarket resolvableMarket = IResolvableMarket(market);
        
        // Check if market has ended
        if (block.timestamp < resolvableMarket.endTime()) {
            revert MarketNotExpired();
        }
        
        // Resolve the market
        resolvableMarket.resolveMarketExternal(outcome);
        
        emit MarketResolved(market, outcome, MarketType.USER);
    }
    
    /// @notice Authorize or deauthorize a creator for user markets
    /// @param creator Address to authorize/deauthorize
    /// @param authorized True to authorize, false to deauthorize
    function setCreatorAuthorization(address creator, bool authorized) external onlyOwner {
        authorizedCreators[creator] = authorized;
        emit CreatorAuthorized(creator, authorized);
    }
    
    /// @notice Check if a market can be resolved
    /// @param market Address of the market
    /// @return canResolve True if market can be resolved
    /// @return resolutionType Type of resolution available
    function canResolveMarket(address market) 
        external 
        view 
        returns (bool canResolve, MarketType resolutionType) 
    {
        if (IResolvableMarket(market).resolved()) {
            return (false, MarketType.PLATFORM);
        }
        
        if (block.timestamp < IResolvableMarket(market).endTime()) {
            return (false, MarketType.PLATFORM);
        }
        
        MarketType marketType = marketTypes[market];
        
        if (marketType == MarketType.PLATFORM) {
            PendingResolution memory resolution = pendingResolutions[market];
            if (resolution.market == address(0)) {
                return (true, MarketType.PLATFORM); // Can request resolution
            } else if (!resolution.resolved) {
                return (optimisticOracle.hasPrice(
                    address(this),
                    YES_OR_NO_IDENTIFIER,
                    resolution.timestamp,
                    resolution.ancillaryData
                ), MarketType.PLATFORM); // Can settle if oracle has price
            }
            return (false, MarketType.PLATFORM);
        }
        
        return (true, MarketType.USER);
    }
    
    /// @notice Get oracle state for a platform market
    /// @param market Address of the market
    /// @return state Current oracle state
    function getOracleState(address market) 
        external 
        view 
        returns (IOptimisticOracleV2.State state) 
    {
        PendingResolution memory resolution = pendingResolutions[market];
        if (resolution.market == address(0)) {
            return IOptimisticOracleV2.State.Invalid;
        }
        
        return optimisticOracle.getState(
            address(this),
            YES_OR_NO_IDENTIFIER,
            resolution.timestamp,
            resolution.ancillaryData
        );
    }
    
    /// @notice Manual override for emergency resolution of platform markets
    /// @param market Address of the market to resolve
    /// @param outcome True for YES, false for NO
    function emergencyResolveMarket(address market, bool outcome) 
        external 
        onlyOwner
        onlyRegisteredMarket(market)
        onlyUnresolvedMarket(market)
    {
        // Only allow emergency resolution if oracle failed or gave invalid response
        require(
            emergencyResolutionRequests[market] > 0 &&
            block.timestamp >= emergencyResolutionRequests[market] + EMERGENCY_RESOLUTION_DELAY,
            "Emergency resolution not available"
        );
        
        IResolvableMarket(market).resolveMarketExternal(outcome);
        emit MarketResolved(market, outcome, MarketType.PLATFORM);
    }
    
    /// @notice Emergency function to recover stuck funds
    /// @param token Address of token to recover (use address(0) for ETH)
    /// @param amount Amount to recover
    function emergencyRecover(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
}