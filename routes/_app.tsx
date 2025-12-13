import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Mutant Maker - Anime PFP Fusion Lab</title>
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Component />
      </body>
    </html>
  );
}
