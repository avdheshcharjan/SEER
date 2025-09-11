#!/bin/bash

# Deploy to Base Sepolia
echo "🚀 Deploying to Base Sepolia..."

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
    --rpc-url base_sepolia \
    --broadcast \
    --verify \
    -vvvv

echo "✅ Deployment complete!"
echo "📄 Check deployments/gnosis-base-sepolia.json for contract addresses"