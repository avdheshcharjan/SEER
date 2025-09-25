#!/usr/bin/env node

/**
 * Switch SEER frontend from AMM to Parimutuel betting system
 * This script updates the necessary files to use parimutuel contracts
 */

const fs = require('fs');
const path = require('path');

console.log('🎰 Switching to Parimutuel Betting System...');
console.log('=============================================');

// Configuration
const FACTORY_ADDRESS_PLACEHOLDER = '0x0000000000000000000000000000000000000000';
const DEMO_ADDRESS_PLACEHOLDER = '0x0000000000000000000000000000000000000000';

// Get contract addresses from command line or use placeholders
const factoryAddress = process.argv[2] || FACTORY_ADDRESS_PLACEHOLDER;
const demoAddress = process.argv[3] || DEMO_ADDRESS_PLACEHOLDER;

console.log(`Factory Address: ${factoryAddress}`);
console.log(`Demo Address: ${demoAddress}`);
console.log('');

// Update parimutuel-blockchain.ts with deployed addresses
const blockchainConfigPath = path.join(__dirname, '../lib/parimutuel-blockchain.ts');

if (fs.existsSync(blockchainConfigPath)) {
    console.log('📝 Updating parimutuel-blockchain.ts with deployed addresses...');

    let content = fs.readFileSync(blockchainConfigPath, 'utf8');

    // Replace placeholder addresses
    content = content.replace(
        /export const PARIMUTUEL_FACTORY_ADDRESS = '[^']*'/,
        `export const PARIMUTUEL_FACTORY_ADDRESS = '${factoryAddress}'`
    );

    content = content.replace(
        /export const PARIMUTUEL_DEMO_ADDRESS = '[^']*'/,
        `export const PARIMUTUEL_DEMO_ADDRESS = '${demoAddress}'`
    );

    fs.writeFileSync(blockchainConfigPath, content);
    console.log('✅ Updated contract addresses');
} else {
    console.log('❌ parimutuel-blockchain.ts not found');
}

// Create or update main page to use parimutuel component
const pagePath = path.join(__dirname, '../app/page.tsx');

if (fs.existsSync(pagePath)) {
    console.log('📝 Checking page.tsx...');

    const content = fs.readFileSync(pagePath, 'utf8');

    // Check if it needs to be updated
    if (content.includes('ParimutuelPredictionMarket')) {
        console.log('✅ Page already uses ParimutuelPredictionMarket');
    } else {
        console.log('⚠️  Page still uses old PredictionMarket component');
        console.log('   Manually update page.tsx to import and use ParimutuelPredictionMarket');
    }
} else {
    console.log('⚠️  page.tsx not found');
}

// Create environment variable template
const envTemplate = `# Parimutuel Betting System Configuration
# Update these values after deploying contracts

# Base Sepolia (Testnet)
NEXT_PUBLIC_PARIMUTUEL_FACTORY_ADDRESS=${factoryAddress}
NEXT_PUBLIC_PARIMUTUEL_DEMO_ADDRESS=${demoAddress}
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# Paymaster Configuration (Coinbase)
NEXT_PUBLIC_PAYMASTER_ENABLED=true

# UI Configuration
NEXT_PUBLIC_DEFAULT_BET_AMOUNT=1
NEXT_PUBLIC_MAX_BATCH_SIZE=20
NEXT_PUBLIC_BATCH_TIMEOUT=8000

# Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=true
`;

const envPath = path.join(__dirname, '../.env.parimutuel');
fs.writeFileSync(envPath, envTemplate);
console.log('📝 Created .env.parimutuel template');

