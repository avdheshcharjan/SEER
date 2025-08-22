// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
// Using real Base Sepolia USDC contract
import "../src/SimplePredictionMarket.sol";
import "../src/MarketFactory.sol";

/// @title Deploy script for BASED prediction market contracts
/// @notice Deploys MockUSDC and creates a demo prediction market
contract DeployScript is Script {
    
    // Base Sepolia Chain ID
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;
    
    // Real Base Sepolia USDC contract
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    function run() external {
        // Ensure we're deploying to the correct network
        require(block.chainid == BASE_SEPOLIA_CHAIN_ID, "Must deploy to Base Sepolia");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts to Base Sepolia...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Use real Base Sepolia USDC
        console.log("Using real Base Sepolia USDC...");
        address usdc = BASE_SEPOLIA_USDC;
        console.log("USDC address:", usdc);
        
        // Deploy Market Factory
        console.log("Deploying MarketFactory...");
        MarketFactory factory = new MarketFactory(usdc, deployer);
        console.log("MarketFactory deployed at:", address(factory));
        
        // Create a demo prediction market through factory
        console.log("Creating demo prediction market...");
        SimplePredictionMarket demoMarket = factory.createMarket(
            "Will ETH be above $4000 on December 31, 2024?",
            block.timestamp + 60 days, // End in 60 days
            address(0) // Use default resolver (deployer)
        );
        console.log("Demo market created at:", address(demoMarket));
        
        // Note: Demo market starts with MINIMUM_LIQUIDITY
        // Real USDC requires actual balance to add liquidity
        console.log("Demo market created with minimal liquidity");
        console.log("To add liquidity, ensure deployer has USDC balance");
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("USDC address:", usdc);
        console.log("Demo market address:", address(demoMarket));
        console.log("Market question:", demoMarket.question());
        console.log("Market end time:", demoMarket.endTime());
        console.log("YES price:", demoMarket.getYesPrice());
        console.log("NO price:", demoMarket.getNoPrice());
        
        // Log final addresses for manual saving
        console.log("=== SAVE THESE ADDRESSES ===");
        console.log("Network: Base Sepolia");
        console.log("Chain ID: 84532");
        console.log("Deployer: %s", deployer);
        console.log("USDC: %s", usdc);
        console.log("MarketFactory: %s", address(factory));
        console.log("Demo Market: %s", address(demoMarket));
        console.log("Deployed At: %s", block.timestamp);
    }
}