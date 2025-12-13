# Payment Verification Technical Guide

## Native APE vs ERC-20 Token Payments

### Overview

This document explains the technical differences between native APE and ERC-20 token payment verification on ApeChain, and provides production-safe implementation patterns.

## Understanding Native vs ERC-20 Tokens

### Native APE (Gas Token)

Native APE is the **blockchain protocol's native currency** - similar to how ETH works on Ethereum:

**Characteristics:**
- Built into the blockchain protocol, not a smart contract
- Used for paying gas fees
- Transfers happen via transaction `value` field
- **No smart contract code** - cannot call functions like `decimals()`, `transfer()`, etc.
- **No events emitted** - transfers don't emit `Transfer(from, to, value)` events
- **Always 18 decimals** by protocol definition
- Address markers: `0x0000000000000000000000000000000000000000`, `native`, empty string

**How to verify native payments:**
```typescript
// Get the transaction (not just receipt)
const tx = await provider.getTransaction(txHash);

// Check the value field (amount sent)
const paymentAmount = tx.value; // bigint in wei

// Check recipient
const recipient = tx.to; // address string

// Verify
const isValid =
  tx.to?.toLowerCase() === expectedRecipient.toLowerCase() &&
  tx.value === expectedAmount;
```

**Why `decimals()` fails:**
```typescript
// ❌ WRONG - This fails with "could not decode result data (value='0x')"
const contract = new Contract(nativeAddress, ["function decimals() view returns (uint8)"], provider);
const decimals = await contract.decimals(); // Error!

// ✅ CORRECT - Native tokens always use 18 decimals
const decimals = 18;
const amount = parseUnits("10.0", 18);
```

### ERC-20 APE Token

ERC-20 tokens are **smart contracts** deployed at specific addresses:

**Characteristics:**
- Deployed smart contract with specific address
- Implements ERC-20 standard functions: `transfer()`, `balanceOf()`, `decimals()`, etc.
- Transfers emit `Transfer(address indexed from, address indexed to, uint256 value)` events
- Can have any number of decimals (commonly 6, 8, or 18)
- Transfers happen via contract function calls, not `tx.value`

**How to verify ERC-20 payments:**
```typescript
// Get transaction receipt (contains logs)
const receipt = await provider.waitForTransaction(txHash, confirmations);

// Parse Transfer events from logs
const contract = new Contract(tokenAddress, ERC20_ABI, provider);

for (const log of receipt.logs) {
  // Only check logs from the expected token contract
  if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) {
    continue;
  }

  const parsedLog = contract.interface.parseLog({
    topics: [...log.topics],
    data: log.data
  });

  if (parsedLog && parsedLog.name === "Transfer") {
    const [from, to, value] = parsedLog.args;
    // Verify to and value match expectations
  }
}
```

**Why looking for Transfer events fails for native:**
```typescript
// ❌ WRONG - Native transfers don't emit events
const receipt = await provider.waitForTransaction(txHash);
// receipt.logs will be empty for native transfers (or contain other unrelated logs)

// ✅ CORRECT - Check tx.value for native
const tx = await provider.getTransaction(txHash);
const amount = tx.value;
```

## Production-Safe Implementation

### 1. Automatic Detection

```typescript
const NATIVE_TOKEN_ADDRESSES = [
  "0x0000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000001",
  "native",
  "NATIVE",
  ""
];

function isNativeToken(address: string | undefined): boolean {
  if (!address) return true;
  const normalized = address.toLowerCase().trim();
  return NATIVE_TOKEN_ADDRESSES.some(addr => addr.toLowerCase() === normalized);
}
```

### 2. Safe Decimals Fetching

```typescript
async function getTokenDecimals(contractAddress: string): Promise<number> {
  try {
    // Check if it's a valid address
    if (!isAddress(contractAddress) ||
        contractAddress === "0x0000000000000000000000000000000000000000") {
      return 18; // Native token default
    }

    const contract = new Contract(
      contractAddress,
      ["function decimals() view returns (uint8)"],
      provider
    );

    const decimals = await contract.decimals();
    return Number(decimals);
  } catch (error) {
    // If call fails, assume native (18 decimals)
    console.warn(`Could not get decimals, using default 18:`, error);
    return 18;
  }
}
```

### 3. Unified Payment Verification

