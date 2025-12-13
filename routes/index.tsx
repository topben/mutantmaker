import { Head } from "$fresh/runtime.ts";
import Hero from "../components/Hero.tsx";
import MutantMaker from "../islands/MutantMaker.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Mutant Maker - Anime PFP Fusion Lab</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Space+Grotesk:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div class="min-h-screen pb-20 overflow-x-hidden">
        {/* Background Noise Texture */}
        <div
          class="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        ></div>

        <div class="w-full max-w-7xl mx-auto p-4 md:p-8 relative z-10">
          <Hero />
          <MutantMaker />

          {/* Footer info */}
          <div class="mt-16 text-center pb-8">
            <p class="text-slate-600 font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase">
              Powered by Google Gemini // Neural Mutagen Engine v2.5 // Running on Deno Fresh 🦕
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
