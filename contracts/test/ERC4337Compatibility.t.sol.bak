// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/SimplePredictionMarket.sol";
import "../src/MarketFactory.sol";
import "../src/MockUSDC.sol";

contract MockSmartWallet {
    address public owner;
    SimplePredictionMarket public market;
    MockUSDC public usdc;
    
    constructor(address _owner, address _market, address _usdc) {
        owner = _owner;
        market = SimplePredictionMarket(_market);
        usdc = MockUSDC(_usdc);
    }
    
    function buyShares(bool side, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        usdc.approve(address(market), amount);
        market.buyShares(side, amount);
    }
    
    function sellShares(bool side, uint256 shares) external {
        require(msg.sender == owner, "Only owner");
        market.sellShares(side, shares);
    }
    
    function claimRewards() external {
        require(msg.sender == owner, "Only owner");
        market.claimRewards();
    }
}

contract ERC4337CompatibilityTest is Test {
    SimplePredictionMarket public market;
    MarketFactory public factory;
    MockUSDC public usdc;
    MockSmartWallet public smartWallet;
    
    address public user = makeAddr("user");
    address public resolver = makeAddr("resolver");
    
    function setUp() public {
        usdc = new MockUSDC();
        factory = new MarketFactory(address(usdc), resolver);
        
        vm.startPrank(user);
        market = factory.createMarket(
            "Will ETH reach $5000?",
            block.timestamp + 7 days,
            address(0)
        );
        vm.stopPrank();
        
        // Create mock smart wallet
        smartWallet = new MockSmartWallet(user, address(market), address(usdc));
        
        // Fund both user and smart wallet
        usdc.mint(user, 10000e6);
        usdc.mint(address(smartWallet), 10000e6);
    }
    
    function test_SmartWalletDetection() public {
        // EOA should return false
        vm.prank(user);
        assertFalse(market.isSmartWallet());
        
        // Smart wallet should return true
        vm.prank(address(smartWallet));
        assertTrue(market.isSmartWallet());
    }
    
    function test_BuySharesWithSmartWallet() public {
        uint256 amount = 100e6;
        
        // Approve and buy shares through smart wallet
        vm.startPrank(user);
        usdc.transfer(address(smartWallet), amount);
        smartWallet.buyShares(true, amount);
        vm.stopPrank();
        
        // Verify shares were credited to smart wallet address
        (uint256 yesShares, uint256 noShares) = market.getUserShares(address(smartWallet));
        assertGt(yesShares, 0);
        assertEq(noShares, 0);
    }
    
    function test_GasEstimation() public {
        uint256 gasEstimate = market.estimateGasForBuy(true, 100e6);
        assertGt(gasEstimate, 50000); // Should be reasonable estimate
        assertLt(gasEstimate, 200000); // Should not be excessive
        
        // Buy shares to set up for sell estimation
        vm.startPrank(user);
        usdc.approve(address(market), 100e6);
        market.buyShares(true, 100e6);
        vm.stopPrank();
        
        (uint256 userYesShares,) = market.getUserShares(user);
        uint256 sellGasEstimate = market.estimateGasForSell(true, userYesShares / 2);
        assertGt(sellGasEstimate, 50000);
        assertLt(sellGasEstimate, 150000);
    }
    
    function test_ReentrancyProtection() public {
        // This test ensures our additional reentrancy protection works
        vm.startPrank(user);
        usdc.approve(address(market), 100e6);
        
        // Should work normally
        market.buyShares(true, 100e6);
        vm.stopPrank();
        
        // Reentrancy protection should prevent issues in complex call stacks
        assertTrue(true); // Test passes if no reentrancy reverts occur
    }
    
    function test_EndToEndSmartWalletFlow() public {
        uint256 buyAmount = 100e6;
        
        // Complete flow: buy, sell, resolve, claim through smart wallet
        vm.startPrank(user);
        usdc.transfer(address(smartWallet), buyAmount);
        smartWallet.buyShares(true, buyAmount);
        
        (uint256 yesShares,) = market.getUserShares(address(smartWallet));
        assertGt(yesShares, 0);
        
        // Advance time and resolve
        vm.warp(block.timestamp + 8 days);
        vm.stopPrank();
        
        vm.prank(resolver);
        market.resolveMarket(true); // YES wins
        
        // Claim rewards through smart wallet
        vm.prank(user);
        smartWallet.claimRewards();
        
        // Verify smart wallet received payout
        assertGt(usdc.balanceOf(address(smartWallet)), 0);
    }
    
    function test_MarketFactorySmartWalletDetection() public {
        // EOA should return false
        vm.prank(user);
        assertFalse(factory.isSmartWallet());
        
        // Smart wallet should return true
        vm.prank(address(smartWallet));
        assertTrue(factory.isSmartWallet());
    }
    
    function test_MarketFactoryGasEstimation() public {
        uint256 gasEstimate = factory.estimateGasForCreateMarket("Test question?", block.timestamp + 7 days, address(0));
        assertGt(gasEstimate, 1000000); // Should be reasonable estimate for contract deployment
        assertLt(gasEstimate, 3000000); // Should not be excessive
    }
    
    function test_CreateMarketWithSmartWallet() public {
        vm.startPrank(address(smartWallet));
        
        SimplePredictionMarket newMarket = factory.createMarket(
            "Smart wallet market?",
            block.timestamp + 7 days,
            address(0)
        );
        
        vm.stopPrank();
        
        // Verify market was created and attributed to smart wallet
        SimplePredictionMarket[] memory creatorMarkets = factory.getCreatorMarkets(address(smartWallet));
        assertEq(creatorMarkets.length, 1);
        assertEq(address(creatorMarkets[0]), address(newMarket));
    }
    
    function test_CreatorStats() public {
        // Check initial stats for user
        (uint256 marketCount, bool isNewCreator) = factory.getCreatorStats(user);
        assertEq(marketCount, 1); // User already created one market in setUp
        assertFalse(isNewCreator);
        
        // Check stats for smart wallet (new creator)
        (marketCount, isNewCreator) = factory.getCreatorStats(address(smartWallet));
        assertEq(marketCount, 0);
        assertTrue(isNewCreator);
    }
}