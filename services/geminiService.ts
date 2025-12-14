/**
 * Server-side Gemini API Service
 * Uses Deno.env to access the API key directly
 */

import { GoogleGenAI } from "@google/genai";

export type FusionMode = "style" | "balanced" | "cosplay";

/**
 * Configuration for retry logic
 */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay

/**
 * Maximum allowed length for user prompts (prevent abuse)
 */
const MAX_PROMPT_LENGTH = 500;

/**
 * Sanitizes user input to prevent prompt injection attacks
 * @param prompt - The user's prompt to sanitize
 * @returns Sanitized prompt safe for use in AI generation
 */
function sanitizeUserPrompt(prompt: string): string {
  if (!prompt || typeof prompt !== "string") {
    return "";
  }

  // Trim whitespace
  let sanitized = prompt.trim();

  // Limit length to prevent abuse
  if (sanitized.length > MAX_PROMPT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_PROMPT_LENGTH);
  }

  // Remove potentially dangerous characters that could be used for injection
  // Keep alphanumeric, spaces, basic punctuation, but remove control characters and special delimiters
  sanitized = sanitized.replace(/[{}[\]<>\\]/g, "");

  // Remove multiple consecutive spaces
  sanitized = sanitized.replace(/\s+/g, " ");

  // Remove common prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous\s+)?(instructions?|prompts?|commands?)/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /user\s*:/gi,
    /new\s+instructions?/gi,
    /override\s+(previous|instructions?)/gi,
    /disregard\s+(previous|above|instructions?)/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized.trim();
}

interface GenerateRequest {
  subjectBase64: string;
  styleBase64: string;
  userPrompt?: string;
  returnComparison?: boolean;
  fusionMode?: FusionMode;
}

/**
 * Get API key from Deno environment variables
 */
const getApiKey = (): string => {
  const apiKey = Deno.env.get("MUTANT_GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "API Key not set. Please set the MUTANT_GEMINI_API_KEY environment variable."
    );
  }
  return apiKey;
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Extract retry delay from Gemini API error response
 * Returns delay in milliseconds
 */
