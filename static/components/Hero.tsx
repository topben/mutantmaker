import { Zap } from "lucide-preact";

export default function Hero() {
  return (
    <div class="text-center py-12 px-4 relative">
      {/* Decorative chaotic elements */}
      <div class="absolute top-0 left-10 text-6xl opacity-20 rotate-12 animate-pulse">
        🧪
      </div>
      <div class="absolute bottom-10 right-10 text-6xl opacity-20 -rotate-12 animate-bounce">
        👁️
      </div>

      <div class="inline-flex items-center justify-center px-6 py-2 bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-2 mb-6">
        <Zap class="w-5 h-5 text-black mr-2 fill-black" />
        <span class="text-black font-['Bangers'] text-xl tracking-wider">
          ENTER THE LAB
        </span>
      </div>

      <div class="flex flex-col md:flex-row items-center justify-center gap-6 mb-4">
        <img 
          src="/mutant.avif" 
          alt="BAYC Mutant" 
          class="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_#84cc16] hover:scale-105 transition-transform duration-300"
        />
        <h1 class="text-6xl md:text-8xl font-['Bangers'] text-white drop-shadow-[4px_4px_0px_rgba(163,230,53,1)] tracking-wide leading-none">
          MUTANT{" "}
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400">
            MAKER
          </span>
        </h1>
      </div>

      <div class="relative inline-block">
        <p class="font-['Space_Grotesk'] text-xl md:text-2xl font-bold text-cyan-300 bg-slate-900/80 px-4 py-2 border-2 border-cyan-500 rounded-lg transform rotate-1">
          Fuse your DNA with Anime Goo.
        </p>
      </div>
    </div>
  );
}