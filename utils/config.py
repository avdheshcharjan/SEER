#!/usr/bin/env python3
"""
Configuration settings for USDC Faucet Automation
"""

import os
from pathlib import Path

# Default configuration
DEFAULT_CONFIG = {
    "wallet_address": "<insert-wallet-address>",
    "network": "Base Sepolia",
    "token": "USDC",
    "faucet_url": "https://faucet.circle.com/",
    "headless": True,
    "timeout": 10,
    "log_level": "INFO"
}

# Environment variable overrides
CONFIG = {
    "wallet_address": os.getenv("FAUCET_WALLET_ADDRESS", DEFAULT_CONFIG["wallet_address"]),
    "network": os.getenv("FAUCET_NETWORK", DEFAULT_CONFIG["network"]),
    "token": os.getenv("FAUCET_TOKEN", DEFAULT_CONFIG["token"]),
    "faucet_url": os.getenv("FAUCET_URL", DEFAULT_CONFIG["faucet_url"]),
    "headless": os.getenv("FAUCET_HEADLESS", str(DEFAULT_CONFIG["headless"])).lower() == "true",
    "timeout": int(os.getenv("FAUCET_TIMEOUT", str(DEFAULT_CONFIG["timeout"]))),
    "log_level": os.getenv("FAUCET_LOG_LEVEL", DEFAULT_CONFIG["log_level"])
}

# File paths
UTILS_DIR = Path(__file__).parent
LOGS_DIR = UTILS_DIR / "logs"
OUTPUT_DIR = UTILS_DIR / "output"

# Ensure directories exist
LOGS_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

LOG_FILE = LOGS_DIR / "faucet_script.log"
RATE_LIMIT_FILE = LOGS_DIR / "rate_limit_status.txt"