const extractRetryDelay = (error: any): number | null => {
  try {
    // Check if error has RetryInfo in details
    if (error?.details) {
      for (const detail of error.details) {
        if (detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo") {
          const retryDelay = detail.retryDelay;
          if (retryDelay) {
            // Parse delay string like "32s" or "32.406210762s"
            const match = retryDelay.match(/^([\d.]+)s$/);
            if (match) {
              return Math.ceil(parseFloat(match[1]) * 1000);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not extract retry delay from error:", e);
  }
  return null;
};

/**
 * Check if error is a rate limit error (429)
 */
const isRateLimitError = (error: any): boolean => {
  return (
    error?.name === "ClientError" &&
    (error?.message?.includes("429") ||
     error?.message?.includes("Too Many Requests") ||
     error?.message?.includes("RESOURCE_EXHAUSTED"))
  );
};

/**
 * Retry wrapper with exponential backoff for rate limit errors
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Only retry on rate limit errors
      if (!isRateLimitError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted our attempts
      if (attempt === MAX_RETRIES) {
        console.error(
          `Rate limit exceeded after ${MAX_RETRIES} retries for ${operation}`
        );
        throw error;
      }

      // Extract suggested delay from error, or use exponential backoff
      const suggestedDelay = extractRetryDelay(error);
      const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
      const delay = suggestedDelay || exponentialDelay;

      console.warn(
        `Rate limit hit for ${operation}. Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Generates an anime PFP by combining a subject image and a style image.
 * This runs on the server side with direct access to Deno.env
 */
export const generateAnimePFP = async (
  request: GenerateRequest
): Promise<string> => {
  const {
    subjectBase64,
    styleBase64,
    userPrompt = "",
    returnComparison = false,
    fusionMode = "balanced",
  } = request;

  try {
    // Initialize the API client with key from environment
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    // Sanitize user input to prevent prompt injection
    const safeUserPrompt = sanitizeUserPrompt(userPrompt);

    // Parse base64 data (remove data URL prefix if present)
    const cleanSubject = subjectBase64.replace(/^data:image\/\w+;base64,/, "");
    const cleanStyle = styleBase64.replace(/^data:image\/\w+;base64,/, "");

    // Define instructions based on Fusion Mode
    let modeInstruction = "";
    switch (fusionMode) {
      case "style":
        modeInstruction = `
          MODE: STYLE TRANSFER ONLY.
          - KEEP the Subject's original hair style, clothing, and pose exactly as they are.
          - ONLY change the rendering style (lines, shading, colors) to match the Style Reference.
          - Do NOT transfer specific character features like hair shape or costume from the anime image.
        `;
        break;
      case "cosplay":
        modeInstruction = `
          MODE: COSPLAY FUSION.
          - The goal is to make the Subject look like they are cosplaying the Anime Character.
          - TRANSFER the Anime Character's HAIR STYLE, CLOTHING, and ACCESSORIES to the Subject.
          - KEEP the Subject's facial structure (eyes, nose, mouth shape) so they are identifiable.
          - This must be a perfect hybrid: Subject's Face + Anime Character's Design.
        `;
        break;
      case "balanced":
      default:
        modeInstruction = `
          MODE: BALANCED FUSION.
          - Maintain the Subject's facial identity strongly.
          - ADAPT the Subject's hair color and texture to match the Anime Character.
          - Incorporate subtle key elements from the Anime Character (e.g. eye color, facial markings) if they are distinctive.
          - The result should feel like the Subject drawn by the artist of the Style Reference.
        `;
        break;
    }

    // Dynamic prompt based on whether user wants a PFP or a Comparison
    let layoutInstruction = "";
    if (returnComparison) {
      layoutInstruction = `
        TASK: Create a SPLIT-SCREEN comparison image.
        - LEFT SIDE: The original Subject's face.
        - RIGHT SIDE: The generated Anime Fusion result.
        - The transition should be seamless.
      `;
    } else {
      layoutInstruction = `
        TASK: Create a single, centered Anime Profile Picture (PFP).
        - Focus on a clean, high-quality headshot.
      `;
    }

    const basePrompt = `
      You are a master digital artist specializing in Character Fusion and Style Transfer.

      GOAL: Create a fusion of "Subject" (Image 1) and "Style Reference" (Image 2).

      ${modeInstruction}

      ${layoutInstruction}

      GENERAL RULES:
      1. Identity Preservation: The face shape and key features must remain recognizable as the Subject.
      2. Art Style: Strictly apply the shading, line weight, and palette of the Style Reference.
      3. High Quality: Ensure the output is crisp, clean, and suitable for a profile picture.

      ===== USER REQUEST (The following is user-provided content) =====
      ${safeUserPrompt || "No additional preferences specified."}
      ===== END USER REQUEST =====
    `;

    // Wrap API call with retry logic for rate limit handling
    const response = await withRetry(
      async () => {
        return await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: {
            parts: [
              { text: basePrompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanSubject,
                },
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanStyle,
                },
              },
            ],
          },
        });
      },
      "generateContent"
    );

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini.");
    }

    // Check for blocking or safety issues
    const firstCandidate = candidates[0];
    if (firstCandidate.finishReason && firstCandidate.finishReason !== "STOP") {
      console.error("Gemini response blocked:", {
        finishReason: firstCandidate.finishReason,
        safetyRatings: firstCandidate.safetyRatings,
      });
      throw new Error(
        `Content generation blocked: ${firstCandidate.finishReason}. This may be due to safety filters. Please try different images.`
      );
    }

    const parts = candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      console.error("No content parts in response:", {
        candidate: firstCandidate,
        finishReason: firstCandidate.finishReason,
      });
      throw new Error("No content parts returned. The model may have declined to generate the image.");
    }

    const imagePart = parts.find((part: any) => part.inlineData);

    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
      return `data:image/webp;base64,${imagePart.inlineData.data}`;
    }

    const textPart = parts.find((part: any) => part.text);
    if (textPart && textPart.text) {
      console.warn("Model returned text:", textPart.text);
      throw new Error(
        "The model declined to generate the image. Please try different source images."
      );
    }

    throw new Error("No valid image data found in response.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
