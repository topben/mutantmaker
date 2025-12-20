/**
 * Client-side Gemini Service
 * Calls the server-side API endpoint for image generation
 */

export type FusionMode = "style" | "balanced" | "cosplay";

const MAX_DIMENSION = 1024; // Safe size for API limits & speed

/**
 * Converts any image base64 string to a standard JPEG base64 string
 * to ensure compatibility with the API.
 */
const convertImageToJpeg = (
  base64Str: string
): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
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

        // Fill white background (handles transparent PNGs)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Lower quality slightly to 0.85 (indistinguishable for AI, much smaller file)
        const jpegBase64 = canvas.toDataURL("image/jpeg", 0.85);
        const cleanData = jpegBase64.replace(/^data:image\/jpeg;base64,/, "");

        resolve({
          mimeType: "image/jpeg",
          data: cleanData,
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
    // Parallel conversion to ensure speed and format validity (JPEG)
    const [subject, style] = await Promise.all([
      convertImageToJpeg(subjectBase64),
      convertImageToJpeg(styleBase64),
    ]);

    // Prepare request data
    const requestData = {
      subjectBase64: `data:${subject.mimeType};base64,${subject.data}`,
      styleBase64: `data:${style.mimeType};base64,${style.data}`,
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
