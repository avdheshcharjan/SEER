// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/GnosisPredictionMarketFactory.sol";
import "../src/TestUSDC.sol";

contract CreateSampleMarkets is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Load deployment addresses (these would come from the deployment file)
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        
        console.log("Creating sample markets with:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        GnosisPredictionMarketFactory factory = GnosisPredictionMarketFactory(factoryAddress);
        TestUSDC usdc = TestUSDC(usdcAddress);
        
        // Sample market data
        string[] memory questions = new string[](5);
        questions[0] = "Will Bitcoin reach $100,000 by end of 2024?";
        questions[1] = "Will Ethereum have more than 50% staking participation by Q2 2025?";
        questions[2] = "Will Base TVL exceed $10 billion by end of 2024?";
        questions[3] = "Will the next US president mention cryptocurrency in inauguration speech?";
        questions[4] = "Will any AI token reach top 10 by market cap in 2024?";
        
        uint256[] memory endTimes = new uint256[](5);
        endTimes[0] = block.timestamp + 60 days; // 2 months
        endTimes[1] = block.timestamp + 180 days; // 6 months  
        endTimes[2] = block.timestamp + 90 days; // 3 months
        endTimes[3] = block.timestamp + 120 days; // 4 months
        endTimes[4] = block.timestamp + 45 days; // 1.5 months
        
        uint256 initialLiquidity = 500 * 10**6; // 500 USDC
        
        // Approve USDC spending for all markets
        usdc.approve(address(factory), questions.length * initialLiquidity);
        
        // Create markets
        for (uint i = 0; i < questions.length; i++) {
            (bytes32 conditionId, address fpmm) = factory.createMarket(
                questions[i],
                endTimes[i],
                deployer, // Use deployer as oracle for demo
                initialLiquidity
            );
            
            console.log("Created market:", i);
            console.log("  Question:", questions[i]);
            console.log("  Condition ID:", vm.toString(conditionId));
            console.log("  FPMM Address:", fpmm);
            console.log("  End Time:", endTimes[i]);
            console.log("  ---");
        }
        
        vm.stopBroadcast();
        
        console.log("Sample markets created successfully!");
        console.log("Total markets:", questions.length);
        console.log("Total liquidity deployed:", (questions.length * initialLiquidity) / 10**6, "USDC");
    }
}