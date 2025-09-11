#!/bin/bash

# Test contracts on Base Sepolia fork
echo "🧪 Running tests against Base Sepolia fork..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Source environment variables
source .env

# Run tests with Sepolia fork
forge test \
    --fork-url https://sepolia.base.org \
    --match-contract GnosisPredictionMarketTest \
    -vvv

echo "✅ Testing complete!"