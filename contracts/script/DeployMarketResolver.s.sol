// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MarketResolver.sol";
import "../src/ParimutuelMarketFactory.sol";

contract DeployMarketResolver is Script {
    // UMA Optimistic Oracle V2 addresses (Base Mainnet)
    address constant UMA_OPTIMISTIC_ORACLE_V2 =
        0xA5B9d8a0B0Fa04Ba71BDD68069661ED5C0848884;
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // Deployment configuration
    address public deployer;
    address public marketResolverOwner;

    // Deployed contracts
    MarketResolver public marketResolver;
    ParimutuelMarketFactory public parimutuelFactory;

    function setUp() public {
        deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        marketResolverOwner = vm.envOr("MARKET_RESOLVER_OWNER", deployer);
    }

    function run() public {
        vm.startBroadcast();

        console.log("Deploying MarketResolver system...");
        console.log("Deployer:", deployer);
        console.log("Market Resolver Owner:", marketResolverOwner);
        console.log("UMA Oracle:", UMA_OPTIMISTIC_ORACLE_V2);
        console.log("USDC:", USDC_BASE);

        // Deploy MarketResolver
        marketResolver = new MarketResolver(
            UMA_OPTIMISTIC_ORACLE_V2,
            USDC_BASE,
            marketResolverOwner
        );

        console.log("MarketResolver deployed at:", address(marketResolver));

        // Deploy new factories with resolver integration
        parimutuelFactory = new ParimutuelMarketFactory(
            USDC_BASE,
            address(marketResolver), // Use resolver as default resolver
            address(marketResolver)
        );

        console.log(
            "ParimutuelMarketFactory deployed at:",
            address(parimutuelFactory)
        );

        // Verify deployment
        verifyDeployment();

        vm.stopBroadcast();

        // Log deployment summary
        logDeploymentSummary();
    }

    function verifyDeployment() internal view {
        console.log("Verifying deployment...");

        // Verify MarketResolver
        require(
            address(marketResolver.optimisticOracle()) ==
                UMA_OPTIMISTIC_ORACLE_V2,
            "Invalid oracle address"
        );
        require(
            address(marketResolver.bondCurrency()) == USDC_BASE,
            "Invalid bond currency"
        );
        require(
            marketResolver.owner() == marketResolverOwner,
            "Invalid resolver owner"
        );

        // Verify ParimutuelMarketFactory
        require(
            address(parimutuelFactory.usdc()) == USDC_BASE,
            "Invalid USDC in ParimutuelFactory"
        );
        require(
            address(parimutuelFactory.marketResolver()) ==
                address(marketResolver),
            "Invalid resolver in ParimutuelFactory"
        );

        console.log("Deployment verification passed!");
    }

    function logDeploymentSummary() internal view {
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("MarketResolver:", address(marketResolver));
        console.log("ParimutuelMarketFactory:", address(parimutuelFactory));
        console.log("");
        console.log("=== CONFIGURATION ===");
        console.log("UMA Oracle V2:", UMA_OPTIMISTIC_ORACLE_V2);
        console.log("Bond Currency (USDC):", USDC_BASE);
        console.log("Bond Amount:", marketResolver.BOND_AMOUNT(), "USDC");
        console.log(
            "Liveness Period:",
            marketResolver.LIVENESS_PERIOD(),
            "seconds"
        );
        console.log("");
        console.log("=== NEXT STEPS ===");
        console.log(
            "1. Platform markets will be resolved via UMA Optimistic Oracle V2"
        );
        console.log("2. User markets will be resolved by their creators");
        console.log("3. To resolve a platform market:");
        console.log(
            "   - Call requestPlatformResolution() after market expires"
        );
        console.log("   - Wait for oracle liveness period");
        console.log("   - Call settlePlatformResolution() to finalize");
        console.log("4. To resolve a user market:");
        console.log(
            "   - Market creator calls resolveUserMarket() after expiry"
        );
        console.log("");
        console.log("=== USAGE EXAMPLE ===");
        console.log("// Create platform market (resolved by UMA)");
        console.log(
            "factory.createMarket('Will BTC hit $100k?', endTime, true);"
        );
        console.log("");
        console.log("// Create user market (resolved by creator)");
        console.log(
            "factory.createMarket('My personal prediction', endTime, false);"
        );
    }

    // Helper function to deploy on testnet with mock oracle
    function runTestnet() public {
        vm.startBroadcast();

        console.log("Deploying MarketResolver system for TESTNET...");

        // For testnet, we might need to deploy a mock oracle or use different addresses
        address mockOracle = vm.envOr(
            "MOCK_ORACLE_ADDRESS",
            UMA_OPTIMISTIC_ORACLE_V2
        );
        address testUsdc = vm.envOr("TEST_USDC_ADDRESS", USDC_BASE);

        console.log("Using Oracle:", mockOracle);
        console.log("Using USDC:", testUsdc);

        marketResolver = new MarketResolver(
            mockOracle,
            testUsdc,
            marketResolverOwner
        );

        console.log("MarketResolver deployed at:", address(marketResolver));

        parimutuelFactory = new ParimutuelMarketFactory(
            testUsdc,
            address(marketResolver),
            address(marketResolver)
        );

        console.log("Testnet deployment complete!");
        console.log("ParimutuelMarketFactory:", address(parimutuelFactory));

        vm.stopBroadcast();
    }
}
