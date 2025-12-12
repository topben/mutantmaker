# Mutant Maker - Anime PFP Fusion Lab 🧪🦕

A fun web app that fuses your photos with anime characters using Google Gemini AI. **Rewritten for Deno**.

![Deno](https://img.shields.io/badge/Deno-1.40+-000000?style=flat&logo=deno)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react)
![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat&logo=google)

## Features

- 🎨 **Style Transfer**: Keep your look, change the art style
- ⚖️ **Balanced Fusion**: Perfect hybrid of you + anime character
- 👔 **Cosplay Mode**: Full character transformation
- 🔀 **Split Comparison**: Side-by-side before/after view
- 💾 **One-click Download**: Save your mutated PFP

## Requirements

- [Deno](https://deno.land/) v1.40 or higher
- Google Gemini API key (get one at [Google AI Studio](https://aistudio.google.com/))

## Quick Start

1. **Clone/Download** the project

2. **Run the server**:
   ```bash
   deno task dev
   ```
   
   Or manually:
   ```bash
   deno run --allow-net --allow-read --allow-env server.ts
   ```

3. **Open** http://localhost:8000 in your browser

4. **Configure** your Gemini API key using the ⚙️ button

5. **Upload** a photo of yourself and an anime reference image

6. **MUTATE!** 🧬

## Project Structure

```
animepfp-fusion-deno/
├── deno.json          # Deno configuration & tasks
├── server.ts          # HTTP server (serves static files)
├── build.ts           # Optional build script for bundling
├── static/
│   ├── index.html     # Main HTML with import maps
│   ├── main.js        # Bundled React app
│   ├── main.tsx       # React entry point (source)
│   ├── App.tsx        # Main app component
│   ├── types.ts       # TypeScript types
│   ├── components/
│   │   ├── Hero.tsx
│   │   └── ImageUploader.tsx
│   └── services/
│       └── geminiService.ts
└── README.md
```

## Configuration

### API Key

The app stores your Gemini API key in localStorage. Click the ⚙️ settings icon to configure it.

### Port

Set the `PORT` environment variable to change the default port:
```bash
PORT=3000 deno task start
```

## Development

### Using Source Files

If you want to modify and build from source TSX files:

```bash
# Build the bundle
deno run --allow-read --allow-write --allow-env --allow-run build.ts

# Then run the server
deno task dev
```

### Hot Reload

The `dev` task includes `--watch` for auto-reload on changes.

## Differences from Node/Vite Version

| Feature | Node/Vite | Deno |
|---------|-----------|------|
| Package Manager | npm | URL imports via esm.sh |
| Build Tool | Vite | Native Deno + esbuild |
| Config | package.json, vite.config.ts | deno.json |
| Server | Vite dev server | Native Deno.serve() |
| TypeScript | Compiled via Vite | Native support |

## Tech Stack

- **Runtime**: Deno
- **Frontend**: React 19 (via esm.sh)
- **Styling**: Tailwind CSS (CDN)
- **Icons**: Lucide React
- **AI**: Google Gemini API

## License

MIT

---

Made with 🧬 and Deno 🦕
