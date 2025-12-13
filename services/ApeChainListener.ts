import { Contract, JsonRpcProvider, parseUnits, isAddress, Network, TransactionReceipt } from "ethers";
import { load } from "https://deno.land/std@0.216.0/dotenv/mod.ts";

const env = await load();

// Load environment variables
const APE_CHAIN_RPC_URL = env["APE_CHAIN_RPC_URL"] || Deno.env.get("APE_CHAIN_RPC_URL")!;
const APE_COIN_CONTRACT_ADDRESS = env["APE_COIN_CONTRACT_ADDRESS"] || Deno.env.get("APE_COIN_CONTRACT_ADDRESS")!;
const RECEIVING_WALLET_ADDRESS = env["RECEIVING_WALLET_ADDRESS"] || Deno.env.get("RECEIVING_WALLET_ADDRESS")!;
const APE_PAYMENT_AMOUNT = env["APE_PAYMENT_AMOUNT"] || Deno.env.get("APE_PAYMENT_AMOUNT")!;

if (!APE_CHAIN_RPC_URL || !RECEIVING_WALLET_ADDRESS || !APE_PAYMENT_AMOUNT) {
    throw new Error("Missing required Web3 environment variables.");
}

// Minimal ERC-20 ABI to decode the Transfer event
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function decimals() view returns (uint8)",
];

// ApeChain Network - Disable ENS to avoid "network does not support ENS" errors
const APECHAIN_NETWORK = new Network("apechain", 33139, { ensAddress: null });

const provider = new JsonRpcProvider(APE_CHAIN_RPC_URL, APECHAIN_NETWORK);

// Constants for native token detection
const NATIVE_TOKEN_ADDRESSES = [
  "0x0000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000001",
  "native",
  "NATIVE",
  ""
];

const NATIVE_TOKEN_DECIMALS = 18;
const REQUIRED_CONFIRMATIONS = 3;

// In-memory replay protection (production: use database)
const processedTransactions = new Set<string>();

/**
 * Determines if the payment asset is native APE or an ERC-20 token
 */
function isNativeToken(address: string | undefined): boolean {
    if (!address) return true;
    const normalized = address.toLowerCase().trim();
    return NATIVE_TOKEN_ADDRESSES.some(addr => addr.toLowerCase() === normalized);
}

/**
 * Safely gets decimals from an ERC-20 contract with fallback
 */
async function getTokenDecimals(contractAddress: string): Promise<number> {
    try {
        // Verify it's a valid address and not zero address
        if (!isAddress(contractAddress) || contractAddress === "0x0000000000000000000000000000000000000000") {
            return NATIVE_TOKEN_DECIMALS;
        }

        const contract = new Contract(contractAddress, ERC20_ABI, provider);
        const decimals = await contract.decimals();
        return Number(decimals);
    } catch (error) {
        console.warn(`Could not get decimals for ${contractAddress}, using default 18:`, error);
        return NATIVE_TOKEN_DECIMALS;
    }
}

/**
 * Verifies a native APE payment by checking transaction value
 */
async function verifyNativePayment(
    txHash: string,
    receipt: TransactionReceipt,
    expectedAmount: bigint,
    receivingAddress: string
): Promise<boolean> {
    try {
        // Get the actual transaction to check value and recipient
        const tx = await provider.getTransaction(txHash);

        if (!tx) {
            console.warn(`Transaction ${txHash} not found`);
            return false;
        }

        const isToReceiver = tx.to?.toLowerCase() === receivingAddress;
        const isCorrectAmount = tx.value === expectedAmount;

        if (!isToReceiver) {
            console.warn(`Native payment sent to wrong address. Expected: ${receivingAddress}, Got: ${tx.to}`);
            return false;
        }

        if (!isCorrectAmount) {
            console.warn(`Native payment incorrect amount. Expected: ${expectedAmount}, Got: ${tx.value}`);
            return false;
        }

        console.log(`✅ Native APE payment verified: ${txHash}`);
        return true;
    } catch (error) {
        console.error(`Error verifying native payment:`, error);
        return false;
    }
}

/**
 * Verifies an ERC-20 token payment by checking Transfer events in logs
 */
async function verifyERC20Payment(
    receipt: TransactionReceipt,
    contractAddress: string,
    expectedAmount: bigint,
    receivingAddress: string
): Promise<boolean> {
    try {
        const contract = new Contract(contractAddress, ERC20_ABI, provider);
        const normalizedContract = contractAddress.toLowerCase();

        for (const log of receipt.logs) {
            // Only check logs from the expected contract
            if (log.address.toLowerCase() !== normalizedContract) {
                continue;
            }

            try {
                const parsedLog = contract.interface.parseLog({
                    topics: [...log.topics],
                    data: log.data
                });

                if (parsedLog && parsedLog.name === "Transfer") {
                    const [from, to, value] = parsedLog.args;

                    const isToReceiver = to.toLowerCase() === receivingAddress;
                    const isCorrectAmount = value === expectedAmount;

                    if (!isToReceiver) {
                        console.warn(`ERC-20 transfer to wrong address. Expected: ${receivingAddress}, Got: ${to}`);
                        continue;
                    }

                    if (!isCorrectAmount) {
                        console.warn(`ERC-20 transfer incorrect amount. Expected: ${expectedAmount}, Got: ${value}`);
                        continue;
                    }

                    console.log(`✅ ERC-20 payment verified from contract ${contractAddress}`);
                    return true;
                }
            } catch (e) {
                // Log is not a Transfer event or parsing failed
                continue;
            }
        }

        console.warn(`No valid ERC-20 Transfer event found in transaction logs`);
        return false;
    } catch (error) {
        console.error(`Error verifying ERC-20 payment:`, error);
        return false;
    }
}

