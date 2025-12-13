import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Mutant Maker - Anime PFP Fusion Lab</title>
        
        {/* Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet" />
        
        {/* Favicons & App Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Fallback for legacy browsers */}
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Component />
      </body>
    </html>
  );
}