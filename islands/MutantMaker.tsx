import { useState, useCallback, useEffect } from "preact/hooks";
import type { UploadedImage, FusionMode } from "../utils/types.ts";
import { GenerationStatus } from "../utils/types.ts";
import ImageUploader from "./ImageUploader.tsx";
import {
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
  Wallet,
  Wrench,
  Info,
} from "lucide-preact";
import { BrowserProvider, Contract, parseUnits, Network } from "ethers";
import { encode as encodeWebP } from "@jsquash/webp";

const LOADING_MESSAGES = [
  "BREWING POTIONS...",
  "SPLITTING ATOMS...",
  "WARPING REALITY...",
  "SUMMONING SPIRITS...",
  "GLITCHING THE MATRIX...",
];

// ERC-20 ABI for transfer function
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

// ApeChain Network - Disable ENS to avoid "network does not support ENS" errors
const APECHAIN_NETWORK = new Network("apechain", 33139, { ensAddress: null });

// ApeChain Configuration
const APECHAIN_CONFIG = {
  chainId: "0x8173", // 33139 in decimal
  chainName: "ApeChain",
  rpcUrls: ["https://rpc.apechain.com"],
  nativeCurrency: {
    name: "ApeCoin",
    symbol: "APE",
    decimals: 18,
  },
  blockExplorerUrls: ["https://apechain.calderaexplorer.xyz"],
};

interface MutantMakerProps {
  apeContractAddress: string;
  receivingWallet: string;
  paymentAmount: string;
}

// Utility to detect if the configured address refers to the native token
const NATIVE_TOKEN_ADDRESSES = [
  "0x0000000000000000000000000000000000000000",
  "native",
  "NATIVE",
  ""
];

function isNativeApe(address: string | undefined): boolean {
    if (!address) return true;
    const normalized = address.toLowerCase().trim();
    // On ApeChain, APE is the native coin (like ETH on Ethereum)
    // Check if the address is in the list of native token markers
    return NATIVE_TOKEN_ADDRESSES.some(addr => addr.toLowerCase() === normalized);
}

/**
 * Convert ArrayBuffer to Base64 string using chunked approach
 * to avoid stack overflow on large images
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }
  return btoa(chunks.join(""));
};

/**
 * Compress image to optimized WebP format
 * Resizes to max 1024px and compresses to reduce API input costs
 * Returns raw base64 string (without data URL prefix)
 */
const compressToWebP = async (base64DataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = async () => {
      try {
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;

        // Resize to fit within MAX_SIZE while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to create canvas context for image compression"));
          return;
        }

        // Fill with white background to handle PNG transparency
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);

        try {
          // Try WebP encoding via @jsquash/webp (uses WASM)
          const webpBuffer = await encodeWebP(imageData, {
            quality: 80,
            method: 4,
          });
          resolve(arrayBufferToBase64(webpBuffer));
        } catch (encodeError) {
          // Fallback to canvas toDataURL if WASM encoding fails
          console.warn("WebP WASM encoding failed, using canvas fallback:", encodeError);
          const fallbackDataUrl = canvas.toDataURL("image/webp", 0.8);
          resolve(fallbackDataUrl.replace(/^data:image\/webp;base64,/, ""));
        }
      } catch (e) {
        reject(new Error(`Image compression failed: ${e instanceof Error ? e.message : "Unknown error"}`));
      }
    };

    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = base64DataUrl;
  });
};

