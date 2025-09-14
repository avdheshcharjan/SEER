# USDC Faucet Automation Utilities

Automated USDC faucet claiming utilities for Base Sepolia testnet.

## Features

- Automated USDC token claiming from Circle's testnet faucet
- Support for Base Sepolia network
- Rate limit detection and handling
- Cron job compatible for scheduled execution
- Comprehensive logging and error handling

## Installation

### Option 1: Using pip (Development Install)

```bash
cd utils
pip install -e .
```

### Option 2: Manual Setup

```bash
cd utils
pip install -r requirements.txt
```

## Usage

### Command Line

```bash
# Run the faucet script directly
python scripts/faucet_script.py

# Or if installed via pip
usdc-faucet
```

### Cron Job Setup

Add to your crontab to run every hour:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path as needed)
0 * * * * cd /path/to/BASED/utils && /usr/bin/python3 scripts/faucet_script.py >> logs/faucet_cron.log 2>&1
```

### Python Import

```python
from utils.scripts.faucet_script import CircleFaucetScraper

# Create scraper instance
scraper = CircleFaucetScraper(headless=True)  # Set to False for GUI mode

# Run the automation
success = scraper.run()

if success:
    print("✅ Faucet claim successful!")
else:
    print("❌ Faucet claim failed")
```

## Configuration

The script is pre-configured with:
- **Wallet Address**: `0xbb65d349dca28a64b5ddba859c0389060efd3d71`
- **Network**: Base Sepolia
- **Token**: USDC

To modify these settings, edit the values in `config.py`.

## Requirements

- Python 3.8+
- Chrome/Chromium browser
- ChromeDriver (auto-installed by webdriver-manager)

## Project Structure

```
utils/
├── scripts/
│   ├── faucet_script.py      # Main automation script
│   └── install.sh            # Installation helper script
├── logs/                     # Generated logs and outputs
│   ├── faucet_script.log     # Execution logs
│   ├── faucet_debug.log      # Debug logs
│   └──  rate_limit_status.txt # Rate limit tracking
├── output/                   # Script outputs and generated files
├── config.py                 # Configuration settings
├── requirements.txt          # Python dependencies
├── setup.py                  # Package installation configuration
├── __init__.py              # Package initialization
└── README.md                # This documentation
```

## Logging

Logs are written to:
- Console output (INFO level)
- `logs/faucet_script.log` (detailed logging)
- `logs/faucet_debug.log` (debug information)

Log levels:
- ✅ Success indicators
- ❌ Error conditions
- ⚠️ Warnings
- 🚀 Process starts

## Error Handling

The script handles:
- Rate limiting detection
- Network timeouts
- Element not found errors
- WebDriver crashes
- Page load failures

## Deployment Notes

When deploying to a new environment:

1. Ensure Chrome/Chromium is installed
2. Install Python dependencies: `pip install -r requirements.txt`
3. Test the script: `python scripts/faucet_script.py`
4. Set up cron job if needed
5. Monitor logs for successful execution

## Troubleshooting

**Common Issues:**

1. **ChromeDriver not found**: Install via `pip install webdriver-manager`
2. **Chrome not found**: Install Chrome browser
3. **Permission denied**: Make script executable with `chmod +x faucet_script.py`
4. **Rate limited**: Wait for the cooldown period (usually 1 hour)

**Debug Mode:**

Run with `headless=False` to see browser automation in action:

```python
scraper = CircleFaucetScraper(headless=False)
```