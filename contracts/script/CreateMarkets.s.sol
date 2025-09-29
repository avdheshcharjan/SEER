// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ParimutuelMarketFactory} from "../src/ParimutuelMarketFactory.sol";

/// @title CreateMarkets
/// @notice Script to deploy 50 prediction markets using ParimutuelMarketFactory
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

        // Generate and create all 50 markets
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
        string[] memory questions = new string[](50);

        // Crypto Markets (12 questions)
        questions[
            0
        ] = "Will BTC/USD close above $65,000 on the next UTC daily candle?";
        questions[
            1
        ] = "Will BTC/USD close above $70,000 on the next UTC daily candle?";
        questions[
            2
        ] = "Will BTC/USD close below $60,000 on the next UTC daily candle?";
        questions[
            3
        ] = "Will ETH/USD trade +/-5% from current price within 24 hours?";
        questions[
            4
        ] = "Will ETH/USD trade +/-10% from current price within 24 hours?";
        questions[
            5
        ] = "Will ETH/USD close above $2,800 on the next UTC daily candle?";
        questions[
            6
        ] = "Will SOL/USD trade +/-15% from current price within 24 hours?";
        questions[
            7
        ] = "Will any top-10 cryptocurrency gain more than 20% in 24 hours?";
        questions[
            8
        ] = "Will any top-10 cryptocurrency lose more than 15% in 24 hours?";
        questions[
            9
        ] = "Will the total crypto market cap change by more than 5% in 24 hours?";
        questions[
            10
        ] = "Will Bitcoin dominance change by more than 2% in 24 hours?";
        questions[
            11
        ] = "Will any major exchange report technical issues lasting >2 hours today?";

        // Current Affairs (10 questions)
        questions[
            12
        ] = "Will USGS report a magnitude >=6.0 earthquake anywhere in the world in 24 hours?";
        questions[
            13
        ] = "Will USGS report a magnitude >=7.0 earthquake anywhere in the world in 24 hours?";
        questions[
            14
        ] = "Will OPEC release an unscheduled statement about oil production in 24 hours?";
        questions[
            15
        ] = "Will oil prices (WTI) change by more than 5% in 24 hours?";
        questions[16] = "Will gold prices change by more than 3% in 24 hours?";
        questions[
            17
        ] = "Will any major airline report significant flight disruptions (>100 cancellations) today?";
        questions[
            18
        ] = "Will any G7 country announce new economic sanctions today?";
        questions[
            19
        ] = "Will the UN Security Council hold an emergency session today?";
        questions[
            20
        ] = "Will any major weather warning be issued for a US state capital today?";
        questions[
            21
        ] = "Will any currency (vs USD) move more than 5% in 24 hours?";

        // Politics (8 questions)
        questions[
            22
        ] = "Will the White House hold an unscheduled press briefing today (DC time)?";
        questions[
            23
        ] = "Will any US federal agency issue a major policy announcement today?";
        questions[
            24
        ] = "Will UK Parliament table a no-confidence motion within 24 hours?";
        questions[
            25
        ] = "Will any EU member state call for an emergency EU meeting today?";
        questions[
            26
        ] = "Will any major political figure announce their resignation today?";
        questions[
            27
        ] = "Will any country announce new trade restrictions today?";
        questions[
            28
        ] = "Will any major protest (>10,000 people) be reported in a world capital today?";
        questions[
            29
        ] = "Will any head of state make an unscheduled public address today?";

        // Technology (10 questions)
        questions[
            30
        ] = "Will Apple confirm any new unreleased hardware via official channels in 24 hours?";
        questions[
            31
        ] = "Will any major tech company announce a significant layoff (>1,000 employees) today?";
        questions[
            32
        ] = "Will OpenAI, Anthropic, or Google report a global outage >=1 hour in 24 hours?";
        questions[
            33
        ] = "Will any major social media platform report technical issues >2 hours today?";
        questions[
            34
        ] = "Will any tech company announce a major acquisition (>$1B) today?";
        questions[
            35
        ] = "Will any new AI model or major update be officially announced today?";
        questions[
            36
        ] = "Will any major cybersecurity incident affecting >100,000 users be reported today?";
        questions[
            37
        ] = "Will any major cloud provider (AWS/Azure/GCP) report widespread issues today?";
        questions[
            38
        ] = "Will any major gaming platform report server issues affecting millions today?";
        questions[
            39
        ] = "Will any major EV manufacturer announce new model or recall today?";

        // Sports (10 questions)
        questions[
            40
        ] = "Will any underdog team (pre-match odds >=3.0) win their Champions League match today?";
        questions[
            41
        ] = "Will any NBA player record a triple-double in today's scheduled games?";
        questions[
            42
        ] = "Will any NBA player score 50+ points in today's scheduled games?";
        questions[
            43
        ] = "Will any NFL team score 40+ points in today's scheduled games?";
        questions[
            44
        ] = "Will any major upset (underdog wins by 10+ points) occur in college basketball today?";
        questions[
            45
        ] = "Will any tennis player ranked outside top 50 beat a top 10 player today?";
        questions[
            46
        ] = "Will any major sports league announce a rule change or disciplinary action today?";
        questions[
            47
        ] = "Will any athlete announce retirement from professional sports today?";
        questions[
            48
        ] = "Will any major sports injury requiring surgery be reported today?";
        questions[49] = "Will any world record be broken in any sport today?";

        return questions;
    }
}
