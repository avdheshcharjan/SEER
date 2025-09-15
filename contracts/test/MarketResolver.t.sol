// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MarketResolver.sol";
import "../src/SimplePredictionMarket.sol";
import "../src/ParimutuelPredictionMarket.sol";
import "../src/interfaces/IOptimisticOracleV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000e6); // 1M USDC
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract MockOptimisticOracle is IOptimisticOracleV2 {
    mapping(bytes32 => Request) public requests;
    mapping(bytes32 => bool) public hasSettledPrice;
    mapping(bytes32 => int256) public settledPrices;
    
    function requestPrice(
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        address currency,
        uint256 reward
    ) external override returns (uint256 totalBond) {
        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, identifier, timestamp, ancillaryData));
        requests[requestId] = Request({
            proposer: address(0),
            disputer: address(0),
            currency: currency,
            settled: false,
            refundOnDispute: false,
            proposedPrice: 0,
            resolvedPrice: 0,
            expirationTime: block.timestamp + 7200, // 2 hours
            reward: reward,
            finalFee: 0,
            bond: 1000e6,
            customLiveness: 7200
        });
        
        return 1000e6; // Bond amount
    }
    
    function setBond(
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        uint256 bond
    ) external override returns (uint256 totalBond) {
        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, identifier, timestamp, ancillaryData));
        requests[requestId].bond = bond;
        return bond;
    }
    
    function setCustomLiveness(
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        uint256 customLiveness
    ) external override {
        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, identifier, timestamp, ancillaryData));
        requests[requestId].customLiveness = customLiveness;
        requests[requestId].expirationTime = block.timestamp + customLiveness;
    }
    
    function hasPrice(
        address requester,
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData
    ) external view override returns (bool) {
        bytes32 requestId = keccak256(abi.encodePacked(requester, identifier, timestamp, ancillaryData));
        return hasSettledPrice[requestId];
    }
    
    function settle(
        address requester,
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData
    ) external override returns (int256) {
        bytes32 requestId = keccak256(abi.encodePacked(requester, identifier, timestamp, ancillaryData));
        require(hasSettledPrice[requestId], "No price available");
        
        requests[requestId].settled = true;
        requests[requestId].resolvedPrice = settledPrices[requestId];
        
        return settledPrices[requestId];
    }
    
    function getState(
        address requester,
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData
    ) external view override returns (State) {
        bytes32 requestId = keccak256(abi.encodePacked(requester, identifier, timestamp, ancillaryData));
        
        if (requests[requestId].expirationTime == 0) return State.Invalid;
        if (requests[requestId].settled) return State.Settled;
        if (hasSettledPrice[requestId]) return State.Resolved;
        if (block.timestamp >= requests[requestId].expirationTime) return State.Expired;
        
        return State.Requested;
    }
    
    // Test helper functions
    function mockSettlePrice(
        address requester,
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        int256 price
    ) external {
        bytes32 requestId = keccak256(abi.encodePacked(requester, identifier, timestamp, ancillaryData));
        hasSettledPrice[requestId] = true;
        settledPrices[requestId] = price;
    }
    
    // Unused interface functions
    function proposePrice(address, bytes32, uint256, bytes memory, int256) external pure override returns (uint256) { revert("Not implemented"); }
    function disputePrice(address, bytes32, uint256, bytes memory) external pure override returns (uint256) { revert("Not implemented"); }
    function getPrice(address, bytes32, uint256, bytes memory) external pure override returns (int256) { revert("Not implemented"); }
    function getRequest(address, bytes32, uint256, bytes memory) external pure override returns (Request memory) { revert("Not implemented"); }
}