```typescript
export async function waitForApePayment(
  txHash: string,
  expectedAmount: string,
  tokenAddress?: string
): Promise<boolean> {
  // Determine payment type
  const isNative = isNativeToken(tokenAddress);

  // Get decimals
  const decimals = isNative
    ? 18
    : await getTokenDecimals(tokenAddress!);

  const expectedWei = parseUnits(expectedAmount, decimals);

  // Wait for confirmations
  const receipt = await provider.waitForTransaction(
    txHash,
    3, // Production: wait for 3 confirmations
    60000
  );

  if (!receipt || receipt.status !== 1) {
    return false;
  }

  // Route to appropriate verification
  if (isNative) {
    return verifyNativePayment(txHash, receipt, expectedWei, receivingAddress);
  } else {
    return verifyERC20Payment(receipt, tokenAddress!, expectedWei, receivingAddress);
  }
}
```

## Security Best Practices

### 1. Confirmations

**Why:** Protect against chain reorganizations and double-spend attacks

```typescript
// ❌ WRONG - 1 confirmation is not secure
const receipt = await provider.waitForTransaction(txHash, 1);

// ✅ CORRECT - Wait for multiple confirmations
const REQUIRED_CONFIRMATIONS = 3; // Adjust based on chain security
const receipt = await provider.waitForTransaction(txHash, REQUIRED_CONFIRMATIONS);
```

**Recommended confirmations:**
- Low-value transactions: 3 confirmations
- Medium-value: 6 confirmations
- High-value: 12+ confirmations

### 2. Replay Protection

**Why:** Prevent users from reusing the same transaction hash multiple times

```typescript
// In-memory (development only)
const processedTransactions = new Set<string>();

export async function waitForApePayment(txHash: string, ...): Promise<boolean> {
  // Check if already processed
  if (processedTransactions.has(txHash)) {
    console.warn(`Transaction ${txHash} already processed (replay attempt)`);
    return false;
  }

  // ... verify payment ...

  // Mark as processed
  if (verified) {
    processedTransactions.add(txHash);
  }

  return verified;
}
```

**Production:** Use a database:
```typescript
// Check database
const exists = await db.query(
  "SELECT id FROM processed_payments WHERE tx_hash = $1",
  [txHash]
);

if (exists.rows.length > 0) {
  return false; // Already processed
}

// After verification, store in database
await db.query(
  "INSERT INTO processed_payments (tx_hash, amount, verified_at) VALUES ($1, $2, NOW())",
  [txHash, amount]
);
```

### 3. Amount Validation

```typescript
// ❌ WRONG - Accepting any amount
const isValid = to.toLowerCase() === expectedRecipient;

// ✅ CORRECT - Exact amount matching
const isCorrectAmount = value === expectedAmount; // Both bigint
const isToReceiver = to.toLowerCase() === expectedRecipient.toLowerCase();
const isValid = isCorrectAmount && isToReceiver;

// ⚠️ ALTERNATIVE - Minimum amount (for flexible pricing)
const meetsMinimum = value >= minimumAmount;
const isValid = meetsMinimum && isToReceiver;
```

### 4. Address Validation

```typescript
import { isAddress } from "ethers";

// ✅ Validate addresses before using
if (!isAddress(receivingAddress)) {
  throw new Error("Invalid receiving address");
}

// ✅ Normalize addresses for comparison
const normalizedReceiver = receivingAddress.toLowerCase();
const normalizedSender = tx.to?.toLowerCase();
const isMatch = normalizedSender === normalizedReceiver;
```

### 5. Error Handling

```typescript
export async function waitForApePayment(...): Promise<boolean> {
  try {
    // Input validation
    if (!txHash || txHash.length !== 66 || !txHash.startsWith('0x')) {
      console.error("Invalid transaction hash format");
      return false; // Don't throw - just return false
    }

    // Timeout handling
    const receipt = await Promise.race([
      provider.waitForTransaction(txHash, confirmations),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 60000)
      )
    ]);

    // ... verification logic ...

  } catch (error) {
    // Log but don't expose internal details to user
    console.error(`Payment verification error:`, error);
    return false;
  }
}
```

## Common Pitfalls

### ❌ Pitfall 1: Calling contract methods on native tokens

```typescript
// WRONG
const contract = new Contract(nativeAddress, ERC20_ABI, provider);
const decimals = await contract.decimals(); // Fails with "0x"
```

**Why it fails:** Native tokens aren't contracts, so calls return empty data (`0x`), which can't be decoded.

