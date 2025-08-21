# 🔧 MockUSDC Faucet Fix - Redeployment Guide

## 🐛 Bug Fixed

The original MockUSDC contract had a critical bug in the faucet logic:
- **Issue**: First-time users couldn't use the faucet due to integer underflow
- **Error**: `FaucetCooldownActive(86399)` on first use
- **Root Cause**: `block.timestamp - lastFaucetRequest[msg.sender]` when `lastFaucetRequest` was 0

## ✅ Fix Applied

Updated the faucet logic to handle first-time users properly:

```solidity
// Before (BUGGY):
uint256 timeSinceLastRequest = block.timestamp - lastFaucetRequest[msg.sender];
if (timeSinceLastRequest < FAUCET_COOLDOWN) {
    revert FaucetCooldownActive(FAUCET_COOLDOWN - timeSinceLastRequest);
}

// After (FIXED):
uint256 lastRequest = lastFaucetRequest[msg.sender];
// Allow first-time users (lastRequest == 0) to use faucet immediately
if (lastRequest != 0) {
    uint256 timeSinceLastRequest = block.timestamp - lastRequest;
    if (timeSinceLastRequest < FAUCET_COOLDOWN) {
        revert FaucetCooldownActive(FAUCET_COOLDOWN - timeSinceLastRequest);
    }
}
```

## 🧪 Tests Passing

All 23 tests pass including:
- ✅ `test_Faucet()` - First-time faucet usage works
- ✅ `test_FaucetCooldown()` - 24-hour cooldown enforced correctly
- ✅ `test_CanUseFaucet()` - Status checking works for first-time and repeat users
- ✅ `test_MultipleFaucetUsers()` - Multiple users can use faucet independently

## 🚀 Redeployment Instructions

### Option 1: Using Forge Script (Recommended)

1. **Set your private key**:
   ```bash
   export PRIVATE_KEY="your_private_key_here"
   ```

2. **Deploy to Base Sepolia**:
   ```bash
   forge script script/Deploy.s.sol:DeployScript \
     --rpc-url https://sepolia.base.org \
     --broadcast \
     --verify
   ```

### Option 2: Manual Deployment

1. **Deploy MockUSDC**:
   ```bash
   forge create src/MockUSDC.sol:MockUSDC \
     --rpc-url https://sepolia.base.org \
     --private-key $PRIVATE_KEY \
     --verify
   ```

2. **Update contract addresses** in:
   - `lib/blockchain.ts` - Update `USDC_CONTRACT_ADDRESS`
   - `contracts/DEPLOYED_CONTRACTS.md` - Update deployment info

### Option 3: Using Cast (Individual Commands)

```bash
# Deploy the contract
cast send --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --create $(forge inspect src/MockUSDC.sol:MockUSDC bytecode)

# Get the deployed address from the transaction receipt
# Then update the address in your config files
```

## 📋 Post-Deployment Checklist

After redeploying:

1. **Update addresses** in `lib/blockchain.ts`:
   ```typescript
   export const USDC_CONTRACT_ADDRESS = 'NEW_ADDRESS_HERE' as Address;
   ```

2. **Test the faucet** in your frontend:
   - Connect wallet
   - Click "Get Test USDC" 
   - Verify 1,000 USDC is received
   - Try again immediately - should show cooldown message

3. **Update documentation**:
   - Update `DEPLOYED_CONTRACTS.md` with new address
   - Update any hardcoded addresses in README files

## 🎯 Expected Behavior

After redeployment, the faucet should:
- ✅ Allow first-time users to claim 1,000 USDC immediately
- ✅ Enforce 24-hour cooldown for subsequent claims
- ✅ Show proper error messages with remaining cooldown time
- ✅ Work independently for different users

## 🔍 Verification

Test the deployed contract:

```bash
# Check if user can use faucet (should return true for new users)
cast call NEW_USDC_ADDRESS "canUseFaucet(address)" YOUR_ADDRESS \
  --rpc-url https://sepolia.base.org

# Use the faucet
cast send NEW_USDC_ADDRESS "faucet()" \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY

# Check balance (should show 1000 * 10^6 = 1000000000)
cast call NEW_USDC_ADDRESS "balanceOf(address)" YOUR_ADDRESS \
  --rpc-url https://sepolia.base.org
```

The faucet is now fully functional! 🎉