// Create migration checklist
const checklistPath = path.join(__dirname, '../PARIMUTUEL_MIGRATION.md');
const checklist = `# Parimutuel Migration Checklist

## 🎰 SEER Parimutuel Betting System Migration

### ✅ Completed Steps
- [x] Created parimutuel smart contracts
- [x] Built parimutuel frontend components
- [x] Generated configuration files

### 🔄 Deployment Steps

1. **Deploy Contracts**
   \`\`\`bash
   cd contracts
   forge create --rpc-url https://sepolia.base.org \\
     --constructor-args 0x036CbD53842c5426634e7929541eC2318f3dCF7e YOUR_RESOLVER_ADDRESS \\
     --private-key YOUR_PRIVATE_KEY \\
     src/ParimutuelMarketFactory.sol:ParimutuelMarketFactory
   \`\`\`

2. **Update Configuration**
   \`\`\`bash
   node scripts/switch-to-parimutuel.js FACTORY_ADDRESS DEMO_ADDRESS
   \`\`\`

3. **Update Paymaster Allowlist**
   - Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
   - Add new factory address: \`${factoryAddress}\`
   - Remove old AMM factory if desired

4. **Update Frontend**
   - Replace \`PredictionMarket\` with \`ParimutuelPredictionMarket\` in page.tsx
   - Test bet amounts: $1, $5, $10
   - Verify gasless transactions work

5. **Testing Checklist**
   - [ ] Connect wallet
   - [ ] Place single bet (YES/NO)
   - [ ] Place batch bets
   - [ ] Test different bet amounts ($1, $5, $10)
   - [ ] Verify payout calculations
   - [ ] Test market resolution
   - [ ] Test reward claiming

### 🎯 Key Differences from AMM

**AMM System (Old)**:
- Dynamic pricing based on pool ratios
- Users buy/sell shares
- Complex pricing can confuse users
- Possible to lose money on correct predictions

**Parimutuel System (New)**:
- Fixed bet amounts: $1, $5, $10
- Winners split losers' pool proportionally
- Simple win/lose outcomes
- Correct predictions always profit (or break even)

### 📊 Benefits

1. **User Experience**
   - Simpler betting interface
   - Clear win/lose outcomes
   - No confusing price calculations

2. **Gas Efficiency**
   - Lower gas costs per bet
   - Simpler contract logic
   - Faster transaction processing

3. **Fairness**
   - Traditional betting model
   - Proportional payouts
   - No AMM manipulation

### 🚨 Important Notes

- Update paymaster allowlist before testing
- Test with small amounts first
- Monitor gas costs and optimize
- Users need to understand payout timing (after resolution)

### 📞 Support

If you encounter issues:
1. Check contract deployment logs
2. Verify paymaster configuration
3. Test network connectivity
4. Review transaction gas limits

Current Status: ${factoryAddress === FACTORY_ADDRESS_PLACEHOLDER ? '🔴 NEEDS DEPLOYMENT' : '🟡 DEPLOYED - NEEDS TESTING'}
`;

fs.writeFileSync(checklistPath, checklist);
console.log('📋 Created migration checklist: PARIMUTUEL_MIGRATION.md');

// Summary
console.log('');
console.log('🎉 Parimutuel Setup Complete!');
console.log('=====================================');
console.log('');

if (factoryAddress === FACTORY_ADDRESS_PLACEHOLDER) {
    console.log('🔴 Next Steps:');
    console.log('1. Deploy the contracts using the commands in deploy-parimutuel-manual.md');
    console.log('2. Run this script again with the deployed addresses:');
    console.log(`   node scripts/switch-to-parimutuel.js FACTORY_ADDRESS DEMO_ADDRESS`);
    console.log('3. Update your paymaster allowlist');
    console.log('4. Test the parimutuel betting system');
} else {
    console.log('🟡 Contracts Deployed!');
    console.log('1. Update your paymaster allowlist with:');
    console.log(`   - Factory: ${factoryAddress}`);
    console.log('2. Update page.tsx to use ParimutuelPredictionMarket');
    console.log('3. Test the betting system');
    console.log('4. Follow PARIMUTUEL_MIGRATION.md for full checklist');
}

console.log('');
console.log('📚 Documentation:');
console.log('- Parimutuel contracts: /contracts/src/Parimutuel*.sol');
console.log('- Frontend component: /app/components/ParimutuelPredictionMarket.tsx');
console.log('- Configuration: /lib/parimutuel-*.ts');
console.log('- Migration guide: PARIMUTUEL_MIGRATION.md');
console.log('');

console.log('🎰 Welcome to the new Parimutuel Betting System! 🚀');