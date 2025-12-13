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

      <h1 class="text-6xl md:text-8xl font-['Bangers'] text-white drop-shadow-[4px_4px_0px_rgba(163,230,53,1)] mb-4 tracking-wide leading-none">
        MUTANT{" "}
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400">
          MAKER
        </span>
      </h1>

      <div class="relative inline-block mb-8">
        <p class="font-['Space_Grotesk'] text-xl md:text-2xl font-bold text-cyan-300 bg-slate-900/80 px-4 py-2 border-2 border-cyan-500 rounded-lg transform rotate-1">
          Fuse your DNA with Anime Goo.
        </p>
      </div>

      {/* Brand Mascot Image */}
      <div class="flex justify-center">
        <img
          src="/mutant.avif"
          alt="Mutant Ape Yacht Club style AI generated mascot - psychedelic anime character"
          fetchpriority="high"
          class="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_20px_rgba(163,230,53,0.5)] hover:scale-105 transition-transform duration-300"
        />
      </div>
    </div>
  );
}
