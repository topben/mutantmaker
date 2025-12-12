/**
 * Server-side Gemini API Service
 * Uses Deno.env to access the API key directly
 */

import { GoogleGenAI } from "@google/genai";

export type FusionMode = "style" | "balanced" | "cosplay";

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

      Additional User Request: ${userPrompt}
    `;

    const response = await ai.models.generateContent({
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

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini.");
    }

    const parts = candidates[0].content?.parts;
    if (!parts) {
      throw new Error("No content parts returned.");
    }

    const imagePart = parts.find((part: any) => part.inlineData);

    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
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