**Solution:** Check if token is native first:
```typescript
if (isNativeToken(address)) {
  decimals = 18;
} else {
  decimals = await contract.decimals();
}
```

### ❌ Pitfall 2: Looking for Transfer events in native payments

```typescript
// WRONG
const receipt = await provider.waitForTransaction(nativePaymentTxHash);
// receipt.logs is empty for native transfers!
```

**Why it fails:** Native transfers don't call smart contracts, so no events are emitted.

**Solution:** Check transaction value instead:
```typescript
const tx = await provider.getTransaction(txHash);
const amount = tx.value;
```

### ❌ Pitfall 3: Not waiting for confirmations

```typescript
// WRONG - Vulnerable to reorgs
const receipt = await provider.getTransactionReceipt(txHash);
if (receipt) {
  // Might be in a block that gets orphaned!
}
```

**Solution:** Always wait for confirmations:
```typescript
const receipt = await provider.waitForTransaction(txHash, 3);
```

### ❌ Pitfall 4: No replay protection

```typescript
// WRONG - User can submit same txHash multiple times
export async function verifyPayment(txHash: string): Promise<boolean> {
  const receipt = await provider.waitForTransaction(txHash);
  return receipt.status === 1;
}
```

**Solution:** Track processed transactions:
```typescript
if (processedTransactions.has(txHash)) {
  return false;
}
// ... verify ...
processedTransactions.add(txHash);
```

## Testing

### Unit Tests

```typescript
import { describe, it } from "https://deno.land/std/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

describe("isNativeToken", () => {
  it("detects zero address as native", () => {
    assertEquals(isNativeToken("0x0000000000000000000000000000000000000000"), true);
  });

  it("detects 'native' string as native", () => {
    assertEquals(isNativeToken("native"), true);
  });

  it("detects valid contract address as non-native", () => {
    assertEquals(isNativeToken("0x4d224452801aced8b2f0aebe155379bb5d594381"), false);
  });
});
```

### Integration Testing

```typescript
// Test with real transactions on testnet
const nativePaymentTx = "0x..."; // Real native transfer
const erc20PaymentTx = "0x...";  // Real ERC-20 transfer

// Should verify native correctly
const nativeResult = await waitForApePayment(nativePaymentTx, "10.0", "native");
assertEquals(nativeResult, true);

// Should verify ERC-20 correctly
const erc20Result = await waitForApePayment(
  erc20PaymentTx,
  "10.0",
  "0x4d224452801aced8b2f0aebe155379bb5d594381"
);
assertEquals(erc20Result, true);
```

## Configuration Examples

### Native APE Payment (Recommended)

```bash
# .env
APE_COIN_CONTRACT_ADDRESS=native
APE_PAYMENT_AMOUNT=10.0
RECEIVING_WALLET_ADDRESS=0xYourAddress
```

**Benefits:**
- Simpler verification (no event parsing)
- Lower gas costs for users
- No contract dependency risks
- Always 18 decimals (no contract calls needed)

### ERC-20 Token Payment

```bash
# .env
APE_COIN_CONTRACT_ADDRESS=0x4d224452801aced8b2f0aebe155379bb5d594381
APE_PAYMENT_AMOUNT=10.0
RECEIVING_WALLET_ADDRESS=0xYourAddress
```

**Use cases:**
- Accepting wrapped tokens
- Multi-token support
- When native token isn't available

## Migration Guide

### From ERC-20-only to Universal

```typescript
// Before (ERC-20 only)
export async function waitForApePayment(txHash: string): Promise<boolean> {
  const contract = new Contract(APE_COIN_CONTRACT_ADDRESS, ERC20_ABI, provider);
  const decimals = await contract.decimals();
  // ... parse logs ...
}

// After (supports both)
export async function waitForApePayment(
  txHash: string,
  expectedAmount: string,
  tokenAddress?: string
): Promise<boolean> {
  const isNative = isNativeToken(tokenAddress || APE_COIN_CONTRACT_ADDRESS);

  if (isNative) {
    return verifyNativePayment(txHash, ...);
  } else {
    return verifyERC20Payment(txHash, ...);
  }
}
```

## References

- [Ethers.js v6 Documentation](https://docs.ethers.org/v6/)
- [ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20)
- [ApeChain Explorer](https://apechain.calderaexplorer.xyz)
- [Transaction Confirmation Best Practices](https://ethereum.org/en/developers/docs/transactions/#transaction-lifecycle)
