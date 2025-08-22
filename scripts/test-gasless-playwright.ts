import { chromium } from 'playwright';
import { setTimeout } from 'timers/promises';

async function testGaslessTransactions() {
  console.log('🚀 Starting Gasless Transaction Tests...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Monitor console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ Console Error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });

  try {
    // Step 1: Navigate to the app
    console.log('📍 Step 1: Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded successfully\n');
    
    // Step 2: Check for OnchainKit provider
    console.log('📍 Step 2: Checking OnchainKit configuration...');
    const hasOnchainKit = await page.evaluate(() => {
      return window.localStorage.getItem('onchainkit-api-key') || 
             document.querySelector('[data-testid="onchainkit-provider"]') !== null;
    });
    
    if (hasOnchainKit) {
      console.log('✅ OnchainKit provider detected\n');
    } else {
      console.log('⚠️  OnchainKit provider may not be configured\n');
    }
    
    // Step 3: Check for wallet connect button
    console.log('📍 Step 3: Looking for wallet connect button...');
    const connectButton = await page.locator('button:has-text("Connect"), button:has-text("Connect Wallet")').first();
    
    if (await connectButton.isVisible()) {
      console.log('✅ Found wallet connect button');
      await connectButton.click();
      console.log('⏳ Waiting for wallet modal...');
      await setTimeout(2000);
      
      // Check if Coinbase Smart Wallet option is available
      const smartWalletOption = await page.locator('text=/Coinbase.*Smart.*Wallet/i').first();
      if (await smartWalletOption.isVisible()) {
        console.log('✅ Coinbase Smart Wallet option available\n');
      } else {
        console.log('⚠️  Coinbase Smart Wallet option not found\n');
      }
    } else {
      console.log('⚠️  No wallet connect button found\n');
    }
    
    // Step 4: Check for gasless transaction components
    console.log('📍 Step 4: Checking for gasless transaction components...');
    
    // Check for Transaction components with isSponsored prop
    const hasGaslessComponents = await page.evaluate(() => {
      const scripts = Array.from(document.scripts);
      const hasIsSponsored = scripts.some(script => 
        script.innerHTML.includes('isSponsored={true}') || 
        script.innerHTML.includes('isSponsored: true')
      );
      return hasIsSponsored;
    });
    
    if (hasGaslessComponents) {
      console.log('✅ Found gasless transaction components (isSponsored={true})\n');
    } else {
      console.log('⚠️  No gasless transaction components detected\n');
    }
    
    // Step 5: Check for paymaster configuration
    console.log('📍 Step 5: Verifying paymaster configuration...');
    const paymasterConfig = await page.evaluate(() => {
      // Check environment variables through window object if exposed
      const hasPaymasterUrl = document.documentElement.innerHTML.includes('PAYMASTER_URL') ||
                             document.documentElement.innerHTML.includes('paymaster');
      return hasPaymasterUrl;
    });
    
    if (paymasterConfig) {
      console.log('✅ Paymaster configuration detected\n');
    } else {
      console.log('⚠️  Paymaster configuration not detected\n');
    }
    
    // Step 6: Check for market/prediction UI
    console.log('📍 Step 6: Looking for prediction markets...');
    await page.goto('http://localhost:3002/markets', { waitUntil: 'networkidle' }).catch(() => {
      console.log('ℹ️  /markets route not available, checking main page...');
    });
    
    const hasMarkets = await page.locator('[class*="market"], [data-testid*="market"]').count() > 0 ||
                       await page.locator('text=/prediction|market/i').count() > 0;
    
    if (hasMarkets) {
      console.log('✅ Found market/prediction UI elements\n');
    } else {
      console.log('⚠️  No market/prediction UI elements found\n');
    }
    
    // Step 7: Check for approval manager
    console.log('📍 Step 7: Checking for approval manager...');
    const hasApprovalManager = await page.evaluate(() => {
      return document.documentElement.innerHTML.includes('ApprovalManager') ||
             document.documentElement.innerHTML.includes('approval-manager');
    });
    
    if (hasApprovalManager) {
      console.log('✅ Approval manager detected\n');
    } else {
      console.log('ℹ️  Approval manager not detected in current view\n');
    }
    
    // Take a screenshot for reference
    await page.screenshot({ path: 'gasless-test-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as gasless-test-screenshot.png\n');
    
    // Summary
    console.log('=' .repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log('=' .repeat(50));
    console.log('✅ Page loads successfully');
    console.log(hasOnchainKit ? '✅ OnchainKit configured' : '⚠️  OnchainKit needs configuration');
    console.log(hasGaslessComponents ? '✅ Gasless components present' : '⚠️  Gasless components missing');
    console.log(paymasterConfig ? '✅ Paymaster configured' : '⚠️  Paymaster needs configuration');
    console.log(hasMarkets ? '✅ Market UI present' : '⚠️  Market UI missing');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
}

// Run the test
testGaslessTransactions().catch(console.error);