contract MarketResolverTest is Test {
    MarketResolver public resolver;
    MockOptimisticOracle public mockOracle;
    MockERC20 public usdc;
    
    address public owner = address(0x1);
    address public creator = address(0x2);
    address public user = address(0x3);
    
    SimplePredictionMarket public platformMarket;
    SimplePredictionMarket public userMarket;
    
    uint256 constant BOND_AMOUNT = 1000e6;
    
    function setUp() public {
        // Deploy mock contracts
        usdc = new MockERC20();
        mockOracle = new MockOptimisticOracle();
        
        // Deploy resolver
        vm.prank(owner);
        resolver = new MarketResolver(
            address(mockOracle),
            address(usdc),
            owner
        );
        
        // Create test markets
        uint256 endTime = block.timestamp + 1 days;
        
        platformMarket = new SimplePredictionMarket(
            address(usdc),
            "Will BTC hit $100k?",
            endTime,
            address(resolver)
        );
        
        userMarket = new SimplePredictionMarket(
            address(usdc),
            "My personal prediction",
            endTime,
            address(resolver)
        );
        
        // Register markets
        vm.startPrank(owner);
        resolver.registerMarket(
            address(platformMarket),
            MarketResolver.MarketType.PLATFORM,
            creator
        );
        
        resolver.registerMarket(
            address(userMarket),
            MarketResolver.MarketType.USER,
            creator
        );
        vm.stopPrank();
        
        // Distribute USDC
        usdc.transfer(creator, 10000e6);
        usdc.transfer(user, 10000e6);
    }
    
    function testRegisterMarket() public {
        // Test registering a new market
        SimplePredictionMarket newMarket = new SimplePredictionMarket(
            address(usdc),
            "Test market",
            block.timestamp + 1 days,
            address(resolver)
        );
        
        vm.prank(owner);
        resolver.registerMarket(
            address(newMarket),
            MarketResolver.MarketType.PLATFORM,
            creator
        );
        
        assertEq(uint256(resolver.marketTypes(address(newMarket))), uint256(MarketResolver.MarketType.PLATFORM));
    }
    
    function testPlatformMarketResolutionFlow() public {
        // Fast forward past market end time
        vm.warp(platformMarket.endTime() + 1);
        
        // Approve USDC for bond
        vm.prank(user);
        usdc.approve(address(resolver), BOND_AMOUNT);
        
        // Request platform resolution
        vm.prank(user);
        resolver.requestPlatformResolution(address(platformMarket));
        
        // Verify pending resolution
        (address market, , , MarketResolver.MarketType marketType, bool resolved) = resolver.pendingResolutions(address(platformMarket));
        assertEq(market, address(platformMarket));
        assertEq(uint256(marketType), uint256(MarketResolver.MarketType.PLATFORM));
        assertFalse(resolved);
        
        // Mock oracle settlement with YES outcome
        mockOracle.mockSettlePrice(
            address(resolver),
            resolver.YES_OR_NO_IDENTIFIER(),
            platformMarket.endTime(),
            abi.encodePacked("Market: Will BTC hit $100k?. Resolution: Should this market resolve to YES (1) or NO (0)?"),
            1e18 // YES
        );
        
        // Settle platform resolution
        vm.prank(user);
        resolver.settlePlatformResolution(address(platformMarket));
        
        // Verify market is resolved
        assertTrue(platformMarket.resolved());
        assertTrue(platformMarket.outcome());
    }
    
    function testUserMarketResolution() public {
        // Fast forward past market end time
        vm.warp(userMarket.endTime() + 1);
        
        // Resolve user market
        vm.prank(creator);
        resolver.resolveUserMarket(address(userMarket), true);
        
        // Verify market is resolved
        assertTrue(userMarket.resolved());
        assertTrue(userMarket.outcome());
    }
    
    function testUnauthorizedUserResolution() public {
        // Fast forward past market end time
        vm.warp(userMarket.endTime() + 1);
        
        // Try to resolve as unauthorized user
        vm.prank(user);
        vm.expectRevert(MarketResolver.UnauthorizedResolver.selector);
        resolver.resolveUserMarket(address(userMarket), true);
    }
    
    function testCannotResolveBeforeEndTime() public {
        // Try to resolve before end time
        vm.prank(creator);
        vm.expectRevert(MarketResolver.MarketNotExpired.selector);
        resolver.resolveUserMarket(address(userMarket), true);
    }
    
    function testCannotResolveResolvedMarket() public {
        // Resolve market first
        vm.warp(userMarket.endTime() + 1);
        vm.prank(creator);
        resolver.resolveUserMarket(address(userMarket), true);
        
        // Try to resolve again
        vm.prank(creator);
        vm.expectRevert(MarketResolver.MarketAlreadyResolved.selector);
        resolver.resolveUserMarket(address(userMarket), false);
    }
    
    function testCanResolveMarket() public {
        // Test before end time
        (bool canResolve, MarketResolver.MarketType resolutionType) = resolver.canResolveMarket(address(userMarket));
        assertFalse(canResolve);
        
        // Test after end time
        vm.warp(userMarket.endTime() + 1);
        (canResolve, resolutionType) = resolver.canResolveMarket(address(userMarket));
        assertTrue(canResolve);
        assertEq(uint256(resolutionType), uint256(MarketResolver.MarketType.USER));
    }
    
    function testCreatorAuthorization() public {
        address newCreator = address(0x4);
        
        // Initially not authorized
        assertFalse(resolver.authorizedCreators(newCreator));
        
        // Authorize creator
        vm.prank(owner);
        resolver.setCreatorAuthorization(newCreator, true);
        assertTrue(resolver.authorizedCreators(newCreator));
        
        // Deauthorize creator
        vm.prank(owner);
        resolver.setCreatorAuthorization(newCreator, false);
        assertFalse(resolver.authorizedCreators(newCreator));
    }
    
    function testInvalidPlatformResolutionOutcome() public {
        // Fast forward past market end time
        vm.warp(platformMarket.endTime() + 1);
        
        // Approve and request resolution
        vm.prank(user);
        usdc.approve(address(resolver), BOND_AMOUNT);
        vm.prank(user);
        resolver.requestPlatformResolution(address(platformMarket));
        
        // Mock oracle settlement with invalid outcome (0.5)
        mockOracle.mockSettlePrice(
            address(resolver),
            resolver.YES_OR_NO_IDENTIFIER(),
            platformMarket.endTime(),
            abi.encodePacked("Market: Will BTC hit $100k?. Resolution: Should this market resolve to YES (1) or NO (0)?"),
            5e17 // 0.5 (invalid)
        );
        
        // Try to settle - should revert
        vm.prank(user);
        vm.expectRevert(MarketResolver.InvalidOutcome.selector);
        resolver.settlePlatformResolution(address(platformMarket));
    }
    
    function testOracleStateTracking() public {
        // Initially invalid state
        IOptimisticOracleV2.State state = resolver.getOracleState(address(platformMarket));
        assertEq(uint256(state), uint256(IOptimisticOracleV2.State.Invalid));
        
        // Request resolution
        vm.warp(platformMarket.endTime() + 1);
        vm.prank(user);
        usdc.approve(address(resolver), BOND_AMOUNT);
        vm.prank(user);
        resolver.requestPlatformResolution(address(platformMarket));
        
        // Should now be in requested state
        state = resolver.getOracleState(address(platformMarket));
        assertEq(uint256(state), uint256(IOptimisticOracleV2.State.Requested));
    }
}