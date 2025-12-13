# Mutant Maker - Anime PFP Fusion Lab 🧪🦕

A fun web app that fuses your photos with anime characters using Google Gemini AI. **Built with Deno Fresh**.

![Deno](https://img.shields.io/badge/Deno-1.40+-000000?style=flat&logo=deno)
![Fresh](https://img.shields.io/badge/Fresh-1.8-yellow?style=flat&logo=deno)
![Preact](https://img.shields.io/badge/Preact-10-673ab8?style=flat&logo=preact)
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

2. **Set your Gemini API key** as an environment variable:
   ```bash
   export MUTANT_GEMINI_API_KEY="your-api-key-here"
   ```

3. **Run the dev server**:
   ```bash
   deno task dev
   ```

   Or run in production mode:
   ```bash
   deno task start
   ```

4. **Open** http://localhost:8000 in your browser

5. **Upload** a photo of yourself and an anime reference image

6. **MUTATE!** 🧬

## Project Structure

```
mutantmaker/
├── deno.json             # Deno configuration & tasks
├── fresh.config.ts       # Fresh framework configuration
├── main.ts              # Production entry point
├── dev.ts               # Development entry point
├── routes/
│   ├── _app.tsx         # App wrapper with HTML structure
│   ├── index.tsx        # Home page route
│   └── api/
│       └── generate.ts  # Image generation API endpoint
├── islands/
│   ├── MutantMaker.tsx  # Main interactive component (client-side)
│   └── ImageUploader.tsx # Image upload component (client-side)
├── components/
│   └── Hero.tsx         # Static hero component (SSR)
├── services/
│   └── geminiService.ts # Server-side Gemini API logic
├── utils/
│   └── types.ts         # Shared TypeScript types
└── README.md
```

## Configuration

### API Key (Required)

The Gemini API key must be set as an environment variable before starting the server. The API key is **only used server-side** and is never exposed to the browser for security.

```bash
export MUTANT_GEMINI_API_KEY="your-api-key-here"
```

**Get your API key**: Visit [Google AI Studio](https://aistudio.google.com/) to create a free API key.

**Architecture**: Built with Deno Fresh using the Islands Architecture. The app uses a server-side API route (`routes/api/generate.ts`) that calls the Gemini API with `Deno.env.get("MUTANT_GEMINI_API_KEY")`. The API key is only used server-side and never exposed to the browser.

**For different shells**:
- **Bash/Zsh**: Add to `~/.bashrc` or `~/.zshrc`:
  ```bash
  export MUTANT_GEMINI_API_KEY="your-api-key-here"
  ```

- **Fish**: Add to `~/.config/fish/config.fish`:
  ```fish
  set -x MUTANT_GEMINI_API_KEY "your-api-key-here"
  ```

- **Windows CMD**:
  ```cmd
  set MUTANT_GEMINI_API_KEY=your-api-key-here
  ```

- **Windows PowerShell**:
  ```powershell
  $env:MUTANT_GEMINI_API_KEY="your-api-key-here"
  ```

**For one-time use**, you can set it inline:
```bash
MUTANT_GEMINI_API_KEY="your-key" deno task dev
```

### Port

Set the `PORT` environment variable to change the default port:
```bash
PORT=3000 deno task start
```

## Development

### Hot Reload

The `dev` task includes `--watch` for auto-reload on file changes in `routes/` and `static/` directories.

### Fresh Islands Architecture

Fresh uses the Islands Architecture for optimal performance:
- **Components** (`components/`): Server-side rendered, no JavaScript sent to client
- **Islands** (`islands/`): Interactive components with client-side JavaScript
- **Routes** (`routes/`): File-based routing with SSR support

## Architecture

| Feature | Technology |
|---------|-----------|
| Runtime | Deno |
| Framework | Fresh 1.8 (Islands Architecture) |
| UI Library | Preact 10 |
| Styling | Tailwind CSS (CDN) |
| Routing | File-based routing |
| Rendering | Server-Side Rendering (SSR) + Islands |
| TypeScript | Native Deno support |

## Tech Stack

- **Runtime**: Deno
- **Framework**: Fresh 1.8
- **Frontend**: Preact 10 (via esm.sh)
- **Styling**: Tailwind CSS (CDN)
- **Icons**: Lucide Preact
- **AI**: Google Gemini API (gemini-2.5-flash-image)

## License

MIT

---

Made with 🧬 and Deno Fresh 🦕
