import React from "react";
import { Zap } from "lucide-react";

const Hero: React.FC = () => {
  return (
    <div className="text-center py-12 px-4 relative">
      {/* Decorative chaotic elements */}
      <div className="absolute top-0 left-10 text-6xl opacity-20 rotate-12 animate-pulse">
        🧪
      </div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-20 -rotate-12 animate-bounce">
        👁️
      </div>

      <div className="inline-flex items-center justify-center px-6 py-2 bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-2 mb-6">
        <Zap className="w-5 h-5 text-black mr-2 fill-black" />
        <span className="text-black font-['Bangers'] text-xl tracking-wider">
          ENTER THE LAB
        </span>
      </div>

      <h1 className="text-6xl md:text-8xl font-['Bangers'] text-white drop-shadow-[4px_4px_0px_rgba(163,230,53,1)] mb-4 tracking-wide leading-none">
        MUTANT{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400">
          MAKER
        </span>
      </h1>

      <div className="relative inline-block">
        <p className="font-['Space_Grotesk'] text-xl md:text-2xl font-bold text-cyan-300 bg-slate-900/80 px-4 py-2 border-2 border-cyan-500 rounded-lg transform rotate-1">
          Fuse your DNA with Anime Goo.
        </p>
      </div>
    </div>
  );
};

export default Hero;
