// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/SimplePredictionMarket.sol";
import "../src/MockUSDC.sol";

contract SimplePredictionMarketTest is Test {
    SimplePredictionMarket public market;
    MockUSDC public usdc;
    
    address public owner = makeAddr("owner");
    address public resolver = makeAddr("resolver");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    
    uint256 public constant INITIAL_BALANCE = 10000e6; // 10,000 USDC
    uint256 public constant BUY_AMOUNT = 100e6; // 100 USDC
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy prediction market
        market = new SimplePredictionMarket(
            address(usdc),
            "Will ETH be above $4000 on Dec 31, 2024?",
            block.timestamp + 30 days,
            resolver
        );
        
        // Give users some USDC
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        
        vm.stopPrank();
    }
    
    function test_InitialState() public {
        assertEq(market.question(), "Will ETH be above $4000 on Dec 31, 2024?");
        assertEq(market.endTime(), block.timestamp + 30 days);
        assertEq(market.resolver(), resolver);
        assertFalse(market.resolved());
        
        // Check initial liquidity
        (uint256 yesPool, uint256 noPool,) = market.getMarketStats();
        assertEq(yesPool, 10e6); // MINIMUM_LIQUIDITY
        assertEq(noPool, 10e6);
    }
    
    function test_BuyYesShares() public {
        vm.startPrank(user1);
        
        // Approve USDC spending
        usdc.approve(address(market), BUY_AMOUNT);
        
        // Buy YES shares
        uint256 sharesBefore = market.yesShares(user1);
        market.buyShares(true, BUY_AMOUNT);
        uint256 sharesAfter = market.yesShares(user1);
        
        // Should have received some shares
        assertGt(sharesAfter, sharesBefore);
        
        // Pool should have increased
        (uint256 yesPool,,) = market.getMarketStats();
        assertEq(yesPool, 10e6 + BUY_AMOUNT);
        
        vm.stopPrank();
    }
    
    function test_BuyNoShares() public {
        vm.startPrank(user2);
        
        // Approve USDC spending
        usdc.approve(address(market), BUY_AMOUNT);
        
        // Buy NO shares
        uint256 sharesBefore = market.noShares(user2);
        market.buyShares(false, BUY_AMOUNT);
        uint256 sharesAfter = market.noShares(user2);
        
        // Should have received some shares
        assertGt(sharesAfter, sharesBefore);
        
        // Pool should have increased
        (, uint256 noPool,) = market.getMarketStats();
        assertEq(noPool, 10e6 + BUY_AMOUNT);
        
        vm.stopPrank();
    }
    
    function test_PriceCalculation() public {
        // Initial prices should be 50/50
        assertEq(market.getYesPrice(), 0.5e18);
        assertEq(market.getNoPrice(), 0.5e18);
        
        // Buy YES shares to shift price
        vm.startPrank(user1);
        usdc.approve(address(market), BUY_AMOUNT);
        market.buyShares(true, BUY_AMOUNT);
        vm.stopPrank();
        
        // YES price should be higher now
        assertGt(market.getYesPrice(), 0.5e18);
        assertLt(market.getNoPrice(), 0.5e18);
        
        // Prices should sum close to 1.0 (allowing for minor rounding differences)
        uint256 totalPrice = market.getYesPrice() + market.getNoPrice();
        assertGe(totalPrice, 0.999e18);
        assertLe(totalPrice, 1.001e18);
    }
    
    function test_SellShares() public {
        // First buy some shares
        vm.startPrank(user1);
        usdc.approve(address(market), BUY_AMOUNT);
        market.buyShares(true, BUY_AMOUNT);
        
        uint256 shares = market.yesShares(user1);
        uint256 balanceBefore = usdc.balanceOf(user1);
        
        // Sell half the shares
        uint256 sharesToSell = shares / 2;
        market.sellShares(true, sharesToSell);
        
        // Should have received some USDC back
        assertGt(usdc.balanceOf(user1), balanceBefore);
        
        // Should have fewer shares
        assertEq(market.yesShares(user1), shares - sharesToSell);
        
        vm.stopPrank();
    }
    
    function test_CannotBuyAfterEndTime() public {
        // Move past end time
        vm.warp(block.timestamp + 31 days);
        
        vm.startPrank(user1);
        usdc.approve(address(market), BUY_AMOUNT);
        
        vm.expectRevert(SimplePredictionMarket.MarketEndedError.selector);
        market.buyShares(true, BUY_AMOUNT);
        
        vm.stopPrank();
    }
    
    function test_ResolveMarket() public {
        // Move past end time
        vm.warp(block.timestamp + 31 days);
        
        // Only resolver can resolve
        vm.prank(user1);
        vm.expectRevert(SimplePredictionMarket.UnauthorizedResolverError.selector);
        market.resolveMarket(true);
        
        // Resolver resolves YES
        vm.prank(resolver);
        market.resolveMarket(true);
        
        assertTrue(market.resolved());
        assertTrue(market.outcome());
    }
    
    function test_ClaimRewards() public {
        // User1 buys YES, User2 buys NO
        vm.startPrank(user1);
        usdc.approve(address(market), BUY_AMOUNT);
        market.buyShares(true, BUY_AMOUNT);
        uint256 yesShares = market.yesShares(user1);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(address(market), BUY_AMOUNT);
        market.buyShares(false, BUY_AMOUNT);
        vm.stopPrank();
        
        // Move past end time and resolve YES
        vm.warp(block.timestamp + 31 days);
        vm.prank(resolver);
        market.resolveMarket(true);
        
        // User1 (YES holder) should be able to claim
        uint256 balanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        market.claimRewards();
        
        // Should receive 1 USDC per YES share
        assertEq(usdc.balanceOf(user1), balanceBefore + yesShares);
        
        // User2 (NO holder) gets nothing
        balanceBefore = usdc.balanceOf(user2);
        vm.prank(user2);
        market.claimRewards();
        assertEq(usdc.balanceOf(user2), balanceBefore);
    }
    
    function test_EmergencyResolve() public {
        // Only owner can emergency resolve
        vm.prank(user1);
        vm.expectRevert();
        market.emergencyResolve(true);
        
        // Owner can resolve anytime
        vm.prank(owner);
        market.emergencyResolve(false);
        
        assertTrue(market.resolved());
        assertFalse(market.outcome());
    }
}