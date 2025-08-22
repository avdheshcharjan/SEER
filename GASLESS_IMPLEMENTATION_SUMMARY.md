# Gasless Implementation Summary

## Overview
This document summarizes the gasless transaction implementation using Coinbase Paymaster for the BASED prediction market application.

## Architecture
- **Paymaster**: Coinbase Paymaster for gas sponsorship
- **Bundler**: Coinbase Bundler for UserOperation submission
- **Smart Accounts**: Base smart accounts for transaction execution
- **EntryPoint**: EIP-4337 EntryPoint contract

## Configuration
```bash
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_KEY
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_KEY
```

## Key Functions
- `executeGaslessTransaction()` - Execute gasless transactions
- `checkSponsorshipEligibility()` - Check if transaction is eligible for sponsorship
- `validateSmartAccount()` - Validate smart account before transactions
- `validateGaslessConfig()` - Validate environment configuration

## Error Handling & Troubleshooting

### AA23 Error: "reverted (or OOG)"
The AA23 error indicates that the signature of the UserOperation was rejected or ran out of gas. This is one of the most common errors in gasless transactions.

#### Root Causes
1. **Insufficient Gas Allocation**: Gas limits are too low for the operation
2. **Invalid Signature**: UserOperation hash, entrypoint address, or chain ID is incorrect
3. **Smart Account Issues**: Account not deployed or lacks sufficient ETH
4. **Paymaster Configuration**: Incorrect API keys or gas policy settings

#### Prevention Measures Implemented

##### 1. Enhanced Gas Limits
```typescript
// Increased gas limits with 30% buffer
userOperation.callGasLimit = '0x4C4B40'; // 5,000,000 gas
userOperation.verificationGasLimit = '0x4C4B40'; // 5,000,000 gas  
userOperation.preVerificationGas = '0x7A120'; // 500,000 gas
userOperation.maxFeePerGas = '0x59682F00'; // 15 gwei
```

##### 2. Smart Account Validation
```typescript
export async function validateSmartAccount(userAddress: Address) {
  // Check if account has code (is a smart contract)
  const code = await publicClient.getBytecode({ address: userAddress });
  
  // Verify minimum balance for gas
  const balance = await publicClient.getBalance({ address: userAddress });
  
  // Check account nonce functionality
  const nonce = await publicClient.getTransactionCount({ address: userAddress });
}
```

##### 3. Improved Error Handling
```typescript
// Map Coinbase Paymaster error codes to user-friendly messages
switch (errorCode) {
  case -32004: // GAS_ESTIMATION_ERROR
    throw new Error(`Gas estimation failed: ${errorMessage}. This usually means insufficient gas or invalid paymaster signature.`);
  case -32001: // UNAUTHORIZED_ERROR or DENIED_ERROR
    throw new Error(`Paymaster authorization failed: ${errorMessage}. Check your API key and gas policy configuration.`);
  case -32602: // INVALID_ARGUMENT
    throw new Error(`Invalid UserOperation parameters: ${errorMessage}. Check transaction data and gas limits.`);
}
```

#### Troubleshooting Steps

##### Step 1: Verify Smart Account
- Ensure the user has a valid Base smart account deployed
- Check that the account has sufficient ETH balance (minimum 0.001 ETH)
- Verify the account can execute basic operations

##### Step 2: Check Gas Policy
- Verify your Coinbase Paymaster gas policy settings
- Ensure per-operation and monthly limits are sufficient
- Check if the transaction cost exceeds your configured limits

##### Step 3: Validate Configuration
- Confirm API keys are correct and active
- Verify RPC URLs are pointing to the correct network (Base Sepolia)
- Check that the EntryPoint address matches your network

##### Step 4: Monitor Gas Usage
- Review transaction logs for actual gas consumption
- Adjust gas limits if operations consistently fail
- Consider increasing the 30% buffer to 50% for complex operations

#### Common Solutions

1. **Increase Gas Limits**: If operations consistently fail, increase the gas buffer from 30% to 50%
2. **Check Account Balance**: Ensure smart accounts have at least 0.001 ETH for gas
3. **Verify Network**: Confirm you're using the correct Base Sepolia configuration
4. **Review Paymaster Policy**: Check your Coinbase Developer Portal gas policy settings

#### Error Code Reference
Based on [Coinbase Paymaster Documentation](https://docs.cdp.coinbase.com/paymaster/reference-troubleshooting/errors):

| Error Code | Description | Solution |
|------------|-------------|----------|
| -32004 | GAS_ESTIMATION_ERROR | Increase gas limits, check paymaster signature |
| -32001 | UNAUTHORIZED_ERROR | Verify API key and RPC URL |
| -32001 | DENIED_ERROR | Check gas policy configuration |
| -32602 | INVALID_ARGUMENT | Validate UserOperation parameters |

## Testing
Run the gasless transaction tests:
```bash
npm run test:gasless
npm run test:gasless-playwright
```

## Support
For persistent AA23 errors:
1. Check the troubleshooting steps above
2. Review Coinbase Developer Portal logs
3. Contact Coinbase Developer Support in Discord #paymaster channel
4. Verify your gas policy configuration in the CDP portal