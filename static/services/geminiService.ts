/**
 * Client-side Gemini Service
 * Calls the server-side API endpoint for image generation
 */
import { encode } from "@jsquash/webp"; // Import jSquash

export type FusionMode = "style" | "balanced" | "cosplay";

/**
 * Converts any image base64 string to an optimized WebP Blob
 * Uses jSquash (WASM) for superior compression without quality loss.
 * Returns a Blob for efficient FormData transport (no base64 overhead).
 */
const convertImageToWebP = (base64Str: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = async () => {
      try {
        // 1. Calculate new dimensions (Max 1024px)
        // This drastically reduces RAM usage for large phone photos
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // 2. Draw resized image
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // This step performs the downscaling
        ctx.drawImage(img, 0, 0, width, height);

        // 3. Get ImageData from the SMALLER canvas
        const imageData = ctx.getImageData(0, 0, width, height);

        // 4. Encode to WebP using jSquash (WASM)
        // We use quality 90 to keep AI inputs sharp (default is often 75)
        const webpBuffer = await encode(imageData, {
          quality: 90, // High quality for AI perception
          method: 4,   // Balance between speed and compression (0=fast, 6=best)
        });

        // 5. Create Blob directly from the buffer (no base64 conversion needed)
        const blob = new Blob([webpBuffer], { type: "image/webp" });

        // 6. Explicit cleanup to help GC reclaim memory faster
        canvas.width = 0;
        canvas.height = 0;
        // Clear the img element
        img.onload = null;
        img.onerror = null;
        img.src = "";

        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () =>
      reject(new Error("Failed to process image. Please try a different file."));
    img.src = base64Str;
  });
};

/**
 * Generates an anime PFP by calling the server-side API
 * Uses FormData to send binary files efficiently (no base64 JSON overhead)
 */
export const generateAnimePFP = async (
  subjectBase64: string,
  styleBase64: string,
  userPrompt: string = "",
  returnComparison: boolean = false,
  fusionMode: FusionMode = "balanced",
  txHash: string = ""
): Promise<string> => {
  try {
    // Convert images to optimized WebP Blobs SEQUENTIALLY
    // This reduces peak memory usage by ~50% compared to Promise.all
    // Processing one image at a time allows GC to clean up between conversions
    const subjectBlob = await convertImageToWebP(subjectBase64);
    const styleBlob = await convertImageToWebP(styleBase64);

    // Use FormData for efficient binary transport (streams data, no JSON parsing overhead)
    const formData = new FormData();
    formData.append("txHash", txHash);
    formData.append("userPrompt", userPrompt);
    formData.append("returnComparison", String(returnComparison));
    formData.append("fusionMode", fusionMode);
    // Append images as binary files
    formData.append("subject", subjectBlob, "subject.webp");
    formData.append("style", styleBlob, "style.webp");

    // Call server API endpoint
    // No Content-Type header - fetch adds multipart/form-data automatically
    const response = await fetch("/api/generate", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate image");
    }

    const data = await response.json();

    if (!data.success || !data.image) {
      throw new Error("Invalid response from server");
    }

    return data.image;
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};
