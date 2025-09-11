#!/bin/bash

# Deploy to Base Mainnet
echo "🚨 DEPLOYING TO BASE MAINNET 🚨"
echo "This will deploy to production. Make sure you've tested on Sepolia first!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Source environment variables
source .env

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set in .env file"
    exit 1
fi

# Deploy contracts
forge script script/Deploy.s.sol:Deploy \
    --rpc-url base_mainnet \
    --broadcast \
    --verify \
    -vvvv

echo "✅ Production deployment complete!"
echo "📄 Check deployments/gnosis-base-mainnet.json for contract addresses"