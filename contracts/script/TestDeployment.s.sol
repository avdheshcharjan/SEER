// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/MarketFactory.sol";
import "../src/SimplePredictionMarket.sol";

/// @title TestDeployment
/// @notice Quick script to test deployed contracts are working
contract TestDeployment is Script {
    
    // Deployed contract addresses
    MockUSDC constant usdc = MockUSDC(0x32dfDC3bB23d294a1b32E0EDDEddB12088112161);
    MarketFactory constant factory = MarketFactory(0xAa84401Ef34C0334D4B85259955DE1fa99495B96);
    SimplePredictionMarket constant demoMarket = SimplePredictionMarket(0xC1f3f3528AD71348AC4683CAde6e5988019735D8);
    
    function run() external view {
        console.log("=== TESTING DEPLOYED CONTRACTS ===");
        
        // Test USDC
        console.log("USDC name:", usdc.name());
        console.log("USDC symbol:", usdc.symbol());
        console.log("USDC decimals:", usdc.decimals());
        console.log("USDC total supply:", usdc.totalSupply());
        
        // Test Factory
        console.log("Factory USDC address:", factory.usdc());
        console.log("Factory default resolver:", factory.defaultResolver());
        console.log("Factory market count:", factory.getMarketCount());
        
        // Test Demo Market
        console.log("Demo market question:", demoMarket.question());
        console.log("Demo market end time:", demoMarket.endTime());
        console.log("Demo market YES price:", demoMarket.getYesPrice());
        console.log("Demo market NO price:", demoMarket.getNoPrice());
        console.log("Demo market resolved:", demoMarket.resolved());
        
        (uint256 yesPool, uint256 noPool, uint256 volume) = demoMarket.getMarketStats();
        console.log("Demo market YES pool:", yesPool);
        console.log("Demo market NO pool:", noPool);
        console.log("Demo market volume:", volume);
        
        console.log("=== ALL CONTRACTS WORKING! ===");
    }
}