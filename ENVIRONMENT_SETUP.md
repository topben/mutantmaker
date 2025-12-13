# Environment Configuration Guide

## Quick Setup

### 1. Create your `.env` file

```bash
cp .env.example .env
```

### 2. Configure Required Variables

Edit `.env` with your actual values:

```bash
# Gemini API Key (Required)
# Get from: https://aistudio.google.com/app/apikey
MUTANT_GEMINI_API_KEY=your_actual_gemini_api_key

# WalletConnect Project ID (Required for Web3)
# Get from: https://cloud.walletconnect.com
WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id

# ApeChain RPC URL (Default provided)
APE_CHAIN_RPC_URL=https://rpc.apechain.com

# Payment Configuration
APE_COIN_CONTRACT_ADDRESS=native
RECEIVING_WALLET_ADDRESS=0xYourActualWalletAddress
APE_PAYMENT_AMOUNT=0.1
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `MUTANT_GEMINI_API_KEY` | Google Gemini API key for image generation | `AIza...` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID for Web3Modal | `abc123...` | [WalletConnect Cloud](https://cloud.walletconnect.com) |
| `RECEIVING_WALLET_ADDRESS` | Your wallet address to receive payments | `0x1234...` | Your wallet (MetaMask, etc.) |

### Optional Variables (with defaults)

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `APE_CHAIN_RPC_URL` | ApeChain RPC endpoint | `https://rpc.apechain.com` | Can use custom RPC |
| `APE_COIN_CONTRACT_ADDRESS` | Payment token address | `native` | Use `"native"` for native APE, contract address for ERC-20 |
| `APE_PAYMENT_AMOUNT` | Payment amount per mutant | `0.1` | Customize pricing as needed |

## Payment Configuration Options

### Option 1: Native APE (Recommended)

**Best for:** Lower gas costs, simpler verification

```bash
APE_COIN_CONTRACT_ADDRESS=native
APE_PAYMENT_AMOUNT=0.1
```

**How it works:**
- Users send native APE directly to your wallet
- No token contract interaction needed
- Lower gas fees for users
- Verified via transaction `value` field

### Option 2: ERC-20 APE Token

**Best for:** Specific token requirements, wrapped tokens

```bash
APE_COIN_CONTRACT_ADDRESS=0x4d224452801aced8b2f0aebe155379bb5d594381
APE_PAYMENT_AMOUNT=0.1
```

**How it works:**
- Users send APE tokens via contract call
- Higher gas fees for users
- Verified via Transfer event logs
- Supports any ERC-20 token

## Environment Variable Loading

### Development (Deno)

The app automatically loads `.env` using:
```typescript
import { load } from "https://deno.land/std@0.216.0/dotenv/mod.ts";
const env = await load();
```

Environment variables are also read from system environment:
```typescript
const value = env["VARIABLE"] || Deno.env.get("VARIABLE");
```

### Production (Deno Deploy)

1. Go to your Deno Deploy project settings
2. Navigate to "Environment Variables"
3. Add all required variables from your `.env` file
4. Deploy your application

## Validation

### Check if variables are loaded correctly:

```bash
deno task dev
```

Look for startup messages showing your configuration:
```
✓ Environment variables loaded
✓ Gemini API configured
✓ Web3 configuration valid
✓ Payment verification ready
```

### Test environment variables:

```typescript
// Quick test script: test-env.ts
import { load } from "https://deno.land/std@0.216.0/dotenv/mod.ts";

const env = await load();

console.log("Environment Check:");
console.log("✓ MUTANT_GEMINI_API_KEY:", env["MUTANT_GEMINI_API_KEY"] ? "SET" : "MISSING");
console.log("✓ WALLET_CONNECT_PROJECT_ID:", env["WALLET_CONNECT_PROJECT_ID"] ? "SET" : "MISSING");
console.log("✓ APE_CHAIN_RPC_URL:", env["APE_CHAIN_RPC_URL"] || "using default");
console.log("✓ APE_COIN_CONTRACT_ADDRESS:", env["APE_COIN_CONTRACT_ADDRESS"] || "MISSING");
console.log("✓ RECEIVING_WALLET_ADDRESS:", env["RECEIVING_WALLET_ADDRESS"] || "MISSING");
console.log("✓ APE_PAYMENT_AMOUNT:", env["APE_PAYMENT_AMOUNT"] || "using default (0.1)");
```

