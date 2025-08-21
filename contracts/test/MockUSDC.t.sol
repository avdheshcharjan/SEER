// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC public usdc;

    address public owner = makeAddr("owner");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        vm.stopPrank();
    }

    function test_InitialState() public {
        assertEq(usdc.name(), "Mock USDC");
        assertEq(usdc.symbol(), "USDC");
        assertEq(usdc.decimals(), 6);
        assertEq(usdc.totalSupply(), 1_000_000 * 10 ** 6); // 1M USDC
        assertEq(usdc.balanceOf(owner), 1_000_000 * 10 ** 6);
    }

    function test_Faucet() public {
        vm.startPrank(user1);

        // Check initial balance
        assertEq(usdc.balanceOf(user1), 0);

        // Use faucet
        usdc.faucet();

        // Should receive 1000 USDC
        assertEq(usdc.balanceOf(user1), 1000 * 10 ** 6);

        vm.stopPrank();
    }

    function test_FaucetCooldown() public {
        vm.startPrank(user1);

        // Use faucet first time
        usdc.faucet();
        assertEq(usdc.balanceOf(user1), 1000 * 10 ** 6);

        // Try to use again immediately - should fail
        vm.expectRevert();
        usdc.faucet();

        // Fast forward 23 hours - should still fail
        vm.warp(block.timestamp + 23 hours);
        vm.expectRevert();
        usdc.faucet();

        // Fast forward 24 hours - should work
        vm.warp(block.timestamp + 1 hours);
        usdc.faucet();
        assertEq(usdc.balanceOf(user1), 2000 * 10 ** 6);

        vm.stopPrank();
    }

    function test_CanUseFaucet() public {
        // Initially should be able to use faucet
        assertTrue(usdc.canUseFaucet(user1));

        vm.startPrank(user1);
        usdc.faucet();
        vm.stopPrank();

        // Should not be able to use faucet after using it
        assertFalse(usdc.canUseFaucet(user1));

        // Fast forward 24 hours
        vm.warp(block.timestamp + 24 hours);

        // Should be able to use faucet again
        assertTrue(usdc.canUseFaucet(user1));
    }

    function test_GetFaucetCooldown() public {
        // Initially no cooldown
        assertEq(usdc.getFaucetCooldown(user1), 0);

        vm.startPrank(user1);
        usdc.faucet();
        vm.stopPrank();

        // Should have 24 hours cooldown
        assertEq(usdc.getFaucetCooldown(user1), 24 hours);

        // Fast forward 12 hours
        vm.warp(block.timestamp + 12 hours);
        assertEq(usdc.getFaucetCooldown(user1), 12 hours);

        // Fast forward another 12 hours
        vm.warp(block.timestamp + 12 hours);
        assertEq(usdc.getFaucetCooldown(user1), 0);
    }

    function test_MultipleFaucetUsers() public {
        // User1 uses faucet
        vm.prank(user1);
        usdc.faucet();
        assertEq(usdc.balanceOf(user1), 1000 * 10 ** 6);

        // User2 should be able to use faucet independently
        vm.prank(user2);
        usdc.faucet();
        assertEq(usdc.balanceOf(user2), 1000 * 10 ** 6);

        // User1 should still be on cooldown
        assertFalse(usdc.canUseFaucet(user1));

        // User2 should also be on cooldown now
        assertFalse(usdc.canUseFaucet(user2));
    }

    function test_HumanAmountConversion() public {
        uint256 humanAmount = 1000;
        uint256 weiAmount = usdc.fromHumanAmount(humanAmount);
        assertEq(weiAmount, 1000 * 10 ** 6);

        uint256 convertedBack = usdc.toHumanAmount(weiAmount);
        assertEq(convertedBack, humanAmount);
    }

    function test_OwnerMint() public {
        vm.startPrank(owner);

        uint256 mintAmount = 5000 * 10 ** 6; // 5000 USDC
        usdc.mint(user1, mintAmount);
        assertEq(usdc.balanceOf(user1), mintAmount);

        vm.stopPrank();
    }

    function test_OwnerMintZeroAmount() public {
        vm.startPrank(owner);

        vm.expectRevert(MockUSDC.InvalidAmount.selector);
        usdc.mint(user1, 0);

        vm.stopPrank();
    }

    function test_NonOwnerCannotMint() public {
        vm.startPrank(user1);

        vm.expectRevert();
        usdc.mint(user2, 1000 * 10 ** 6);

        vm.stopPrank();
    }

    function test_Airdrop() public {
        address[] memory recipients = new address[](3);
        recipients[0] = user1;
        recipients[1] = user2;
        recipients[2] = makeAddr("user3");

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000 * 10 ** 6;
        amounts[1] = 2000 * 10 ** 6;
        amounts[2] = 500 * 10 ** 6;

        vm.startPrank(owner);
        usdc.airdrop(recipients, amounts);
        vm.stopPrank();

        assertEq(usdc.balanceOf(user1), 1000 * 10 ** 6);
        assertEq(usdc.balanceOf(user2), 2000 * 10 ** 6);
        assertEq(usdc.balanceOf(makeAddr("user3")), 500 * 10 ** 6);
    }

    function test_AirdropMismatchedArrays() public {
        address[] memory recipients = new address[](2);
        recipients[0] = user1;
        recipients[1] = user2;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000 * 10 ** 6;
        amounts[1] = 2000 * 10 ** 6;
        amounts[2] = 500 * 10 ** 6;

        vm.startPrank(owner);
        vm.expectRevert("Arrays length mismatch");
        usdc.airdrop(recipients, amounts);
        vm.stopPrank();
    }
}
