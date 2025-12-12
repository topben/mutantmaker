/**
 * Deno HTTP Server for Anime PFP Fusion
 * Serves static files and handles API requests
 */

import { generateAnimePFP } from "./services/geminiService.ts";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".ts": "text/typescript",
  ".tsx": "text/typescript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf("."));
  return MIME_TYPES[ext] || "application/octet-stream";
}

async function serveStaticFile(path: string): Promise<Response> {
  try {
    const file = await Deno.readFile(`./static${path}`);
    const mimeType = getMimeType(path);
    return new Response(file, {
      headers: { "Content-Type": mimeType },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Handle API endpoint for image generation
  if (path === "/api/generate" && req.method === "POST") {
    try {
      const body = await req.json();
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
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to generate image",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Serve index.html for root
  let servePath = path === "/" ? "/index.html" : path;

  // Handle static files
  return await serveStaticFile(servePath);
}

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🧪 Mutant Maker Lab running at http://localhost:${port}`);

Deno.serve({ port }, handler);
