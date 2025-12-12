import React, { useState, useCallback, useEffect } from "react";
import type { UploadedImage } from "./types.ts";
import { GenerationStatus } from "./types.ts";
import { generateAnimePFP } from "./services/geminiService.ts";
import type { FusionMode } from "./services/geminiService.ts";
import ImageUploader from "./components/ImageUploader.tsx";
import Hero from "./components/Hero.tsx";
import {
  Wand2,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  Sparkles,
  SplitSquareHorizontal,
  Brush,
  Shirt,
  Zap,
  Crown,
  Settings,
} from "lucide-react";

const LOADING_MESSAGES = [
  "BREWING POTIONS...",
  "SPLITTING ATOMS...",
  "WARPING REALITY...",
  "SUMMONING SPIRITS...",
  "GLITCHING THE MATRIX...",
];

const App: React.FC = () => {
  const [subjectImage, setSubjectImage] = useState<UploadedImage | null>(null);
  const [styleImage, setStyleImage] = useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [fusionMode, setFusionMode] = useState<FusionMode>("balanced");
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("MUTANT_GEMINI_API_KEY");
    if (savedKey) {
      setApiKey(savedKey);
      (window as any).MUTANT_GEMINI_API_KEY = savedKey;
    }
  }, []);

  // Cycle loading messages
  useEffect(() => {
    let interval: number | undefined;
    if (status === GenerationStatus.LOADING) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleSaveApiKey = () => {
    localStorage.setItem("MUTANT_GEMINI_API_KEY", apiKey);
    (window as any).MUTANT_GEMINI_API_KEY = apiKey;
    setShowApiKeyModal(false);
  };

  const handleGenerate = useCallback(async () => {
    if (!subjectImage || !styleImage) return;

    // Check for API key
    if (!localStorage.getItem("MUTANT_GEMINI_API_KEY") && !(window as any).MUTANT_GEMINI_API_KEY) {
      setShowApiKeyModal(true);
      return;
    }

    setStatus(GenerationStatus.LOADING);
    setErrorMsg(null);
    setResultImage(null);
    setLoadingMsgIndex(0);

    try {
      const generatedImageBase64 = await generateAnimePFP(
        subjectImage.base64,
        styleImage.base64,
        prompt,
        showComparison,
        fusionMode
      );
      setResultImage(generatedImageBase64);
      setStatus(GenerationStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  }, [subjectImage, styleImage, prompt, showComparison, fusionMode]);

  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement("a");
      link.href = resultImage;
      link.download = `mutant-pfp-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isFormValid = subjectImage && styleImage;

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      {/* Background Noise Texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b26] border-4 border-black shadow-[8px_8px_0px_0px_#4c1d95] p-8 max-w-md w-full">
            <h2 className="text-3xl font-['Bangers'] text-lime-400 mb-4">
              🔑 API KEY REQUIRED
            </h2>
            <p className="text-slate-300 mb-4 font-['Space_Grotesk']">
              Enter your Google Gemini API key to enable image generation.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="w-full bg-slate-900 border-4 border-slate-700 focus:border-lime-400 text-white p-4 font-bold font-['Space_Grotesk'] outline-none transition-colors mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={handleSaveApiKey}
                className="flex-1 bg-lime-400 text-black py-3 font-['Bangers'] text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
              >
                SAVE KEY
              </button>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-6 py-3 bg-slate-700 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-['Bangers'] text-xl"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 relative z-10">
        {/* Settings button */}
        <button
          onClick={() => setShowApiKeyModal(true)}
          className="absolute top-4 right-4 p-2 bg-slate-800 border-2 border-slate-600 hover:border-lime-400 text-slate-400 hover:text-lime-400 transition-colors"
          title="Configure API Key"
        >
          <Settings size={20} />
        </button>

        <Hero />

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* Left Column: Inputs - The "Control Panel" */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#1a1b26] p-6 rounded-none border-4 border-black shadow-[8px_8px_0px_0px_#4c1d95] relative">
              {/* Decorative bolts */}
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-black"></div>
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-black"></div>
              <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-black"></div>
              <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-black"></div>

              <h2 className="text-3xl font-['Bangers'] text-lime-400 mb-6 flex items-center drop-shadow-md">
                STEP 1: INGREDIENTS
              </h2>

              <div className="space-y-8">
                <ImageUploader
                  id="upload-subject"
                  label="THE SUBJECT"
                  description="DROP HUMAN PHOTO"
                  image={subjectImage}
                  onImageUpload={setSubjectImage}
                />

                <ImageUploader
                  id="upload-style"
                  label="THE MUTAGEN"
                  description="DROP ANIME REF"
                  image={styleImage}
                  onImageUpload={setStyleImage}
                />
              </div>
            </div>

            {/* Options Section - "The Toggles" */}
            <div className="bg-[#1a1b26] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#be185d]">
              <h2 className="text-3xl font-['Bangers'] text-fuchsia-400 mb-6 drop-shadow-md">
                STEP 2: CALIBRATION
              </h2>

              <div className="space-y-6">
                {/* Fusion Mode Selector */}
                <div>
                  <label className="text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']">
                    <span className="bg-blue-600 text-white px-2 py-1 border-2 border-black mr-2">
                      MODE
                    </span>
                    MUTATION LEVEL
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "style", icon: Brush, label: "VIBE", color: "bg-yellow-400" },
                      { id: "balanced", icon: Sparkles, label: "HYBRID", color: "bg-lime-400" },
                      { id: "cosplay", icon: Shirt, label: "FULL SUIT", color: "bg-cyan-400" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setFusionMode(mode.id as FusionMode)}
                        className={`
                          flex flex-col items-center justify-center py-4 px-2 border-4 border-black transition-all duration-200
                          ${
                            fusionMode === mode.id
                              ? `${mode.color} text-black -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }
                        `}
                      >
                        <mode.icon size={24} strokeWidth={2.5} className="mb-1" />
                        <span className="font-['Bangers'] tracking-wider text-lg">
                          {mode.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comparison Toggle */}
                <div>
                  <label className="text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']">
                    <span className="bg-purple-600 text-white px-2 py-1 border-2 border-black mr-2">
                      VIEW
                    </span>
                    OUTPUT FORMAT
                  </label>
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className={`w-full flex items-center justify-between p-4 border-4 border-black transition-all duration-200 ${
                      showComparison
                        ? "bg-fuchsia-500 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SplitSquareHorizontal size={24} strokeWidth={2.5} />
                      <span className="font-['Bangers'] text-xl tracking-wide">
                        SPLIT COMPARISON
                      </span>
                    </div>
                    <div
                      className={`w-12 h-6 border-2 border-black p-0.5 transition-colors ${
                        showComparison ? "bg-black" : "bg-slate-600"
                      }`}
                    >
                      <div
                        className={`w-4 h-full bg-white border border-black transition-transform ${
                          showComparison ? "translate-x-6 bg-lime-400" : ""
                        }`}
                      />
                    </div>
                  </button>
                </div>

                {/* Text Input */}
                <div>
                  <label className="text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']">
                    <span className="bg-orange-500 text-white px-2 py-1 border-2 border-black mr-2">
                      EXTRA
                    </span>
                    SPECIAL REQUESTS
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g., ADD LASER EYES, GLITCH BACKGROUND, CYBERNETIC JAW..."
                    className="w-full bg-slate-900 border-4 border-slate-700 focus:border-lime-400 text-white p-4 font-bold font-['Space_Grotesk'] outline-none transition-colors h-24 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="mt-4 bg-red-500 border-4 border-black text-white p-4 flex items-center gap-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                  <AlertCircle className="w-8 h-8 flex-shrink-0" />
                  <p className="font-mono text-sm uppercase">{errorMsg}</p>
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={handleGenerate}
                  disabled={!isFormValid || status === GenerationStatus.LOADING}
                  className={`
                    w-full py-5 font-['Bangers'] text-3xl tracking-widest border-4 border-black transition-all duration-200
                    flex items-center justify-center gap-4 relative overflow-hidden
                    ${
                      isFormValid
                        ? "bg-lime-400 hover:bg-lime-300 text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-none"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border-slate-600"
                    }
                  `}
                >
                  {status === GenerationStatus.LOADING ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin" strokeWidth={3} />
                      PROCESSING...
                    </>
                  ) : (
                    <>
                      <Zap className="w-8 h-8 fill-black" strokeWidth={3} />
                      MUTATE NOW
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <div className="bg-[#1a1b26] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#06b6d4] h-full flex flex-col relative min-h-[600px]">
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-16 h-16 border-l-4 border-b-4 border-black bg-cyan-400 flex items-center justify-center">
                <Crown size={32} strokeWidth={2.5} className="text-black" />
              </div>

              <h2 className="text-3xl font-['Bangers'] text-cyan-400 mb-6 flex items-center drop-shadow-md">
                RESULT CHAMBER
              </h2>

              <div className="flex-grow flex items-center justify-center bg-black border-4 border-slate-800 relative overflow-hidden group">
                {/* Grid background inside output */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                ></div>

                {status === GenerationStatus.LOADING && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center bg-black/90">
                    <div className="relative w-32 h-32 mb-8">
                      <div className="absolute inset-0 border-8 border-slate-800 rounded-full"></div>
                      <div className="absolute inset-0 border-8 border-t-lime-400 border-r-fuchsia-500 border-b-cyan-400 border-l-yellow-400 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-lime-400 font-['Bangers'] text-4xl tracking-wide animate-pulse">
                      {LOADING_MESSAGES[loadingMsgIndex]}
                    </p>
                  </div>
                )}

                {resultImage ? (
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <img
                      src={resultImage}
                      alt="Generated PFP"
                      className="max-w-full max-h-[600px] object-contain border-4 border-white shadow-[0_0_50px_rgba(163,230,53,0.3)]"
                    />
                    <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-1 font-['Bangers'] border border-white transform rotate-2">
                      GENERATED BY GEMINI
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 relative z-10">
                    {status === GenerationStatus.IDLE && (
                      <div className="flex flex-col items-center opacity-50">
                        <div className="w-32 h-32 bg-slate-900 border-4 border-slate-700 rounded-full flex items-center justify-center mb-6">
                          <span className="text-6xl grayscale">🦍</span>
                        </div>
                        <p className="font-['Bangers'] text-2xl text-slate-500 tracking-wide">
                          AWAITING SUBJECT...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {resultImage && (
                <div className="mt-6 flex gap-4">
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-yellow-400 text-black py-4 font-['Bangers'] text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-yellow-300 transition-all flex items-center justify-center gap-3"
                  >
                    <Download className="w-6 h-6" strokeWidth={3} />
                    SAVE TO DISK
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="px-8 py-4 bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-slate-100 transition-all flex items-center justify-center"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-6 h-6" strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-16 text-center pb-8">
          <p className="text-slate-600 font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase">
            Powered by Google Gemini // Neural Mutagen Engine v2.5 // Running on Deno 🦕
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
