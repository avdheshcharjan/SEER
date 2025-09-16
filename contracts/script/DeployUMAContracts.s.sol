// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/UMAEventBasedParimutuelMarketMinimal.sol";
import "../src/UMAParimutuelMarketFactoryV2.sol";
import "../src/MarketResolver.sol";
import "../src/ParimutuelPredictionMarket.sol";
import "../src/ParimutuelMarketFactory.sol";

contract DeployUMAContracts is Script {
    // Base Sepolia addresses (with correct checksums)
    address constant OPTIMISTIC_ORACLE_V2 =
        0x5953f2538F613E05bAeD8a5aEf8b796c9AE2Df85; // UMA OOv2 on Base Sepolia
    address constant USDC_BASE_SEPOLIA =
        0x036CbD53842c5426634e7929541eC2318f3dCF7e; // USDC on Base Sepolia
    address constant OWNER = 0x4f6742bADB049791CD9A37ea913f2BAC38d01279; // Owner address (with correct checksum)

    function run() external {
        vm.startBroadcast();

        console.log("Deploying contracts to Base Sepolia...");
        console.log("Deployer address:", msg.sender);
        console.log("USDC address:", USDC_BASE_SEPOLIA);
        console.log("UMA Oracle address:", OPTIMISTIC_ORACLE_V2);
        console.log("Owner address:", OWNER);

        // 1. Deploy MarketResolver (for traditional markets)
        console.log("\n=== Deploying MarketResolver ===");
        MarketResolver marketResolver = new MarketResolver(
            OPTIMISTIC_ORACLE_V2,
            USDC_BASE_SEPOLIA,
            OWNER
        );
        console.log("MarketResolver deployed to:", address(marketResolver));

        // 2. Deploy UMAParimutuelMarketFactory (for UMA-based markets)
        console.log("\n=== Deploying UMAParimutuelMarketFactory ===");
        UMAParimutuelMarketFactoryV2 umaFactory = new UMAParimutuelMarketFactoryV2(
                OPTIMISTIC_ORACLE_V2,
                USDC_BASE_SEPOLIA
            );
        console.log(
            "UMAParimutuelMarketFactory deployed to:",
            address(umaFactory)
        );

        // 3. Deploy traditional ParimutuelMarketFactory
        console.log("\n=== Deploying ParimutuelMarketFactory ===");
        ParimutuelMarketFactory traditionalFactory = new ParimutuelMarketFactory(
                USDC_BASE_SEPOLIA,
                OWNER, // defaultResolver
                address(marketResolver)
            );
        console.log(
            "ParimutuelMarketFactory deployed to:",
            address(traditionalFactory)
        );

        // 4. Deploy a sample UMA-based market for testing
        console.log("\n=== Deploying Sample UMA Market ===");
        string
            memory question = "Will Bitcoin reach $100,000 by December 31, 2024?";
        uint256 endTime = block.timestamp + 30 days; // 30 days from now

        UMAEventBasedParimutuelMarketMinimal sampleUMAMarket = new UMAEventBasedParimutuelMarketMinimal(
                OPTIMISTIC_ORACLE_V2,
                USDC_BASE_SEPOLIA,
                question,
                endTime
            );
        console.log("Sample UMA Market deployed to:", address(sampleUMAMarket));

        // 5. Deploy a sample traditional market for testing
        console.log("\n=== Deploying Sample Traditional Market ===");
        ParimutuelPredictionMarket sampleTraditionalMarket = new ParimutuelPredictionMarket(
                USDC_BASE_SEPOLIA,
                question,
                endTime,
                address(marketResolver)
            );
        console.log(
            "Sample Traditional Market deployed to:",
            address(sampleTraditionalMarket)
        );

        console.log("\n=== Deployment Summary ===");
        console.log("MarketResolver:", address(marketResolver));
        console.log("UMAParimutuelMarketFactory:", address(umaFactory));
        console.log("ParimutuelMarketFactory:", address(traditionalFactory));
        console.log("Sample UMA Market:", address(sampleUMAMarket));
        console.log(
            "Sample Traditional Market:",
            address(sampleTraditionalMarket)
        );

        console.log("\n=== Next Steps ===");
        console.log(
            "1. Transfer ownership of sample markets to desired owners"
        );
        console.log("2. Initialize UMA market with proposer reward (10 USDC)");
        console.log("3. Register traditional market with MarketResolver");
        console.log("4. Fund markets with initial liquidity for testing");

        vm.stopBroadcast();
    }

    // Helper function to setup markets after deployment (call separately)
    function setupMarkets() external {
        vm.startBroadcast();

        // You would call this after the main deployment to setup the markets
        // This requires the deployed addresses from the previous step

        vm.stopBroadcast();
    }
}
