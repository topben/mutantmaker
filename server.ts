/**
 * Deno HTTP Server for Anime PFP Fusion
 * Serves static files and handles API proxying for Gemini
 */

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

    // Inject API key from environment for index.html
    if (path === "/index.html") {
      const apiKey = Deno.env.get("MUTANT_GEMINI_API_KEY");
      let html = new TextDecoder().decode(file);

      if (apiKey) {
        // Inject API key into window object before other scripts load
        const script = `<script>window.MUTANT_GEMINI_API_KEY = "${apiKey}";</script>`;
        html = html.replace("<head>", `<head>${script}`);
      }

      return new Response(html, {
        headers: { "Content-Type": mimeType },
      });
    }

    return new Response(file, {
      headers: { "Content-Type": mimeType },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let path = url.pathname;

  // Serve index.html for root
  if (path === "/") {
    path = "/index.html";
  }

  // Handle static files
  return await serveStaticFile(path);
}

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🧪 Mutant Maker Lab running at http://localhost:${port}`);

Deno.serve({ port }, handler);
