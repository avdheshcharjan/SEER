#!/bin/bash

# 🚀 Pari-mutuel Prediction Market Deployment Script
# This script deploys the pari-mutuel system to Base Sepolia

echo "🚀 Starting Pari-mutuel Prediction Market Deployment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "contracts/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp contracts/.env.example contracts/.env
    echo -e "${RED}❌ Please edit contracts/.env with your PRIVATE_KEY and run this script again.${NC}"
    echo "Example: PRIVATE_KEY=your_private_key_without_0x_prefix"
    exit 1
fi

# Load environment variables
source contracts/.env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "your_private_key_here" ]; then
    echo -e "${RED}❌ PRIVATE_KEY not set in contracts/.env${NC}"
    echo "Please edit contracts/.env and set your private key (without 0x prefix)"
    exit 1
fi

# Move to contracts directory
cd contracts

echo -e "${BLUE}🔨 Building contracts...${NC}"
forge build src/ParimutuelPredictionMarket.sol src/ParimutuelMarketFactory.sol

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Contract compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contracts compiled successfully${NC}"

echo -e "${BLUE}🧪 Running tests...${NC}"
forge test --match-contract ParimutuelPredictionMarketTest --no-match-test testEmergencyResolve -v

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tests passed${NC}"

# Set RPC URL
RPC_URL=${BASE_SEPOLIA_RPC_URL:-"https://sepolia.base.org"}
echo -e "${BLUE}🌐 Using RPC: $RPC_URL${NC}"

echo -e "${BLUE}🚀 Deploying to Base Sepolia...${NC}"
echo "This may take a few minutes..."

# Deploy the contracts
forge script script/DeployParimutuel.s.sol \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --verify \
    -vvvv

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Copy the contract addresses from the deployment output above"
    echo "2. Update lib/gasless-parimutuel.ts with the new PARIMUTUEL_FACTORY_ADDRESS"
    echo "3. Add the contract addresses to your Coinbase Developer Platform paymaster allowlist"
    echo "4. Test the deployment using the contract addresses"
    echo ""
    echo -e "${BLUE}🔍 You can verify the contracts on Basescan:${NC}"
    echo "https://sepolia.basescan.org"
    echo ""
    echo -e "${GREEN}🎉 Pari-mutuel system is ready to use!${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Common issues:"
    echo "- Insufficient Base Sepolia ETH for gas"
    echo "- Incorrect private key format (should not include 0x prefix)"
    echo "- RPC connection issues"
    echo ""
    echo "Get Base Sepolia ETH from: https://bridge.base.org/deposit"
    exit 1
fi