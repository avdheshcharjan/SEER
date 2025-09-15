// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MarketFactory.sol";
import "../src/MockUSDC.sol";

/// @title CreateSampleMarkets
/// @notice Creates sample prediction markets for demo/testing
contract CreateSampleMarkets is Script {
    
    function run() external {
        // Load deployment addresses - update these after deployment
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        MarketFactory factory = MarketFactory(factoryAddress);
        MockUSDC usdc = MockUSDC(usdcAddress);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Creating sample markets...");
        console.log("Factory:", factoryAddress);
        console.log("USDC:", usdcAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Sample market questions
        string[10] memory questions = [
            "Will BTC reach $100,000 by end of 2024?",
            "Will BASE token launch in Q1 2025?", 
            "Will Ethereum 3.0 be announced in 2025?",
            "Will AI tokens outperform BTC in 2024?",
            "Will a new L2 reach $1B TVL this year?",
            "Will Donald Trump win the 2024 election?",
            "Will Taylor Swift announce a new album in 2024?",
            "Will Tesla stock hit $300 this year?",
            "Will Apple release VR glasses in 2024?",
            "Will Bitcoin halving cause price to double?"
        ];
        
        // Create markets with different end times
        for (uint i = 0; i < questions.length; i++) {
            uint256 daysToEnd = 30 + (i * 10); // Markets end in 30, 40, 50... days
            
            SimplePredictionMarket market = factory.createMarket(
                questions[i],
                block.timestamp + (daysToEnd * 1 days),
                address(0) // Use default resolver
            );
            
            console.log("Created market:", address(market));
            console.log("Question:", questions[i]);
            
            // Add some initial liquidity to make markets more realistic
            usdc.approve(address(market), 200e6);
            
            // Randomly seed YES/NO to create different initial prices
            if (i % 3 == 0) {
                // Favor YES
                market.buyShares(true, 120e6);
                market.buyShares(false, 80e6);
            } else if (i % 3 == 1) {
                // Favor NO  
                market.buyShares(true, 80e6);
                market.buyShares(false, 120e6);
            } else {
                // Balanced
                market.buyShares(true, 100e6);
                market.buyShares(false, 100e6);
            }
            
            console.log("Added liquidity. YES price:", market.getYesPrice());
            console.log("---");
        }
        
        vm.stopBroadcast();
        
        console.log("Sample markets created!");
        console.log("Total markets:", factory.getMarketCount());
    }
}