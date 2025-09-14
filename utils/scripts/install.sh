#!/bin/bash
# Installation script for USDC Faucet Automation Utilities

echo "🚀 Installing USDC Faucet Automation Utilities..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Installation completed successfully!"
echo ""
echo "To use the faucet script:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Run the script: python faucet_script.py"
echo ""
echo "For cron job setup, see README.md"