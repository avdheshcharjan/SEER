// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/GnosisPredictionMarketFactory.sol";
import "../src/PredictionMarketTrader.sol";
import "../src/ConditionalTokens.sol";
import "../src/FixedProductMarketMakerFactory.sol";

contract Deploy is Script {
    // Network configurations
    struct NetworkConfig {
        address usdc;
        string name;
    }
    
    // Base Sepolia (Chain ID: 84532)
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Base Mainnet (Chain ID: 8453)
    address constant USDC_BASE_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        NetworkConfig memory config = getNetworkConfig();
        
        console.log("Deploying on network:", config.name);
        console.log("Using USDC address:", config.usdc);
        console.log("Deploying with address:", deployer);
        console.log("Balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy ConditionalTokens
        console.log("Deploying ConditionalTokens...");
        address conditionalTokens = deployConditionalTokens();
        console.log("ConditionalTokens deployed at:", conditionalTokens);
        
        // Deploy FixedProductMarketMakerFactory
        console.log("Deploying FixedProductMarketMakerFactory...");
        address fpmmFactory = deployFPMMFactory();
        console.log("FixedProductMarketMakerFactory deployed at:", fpmmFactory);
        
        // Deploy our factory
        console.log("Deploying GnosisPredictionMarketFactory...");
        GnosisPredictionMarketFactory factory = new GnosisPredictionMarketFactory(
            conditionalTokens,
            fpmmFactory,
            config.usdc
        );
        console.log("GnosisPredictionMarketFactory deployed at:", address(factory));
        
        // Deploy trader
        console.log("Deploying PredictionMarketTrader...");
        PredictionMarketTrader trader = new PredictionMarketTrader(
            address(factory),
            conditionalTokens,
            config.usdc
        );
        console.log("PredictionMarketTrader deployed at:", address(trader));
        
        vm.stopBroadcast();
        
        // Save deployment addresses
        string memory deploymentData = string(abi.encodePacked(
            '{\n',
            '  "conditionalTokens": "', vm.toString(conditionalTokens), '",\n',
            '  "fpmmFactory": "', vm.toString(fpmmFactory), '",\n',
            '  "factory": "', vm.toString(address(factory)), '",\n',
            '  "trader": "', vm.toString(address(trader)), '",\n',
            '  "usdc": "', vm.toString(config.usdc), '",\n',
            '  "network": "', config.name, '",\n',
            '  "chainId": ', vm.toString(block.chainid), '\n',
            '}'
        ));
        
        string memory fileName = string(abi.encodePacked("./deployments/gnosis-", config.name, ".json"));
        vm.writeFile(fileName, deploymentData);
        console.log("Deployment complete! Addresses saved to", fileName);
    }
    
    function getNetworkConfig() internal view returns (NetworkConfig memory) {
        uint256 chainId = block.chainid;
        
        if (chainId == 84532) {
            return NetworkConfig({
                usdc: USDC_BASE_SEPOLIA,
                name: "base-sepolia"
            });
        } else if (chainId == 8453) {
            return NetworkConfig({
                usdc: USDC_BASE_MAINNET,
                name: "base-mainnet"
            });
        } else {
            revert("Unsupported network");
        }
    }
    
    function deployConditionalTokens() internal returns (address) {
        // Deploy our ConditionalTokens implementation
        ConditionalTokens conditionalTokens = new ConditionalTokens();
        return address(conditionalTokens);
    }
    
    function deployFPMMFactory() internal returns (address) {
        // Deploy our FPMM factory
        FixedProductMarketMakerFactory fpmmFactory = new FixedProductMarketMakerFactory();
        return address(fpmmFactory);
    }
}