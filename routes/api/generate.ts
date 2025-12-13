import { HandlerContext } from "$fresh/server.ts";
import { generateAnimePFP } from "../../services/geminiService.ts";

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
    const resultImage = await generateAnimePFP(body);

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
