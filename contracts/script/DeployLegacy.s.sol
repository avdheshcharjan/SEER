// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SimplePredictionMarket.sol";

// Legacy deployment for old factory pattern
contract DeployLegacy is Script {
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    function run() public {
        vm.startBroadcast();
        
        console.log("Deploying legacy single market...");
        console.log("Deployer:", msg.sender);
        console.log("USDC:", USDC_BASE);
        
        // Deploy a single market for testing
        SimplePredictionMarket market = new SimplePredictionMarket(
            USDC_BASE,
            "Will BTC hit $100k by end of 2024?",
            block.timestamp + 30 days,
            msg.sender // deployer as resolver
        );
        
        console.log("Market deployed at:", address(market));
        console.log("Question:", market.question());
        console.log("End time:", market.endTime());
        console.log("Resolver:", market.resolver());
        
        vm.stopBroadcast();
    }
}