/**
 * Confirms if a transaction successfully transferred the exact amount of APE
 * to the designated receiving wallet.
 *
 * This function handles both:
 * - Native APE transfers (using tx.value)
 * - ERC-20 APE token transfers (using Transfer events)
 *
 * @param txHash The transaction hash submitted by the user.
 * @param expectedAmount The required APE amount (as a string, e.g., "10.0").
 * @param tokenAddress Optional: ERC-20 contract address. If not provided or is native marker, treats as native APE.
 * @returns true if payment is confirmed and valid, false otherwise.
 */
export async function waitForApePayment(
    txHash: string,
    expectedAmount: string,
    tokenAddress?: string
): Promise<boolean> {
    // Input validation
    if (!txHash || txHash.length !== 66 || !txHash.startsWith('0x')) {
        console.error("Invalid transaction hash format");
        return false;
    }

    // Replay protection - check if already processed
    if (processedTransactions.has(txHash)) {
        console.warn(`Transaction ${txHash} already processed (replay attempt)`);
        return false;
    }

    try {
        console.log(`🔍 Verifying payment for TX: ${txHash}`);

        // Determine payment type
        const paymentTokenAddress = tokenAddress || APE_COIN_CONTRACT_ADDRESS;
        const isNative = isNativeToken(paymentTokenAddress);

        console.log(`Payment type: ${isNative ? 'Native APE' : 'ERC-20 Token'}`);
        if (!isNative) {
            console.log(`Token contract: ${paymentTokenAddress}`);
        }

        // Get decimals
        const decimals = isNative
            ? NATIVE_TOKEN_DECIMALS
            : await getTokenDecimals(paymentTokenAddress);

        const expectedWei = parseUnits(expectedAmount, decimals);
        const receivingAddress = RECEIVING_WALLET_ADDRESS.toLowerCase();

        console.log(`Expected amount: ${expectedAmount} (${expectedWei} wei)`);
        console.log(`Receiving address: ${receivingAddress}`);

        // Wait for transaction with confirmations
        console.log(`Waiting for ${REQUIRED_CONFIRMATIONS} confirmations...`);
        const receipt = await provider.waitForTransaction(
            txHash,
            REQUIRED_CONFIRMATIONS,
            60000 // 60 second timeout
        );

        if (!receipt) {
            console.warn(`Transaction receipt not found or timed out for ${txHash}`);
            return false;
        }

        // Check transaction status
        if (receipt.status !== 1) {
            console.warn(`Transaction failed on-chain for ${txHash}`);
            return false;
        }

        console.log(`✅ Transaction confirmed with ${REQUIRED_CONFIRMATIONS} confirmations`);

        // Verify payment based on type
        let verified = false;

        if (isNative) {
            // Primary path: Native APE
            verified = await verifyNativePayment(txHash, receipt, expectedWei, receivingAddress);
        } else {
            // Primary path: ERC-20 Token
            verified = await verifyERC20Payment(receipt, paymentTokenAddress, expectedWei, receivingAddress);

            // FALLBACK LOGIC: If ERC-20 verification fails, attempt Native verification as a safety net.
            if (!verified) {
                console.warn(`ERC-20 verification failed. Attempting Native APE fallback verification...`);
                // Note: Expected Wei is already calculated correctly (using 18 decimals if getTokenDecimals failed).
                const nativeFallbackVerified = await verifyNativePayment(txHash, receipt, expectedWei, receivingAddress);
                if (nativeFallbackVerified) {
                    console.log(`✅ Native APE fallback successful.`);
                    verified = true;
                } else {
                    console.warn(`❌ Native APE fallback verification failed.`);
                }
            }
        }

        // Mark as processed if verified (replay protection)
        if (verified) {
            processedTransactions.add(txHash);
            console.log(`✅ Payment verified and recorded: ${expectedAmount} ${isNative ? 'APE' : 'tokens'}`);
        }

        return verified;

    } catch (error) {
        console.error(`❌ Error during payment verification for ${txHash}:`, error);
        return false;
    }
}

/**
 * Clears a transaction from the replay protection set.
 * Use this for testing or in case of false positives.
 */
export function clearProcessedTransaction(txHash: string): void {
    processedTransactions.delete(txHash);
    console.log(`Cleared transaction ${txHash} from processed set`);
}
