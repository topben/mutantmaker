import { Contract, JsonRpcProvider, parseUnits, isAddress } from "ethers";
import { load } from "https://deno.land/std@0.216.0/dotenv/mod.ts";

const env = await load();

// Load environment variables
const APE_CHAIN_RPC_URL = env["APE_CHAIN_RPC_URL"] || Deno.env.get("APE_CHAIN_RPC_URL")!;
const APE_COIN_CONTRACT_ADDRESS = env["APE_COIN_CONTRACT_ADDRESS"] || Deno.env.get("APE_COIN_CONTRACT_ADDRESS")!;
const RECEIVING_WALLET_ADDRESS = env["RECEIVING_WALLET_ADDRESS"] || Deno.env.get("RECEIVING_WALLET_ADDRESS")!;
const APE_PAYMENT_AMOUNT = env["APE_PAYMENT_AMOUNT"] || Deno.env.get("APE_PAYMENT_AMOUNT")!;

if (!APE_CHAIN_RPC_URL || !APE_COIN_CONTRACT_ADDRESS || !RECEIVING_WALLET_ADDRESS || !APE_PAYMENT_AMOUNT) {
    throw new Error("Missing required Web3 environment variables.");
}

// Minimal ERC-20 ABI to decode the Transfer event
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function decimals() view returns (uint8)",
];

const provider = new JsonRpcProvider(APE_CHAIN_RPC_URL);
const apeContract = new Contract(APE_COIN_CONTRACT_ADDRESS, ERC20_ABI, provider);

/**
 * Confirms if a transaction successfully transferred the exact amount of APE
 * to the designated receiving wallet.
 * @param txHash The transaction hash submitted by the user.
 * @param expectedAmount The required APE amount (as a string, e.g., "10.0").
 * @returns true if payment is confirmed and valid, false otherwise.
 */
export async function waitForApePayment(txHash: string, expectedAmount: string): Promise<boolean> {
    if (!txHash || txHash.length !== 66 || !txHash.startsWith('0x')) {
        console.error("Invalid transaction hash provided.");
        return false;
    }

    try {
        console.log(`Verifying payment for TX: ${txHash}`);

        // 1. Get Decimals and Expected Amount in Wei
        // APE on ApeChain is the native token with 18 decimals
        // Fallback to 18 if decimals() call fails
        let decimals = 18;
        try {
            decimals = await apeContract.decimals();
        } catch (error) {
            console.warn("Failed to get decimals from contract, using default 18:", error);
        }
        const expectedWei = parseUnits(expectedAmount, decimals);
        const receivingAddress = RECEIVING_WALLET_ADDRESS.toLowerCase();

        // 2. Wait for transaction receipt
        const receipt = await provider.waitForTransaction(txHash, 1, 60000); // Wait up to 60s

        if (!receipt) {
            console.warn(`Transaction receipt not found or timed out for ${txHash}`);
            return false;
        }

        if (receipt.status !== 1) {
            console.warn(`Transaction failed on-chain for ${txHash}`);
            return false;
        }

        // 3. Check logs for the correct Transfer event
        for (const log of receipt.logs) {
            try {
                // Try to parse the log as an ERC-20 Transfer event
                const parsedLog = apeContract.interface.parseLog(log as any);

                if (parsedLog && parsedLog.name === "Transfer") {
                    const [from, to, value] = parsedLog.args;

                    const isToMe = to.toLowerCase() === receivingAddress;
                    const isCorrectAmount = value.toString() === expectedWei.toString();

                    if (isToMe && isCorrectAmount) {
                        console.log(`✅ Payment confirmed for ${txHash}. Amount: ${expectedAmount} APE.`);
                        return true;
                    } else if (isToMe && !isCorrectAmount) {
                        console.warn(`Payment found, but incorrect amount. Expected: ${expectedAmount}, Actual (Wei): ${value.toString()}`);
                    }
                }
            } catch (e) {
                // Ignore logs that are not Transfer events or are from other contracts
            }
        }

        console.warn(`Payment verified, but required APE Transfer event not found or invalid for ${txHash}.`);
        return false;

    } catch (error) {
        console.error(`Error during on-chain verification for ${txHash}:`, error);
        return false;
    }
}
