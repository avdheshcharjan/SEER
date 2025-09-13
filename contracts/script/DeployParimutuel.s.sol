// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ParimutuelMarketFactory.sol";

/// @title Deploy Pari-mutuel System
/// @notice Script to deploy the pari-mutuel prediction market system
contract DeployParimutuel is Script {
    
    // Base Sepolia USDC address
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    function setUp() public {}
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying pari-mutuel system with deployer:", deployer);
        console.log("USDC address:", USDC_ADDRESS);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the factory with deployer as default resolver
        ParimutuelMarketFactory factory = new ParimutuelMarketFactory(
            USDC_ADDRESS,
            deployer // Use deployer as default resolver for MVP
        );
        
        console.log("ParimutuelMarketFactory deployed at:", address(factory));
        
        // Create a demo market for testing
        string memory question = "Will BTC be above $70k by end of December 2024?";
        uint256 endTime = block.timestamp + 30 days; // 30 days from now
        
        ParimutuelPredictionMarket demoMarket = factory.createMarket(
            question,
            endTime,
            address(0) // Use default resolver
        );
        
        console.log("Demo ParimutuelPredictionMarket deployed at:", address(demoMarket));
        console.log("Question:", question);
        console.log("End time:", endTime);
        
        vm.stopBroadcast();
        
        // Log deployment info for updating frontend
        console.log("");
        console.log("=== UPDATE THESE ADDRESSES IN YOUR FRONTEND ===");
        console.log("PARIMUTUEL_FACTORY_ADDRESS:", address(factory));
        console.log("DEMO_PARIMUTUEL_MARKET_ADDRESS:", address(demoMarket));
        console.log("===============================================");
    }
}