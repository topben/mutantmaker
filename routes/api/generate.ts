import { HandlerContext } from "$fresh/server.ts";
import { generateAnimePFP } from "../../services/geminiService.ts";
import type { FusionMode } from "../../services/geminiService.ts";
import { waitForApePayment } from "../../services/ApeChainListener.ts";
import { applyRateLimit, getClientIP, checkRateLimit } from "../../services/rateLimiter.ts";

// Environment variables are loaded in main.ts/dev.ts
const APE_PAYMENT_AMOUNT = Deno.env.get("APE_PAYMENT_AMOUNT") || "0.1";

/**
 * Convert ArrayBuffer to Base64 string
 * Memory-efficient for server-side use
 */
const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

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

  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(_req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Get rate limit info for headers
  const clientIP = getClientIP(_req);
  const rateLimitInfo = await checkRateLimit(clientIP);

  try {
    // Parse FormData - handles binary streams more efficiently than JSON
    const form = await _req.formData();

    // Extract text fields
    const txHash = form.get("txHash") as string;
    const userPrompt = form.get("userPrompt") as string || "";
    const returnComparison = form.get("returnComparison") === "true";
    const fusionMode = (form.get("fusionMode") as FusionMode) || "balanced";

    // Extract image files
    const subjectFile = form.get("subject") as File;
    const styleFile = form.get("style") as File;

    if (!subjectFile || !styleFile) {
      return new Response(
        JSON.stringify({ success: false, error: "Both subject and style images are required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    // 2. Convert files to Base64 ONLY when needed for Gemini API
    // Reading ArrayBuffer is more memory-efficient than parsing huge JSON strings
    const subjectBuffer = await subjectFile.arrayBuffer();
    const styleBuffer = await styleFile.arrayBuffer();

    const subjectBase64 = `data:image/webp;base64,${toBase64(subjectBuffer)}`;
    const styleBase64 = `data:image/webp;base64,${toBase64(styleBuffer)}`;

    // 3. IMAGE GENERATION (Only proceeds if payment is confirmed)
    const resultImage = await generateAnimePFP({
      subjectBase64,
      styleBase64,
      userPrompt,
      returnComparison,
      fusionMode,
    });

    return new Response(
      JSON.stringify({ success: true, image: resultImage }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": rateLimitInfo.remaining.toString(),
          "X-RateLimit-Reset": rateLimitInfo.resetTime.toString(),
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