Run with:
```bash
deno run --allow-read --allow-env test-env.ts
```

## Security Best Practices

### ✅ DO:
- Keep `.env` file in `.gitignore` (already configured)
- Use dedicated wallet for receiving payments
- Regularly transfer collected APE to cold storage
- Use strong API keys
- Rotate API keys periodically
- Use environment-specific configurations (dev/staging/prod)

### ❌ DON'T:
- Commit `.env` file to version control
- Share your API keys or private keys
- Use your personal wallet for receiving payments
- Hardcode sensitive values in source code
- Store private keys in environment variables

## Common Issues

### "Missing required Web3 environment variables"

**Cause:** One or more required variables are not set

**Solution:**
1. Check `.env` file exists in project root
2. Verify all required variables are set
3. Check for typos in variable names
4. Restart the development server

### "Invalid receiving address"

**Cause:** `RECEIVING_WALLET_ADDRESS` is not a valid Ethereum address

**Solution:**
1. Must start with `0x`
2. Must be 42 characters long (0x + 40 hex characters)
3. Get address from MetaMask or your wallet

### "Payment verification fails with correct payment"

**Cause:** Mismatch between `APE_PAYMENT_AMOUNT` and actual payment

**Solution:**
1. Check `.env` has `APE_PAYMENT_AMOUNT=0.1`
2. Verify user sent exactly 0.1 APE
3. Check `APE_COIN_CONTRACT_ADDRESS` matches payment type (native vs ERC-20)

### Variables not loading in production

**Cause:** Environment variables not set in deployment platform

**Solution:**
1. Go to Deno Deploy project settings
2. Add all variables from `.env`
3. Redeploy application

## Example Configurations

### Development Setup
```bash
# .env for local development
MUTANT_GEMINI_API_KEY=AIza...your_dev_key
WALLET_CONNECT_PROJECT_ID=abc123
APE_CHAIN_RPC_URL=https://rpc.apechain.com
APE_COIN_CONTRACT_ADDRESS=native
RECEIVING_WALLET_ADDRESS=0xYourDevWallet
APE_PAYMENT_AMOUNT=0.01  # Lower amount for testing
```

### Production Setup
```bash
# .env for production (set in Deno Deploy dashboard)
MUTANT_GEMINI_API_KEY=AIza...your_prod_key
WALLET_CONNECT_PROJECT_ID=xyz789
APE_CHAIN_RPC_URL=https://rpc.apechain.com
APE_COIN_CONTRACT_ADDRESS=native
RECEIVING_WALLET_ADDRESS=0xYourProductionWallet
APE_PAYMENT_AMOUNT=0.1  # Production pricing
```

## Environment Variable Precedence

The application checks for variables in this order:

1. `.env` file (loaded via dotenv)
2. System environment variables (`Deno.env.get()`)
3. Default values (hardcoded fallbacks)

Example:
```typescript
const APE_PAYMENT_AMOUNT =
  env["APE_PAYMENT_AMOUNT"] ||           // 1. From .env file
  Deno.env.get("APE_PAYMENT_AMOUNT") ||  // 2. From system env
  "0.1";                                  // 3. Default value
```

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in deployment platform
- [ ] `RECEIVING_WALLET_ADDRESS` is correct and owned by you
- [ ] API keys are production keys (not development)
- [ ] `APE_PAYMENT_AMOUNT` reflects your pricing
- [ ] Test payment flow in production
- [ ] Monitor first few transactions
- [ ] Set up wallet monitoring/alerts

## Support

For environment configuration issues:
1. Check this guide
2. Verify `.env` file format (no quotes around values)
3. Check console for error messages
4. Review APECOIN_SETUP.md for payment-specific configuration
5. See PAYMENT_VERIFICATION_TECHNICAL.md for advanced topics
