# MockUSDC Faucet Troubleshooting Guide

## Issue: "Insufficient USDC balance! You need $1 but have $0.00"

### Quick Fixes:

#### 1. **Clear Browser Cache**
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache for the site
- Try incognito/private browsing mode

#### 2. **Check Wallet Network**
- Ensure you're connected to **Base Sepolia** testnet
- Network details:
  - Network Name: Base Sepolia
  - RPC URL: https://sepolia.base.org
  - Chain ID: 84532
  - Currency Symbol: ETH
  - Block Explorer: https://sepolia.basescan.org

#### 3. **Verify Contract Address**
The new MockUSDC contract address is:
```
0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2
```

#### 4. **Add Token to Wallet**
Add the MockUSDC token to your wallet:
- Token Address: `0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2`
- Token Symbol: `USDC`
- Decimals: `6`

#### 5. **Use the Faucet**
- Click "Get Test USDC" button in the app
- Wait for transaction confirmation
- Should receive 1,000 USDC

#### 6. **Manual Faucet (if button doesn't work)**
```bash
# Replace YOUR_WALLET_ADDRESS with your actual address
cast send 0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2 "faucet()" \
  --rpc-url https://sepolia.base.org \
  --private-key YOUR_PRIVATE_KEY

# Check balance after
cast call 0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2 \
  "balanceOf(address)" YOUR_WALLET_ADDRESS \
  --rpc-url https://sepolia.base.org
```

#### 7. **Check Balance Manually**
```bash
# Replace with your wallet address
cast call 0xA892E08a5135C781f4eb08dBD946cd7b9E0772f2 \
  "balanceOf(address)" 0xYOUR_WALLET_ADDRESS \
  --rpc-url https://sepolia.base.org

# Convert result from hex to decimal, then divide by 1,000,000 to get USDC amount
```

### Common Issues:

1. **Wrong Network**: Make sure you're on Base Sepolia, not Ethereum mainnet
2. **Old Contract**: Frontend might be cached with old contract address
3. **Wallet Not Connected**: Ensure wallet is properly connected
4. **RPC Issues**: Try refreshing or switching RPC endpoints

### Still Having Issues?

If you're still seeing $0.00 balance:
1. Provide your wallet address
2. Check if you can see the transaction on Basescan
3. Try connecting a different wallet
4. Clear all browser data and try again

The faucet is working correctly - we tested it and it successfully gives 1,000 USDC per claim with a 24-hour cooldown.
