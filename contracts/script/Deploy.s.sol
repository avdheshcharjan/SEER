// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/SimplePredictionMarket.sol";
import "../src/MarketFactory.sol";

/// @title Deploy script for BASED prediction market contracts
/// @notice Deploys MockUSDC and creates a demo prediction market
contract DeployScript is Script {
    
    // Base Sepolia Chain ID
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;
    
    function run() external {
        // Ensure we're deploying to the correct network
        require(block.chainid == BASE_SEPOLIA_CHAIN_ID, "Must deploy to Base Sepolia");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts to Base Sepolia...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Mock USDC
        console.log("Deploying MockUSDC...");
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));
        
        // Deploy Market Factory
        console.log("Deploying MarketFactory...");
        MarketFactory factory = new MarketFactory(address(usdc), deployer);
        console.log("MarketFactory deployed at:", address(factory));
        
        // Create a demo prediction market through factory
        console.log("Creating demo prediction market...");
        SimplePredictionMarket demoMarket = factory.createMarket(
            "Will ETH be above $4000 on December 31, 2024?",
            block.timestamp + 60 days, // End in 60 days
            address(0) // Use default resolver (deployer)
        );
        console.log("Demo market created at:", address(demoMarket));
        
        // Fund the demo market with initial liquidity (it starts with MINIMUM_LIQUIDITY already)
        // Mint some USDC for testing
        console.log("Minting test USDC...");
        usdc.mint(deployer, 100000e6); // 100,000 USDC for testing
        
        // Approve and add some initial liquidity to make the market more realistic
        usdc.approve(address(demoMarket), 1000e6);
        demoMarket.buyShares(true, 500e6);  // Buy 500 USDC worth of YES shares
        demoMarket.buyShares(false, 500e6); // Buy 500 USDC worth of NO shares
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDC address:", address(usdc));
        console.log("Demo market address:", address(demoMarket));
        console.log("Market question:", demoMarket.question());
        console.log("Market end time:", demoMarket.endTime());
        console.log("YES price:", demoMarket.getYesPrice());
        console.log("NO price:", demoMarket.getNoPrice());
        
        // Save deployment info to JSON file
        string memory json = '{\n';
        json = string.concat(json, '  "network": "Base Sepolia",\n');
        json = string.concat(json, '  "chainId": "84532",\n');
        json = string.concat(json, '  "deployer": "', vm.toString(deployer), '",\n');
        json = string.concat(json, '  "mockUSDC": "', vm.toString(address(usdc)), '",\n');
        json = string.concat(json, '  "factory": "', vm.toString(address(factory)), '",\n');
        json = string.concat(json, '  "demoMarket": "', vm.toString(address(demoMarket)), '",\n');
        json = string.concat(json, '  "deployedAt": "', vm.toString(block.timestamp), '"\n');
        json = string.concat(json, '}');
        
        vm.writeFile("deployments/base-sepolia.json", json);
        console.log("Deployment info saved to deployments/base-sepolia.json");
    }
}