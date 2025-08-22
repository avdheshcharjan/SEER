// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

contract VerifyDeploymentScript is Script {
    
    function run() external view {
        console.log("=== DEPLOYMENT VERIFICATION REPORT ===\n");
        
        // Check claimed addresses from documentation
        address claimedFactory = 0xfE7440a0C61aE1156E9B759Bb6C7E8BEFa0BCC3C;
        address claimedDemoMarket = 0x688B4b38b8f73878Cd19ef7250FA63D6b36361d1;
        address deployer = 0x817ADecF13045578BDbA571eA204b6B0a1C90Ab8;
        address realUSDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        
        console.log("Network: Base Sepolia (Chain ID: %d)", block.chainid);
        console.log("Current Block: %d", block.number);
        console.log("Current Time: %d\n", block.timestamp);
        
        // Check deployer status
        console.log("DEPLOYER STATUS:");
        console.log("Address: %s", deployer);
        console.log("ETH Balance: %d wei (%.6f ETH)", deployer.balance, deployer.balance / 1e18);
        console.log("Has sufficient funds: %s\n", deployer.balance > 0.01 ether ? "YES" : "NO");
        
        // Check claimed contract addresses
        console.log("CLAIMED CONTRACT STATUS:");
        console.log("Factory Address: %s", claimedFactory);
        console.log("Factory Code Size: %d bytes", claimedFactory.code.length);
        console.log("Factory Has Code: %s", claimedFactory.code.length > 0 ? "YES" : "NO");
        
        console.log("Demo Market Address: %s", claimedDemoMarket);
        console.log("Demo Market Code Size: %d bytes", claimedDemoMarket.code.length);
        console.log("Demo Market Has Code: %s\n", claimedDemoMarket.code.length > 0 ? "YES" : "NO");
        
        // Check USDC contract
        console.log("USDC CONTRACT STATUS:");
        console.log("Real USDC Address: %s", realUSDC);
        console.log("Real USDC Code Size: %d bytes", realUSDC.code.length);
        console.log("Real USDC Exists: %s\n", realUSDC.code.length > 0 ? "YES" : "NO");
        
        // Network verification
        require(block.chainid == 84532, "Not on Base Sepolia!");
        console.log("NETWORK VERIFICATION: PASSED\n");
        
        // Provide diagnosis
        console.log("=== DIAGNOSIS ===");
        
        if (claimedFactory.code.length == 0 && claimedDemoMarket.code.length == 0) {
            console.log("ROOT CAUSE: Contracts were never deployed");
            console.log("   Both factory and demo market have no code");
            console.log("   This suggests deployment transaction failed or was never executed");
        } else if (claimedFactory.code.length == 0) {
            console.log("ROOT CAUSE: Factory deployment failed");
            console.log("   Demo market exists but factory doesn't - inconsistent state");
        } else if (claimedDemoMarket.code.length == 0) {
            console.log("ROOT CAUSE: Demo market creation failed");
            console.log("   Factory exists but demo market creation failed");
        } else {
            console.log("ROOT CAUSE: Contracts exist - possible RPC/indexing issue");
        }
        
        console.log("\n=== RECOMMENDED ACTION ===");
        
        if (deployer.balance < 0.01 ether) {
            console.log("CRITICAL: Insufficient ETH balance for deployment");
            console.log("   Current: %.6f ETH", deployer.balance / 1e18);
            console.log("   Minimum needed: ~0.01 ETH");
            console.log("   Action: Fund deployer account first");
        } else if (claimedFactory.code.length == 0) {
            console.log("DEPLOY: Execute deployment script");
            console.log("   Deployer has sufficient balance");
            console.log("   Network is correct (Base Sepolia)");
            console.log("   USDC contract exists");
            console.log("   Action: Run deployment script with proper private key");
        } else {
            console.log("INVESTIGATE: Contracts appear to exist");
            console.log("   Action: Check RPC endpoint or wait for indexing");
        }
        
        console.log("\n=== NEXT STEPS ===");
        console.log("1. Ensure deployer private key is set in .env file");
        console.log("2. Run: forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast");
        console.log("3. Verify deployment with this verification script");
        console.log("4. Update frontend with actual deployed addresses");
    }
}