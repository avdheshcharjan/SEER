// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ParimutuelPredictionMarket.sol";

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

contract ParimutuelStandaloneTest is Test {
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
        
        // Deploy standalone market
        market = new ParimutuelPredictionMarket(
            address(usdc),
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
    
    function testBasicMarketInfo() public {
        assertEq(market.question(), "Will ETH hit $5000 by end of year?");
        assertEq(market.resolver(), deployer);
        assertFalse(market.resolved());
        assertEq(market.totalYesBets(), 0);
        assertEq(market.totalNoBets(), 0);
    }
    
    function testYesBet() public {
        uint256 betAmount = 100e6; // 100 USDC
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.betYes(betAmount);
        vm.stopPrank();
        
        assertEq(market.yesBets(user1), betAmount);
        assertEq(market.totalYesBets(), betAmount);
        assertEq(market.noBets(user1), 0);
        assertEq(market.totalNoBets(), 0);
    }
    
    function testNoBet() public {
        uint256 betAmount = 50e6; // 50 USDC
        
        vm.startPrank(user2);
        usdc.approve(address(market), betAmount);
        market.betNo(betAmount);
        vm.stopPrank();
        
        assertEq(market.noBets(user2), betAmount);
        assertEq(market.totalNoBets(), betAmount);
        assertEq(market.yesBets(user2), 0);
        assertEq(market.totalYesBets(), 0);
    }
    
    function testMultipleBets() public {
        uint256 bet1 = 100e6; // 100 USDC
        uint256 bet2 = 150e6; // 150 USDC
        
        // User1 bets YES
        vm.startPrank(user1);
        usdc.approve(address(market), bet1);
        market.betYes(bet1);
        vm.stopPrank();
        
        // User2 bets NO
        vm.startPrank(user2);
        usdc.approve(address(market), bet2);
        market.betNo(bet2);
        vm.stopPrank();
        
        assertEq(market.totalYesBets(), bet1);
        assertEq(market.totalNoBets(), bet2);
        
        (uint256 totalYes, uint256 totalNo, uint256 volume) = market.getMarketStats();
        assertEq(totalYes, bet1);
        assertEq(totalNo, bet2);
        assertEq(volume, bet1 + bet2);
    }
    
    function testResolutionYesWins() public {
        uint256 yesBet = 100e6;
        uint256 noBet = 200e6;
        
        // Place bets
        vm.startPrank(user1);
        usdc.approve(address(market), yesBet);
        market.betYes(yesBet);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(address(market), noBet);
        market.betNo(noBet);
        vm.stopPrank();
        
        // Fast forward past end time
        vm.warp(market.endTime() + 1);
        
        // Resolve with YES winning
        vm.prank(deployer);
        market.resolveMarket(true);
        
        assertTrue(market.resolved());
        assertTrue(market.outcome());
        
        // Check user1's bets before claiming
        console.log("User1 YES bets:", market.yesBets(user1));
        console.log("User1 NO bets:", market.noBets(user1));
        console.log("Market outcome:", market.outcome());
        console.log("Market resolved:", market.resolved());
        
        // User1 (YES bettor) claims rewards
        uint256 balanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        uint256 payout = market.claimRewards();
        uint256 balanceAfter = usdc.balanceOf(user1);
        
        // Should get original bet + share of losing pool
        uint256 expectedPayout = yesBet + noBet; // Gets all of losing pool since only YES bettor
        assertEq(payout, expectedPayout);
        assertEq(balanceAfter, balanceBefore + expectedPayout);
        
        // User2 (NO bettor) should get nothing (should revert with NothingToClaimError)
        vm.prank(user2);
        vm.expectRevert(ParimutuelPredictionMarket.NothingToClaimError.selector);
        market.claimRewards();
    }
    
    function testResolutionNoWins() public {
        uint256 yesBet = 100e6;
        uint256 noBet = 200e6;
        
        // Place bets
        vm.startPrank(user1);
        usdc.approve(address(market), yesBet);
        market.betYes(yesBet);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(address(market), noBet);
        market.betNo(noBet);
        vm.stopPrank();
        
        // Fast forward past end time
        vm.warp(market.endTime() + 1);
        
        // Resolve with NO winning
        vm.prank(deployer);
        market.resolveMarket(false);
        
        assertTrue(market.resolved());
        assertFalse(market.outcome());
        
        // User2 (NO bettor) claims rewards
        uint256 balanceBefore = usdc.balanceOf(user2);
        vm.prank(user2);
        uint256 payout = market.claimRewards();
        uint256 balanceAfter = usdc.balanceOf(user2);
        
        // Should get original bet + share of losing pool
        uint256 expectedPayout = noBet + yesBet; // Gets all of losing pool since only NO bettor
        assertEq(payout, expectedPayout);
        assertEq(balanceAfter, balanceBefore + expectedPayout);
    }
    
    function testCannotBetAfterEnd() public {
        vm.warp(market.endTime() + 1);
        
        vm.startPrank(user1);
        usdc.approve(address(market), 100e6);
        vm.expectRevert(ParimutuelPredictionMarket.MarketEndedError.selector);
        market.betYes(100e6);
        vm.stopPrank();
    }
    
    function testCannotResolveBeforeEnd() public {
        vm.prank(deployer);
        vm.expectRevert(ParimutuelPredictionMarket.MarketNotEndedError.selector);
        market.resolveMarket(true);
    }
    
    function testMinimumBet() public {
        uint256 tooSmall = market.MINIMUM_BET() - 1;
        
        vm.startPrank(user1);
        usdc.approve(address(market), tooSmall);
        vm.expectRevert(ParimutuelPredictionMarket.BetTooLowError.selector);
        market.betYes(tooSmall);
        vm.stopPrank();
    }
    
    function testCalculatePotentialPayout() public {
        uint256 yesBet = 100e6;
        uint256 noBet = 200e6;
        
        // Place bets
        vm.startPrank(user1);
        usdc.approve(address(market), yesBet);
        market.betYes(yesBet);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(address(market), noBet);
        market.betNo(noBet);
        vm.stopPrank();
        
        // Calculate potential payouts before resolution
        uint256 user1Potential = market.calculatePotentialPayout(user1);
        uint256 user2Potential = market.calculatePotentialPayout(user2);
        
        // User1 (YES) would get their bet + proportional share of NO pool
        uint256 expectedUser1 = yesBet + noBet; // Only YES bettor gets all NO pool
        assertEq(user1Potential, expectedUser1);
        
        // User2 (NO) would get their bet + proportional share of YES pool  
        uint256 expectedUser2 = noBet + yesBet; // Only NO bettor gets all YES pool
        assertEq(user2Potential, expectedUser2);
    }
    
    function testPauseFeature() public {
        // Only owner can pause
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(0x118cdaa7, user1)); // OwnableUnauthorizedAccount selector
        market.setPaused(true);
        
        // Owner pauses market
        vm.prank(deployer);
        market.setPaused(true);
        
        // Betting should fail when paused
        vm.startPrank(user1);
        usdc.approve(address(market), 100e6);
        vm.expectRevert(ParimutuelPredictionMarket.MarketPausedError.selector);
        market.betYes(100e6);
        vm.stopPrank();
        
        // Unpause market
        vm.prank(deployer);
        market.setPaused(false);
        
        // Betting should work again
        vm.startPrank(user1);
        market.betYes(100e6);
        vm.stopPrank();
        
        assertEq(market.yesBets(user1), 100e6);
    }
    
    function testEmergencyResolveTimelock() public {
        // Request emergency resolution
        vm.prank(deployer);
        market.requestEmergencyResolve();
        
        // Should not be able to resolve immediately
        vm.prank(deployer);
        vm.expectRevert(ParimutuelPredictionMarket.EmergencyTimelockNotElapsedError.selector);
        market.emergencyResolve(true);
        
        // Fast forward past timelock
        vm.warp(block.timestamp + 48 hours + 1);
        
        // Now should be able to resolve
        vm.prank(deployer);
        market.emergencyResolve(true);
        
        assertTrue(market.resolved());
        assertTrue(market.outcome());
    }
    
    function testInvalidQuestionLength() public {
        vm.prank(deployer);
        
        // Too short question
        vm.expectRevert(ParimutuelPredictionMarket.InvalidQuestionError.selector);
        new ParimutuelPredictionMarket(
            address(usdc),
            "Short", // Less than 10 characters
            block.timestamp + 30 days,
            deployer
        );
        
        // Too long question (over 500 characters)
        string memory longQuestion = "";
        for(uint i = 0; i < 51; i++) {
            longQuestion = string(abi.encodePacked(longQuestion, "0123456789"));
        }
        
        vm.expectRevert(ParimutuelPredictionMarket.InvalidQuestionError.selector);
        new ParimutuelPredictionMarket(
            address(usdc),
            longQuestion,
            block.timestamp + 30 days,
            deployer
        );
    }
}