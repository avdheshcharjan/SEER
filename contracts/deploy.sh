#!/bin/bash

# SEER Deployment Script for Base Sepolia
# Usage: ./deploy.sh [script_name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== SEER Deployment Helper ===${NC}"

# Check if we're in the contracts directory
if [[ ! -f "foundry.toml" ]]; then
    echo -e "${RED}Error: Please run this script from the contracts directory${NC}"
    exit 1
fi

# Load environment variables from parent directory
if [[ -f "../.env" ]]; then
    echo -e "${YELLOW}Loading environment variables from ../.env${NC}"
    source ../.env
else
    echo -e "${RED}Error: .env file not found in parent directory${NC}"
    exit 1
fi

# Validate required environment variables
if [[ -z "$PRIVATE_KEY" ]]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env file${NC}"
    exit 1
fi

# Add 0x prefix if missing
if [[ $PRIVATE_KEY != 0x* ]]; then
    export PRIVATE_KEY="0x$PRIVATE_KEY"
    echo -e "${YELLOW}Added 0x prefix to PRIVATE_KEY${NC}"
fi

# Default to DeployFactory if no script specified
SCRIPT_NAME=${1:-"DeployFactory"}
SCRIPT_PATH="script/${SCRIPT_NAME}.s.sol:${SCRIPT_NAME}"

echo -e "${BLUE}Script: ${SCRIPT_PATH}${NC}"
echo -e "${BLUE}Network: Base Sepolia${NC}"
echo -e "${BLUE}Deployer: $(cast wallet address $PRIVATE_KEY)${NC}"

# Ask for confirmation
echo -e "${YELLOW}Proceed with deployment? (y/N)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo -e "${GREEN}Starting deployment...${NC}"

# Run the forge script
forge script "$SCRIPT_PATH" \
    --rpc-url base-sepolia \
    --broadcast \
    --verify \
    --etherscan-api-key "$BASESCAN_API_KEY" \
    --gas-estimate-multiplier 120 \
    -vvv

echo -e "${GREEN}Deployment completed!${NC}"

# Auto-sync deployed contracts to Supabase
echo -e "${BLUE}=== Auto-Sync to Database ===${NC}"
echo -e "${YELLOW}Syncing deployed markets to Supabase...${NC}"

cd ..
if npm run sync-markets; then
    echo -e "${GREEN}✅ Auto-sync completed successfully!${NC}"
    echo -e "${GREEN}🎉 Markets are now live and ready for trading!${NC}"
else
    echo -e "${RED}⚠️  Auto-sync failed. You can manually run: npm run sync-markets${NC}"
fi
cd contracts