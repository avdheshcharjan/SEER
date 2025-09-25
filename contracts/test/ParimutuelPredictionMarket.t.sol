// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {ParimutuelPredictionMarket} from "../src/ParimutuelPredictionMarket.sol";
import {ParimutuelMarketFactory} from "../src/ParimutuelMarketFactory.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ParimutuelPredictionMarketTest is Test {
    ParimutuelPredictionMarket public market;
    ParimutuelMarketFactory public factory;
    MockUSDC public usdc;

    address public owner = address(this);
    address public resolver = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);
    address public charlie = address(0x4);

    uint256 public constant USDC_AMOUNT = 1000e6; // 1000 USDC
    uint256 public constant BET_1_USDC = 1e6;
    uint256 public constant BET_5_USDC = 5e6;
    uint256 public constant BET_10_USDC = 10e6;

    string public constant QUESTION = "Will it rain tomorrow?";
    uint256 public endTime;

    event BetPlaced(address indexed bettor, bool side, uint256 amount);
    event MarketResolved(bool outcome, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount);

    function setUp() public {
        // Deploy contracts
        usdc = new MockUSDC();
        factory = new ParimutuelMarketFactory(address(usdc), resolver);

        // Set end time to 24 hours from now
        endTime = block.timestamp + 24 hours;

        // Create a test market
        market = factory.createMarket(QUESTION, endTime, resolver);

        // Mint USDC to test users
        usdc.mint(alice, USDC_AMOUNT);
        usdc.mint(bob, USDC_AMOUNT);
        usdc.mint(charlie, USDC_AMOUNT);

        // Approve spending
        vm.prank(alice);
        usdc.approve(address(market), type(uint256).max);

        vm.prank(bob);
        usdc.approve(address(market), type(uint256).max);

        vm.prank(charlie);
        usdc.approve(address(market), type(uint256).max);
    }

    function testMarketCreation() public view {
        assertEq(market.question(), QUESTION);
        assertEq(market.endTime(), endTime);
        assertEq(market.resolver(), resolver);
        assertFalse(market.resolved());
        assertEq(market.yesPool(), 0);
        assertEq(market.noPool(), 0);
    }

    function testValidBetAmounts() public {
        // Test valid bet amounts
        vm.prank(alice);
        market.betYes(BET_1_USDC);

        vm.prank(bob);
        market.betYes(BET_5_USDC);

        vm.prank(charlie);
        market.betNo(BET_10_USDC);

        assertEq(market.yesPool(), BET_1_USDC + BET_5_USDC);
        assertEq(market.noPool(), BET_10_USDC);
    }

    function testInvalidBetAmounts() public {
        // Test invalid bet amounts
        vm.prank(alice);
        vm.expectRevert(
            ParimutuelPredictionMarket.InvalidBetAmountError.selector
        );
        market.betYes(2e6); // 2 USDC is not allowed

        vm.prank(alice);
        vm.expectRevert(
            ParimutuelPredictionMarket.InvalidBetAmountError.selector
        );
        market.betYes(15e6); // 15 USDC is not allowed
    }

    function testCannotBetTwiceOnSameSide() public {
        vm.prank(alice);
        market.betYes(BET_1_USDC);

        // Should revert when trying to bet on same side again
        vm.prank(alice);
        vm.expectRevert(
            ParimutuelPredictionMarket.AlreadyBetOnSideError.selector
        );
        market.betYes(BET_5_USDC);
    }

    function testCanBetOnBothSides() public {
        // Alice can bet on both YES and NO (different sides)
        vm.prank(alice);
        market.betYes(BET_1_USDC);

        vm.prank(alice);
        market.betNo(BET_5_USDC);

        (uint256 userYesBet, uint256 userNoBet, ) = market.getUserBets(alice);
        assertEq(userYesBet, BET_1_USDC);
        assertEq(userNoBet, BET_5_USDC);
    }

    function testBettingEvents() public {
        vm.expectEmit(true, true, false, true);
        emit BetPlaced(alice, true, BET_5_USDC);

        vm.prank(alice);
        market.betYes(BET_5_USDC);
    }

    function testCannotBetAfterEnd() public {
        // Fast forward past end time
        vm.warp(endTime + 1);

        vm.prank(alice);
        vm.expectRevert(ParimutuelPredictionMarket.MarketEndedError.selector);
        market.betYes(BET_1_USDC);
    }

    function testBasicResolution() public {
        // Place some bets
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        vm.prank(bob);
        market.betNo(BET_1_USDC);

        // Fast forward past end time
        vm.warp(endTime + 1);

        // Resolve market (YES wins)
        vm.expectEmit(true, false, false, true);
        emit MarketResolved(true, block.timestamp);

        vm.prank(resolver);
        market.resolveMarket(true);

        assertTrue(market.resolved());
        assertTrue(market.outcome());
    }

    function testUnauthorizedResolution() public {
        vm.warp(endTime + 1);

        // Alice cannot resolve
        vm.prank(alice);
        vm.expectRevert(
            ParimutuelPredictionMarket.UnauthorizedResolverError.selector
        );
        market.resolveMarket(true);
    }

    function testOwnerCanAlwaysResolve() public {
        vm.warp(endTime + 1);

        // Owner can resolve even if not the designated resolver
        vm.prank(owner);
        market.resolveMarket(true);

        assertTrue(market.resolved());
    }

    function testEmergencyResolve() public {
        // Owner can emergency resolve even before end time
        vm.prank(owner);
        market.emergencyResolve(false);

        assertTrue(market.resolved());
        assertFalse(market.outcome());
    }

    function testPayoutCalculation() public {
        // Alice bets 5 USDC on YES
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        // Bob bets 1 USDC on NO
        vm.prank(bob);
        market.betNo(BET_1_USDC);

        // Resolve with YES winning
        vm.warp(endTime + 1);
        vm.prank(resolver);
        market.resolveMarket(true);

        // Alice should get: 5 USDC (original) + 1 USDC (Bob's bet) = 6 USDC
        vm.expectEmit(true, false, false, true);
        emit RewardsClaimed(alice, 6e6);

        vm.prank(alice);
        uint256 payout = market.claimRewards();

        assertEq(payout, 6e6);
        assertEq(usdc.balanceOf(alice), USDC_AMOUNT - BET_5_USDC + 6e6);
    }

    function testMultipleBettorsPayoutCalculation() public {
        // Alice bets 5 USDC on YES
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        // Bob bets 1 USDC on YES
        vm.prank(bob);
        market.betYes(BET_1_USDC);

        // Charlie bets 10 USDC on NO
        vm.prank(charlie);
        market.betNo(BET_10_USDC);

        // Total YES: 6 USDC, Total NO: 10 USDC
        // YES wins, so winners split the 10 USDC from NO bettors

        vm.warp(endTime + 1);
        vm.prank(resolver);
        market.resolveMarket(true);

        // Alice should get: 5 USDC + (5/6) * 10 USDC = 5 + 8.333... ≈ 13.333 USDC
        vm.prank(alice);
        uint256 alicePayout = market.claimRewards();
        // Alice should get: 5 USDC + (5/6) * 10 USDC = 5 + 8.333... ≈ 13.333 USDC
        // Using integer arithmetic: 5e6 + (5e6 * 10e6) / 6e6 = 13333333
        uint256 expectedAlicePayout = 5e6 + uint256(50e6) / uint256(6); // Simplified to avoid precision issues
        assertEq(alicePayout, expectedAlicePayout);

        // Bob should get: 1 USDC + (1/6) * 10 USDC = 1 + 1.666... ≈ 2.666 USDC
        vm.prank(bob);
        uint256 bobPayout = market.claimRewards();
        // Bob should get: 1 USDC + (1/6) * 10 USDC = 1 + 1.666... ≈ 2.666 USDC
        // Using integer arithmetic: 1e6 + (10e6) / 6 = 2666666
        uint256 expectedBobPayout = 1e6 + uint256(10e6) / uint256(6); // Simplified to avoid precision issues
        assertEq(bobPayout, expectedBobPayout);

        // Total payouts should equal total pool
        assertEq(alicePayout + bobPayout, 16e6); // 6 USDC + 10 USDC = 16 USDC
    }

    function testLoserGetsNothing() public {
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        vm.prank(bob);
        market.betNo(BET_1_USDC);

        vm.warp(endTime + 1);
        vm.prank(resolver);
        market.resolveMarket(true); // YES wins

        // Bob (NO bettor) should get nothing
        vm.prank(bob);
        vm.expectRevert(
            ParimutuelPredictionMarket.NoWinningsToClaimError.selector
        );
        market.claimRewards();
    }

    function testCannotClaimTwice() public {
        vm.prank(alice);
        market.betYes(BET_1_USDC);

        vm.warp(endTime + 1);
        vm.prank(resolver);
        market.resolveMarket(true);

        vm.prank(alice);
        market.claimRewards();

        // Second claim should fail
        vm.prank(alice);
        vm.expectRevert(
            ParimutuelPredictionMarket.AlreadyClaimedError.selector
        );
        market.claimRewards();
    }

    function testPotentialPayouts() public {
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        vm.prank(bob);
        market.betNo(BET_1_USDC);

        // Check potential payouts before resolution
        (uint256 aliceYesPayout, uint256 aliceNoPayout) = market
            .getPotentialPayouts(alice);
        (uint256 bobYesPayout, uint256 bobNoPayout) = market
            .getPotentialPayouts(bob);

        // Alice: if YES wins, gets 5 + 1 = 6 USDC
        assertEq(aliceYesPayout, 6e6);
        assertEq(aliceNoPayout, 0); // Alice didn't bet on NO

        // Bob: if NO wins, gets 1 + 5 = 6 USDC
        assertEq(bobYesPayout, 0); // Bob didn't bet on YES
        assertEq(bobNoPayout, 6e6);
    }

    function testCurrentOdds() public {
        // Initially no bets, should be 50/50
        (uint256 yesOdds, uint256 noOdds) = market.getCurrentOdds();
        assertEq(yesOdds, 5e17); // 50%
        assertEq(noOdds, 5e17); // 50%

        // Alice bets 5 USDC on YES
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        // Bob bets 1 USDC on NO
        vm.prank(bob);
        market.betNo(BET_1_USDC);

        // Now YES: 5, NO: 1, Total: 6
        // YES odds: 5/6 ≈ 83.33%
        // NO odds: 1/6 ≈ 16.67%
        (yesOdds, noOdds) = market.getCurrentOdds();
        uint256 expectedYesOdds = uint256(5 * 1e18) / uint256(6); // 5/6 in 18 decimals
        assertEq(yesOdds, expectedYesOdds);
        uint256 expectedNoOdds = uint256(1 * 1e18) / uint256(6); // 1/6 in 18 decimals
        assertEq(noOdds, expectedNoOdds);
    }

    function testEmergencyRefund() public {
        // Only Alice bets (unbalanced market)
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        // Fast forward past end time
        vm.warp(endTime + 1);

        // Alice should be able to get emergency refund
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        market.emergencyRefund();

        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        assertEq(aliceBalanceAfter - aliceBalanceBefore, BET_5_USDC);
        assertEq(market.yesPool(), 0);
    }

    function testEmergencyRefundNotAllowedWhenBalanced() public {
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        vm.prank(bob);
        market.betNo(BET_1_USDC);

        vm.warp(endTime + 1);

        // Should not allow refund when both sides have bets
        vm.prank(alice);
        vm.expectRevert(
            ParimutuelPredictionMarket.RefundNotAllowedError.selector
        );
        market.emergencyRefund();
    }

    function testFactoryBatchCreation() public {
        string[] memory questions = new string[](3);
        questions[0] = "Question 1";
        questions[1] = "Question 2";
        questions[2] = "Question 3";

        uint256[] memory endTimes = new uint256[](3);
        endTimes[0] = block.timestamp + 1 days;
        endTimes[1] = block.timestamp + 2 days;
        endTimes[2] = block.timestamp + 3 days;

        address[] memory resolvers = new address[](3);
        resolvers[0] = resolver;
        resolvers[1] = resolver;
        resolvers[2] = resolver;

        address[] memory marketAddresses = factory.createMarkets(
            questions,
            endTimes,
            resolvers
        );

        assertEq(marketAddresses.length, 3);
        assertEq(factory.getMarketCount(), 4); // 1 from setUp + 3 from batch
    }

    function testGasEstimation() public view {
        uint256 gasEstimate = market.estimateGasForBet(true);
        assertTrue(gasEstimate > 0);
        assertTrue(gasEstimate < 200000); // Should be reasonable
    }

    function testGetMarketStats() public {
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        vm.prank(bob);
        market.betNo(BET_1_USDC);

        (uint256 yesPool, uint256 noPool, uint256 totalVolume, ) = market
            .getMarketStats();

        assertEq(yesPool, BET_5_USDC);
        assertEq(noPool, BET_1_USDC);
        assertEq(totalVolume, BET_5_USDC + BET_1_USDC);
    }

    // Test edge case: all money on one side
    function testAllMoneyOnOneSide() public {
        vm.prank(alice);
        market.betYes(BET_5_USDC);

        vm.prank(bob);
        market.betYes(BET_1_USDC);

        // No NO bets, so if YES wins, everyone just gets their money back
        vm.warp(endTime + 1);
        vm.prank(resolver);
        market.resolveMarket(true);

        vm.prank(alice);
        uint256 alicePayout = market.claimRewards();
        assertEq(alicePayout, BET_5_USDC); // Just gets original bet back

        vm.prank(bob);
        uint256 bobPayout = market.claimRewards();
        assertEq(bobPayout, BET_1_USDC); // Just gets original bet back
    }
}