export default function MutantMaker({ apeContractAddress, receivingWallet, paymentAmount }: MutantMakerProps) {
  const [subjectImage, setSubjectImage] = useState<UploadedImage | null>(null);
  const [styleImage, setStyleImage] = useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [fusionMode, setFusionMode] = useState<FusionMode>("balanced");
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  // Web3 State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'connecting' | 'paying' | 'confirming' | 'generating'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

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

  // Connect wallet and switch to ApeChain
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      throw new Error("Please install MetaMask or another Web3 wallet to continue.");
    }

    setPaymentStatus('connecting');

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      setWalletAddress(accounts[0]);

      // Switch to ApeChain or add it if not present
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: APECHAIN_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [APECHAIN_CONFIG],
          });
        } else {
          throw switchError;
        }
      }

      setWalletConnected(true);
      return accounts[0];
    } catch (error: any) {
      setPaymentStatus('idle');
      throw error;
    }
  }, []);

  // Send ApeCoin payment - REFACTORED
  const sendPayment = useCallback(async (userAddress: string) => {
    setPaymentStatus('paying');

    // Create provider with custom ApeChain network to disable ENS
    const provider = new BrowserProvider(window.ethereum, APECHAIN_NETWORK);
    const signer = await provider.getSigner();

    const isNative = isNativeApe(apeContractAddress);
    let txHash: string;

    if (isNative) {
        // Native APE transfer: Use signer.sendTransaction with value
        const amount = parseUnits(paymentAmount, 18); // Native APE is always 18 decimals

        const tx = await signer.sendTransaction({
            to: receivingWallet,
            value: amount,
        });
        txHash = tx.hash;

    } else {
        // ERC-20 token transfer: Use contract.transfer
        const apeContract = new Contract(apeContractAddress, ERC20_ABI, signer);

        // Get decimals and calculate amount (with fallback to 18)
        let decimals = 18;
        try {
            decimals = await apeContract.decimals();
        } catch (error) {
            console.warn("Failed to get decimals from contract, using default 18:", error);
        }
        const amount = parseUnits(paymentAmount, decimals);

        // Send transaction
        const tx = await apeContract.transfer(receivingWallet, amount);
        txHash = tx.hash;
    }

    setTxHash(txHash);
    setPaymentStatus('confirming');

    // Wait for transaction confirmation (1 confirmation for better UX)
    await provider.waitForTransaction(txHash, 1);

    return txHash;
  }, [apeContractAddress, receivingWallet, paymentAmount]);

  const handleGenerate = useCallback(async () => {
    if (!subjectImage || !styleImage) return;

    setStatus(GenerationStatus.LOADING);
    setErrorMsg(null);
    setResultImage(null);
    setLoadingMsgIndex(0);

    try {
      // Phase 1: Connect Wallet
      let userAddress = walletAddress;
      if (!walletConnected) {
        userAddress = await connectWallet();
      }

      if (!userAddress) {
        throw new Error("Failed to connect wallet.");
      }

      // Phase 2: Send Payment
      const transactionHash = await sendPayment(userAddress);

      // Phase 3: Generate Image with payment proof
      setPaymentStatus('generating');

      // Compress images to WebP before sending to reduce API input costs
      const [subjectWebP, styleWebP] = await Promise.all([
        compressToWebP(subjectImage.base64),
        compressToWebP(styleImage.base64),
      ]);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash: transactionHash,
          subjectBase64: subjectWebP,
          styleBase64: styleWebP,
          userPrompt: prompt,
          returnComparison: showComparison,
          fusionMode: fusionMode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResultImage(data.image);
        setStatus(GenerationStatus.SUCCESS);
        setPaymentStatus('idle');
      } else {
        throw new Error(data.error || "Failed to generate image");
      }
    } catch (err: any) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      setPaymentStatus('idle');

      // Enhanced error message logic
      const errorMessage = err.message || "";
      const lowerError = errorMessage.toLowerCase();

      if (lowerError.includes("blocked") || lowerError.includes("declined")) {
        setErrorMsg("Generation was rejected! The AI may have flagged your image/prompt. Try again with a different request.");
      } else if (lowerError.includes("content parts")) {
        setErrorMsg("Generation failed due to an unknown API error. Please try clicking MUTATE NOW again!");
      } else {
        setErrorMsg(errorMessage || "Something went wrong. Please try again.");
      }
    }
  }, [subjectImage, styleImage, prompt, showComparison, fusionMode, walletConnected, walletAddress, connectWallet, sendPayment]);

  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement("a");
      link.href = resultImage;
      link.download = `mutant-pfp-${Date.now()}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isFormValid = subjectImage && styleImage;

  return (
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
      {/* Left Column: Inputs - The "Control Panel" */}
      <div class="lg:col-span-5 flex flex-col gap-6">
        <div class="bg-[#1a1b26] p-6 rounded-none border-4 border-black shadow-[8px_8px_0px_0px_#4c1d95] relative">
          {/* Decorative bolts */}
          <div class="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-black"></div>
          <div class="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-black"></div>
          <div class="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-black"></div>
          <div class="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-black"></div>

          <h2 class="text-3xl font-['Bangers'] text-lime-400 mb-6 flex items-center drop-shadow-md">
            STEP 1: INGREDIENTS
          </h2>

          <div class="space-y-8">
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
        <div class="bg-[#1a1b26] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#be185d]">
          <h2 class="text-3xl font-['Bangers'] text-fuchsia-400 mb-6 drop-shadow-md">
            STEP 2: CALIBRATION
          </h2>

          <div class="space-y-6">
            {/* Fusion Mode Selector */}
            <div>
              <label class="text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']">
                <span class="bg-blue-600 text-white px-2 py-1 border-2 border-black mr-2">
                  MODE
                </span>
                MUTATION LEVEL
              </label>
              <div class="grid grid-cols-3 gap-3">
                {[
                  { id: "style", icon: Brush, label: "VIBE", color: "bg-yellow-400" },
                  { id: "balanced", icon: Sparkles, label: "HYBRID", color: "bg-lime-400" },
                  { id: "cosplay", icon: Shirt, label: "FULL SUIT", color: "bg-cyan-400" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setFusionMode(mode.id as FusionMode)}
                    class={`
                      flex flex-col items-center justify-center py-4 px-2 border-4 border-black transition-all duration-200
                      ${
                        fusionMode === mode.id
                          ? `${mode.color} text-black -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }
                    `}
                  >
                    <mode.icon size={24} strokeWidth={2.5} class="mb-1" />
                    <span class="font-['Bangers'] tracking-wider text-lg">
                      {mode.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison Toggle */}
            <div>
              <label class="text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']">
                <span class="bg-purple-600 text-white px-2 py-1 border-2 border-black mr-2">
                  VIEW
                </span>
                OUTPUT FORMAT
              </label>
              <button
                onClick={() => setShowComparison(!showComparison)}
                class={`w-full flex items-center justify-between p-4 border-4 border-black transition-all duration-200 ${
                  showComparison
                    ? "bg-fuchsia-500 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <div class="flex items-center gap-3">
                  <SplitSquareHorizontal size={24} strokeWidth={2.5} />
                  <span class="font-['Bangers'] text-xl tracking-wide">
                    SPLIT COMPARISON
                  </span>
                </div>
                <div
                  class={`w-12 h-6 border-2 border-black p-0.5 transition-colors ${
                    showComparison ? "bg-black" : "bg-slate-600"
                  }`}
                >
                  <div
                    class={`w-4 h-full bg-white border border-black transition-transform ${
                      showComparison ? "translate-x-6 bg-lime-400" : ""
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Text Input */}
            <div>
              <label class="text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']">
                <span class="bg-orange-500 text-white px-2 py-1 border-2 border-black mr-2">
                  EXTRA
                </span>
                SPECIAL REQUESTS
              </label>
              <textarea
                value={prompt}
                onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
                placeholder="E.g., ADD LASER EYES, GLITCH BACKGROUND, CYBERNETIC JAW..."
                class="w-full bg-slate-900 border-4 border-slate-700 focus:border-lime-400 text-white p-4 font-bold font-['Space_Grotesk'] outline-none transition-colors h-24 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Probability Warning Card */}
          <div class="mt-6 bg-cyan-800/20 border-4 border-cyan-400 text-cyan-200 p-4 shadow-[4px_4px_0px_0px_rgba(34,211,238,0.5)]">
            <div class="flex items-start gap-3">
              <Wrench class="w-6 h-6 flex-shrink-0 mt-1" strokeWidth={2.5} />
              <div>
                <h3 class="font-['Bangers'] text-xl text-cyan-300 mb-2 tracking-wide">
                  MUTATION PROBABILITY WARNING
                </h3>
                <p class="font-['Space_Grotesk'] text-sm leading-relaxed">
                  AI image fusion isn't 100% reliable. Results may vary! If the first attempt fails or the image is poor, try running it 3-4 times with the same inputs before changing your prompt.
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div class="mt-4 bg-red-500 border-4 border-black text-white p-4 flex items-center gap-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse">
              <AlertCircle class="w-8 h-8 flex-shrink-0" />
              <p class="font-mono text-sm uppercase">{errorMsg}</p>
            </div>
          )}

          {/* Wallet Status */}
          {walletConnected && walletAddress && (
            <div class="mt-4 bg-lime-400 border-4 border-black text-black p-3 flex items-center gap-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Wallet class="w-6 h-6 flex-shrink-0" />
              <p class="font-mono text-xs uppercase truncate">
                WALLET: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>
          )}

          {/* Payment Status Indicator */}
          {paymentStatus !== 'idle' && (
            <div class="mt-4 bg-yellow-400 border-4 border-black text-black p-4 flex items-center gap-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Loader2 class="w-6 h-6 animate-spin flex-shrink-0" />
              <div class="font-mono text-sm uppercase">
                {paymentStatus === 'connecting' && "CONNECTING WALLET..."}
                {paymentStatus === 'paying' && "SENDING PAYMENT..."}
                {paymentStatus === 'confirming' && "CONFIRMING TRANSACTION..."}
                {paymentStatus === 'generating' && "VERIFYING PAYMENT & GENERATING..."}
              </div>
            </div>
          )}

          {txHash && (
            <div class="mt-4 bg-blue-500 border-4 border-black text-white p-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p class="font-mono text-xs uppercase">TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}</p>
            </div>
          )}

          {/* Network/Payment Reminder */}
          <div class="mt-4 bg-blue-900/30 border-4 border-blue-500 text-blue-200 p-3 flex items-center gap-3 shadow-[4px_4px_0px_0px_#3b82f6]">
            <Info class="w-6 h-6 flex-shrink-0 text-blue-400" strokeWidth={2.5} />
            <div>
              <p class="font-['Space_Grotesk'] text-xs md:text-sm font-bold tracking-wide">
                NETWORK: <span class="text-white">APECHAIN</span> • CURRENCY: <span class="text-white">APE ($APE)</span>
              </p>
              <p class="text-xs opacity-80 mt-1">
                Please ensure your wallet is connected to ApeChain to pay.
              </p>
            </div>
          </div>

          <div class="mt-8">
            <button
              onClick={handleGenerate}
              disabled={!isFormValid || status === GenerationStatus.LOADING}
              class={`
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
                  <Loader2 class="w-8 h-8 animate-spin" strokeWidth={3} />
                  {paymentStatus === 'connecting' && "CONNECTING..."}
                  {paymentStatus === 'paying' && "PAYING..."}
                  {paymentStatus === 'confirming' && "CONFIRMING..."}
                  {paymentStatus === 'generating' && "GENERATING..."}
                  {paymentStatus === 'idle' && "PROCESSING..."}
                </>
              ) : (
                <>
                  <Zap class="w-8 h-8 fill-black" strokeWidth={3} />
                  {walletConnected ? `PAY ${paymentAmount} APE & MUTATE` : "CONNECT & PAY TO MUTATE"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Output */}
      <div class="lg:col-span-7 flex flex-col h-full">
        <div class="bg-[#1a1b26] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#06b6d4] h-full flex flex-col relative min-h-[600px]">
          {/* Decorative corner */}
          <div class="absolute top-0 right-0 w-16 h-16 border-l-4 border-b-4 border-black bg-cyan-400 flex items-center justify-center">
            <Crown size={32} strokeWidth={2.5} class="text-black" />
          </div>

          <h2 class="text-3xl font-['Bangers'] text-cyan-400 mb-6 flex items-center drop-shadow-md">
            RESULT CHAMBER
          </h2>

          <div class="flex-grow flex items-center justify-center bg-black border-4 border-slate-800 relative overflow-hidden group">
            {/* Grid background inside output */}
            <div
              class="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            ></div>

            {status === GenerationStatus.LOADING && (
              <div class="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center bg-black/90">
                <div class="relative w-32 h-32 mb-8">
                  <div class="absolute inset-0 border-8 border-slate-800 rounded-full"></div>
                  <div class="absolute inset-0 border-8 border-t-lime-400 border-r-fuchsia-500 border-b-cyan-400 border-l-yellow-400 rounded-full animate-spin"></div>
                </div>
                <p class="text-lime-400 font-['Bangers'] text-4xl tracking-wide animate-pulse">
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </p>
              </div>
            )}

            {resultImage ? (
              <div class="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={resultImage}
                  alt="Generated PFP"
                  class="max-w-full max-h-[600px] object-contain border-4 border-white shadow-[0_0_50px_rgba(163,230,53,0.3)]"
                />
                <div class="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-1 font-['Bangers'] border border-white transform rotate-2">
                  GENERATED BY GEMINI
                </div>
              </div>
            ) : (
              <div class="text-center p-8 relative z-10">
                {status === GenerationStatus.IDLE && (
                  <div class="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity duration-300">
                    <div class="w-48 h-48 bg-slate-900 border-4 border-lime-400 rounded-full flex items-center justify-center mb-6 overflow-hidden shadow-[0_0_30px_rgba(163,230,53,0.3)] relative group">
                      <div class="absolute inset-0 bg-lime-400/20 mix-blend-overlay z-10 group-hover:bg-transparent transition-colors"></div>
                      <img 
                        src="/mutant.avif" 
                        alt="Awaiting Subject" 
                        class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                    </div>
                    <p class="font-['Bangers'] text-3xl text-lime-400 tracking-wide drop-shadow-md">
                      AWAITING SUBJECT...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {resultImage && (
            <div class="mt-6 flex gap-4">
              <button
                onClick={handleDownload}
                class="flex-1 bg-yellow-400 text-black py-4 font-['Bangers'] text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-yellow-300 transition-all flex items-center justify-center gap-3"
              >
                <Download class="w-6 h-6" strokeWidth={3} />
                SAVE TO DISK
              </button>
              <button
                onClick={handleGenerate}
                class="px-8 py-4 bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-slate-100 transition-all flex items-center justify-center"
                title="Regenerate"
              >
                <RefreshCw class="w-6 h-6" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
