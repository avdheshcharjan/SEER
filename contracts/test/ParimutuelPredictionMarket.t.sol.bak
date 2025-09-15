// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ParimutuelPredictionMarket.sol";
import "../src/ParimutuelMarketFactory.sol";

// Mock USDC contract for testing
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    uint8 public decimals = 6;
    string public name = "Mock USDC";
    string public symbol = "USDC";
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        return true;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract ParimutuelPredictionMarketTest is Test {
    ParimutuelMarketFactory factory;
    ParimutuelPredictionMarket market;
    MockUSDC usdc;
    
    address deployer = address(0x1);
    address user1 = address(0x2);
    address user2 = address(0x3);
    address user3 = address(0x4);
    
    uint256 constant INITIAL_USDC = 1000e6; // 1000 USDC
    
    function setUp() public {
        vm.startPrank(deployer);
        
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy factory
        factory = new ParimutuelMarketFactory(address(usdc), deployer);
        
        // Create a test market
        market = factory.createMarket(
            "Will ETH hit $5000 by end of year?",
            block.timestamp + 30 days,
            deployer
        );
        
        // Mint USDC for users
        usdc.mint(user1, INITIAL_USDC);
        usdc.mint(user2, INITIAL_USDC);
        usdc.mint(user3, INITIAL_USDC);
        
        vm.stopPrank();
    }
    
    function testFactoryDeployment() public {
        assertEq(factory.usdc(), address(usdc));
        assertEq(factory.defaultResolver(), deployer);
        assertEq(factory.getMarketCount(), 1);
    }
    
    function testMarketCreation() public {
        assertEq(market.question(), "Will ETH hit $5000 by end of year?");
        assertEq(market.endTime(), block.timestamp + 30 days);
        assertFalse(market.resolved());
        
        (uint256 yesTotal, uint256 noTotal, uint256 totalVolume) = market.getMarketStats();
        assertEq(yesTotal, 0);
        assertEq(noTotal, 0);
        assertEq(totalVolume, 0);
    }
    
    function testBetYes() public {
        uint256 betAmount = 10e6; // 10 USDC
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.betYes(betAmount);
        vm.stopPrank();
        
        (uint256 yesBet, uint256 noBet) = market.getUserBets(user1);
        assertEq(yesBet, betAmount);
        assertEq(noBet, 0);
        
        (uint256 yesTotal, uint256 noTotal, uint256 totalVolume) = market.getMarketStats();
        assertEq(yesTotal, betAmount);
        assertEq(noTotal, 0);
        assertEq(totalVolume, betAmount);
    }
    
    function testBetNo() public {
        uint256 betAmount = 15e6; // 15 USDC
        
        vm.startPrank(user2);
        usdc.approve(address(market), betAmount);
        market.betNo(betAmount);
        vm.stopPrank();
        
        (uint256 yesBet, uint256 noBet) = market.getUserBets(user2);
        assertEq(yesBet, 0);
        assertEq(noBet, betAmount);
        
        (uint256 yesTotal, uint256 noTotal, uint256 totalVolume) = market.getMarketStats();
        assertEq(yesTotal, 0);
        assertEq(noTotal, betAmount);
        assertEq(totalVolume, betAmount);
    }
    
    function testGenericPlaceBet() public {
        uint256 yesBetAmount = 20e6; // 20 USDC
        uint256 noBetAmount = 25e6;  // 25 USDC
        
        // Bet YES
        vm.startPrank(user1);
        usdc.approve(address(market), yesBetAmount);
        market.placeBet(true, yesBetAmount);
        vm.stopPrank();
        
        // Bet NO
        vm.startPrank(user2);
        usdc.approve(address(market), noBetAmount);
        market.placeBet(false, noBetAmount);
        vm.stopPrank();
        
        (uint256 yesTotal, uint256 noTotal, uint256 totalVolume) = market.getMarketStats();
        assertEq(yesTotal, yesBetAmount);
        assertEq(noTotal, noBetAmount);
        assertEq(totalVolume, yesBetAmount + noBetAmount);
    }
    
    function testCurrentOdds() public {
        // Initially 50/50
        (uint256 yesOdds, uint256 noOdds) = market.getCurrentOdds();
        assertEq(yesOdds, 5e17); // 50% in 1e18 scale
        assertEq(noOdds, 5e17);  // 50% in 1e18 scale
        
        // After betting, odds should change
        uint256 yesBetAmount = 30e6; // 30 USDC
        uint256 noBetAmount = 10e6;  // 10 USDC
        
        vm.startPrank(user1);
        usdc.approve(address(market), yesBetAmount);
        market.betYes(yesBetAmount);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(address(market), noBetAmount);
        market.betNo(noBetAmount);
        vm.stopPrank();
        
        (yesOdds, noOdds) = market.getCurrentOdds();
        // YES: 30/(30+10) = 75%, NO: 10/(30+10) = 25%
        assertEq(yesOdds, 75e16); // 75% in 1e18 scale
        assertEq(noOdds, 25e16);  // 25% in 1e18 scale
    }
    
    function testPayout() public {
        uint256 yesBetAmount = 40e6; // 40 USDC from user1
        uint256 noBetAmount = 60e6;  // 60 USDC from user2
        
        // User1 bets YES
        vm.startPrank(user1);
        usdc.approve(address(market), yesBetAmount);
        market.betYes(yesBetAmount);
        vm.stopPrank();
        
        // User2 bets NO
        vm.startPrank(user2);
        usdc.approve(address(market), noBetAmount);
        market.betNo(noBetAmount);
        vm.stopPrank();
        
        // Resolve market - YES wins
        vm.warp(block.timestamp + 31 days);
        vm.prank(deployer);
        market.resolveMarket(true);
        
        // User1 should get: 40 USDC (original) + 60 USDC (from losing pool) = 100 USDC
        uint256 expectedPayout = yesBetAmount + noBetAmount;
        uint256 actualPayout = market.calculatePotentialPayout(user1);
        assertEq(actualPayout, expectedPayout);
        
        // User2 should get 0 (lost)
        assertEq(market.calculatePotentialPayout(user2), 0);
        
        // Claim rewards
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        uint256 payout = market.claimRewards();
        
        assertEq(payout, expectedPayout);
        assertEq(usdc.balanceOf(user1), user1BalanceBefore + expectedPayout);
    }
    
    function testMultipleYesBettorsWin() public {
        // User1 bets 20 USDC on YES
        // User2 bets 30 USDC on YES  
        // User3 bets 100 USDC on NO
        
        vm.startPrank(user1);
        usdc.approve(address(market), 20e6);
        market.betYes(20e6);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(address(market), 30e6);
        market.betYes(30e6);
        vm.stopPrank();
        
        vm.startPrank(user3);
        usdc.approve(address(market), 100e6);
        market.betNo(100e6);
        vm.stopPrank();
        
        // Resolve - YES wins
        vm.warp(block.timestamp + 31 days);
        vm.prank(deployer);
        market.resolveMarket(true);
        
        // User1: 20 + (20/50) * 100 = 20 + 40 = 60 USDC
        // User2: 30 + (30/50) * 100 = 30 + 60 = 90 USDC
        // User3: 0 USDC
        
        assertEq(market.calculatePotentialPayout(user1), 60e6);
        assertEq(market.calculatePotentialPayout(user2), 90e6);
        assertEq(market.calculatePotentialPayout(user3), 0);
    }
    
    function testCannotBetAfterEnd() public {
        vm.warp(block.timestamp + 31 days);
        
        vm.startPrank(user1);
        usdc.approve(address(market), 10e6);
        vm.expectRevert();
        market.betYes(10e6);
        vm.stopPrank();
    }
    
    function testCannotResolveBeforeEnd() public {
        vm.prank(deployer);
        vm.expectRevert();
        market.resolveMarket(true);
    }
    
    function testEmergencyResolve() public {
        address marketOwner = market.owner();
        vm.prank(marketOwner);
        market.emergencyResolve(true);
        assertTrue(market.resolved());
        assertTrue(market.outcome());
    }
}