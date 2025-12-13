import { HandlerContext } from "$fresh/server.ts";
import { generateAnimePFP } from "../../services/geminiService.ts";
import { waitForApePayment } from "../../services/ApeChainListener.ts";

// Environment variables are loaded in main.ts/dev.ts
const APE_PAYMENT_AMOUNT = Deno.env.get("APE_PAYMENT_AMOUNT") || "0.1";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext
): Promise<Response> => {
  if (_req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const body = await _req.json();
    const { txHash, ...generateRequest } = body;

    // 1. PAYMENT VALIDATION CHECK
    if (!txHash) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment is required. Please provide a txHash." }),
        {
          status: 402, // 402 Payment Required
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const paymentConfirmed = await waitForApePayment(txHash, APE_PAYMENT_AMOUNT);

    if (!paymentConfirmed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Payment verification failed for ${APE_PAYMENT_AMOUNT} APE. Please check the transaction hash and amount.`,
        }),
        {
          status: 402, // 402 Payment Required
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. IMAGE GENERATION (Only proceeds if payment is confirmed)
    const resultImage = await generateAnimePFP(generateRequest);

    return new Response(
      JSON.stringify({ success: true, image: resultImage }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("API Error:", error);

    // Check if it's a rate limit error
    const isRateLimit =
      error?.name === "ClientError" &&
      (error?.message?.includes("429") ||
       error?.message?.includes("Too Many Requests") ||
       error?.message?.includes("RESOURCE_EXHAUSTED"));

    const statusCode = isRateLimit ? 429 : 500;
    const errorMessage = isRateLimit
      ? "Rate limit exceeded. Please try again in a few moments."
      : (error.message || "Failed to generate image");

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
