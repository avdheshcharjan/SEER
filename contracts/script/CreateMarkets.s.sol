// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ParimutuelMarketFactory} from "../src/ParimutuelMarketFactory.sol";

/// @title CreateMarkets
/// @notice Script to deploy 10 prediction markets using ParimutuelMarketFactory
/// @dev Creates markets based on MARKET-IDEAS.md with variations
contract CreateMarkets is Script {
    ParimutuelMarketFactory public factory;

    // Base Sepolia USDC address
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Default resolver address - should be set to a trusted resolver
    address constant DEFAULT_RESOLVER =
        0x7579c7457F4151B1ae7078fAf9D4A30Af953bDeE;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the factory if needed, or use existing one
        factory = new ParimutuelMarketFactory(USDC, DEFAULT_RESOLVER);
        console.log("Factory deployed at:", address(factory));

        // Generate and create all 10 markets
        createAllMarkets();

        vm.stopBroadcast();
    }

    function createAllMarkets() internal {
        string[] memory questions = generateMarketQuestions();

        // Create markets in batches of 5 to stay under gas limit
        uint256 totalQuestions = questions.length;
        uint256 batchSize = 5;

        for (uint256 i = 0; i < totalQuestions; i += batchSize) {
            uint256 currentBatchSize = (i + batchSize > totalQuestions)
                ? totalQuestions - i
                : batchSize;

            string[] memory batchQuestions = new string[](currentBatchSize);
            address[] memory batchResolvers = new address[](currentBatchSize);

            for (uint256 j = 0; j < currentBatchSize; j++) {
                batchQuestions[j] = questions[i + j];
                batchResolvers[j] = address(0); // Use default resolver
            }

            address[] memory marketAddresses = factory.createMarkets(
                batchQuestions,
                batchResolvers
            );

            console.log("Created batch starting at index:", i);
            console.log("Batch size:", currentBatchSize);
            console.log("First market in batch:", marketAddresses[0]);
        }

        console.log("Total markets created:", totalQuestions);
    }

    function generateMarketQuestions() internal pure returns (string[] memory) {
        string[] memory questions = new string[](10);

        // Crypto Markets (4 questions)
        questions[
            0
        ] = "Will BTC/USD close above $65,000 on the next UTC daily candle?";
        questions[
            1
        ] = "Will ETH/USD trade +/-5% from current price within 24 hours?";
        questions[
            2
        ] = "Will SOL/USD trade +/-15% from current price within 24 hours?";
        questions[
            3
        ] = "Will any top-10 cryptocurrency gain more than 20% in 24 hours?";

        // Current Affairs (2 questions)
        questions[
            4
        ] = "Will USGS report a magnitude >=6.0 earthquake anywhere in the world in 24 hours?";
        questions[
            5
        ] = "Will oil prices (WTI) change by more than 5% in 24 hours?";

        // Politics (2 questions)
        questions[
            6
        ] = "Will the White House hold an unscheduled press briefing today (DC time)?";
        questions[
            7
        ] = "Will any major political figure announce their resignation today?";

        // Technology (2 questions)
        questions[
            8
        ] = "Will OpenAI, Anthropic, or Google report a global outage >=1 hour in 24 hours?";
        questions[
            9
        ] = "Will any major tech company announce a significant layoff (>1,000 employees) today?";

        return questions;
    }
}
