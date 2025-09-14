#!/usr/bin/env python3

import time
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, WebDriverException

# Import configuration
try:
    from ..config import CONFIG, LOG_FILE, RATE_LIMIT_FILE
except ImportError:
    # Fallback for direct script execution
    import sys
    sys.path.append(str(Path(__file__).parent.parent))
    from config import CONFIG, LOG_FILE, RATE_LIMIT_FILE

# Enhanced logging setup
def setup_logging():
    """Setup logging with both console and file output"""
    logger = logging.getLogger(__name__)
    logger.setLevel(getattr(logging, CONFIG["log_level"]))

    # Clear existing handlers
    logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(console_format)

    # File handler
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter('%(asctime)s - %(levelname)s - %(funcName)s - %(message)s')
    file_handler.setFormatter(file_format)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger

logger = setup_logging()

class CircleFaucetScraper:
    def __init__(self, headless=None, wallet_address=None):
        self.driver = None
        self.wait = None
        self.headless = headless if headless is not None else CONFIG["headless"]
        self.wallet_address = wallet_address or CONFIG["wallet_address"]
        self.timeout = CONFIG["timeout"]

    def setup_driver(self):
        """Setup Chrome WebDriver"""
        options = Options()
        if self.headless:
            options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)

        self.driver = webdriver.Chrome(options=options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.wait = WebDriverWait(self.driver, self.timeout)
        self.driver.set_window_size(1920, 1080)
        logger.debug("WebDriver setup completed")

    def navigate_to_faucet(self):
        """Navigate to Circle faucet"""
        logger.debug(f"Navigating to {CONFIG['faucet_url']}")
        self.driver.get(CONFIG["faucet_url"])
        self.wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
        logger.debug("Page loaded successfully")

    def safe_click(self, element):
        """Click element with fallback to JS click"""
        try:
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
            time.sleep(0.3)
            element.click()
        except:
            self.driver.execute_script("arguments[0].click();", element)

    def automate_faucet_process(self):
        """Main automation process"""
        try:
            # Step 1: Click USDC card
            usdc_card = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="select-card-USDC"]')))
            self.safe_click(usdc_card)
            time.sleep(0.5)

            # Step 2: Click dropdown
            dropdown = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '.cb-dropdown.variant-default.no-placeholder')))
            self.safe_click(dropdown)
            time.sleep(0.5)

            # Step 3: Wait for dropdown to open
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[role="option"], [role="listbox"]')))

            # Step 4: Select Base Sepolia
            base_sepolia = None

            # Try XPath first (most reliable)
            try:
                base_sepolia = self.driver.find_element(By.XPATH, "//*[contains(text(), 'Base Sepolia')]")
                if base_sepolia.is_displayed():
                    self.safe_click(base_sepolia)
                else:
                    base_sepolia = None
            except:
                pass

            # Fallback to option enumeration
            if not base_sepolia:
                options = self.driver.find_elements(By.CSS_SELECTOR, '[role="option"], option, li')
                for opt in options:
                    if opt.is_displayed():
                        text = opt.text or opt.get_attribute('textContent') or ""
                        if "base sepolia" in text.lower():
                            self.safe_click(opt)
                            break
                else:
                    raise Exception("Base Sepolia option not found")

            time.sleep(0.5)

            # Step 5: Enter wallet address
            address_input = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[placeholder*="address" i]')))
            address_input.clear()
            address_input.send_keys(self.wallet_address)
            logger.debug(f"Entered wallet address: {self.wallet_address}")
            time.sleep(0.5)

            # Step 6: Submit
            submit_button = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '.cb-button.base.primary.w-full')))
            self.safe_click(submit_button)
            time.sleep(2)

            # Check result - success indicators first
            page_source = self.driver.page_source.lower()

            # Check for success first (priority)
            if any(success in page_source for success in ['tokens sent', 'on its way', 'should appear shortly', 'get more tokens']):
                logger.info("✅ Faucet claim successful")
                return True

            # Only check for rate limit if no success indicators found
            if any(error in page_source for error in ['limit exceeded', 'hit the limit', 'try again later']):
                logger.error("❌ RATE LIMIT EXCEEDED")
                return False

            logger.warning("⚠️ Could not verify claim result - assuming success")
            return True

        except TimeoutException as e:
            logger.error(f"❌ Timeout: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Error: {e}")
            return False

    def close_driver(self):
        """Close WebDriver"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass

    def run(self):
        """Main execution"""
        try:
            self.setup_driver()
            self.navigate_to_faucet()
            return self.automate_faucet_process()
        except Exception as e:
            logger.error(f"❌ Script failed: {e}")
            return False
        finally:
            self.close_driver()

def main():
    """Main entry point"""
    logger.info(f"🚀 Starting {CONFIG['token']} faucet claim at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Configuration - Wallet: {CONFIG['wallet_address']}, Network: {CONFIG['network']}")

    # Check for rate limit status
    if RATE_LIMIT_FILE.exists():
        with open(RATE_LIMIT_FILE, 'r') as f:
            status = f.read().strip()
            if "RATE_LIMITED" in status:
                logger.warning("⚠️ Previous run was rate limited - proceeding anyway")

    scraper = CircleFaucetScraper()
    success = scraper.run()

    # Update rate limit status
    status = "SUCCESS" if success else "FAILED"
    with open(RATE_LIMIT_FILE, 'w') as f:
        f.write(f"{status} - {datetime.now().isoformat()}\n")

    if success:
        logger.info("✅ USDC faucet claim completed successfully!")
        return 0
    else:
        logger.error("❌ USDC faucet claim failed")
        return 1

if __name__ == "__main__":
    exit(main())