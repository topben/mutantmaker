/**
 * Client-side Gemini Service
 * Calls the server-side API endpoint for image generation
 */
import { encode } from "@jsquash/webp"; // Import jSquash

export type FusionMode = "style" | "balanced" | "cosplay";

/**
 * Converts ArrayBuffer to Base64 string
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Converts any image base64 string to a highly optimized WebP base64 string
 * Uses jSquash (WASM) for superior compression without quality loss.
 */
const convertImageToWebP = (
  base64Str: string
): Promise<{ mimeType: string; data: string }> => {
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

        // 5. Cleanup hints (help the Garbage Collector)
        // @ts-ignore - Clear reference to allow memory release
        imageData.data = null;

        // Convert WASM buffer output to base64 for API transport
        const base64Data = arrayBufferToBase64(webpBuffer);

        resolve({
          mimeType: "image/webp",
          data: base64Data,
        });
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
 */
export const generateAnimePFP = async (
  subjectBase64: string,
  styleBase64: string,
  userPrompt: string = "",
  returnComparison: boolean = false,
  fusionMode: FusionMode = "balanced"
): Promise<string> => {
  try {
    // Convert images to optimized WebP format
    const [subject, style] = await Promise.all([
      convertImageToWebP(subjectBase64),
      convertImageToWebP(styleBase64),
    ]);

    // Prepare request data
    const requestData = {
      subjectBase64: `data:image/webp;base64,${subject.data}`,
      styleBase64: `data:image/webp;base64,${style.data}`,
      userPrompt,
      returnComparison,
      fusionMode,
    };

    // Call server API endpoint
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
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
