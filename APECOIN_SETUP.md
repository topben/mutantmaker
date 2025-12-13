# ApeCoin Payment Integration Guide

This guide explains how to set up and use the ApeCoin payment system for the Mutant Maker image generation service.

## Overview

The Mutant Maker application now requires ApeCoin (APE) payments on the ApeChain network before generating images. The payment flow is:

1. **User connects wallet** (MetaMask or compatible Web3 wallet)
2. **User sends APE payment** to the configured receiving address
3. **Backend verifies payment** on-chain using ApeChain RPC
4. **Image generation proceeds** only after payment confirmation

## Prerequisites

- Deno 1.x or later
- MetaMask or compatible Web3 wallet
- APE tokens on ApeChain network
- WalletConnect Project ID (get from https://cloud.walletconnect.com)

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

### Required Variables

```bash
# Gemini API Key (existing)
MUTANT_GEMINI_API_KEY=your_gemini_api_key

# WalletConnect Project ID
# Get from: https://cloud.walletconnect.com
WALLET_CONNECT_PROJECT_ID=YOUR_WC_PROJECT_ID

# ApeChain RPC URL
APE_CHAIN_RPC_URL=https://rpc.apechain.com

# ApeCoin ERC-20 Contract Address on ApeChain
APE_COIN_CONTRACT_ADDRESS=0x4d224452801aced8b2f0aebe155379bb5d594381

# Your wallet address to receive payments
RECEIVING_WALLET_ADDRESS=0xYOUR_RECEIVING_ADDRESS

# Payment amount in APE tokens
APE_PAYMENT_AMOUNT=10.0
```

### Configuration Details

- **WALLET_CONNECT_PROJECT_ID**: Required for Web3Modal integration. Sign up at WalletConnect Cloud.
- **APE_CHAIN_RPC_URL**: The RPC endpoint for ApeChain. Default is `https://rpc.apechain.com`
- **APE_COIN_CONTRACT_ADDRESS**: The official APE token contract on ApeChain
- **RECEIVING_WALLET_ADDRESS**: Your EOA (Externally Owned Account) address where payments will be sent
- **APE_PAYMENT_AMOUNT**: Fixed amount in APE tokens (e.g., "10.0" for 10 APE)

## Architecture

### Backend Components

#### 1. `services/ApeChainListener.ts`
Handles on-chain payment verification:
- Connects to ApeChain RPC
- Waits for transaction confirmation
- Validates transfer amount and recipient
- Parses ERC-20 Transfer events from transaction logs

#### 2. `routes/api/generate.ts`
Modified API endpoint:
- Requires `txHash` in request body
- Validates payment before image generation
- Returns 402 (Payment Required) if validation fails

### Frontend Components

#### 1. `islands/MutantMaker.tsx`
Enhanced with Web3 integration:
- MetaMask wallet connection
- ApeChain network switching/adding
- APE token transfer
- Transaction hash submission to backend
- Payment status UI indicators

#### 2. `utils/types.ts`
TypeScript definitions for Web3:
- Window.ethereum types
- Web3 global variables

## Payment Flow

### User Journey

1. **Upload Images**: User uploads subject and style images
2. **Configure Options**: User selects fusion mode and options
3. **Click "CONNECT & PAY TO MUTATE"**:
   - If wallet not connected: Prompts wallet connection
   - Requests ApeChain network switch (adds if not present)
4. **Payment Transaction**:
   - Constructs ERC-20 transfer transaction
   - User approves in MetaMask
   - Transaction hash displayed to user
5. **Confirmation**:
   - Frontend waits for 1 confirmation
   - Sends txHash to backend
6. **Backend Verification**:
   - Fetches transaction receipt from ApeChain
   - Validates recipient and amount
   - Generates image only if payment valid
7. **Image Delivery**: User receives generated image

### Error Handling

The system handles various error scenarios:
- **No wallet detected**: Prompts user to install MetaMask
- **Wrong network**: Automatically switches to ApeChain
- **Insufficient APE**: Transaction fails, user sees error
- **Payment verification failed**: Backend returns 402 error
- **Network issues**: Retries with timeout

## Testing

### Local Testing Setup

1. **Install Dependencies**:
   ```bash
   deno cache --reload deno.json
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Run Development Server**:
   ```bash
   deno task dev
   ```

4. **Test Wallet Connection**:
   - Open http://localhost:8000
   - Click "CONNECT & PAY TO MUTATE"
   - Approve MetaMask connection
   - Verify network switches to ApeChain

### Testing Payment Flow

**Note**: Testing on mainnet requires real APE tokens. Consider these options:

1. **Mainnet Testing** (requires real APE):
   - Ensure you have APE tokens on ApeChain
   - Set payment amount to minimum (e.g., "0.1")
   - Test full payment flow

2. **Backend Testing** (without frontend):
   ```bash
   # Test payment verification with a real txHash
   curl -X POST http://localhost:8000/api/generate \
     -H "Content-Type: application/json" \
     -d '{
       "txHash": "0x...",
       "subjectBase64": "...",
       "styleBase64": "...",
       "fusionMode": "balanced"
     }'
   ```

## Security Considerations

1. **Environment Variables**:
   - Never commit `.env` to version control
   - Use `.env.example` as template only
   - Receiving wallet private key should NEVER be in code

2. **Payment Verification**:
   - All verification happens server-side
   - Frontend cannot bypass payment check
   - Transaction logs verified on-chain

3. **RPC Security**:
   - Use trusted ApeChain RPC endpoints
   - Consider rate limiting on backend
   - Monitor RPC availability

4. **Wallet Security**:
   - Receiving wallet should be dedicated for this service
   - Regularly transfer funds to cold storage
   - Monitor for unusual transactions

## Deployment

### Production Checklist

- [ ] Set all environment variables in production
- [ ] Verify RECEIVING_WALLET_ADDRESS is correct
- [ ] Test payment flow on production
- [ ] Monitor RPC endpoint performance
- [ ] Set up logging for payment verification
- [ ] Configure alerts for failed payments
- [ ] Document withdrawal process for collected APE

### Environment Variables in Production

For Deno Deploy or similar platforms:
1. Add all environment variables through dashboard
2. Verify variables are loaded correctly
3. Test payment verification in production

## Troubleshooting

### Common Issues

**"Missing required Web3 environment variables"**
- Ensure all variables in `.env` are set
- Check for typos in variable names
- Verify `.env` file is in project root

**"Payment verification failed"**
- Check transaction hash is valid (66 characters, starts with 0x)
- Verify payment amount matches APE_PAYMENT_AMOUNT
- Confirm payment sent to RECEIVING_WALLET_ADDRESS
- Check ApeChain RPC is accessible

**"Please install MetaMask"**
- Install MetaMask browser extension
- Or use a compatible Web3 wallet (Coinbase Wallet, Trust Wallet)

**Network switching fails**
- Manually add ApeChain to MetaMask:
  - Network Name: ApeChain
  - RPC URL: https://rpc.apechain.com
  - Chain ID: 33139
  - Currency Symbol: APE
  - Block Explorer: https://apechain.calderaexplorer.xyz

## Development Notes

### Dependencies

- **ethers.js**: Web3 library for blockchain interaction
- **@web3modal/ethers**: Web3Modal for wallet connection (optional, currently using direct MetaMask)

### Key Files Modified

1. `deno.json` - Added ethers.js dependency
2. `.env.example` - Added Web3 configuration
3. `services/ApeChainListener.ts` - NEW: Payment verification
4. `routes/api/generate.ts` - Added payment validation
5. `islands/MutantMaker.tsx` - Added Web3 integration
6. `utils/types.ts` - Added Web3 type definitions

## Future Enhancements

Potential improvements:
- Support for multiple payment tokens
- Dynamic pricing based on image complexity
- Payment history/receipt system
- Subscription model for unlimited generations
- Refund system for failed generations
- Alternative wallet connectors (WalletConnect modal)

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console
3. Check backend logs for payment verification issues
4. Verify environment variables are correctly set
