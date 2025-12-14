import React, { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
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
  X,
  UploadCloud,
} from "lucide-react";

// ============ Types ============
const GenerationStatus = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
};

// ============ Gemini Service ============
const convertImageToJpeg = (base64Str) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpegBase64 = canvas.toDataURL("image/jpeg", 0.95);
        const cleanData = jpegBase64.replace(/^data:image\/jpeg;base64,/, "");
        resolve({ mimeType: "image/jpeg", data: cleanData });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () =>
      reject(new Error("Failed to process image. Please try a different file."));
    img.src = base64Str;
  });
};

const generateAnimePFP = async (
  subjectBase64,
  styleBase64,
  userPrompt = "",
  returnComparison = false,
  fusionMode = "balanced"
) => {
  try {
    // Convert images to JPEG format
    const [subject, style] = await Promise.all([
      convertImageToJpeg(subjectBase64),
      convertImageToJpeg(styleBase64),
    ]);

    // Prepare request data
    const requestData = {
      subjectBase64: `data:image/jpeg;base64,${subject.data}`,
      styleBase64: `data:image/jpeg;base64,${style.data}`,
      userPrompt,
      returnComparison,
      fusionMode,
    };

    // Call server API endpoint
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate image");
    }

    const data = await response.json();

    if (!data.success || !data.image) {
      throw new Error("Invalid response from server");
    }

    return data.image;
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};

// ============ Components ============

// Hero Component
const Hero = () => {
  return React.createElement(
    "div",
    { className: "text-center py-12 px-4 relative" },
    React.createElement("div", {
      className: "absolute top-0 left-10 text-6xl opacity-20 rotate-12 animate-pulse",
    }, "🧪"),
    React.createElement("div", {
      className: "absolute bottom-10 right-10 text-6xl opacity-20 -rotate-12 animate-bounce",
    }, "👁️"),
    React.createElement(
      "div",
      {
        className:
          "inline-flex items-center justify-center px-6 py-2 bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-2 mb-6",
      },
      React.createElement(Zap, { className: "w-5 h-5 text-black mr-2 fill-black" }),
      React.createElement(
        "span",
        { className: "text-black font-['Bangers'] text-xl tracking-wider" },
        "ENTER THE LAB"
      )
    ),
    React.createElement(
      "h1",
      {
        className:
          "text-6xl md:text-8xl font-['Bangers'] text-white drop-shadow-[4px_4px_0px_rgba(163,230,53,1)] mb-4 tracking-wide leading-none",
      },
      "MUTANT ",
      React.createElement(
        "span",
        { className: "text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400" },
        "MAKER"
      )
    ),
    React.createElement(
      "div",
      { className: "relative inline-block" },
      React.createElement(
        "p",
        {
          className:
            "font-['Space_Grotesk'] text-xl md:text-2xl font-bold text-cyan-300 bg-slate-900/80 px-4 py-2 border-2 border-cyan-500 rounded-lg transform rotate-1",
        },
        "Fuse your DNA with Anime Goo."
      )
    )
  );
};

// ImageUploader Component
const ImageUploader = ({ label, description, image, onImageUpload, id }) => {
  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onImageUpload({
            file,
            previewUrl: URL.createObjectURL(file),
            base64: reader.result,
          });
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageUpload]
  );

  const handleClear = useCallback(() => {
    onImageUpload(null);
  }, [onImageUpload]);

  return React.createElement(
    "div",
    { className: "flex flex-col gap-2 w-full" },
    React.createElement(
      "div",
      { className: "flex items-center justify-between" },
      React.createElement(
        "label",
        { className: "font-['Bangers'] text-2xl tracking-wide text-white drop-shadow-md" },
        label
      ),
      !image &&
        React.createElement(
          "span",
          {
            className:
              "text-xs font-bold bg-fuchsia-500 text-black px-2 py-0.5 border-2 border-black -rotate-2",
          },
          "REQUIRED"
        )
    ),
    React.createElement(
      "div",
      {
        className: `relative border-4 rounded-xl h-64 flex items-center justify-center overflow-hidden transition-all duration-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] ${
          image
            ? "border-lime-400 bg-slate-900"
            : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-cyan-400 border-dashed"
        }`,
      },
      image
        ? React.createElement(
            "div",
            { className: "relative w-full h-full group" },
            React.createElement("img", {
              src: image.previewUrl,
              alt: "Preview",
              className: "w-full h-full object-cover",
            }),
            React.createElement("div", {
              className:
                "absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]",
            }),
            React.createElement(
              "div",
              {
                className:
                  "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20",
              },
              React.createElement(
                "button",
                {
                  onClick: handleClear,
                  className:
                    "p-3 bg-red-500 border-4 border-black text-white rounded-none hover:bg-red-600 hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                },
                React.createElement(X, { size: 32, strokeWidth: 3 })
              )
            )
          )
        : React.createElement(
            "div",
            {
              className:
                "text-center p-6 cursor-pointer w-full h-full flex flex-col items-center justify-center group",
              onClick: () => document.getElementById(id)?.click(),
            },
            React.createElement(
              "div",
              { className: "relative mb-4" },
              React.createElement("div", {
                className:
                  "absolute inset-0 bg-cyan-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity",
              }),
              React.createElement(
                "div",
                {
                  className:
                    "bg-slate-900 border-4 border-slate-600 group-hover:border-cyan-400 w-20 h-20 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 transition-colors transform group-hover:-translate-y-2 duration-300 rounded-lg",
                },
                React.createElement(UploadCloud, { size: 40, strokeWidth: 2.5 })
              )
            ),
            React.createElement(
              "p",
              {
                className:
                  "text-slate-300 font-bold text-lg group-hover:text-white uppercase tracking-wider",
              },
              description
            ),
            React.createElement(
              "p",
              { className: "text-slate-500 text-xs mt-2 font-mono" },
              "JPG / PNG / WEBP"
            )
          ),
      React.createElement("input", {
        id,
        type: "file",
        accept: "image/*",
        className: "hidden",
        onChange: handleFileChange,
      })
    )
  );
};

// ============ Main App ============
const LOADING_MESSAGES = [
  "BREWING POTIONS...",
  "SPLITTING ATOMS...",
  "WARPING REALITY...",
  "SUMMONING SPIRITS...",
  "GLITCHING THE MATRIX...",
];

const App = () => {
  const [subjectImage, setSubjectImage] = useState(null);
  const [styleImage, setStyleImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [fusionMode, setFusionMode] = useState("balanced");
  const [status, setStatus] = useState(GenerationStatus.IDLE);
  const [resultImage, setResultImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (status === GenerationStatus.LOADING) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleGenerate = useCallback(async () => {
    if (!subjectImage || !styleImage) return;

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
    } catch (err) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  }, [subjectImage, styleImage, prompt, showComparison, fusionMode]);

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

  const modes = [
    { id: "style", icon: Brush, label: "VIBE", color: "bg-yellow-400" },
    { id: "balanced", icon: Sparkles, label: "HYBRID", color: "bg-lime-400" },
    { id: "cosplay", icon: Shirt, label: "FULL SUIT", color: "bg-cyan-400" },
  ];

  return React.createElement(
    "div",
    { className: "min-h-screen pb-20 overflow-x-hidden" },
    // Background noise
    React.createElement("div", {
      className: "fixed inset-0 opacity-[0.03] pointer-events-none z-0",
      style: {
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      },
    }),

    // Main content
    React.createElement(
      "div",
      { className: "w-full max-w-7xl mx-auto p-4 md:p-8 relative z-10" },

      React.createElement(Hero),

      // Main grid
      React.createElement(
        "div",
        { className: "grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8" },
        // Left column
        React.createElement(
          "div",
          { className: "lg:col-span-5 flex flex-col gap-6" },
          // Step 1 panel
          React.createElement(
            "div",
            {
              className:
                "bg-[#1a1b26] p-6 rounded-none border-4 border-black shadow-[8px_8px_0px_0px_#4c1d95] relative",
            },
            React.createElement("div", {
              className: "absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-black",
            }),
            React.createElement("div", {
              className: "absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-black",
            }),
            React.createElement("div", {
              className: "absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-black",
            }),
            React.createElement("div", {
              className: "absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-black",
            }),
            React.createElement(
              "h2",
              {
                className:
                  "text-3xl font-['Bangers'] text-lime-400 mb-6 flex items-center drop-shadow-md",
              },
              "STEP 1: INGREDIENTS"
            ),
            React.createElement(
              "div",
              { className: "space-y-8" },
              React.createElement(ImageUploader, {
                id: "upload-subject",
                label: "THE SUBJECT",
                description: "DROP HUMAN PHOTO",
                image: subjectImage,
                onImageUpload: setSubjectImage,
              }),
              React.createElement(ImageUploader, {
                id: "upload-style",
                label: "THE MUTAGEN",
                description: "DROP ANIME REF",
                image: styleImage,
                onImageUpload: setStyleImage,
              })
            )
          ),
          // Step 2 panel
          React.createElement(
            "div",
            {
              className:
                "bg-[#1a1b26] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#be185d]",
            },
            React.createElement(
              "h2",
              { className: "text-3xl font-['Bangers'] text-fuchsia-400 mb-6 drop-shadow-md" },
              "STEP 2: CALIBRATION"
            ),
            React.createElement(
              "div",
              { className: "space-y-6" },
              // Mode selector
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  {
                    className:
                      "text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']",
                  },
                  React.createElement(
                    "span",
                    { className: "bg-blue-600 text-white px-2 py-1 border-2 border-black mr-2" },
                    "MODE"
                  ),
                  "MUTATION LEVEL"
                ),
                React.createElement(
                  "div",
                  { className: "grid grid-cols-3 gap-3" },
                  modes.map((mode) =>
                    React.createElement(
                      "button",
                      {
                        key: mode.id,
                        onClick: () => setFusionMode(mode.id),
                        className: `flex flex-col items-center justify-center py-4 px-2 border-4 border-black transition-all duration-200 ${
                          fusionMode === mode.id
                            ? `${mode.color} text-black -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`,
                      },
                      React.createElement(mode.icon, { size: 24, strokeWidth: 2.5, className: "mb-1" }),
                      React.createElement(
                        "span",
                        { className: "font-['Bangers'] tracking-wider text-lg" },
                        mode.label
                      )
                    )
                  )
                )
              ),
              // Comparison toggle
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  {
                    className:
                      "text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']",
                  },
                  React.createElement(
                    "span",
                    { className: "bg-purple-600 text-white px-2 py-1 border-2 border-black mr-2" },
                    "VIEW"
                  ),
                  "OUTPUT FORMAT"
                ),
                React.createElement(
                  "button",
                  {
                    onClick: () => setShowComparison(!showComparison),
                    className: `w-full flex items-center justify-between p-4 border-4 border-black transition-all duration-200 ${
                      showComparison
                        ? "bg-fuchsia-500 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`,
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    React.createElement(SplitSquareHorizontal, { size: 24, strokeWidth: 2.5 }),
                    React.createElement(
                      "span",
                      { className: "font-['Bangers'] text-xl tracking-wide" },
                      "SPLIT COMPARISON"
                    )
                  ),
                  React.createElement(
                    "div",
                    {
                      className: `w-12 h-6 border-2 border-black p-0.5 transition-colors ${
                        showComparison ? "bg-black" : "bg-slate-600"
                      }`,
                    },
                    React.createElement("div", {
                      className: `w-4 h-full bg-white border border-black transition-transform ${
                        showComparison ? "translate-x-6 bg-lime-400" : ""
                      }`,
                    })
                  )
                )
              ),
              // Text input
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  {
                    className:
                      "text-sm font-bold text-white uppercase tracking-widest mb-3 block font-['Space_Grotesk']",
                  },
                  React.createElement(
                    "span",
                    { className: "bg-orange-500 text-white px-2 py-1 border-2 border-black mr-2" },
                    "EXTRA"
                  ),
                  "SPECIAL REQUESTS"
                ),
                React.createElement("textarea", {
                  value: prompt,
                  onChange: (e) => setPrompt(e.target.value),
                  placeholder: "E.g., ADD LASER EYES, GLITCH BACKGROUND, CYBERNETIC JAW...",
                  className:
                    "w-full bg-slate-900 border-4 border-slate-700 focus:border-lime-400 text-white p-4 font-bold font-['Space_Grotesk'] outline-none transition-colors h-24 placeholder:text-slate-600",
                })
              )
            ),
            // Error message
            errorMsg &&
              React.createElement(
                "div",
                {
                  className:
                    "mt-4 bg-red-500 border-4 border-black text-white p-4 flex items-center gap-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse",
                },
                React.createElement(AlertCircle, { className: "w-8 h-8 flex-shrink-0" }),
                React.createElement(
                  "p",
                  { className: "font-mono text-sm uppercase" },
                  errorMsg
                )
              ),
            // Generate button
            React.createElement(
              "div",
              { className: "mt-8" },
              React.createElement(
                "button",
                {
                  onClick: handleGenerate,
                  disabled: !isFormValid || status === GenerationStatus.LOADING,
                  className: `w-full py-5 font-['Bangers'] text-3xl tracking-widest border-4 border-black transition-all duration-200 flex items-center justify-center gap-4 relative overflow-hidden ${
                    isFormValid
                      ? "bg-lime-400 hover:bg-lime-300 text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-none"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed border-slate-600"
                  }`,
                },
                status === GenerationStatus.LOADING
                  ? React.createElement(
                      React.Fragment,
                      null,
                      React.createElement(Loader2, { className: "w-8 h-8 animate-spin", strokeWidth: 3 }),
                      "PROCESSING..."
                    )
                  : React.createElement(
                      React.Fragment,
                      null,
                      React.createElement(Zap, { className: "w-8 h-8 fill-black", strokeWidth: 3 }),
                      "MUTATE NOW"
                    )
              )
            )
          )
        ),

        // Right column - Output
        React.createElement(
          "div",
          { className: "lg:col-span-7 flex flex-col h-full" },
          React.createElement(
            "div",
            {
              className:
                "bg-[#1a1b26] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#06b6d4] h-full flex flex-col relative min-h-[600px]",
            },
            React.createElement(
              "div",
              {
                className:
                  "absolute top-0 right-0 w-16 h-16 border-l-4 border-b-4 border-black bg-cyan-400 flex items-center justify-center",
              },
              React.createElement(Crown, { size: 32, strokeWidth: 2.5, className: "text-black" })
            ),
            React.createElement(
              "h2",
              {
                className:
                  "text-3xl font-['Bangers'] text-cyan-400 mb-6 flex items-center drop-shadow-md",
              },
              "RESULT CHAMBER"
            ),
            React.createElement(
              "div",
              {
                className:
                  "flex-grow flex items-center justify-center bg-black border-4 border-slate-800 relative overflow-hidden group",
              },
              React.createElement("div", {
                className: "absolute inset-0 opacity-20",
                style: {
                  backgroundImage:
                    "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                },
              }),
              status === GenerationStatus.LOADING &&
                React.createElement(
                  "div",
                  {
                    className:
                      "absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center bg-black/90",
                  },
                  React.createElement(
                    "div",
                    { className: "relative w-32 h-32 mb-8" },
                    React.createElement("div", {
                      className: "absolute inset-0 border-8 border-slate-800 rounded-full",
                    }),
                    React.createElement("div", {
                      className:
                        "absolute inset-0 border-8 border-t-lime-400 border-r-fuchsia-500 border-b-cyan-400 border-l-yellow-400 rounded-full animate-spin",
                    })
                  ),
                  React.createElement(
                    "p",
                    { className: "text-lime-400 font-['Bangers'] text-4xl tracking-wide animate-pulse" },
                    LOADING_MESSAGES[loadingMsgIndex]
                  )
                ),
              resultImage
                ? React.createElement(
                    "div",
                    { className: "relative w-full h-full flex items-center justify-center p-4" },
                    React.createElement("img", {
                      src: resultImage,
                      alt: "Generated PFP",
                      className:
                        "max-w-full max-h-[600px] object-contain border-4 border-white shadow-[0_0_50px_rgba(163,230,53,0.3)]",
                    }),
                    React.createElement(
                      "div",
                      {
                        className:
                          "absolute bottom-4 right-4 bg-black/80 text-white px-3 py-1 font-['Bangers'] border border-white transform rotate-2",
                      },
                      "GENERATED BY GEMINI"
                    )
                  )
                : React.createElement(
                    "div",
                    { className: "text-center p-8 relative z-10" },
                    status === GenerationStatus.IDLE &&
                      React.createElement(
                        "div",
                        { className: "flex flex-col items-center opacity-50" },
                        React.createElement(
                          "div",
                          {
                            className:
                              "w-32 h-32 bg-slate-900 border-4 border-slate-700 rounded-full flex items-center justify-center mb-6",
                          },
                          React.createElement("span", { className: "text-6xl grayscale" }, "🦍")
                        ),
                        React.createElement(
                          "p",
                          { className: "font-['Bangers'] text-2xl text-slate-500 tracking-wide" },
                          "AWAITING SUBJECT..."
                        )
                      )
                  )
            ),
            resultImage &&
              React.createElement(
                "div",
                { className: "mt-6 flex gap-4" },
                React.createElement(
                  "button",
                  {
                    onClick: handleDownload,
                    className:
                      "flex-1 bg-yellow-400 text-black py-4 font-['Bangers'] text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-yellow-300 transition-all flex items-center justify-center gap-3",
                  },
                  React.createElement(Download, { className: "w-6 h-6", strokeWidth: 3 }),
                  "SAVE TO DISK"
                ),
                React.createElement(
                  "button",
                  {
                    onClick: handleGenerate,
                    className:
                      "px-8 py-4 bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-slate-100 transition-all flex items-center justify-center",
                    title: "Regenerate",
                  },
                  React.createElement(RefreshCw, { className: "w-6 h-6", strokeWidth: 3 })
                )
              )
          )
        )
      ),
      // Footer
      React.createElement(
        "div",
        { className: "mt-16 text-center pb-8" },
        React.createElement(
          "p",
          {
            className:
              "text-slate-600 font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase",
          },
          "Powered by Google Gemini // Neural Mutagen Engine v2.5 // Running on Deno 🦕"
        )
      )
    )
  );
};

// ============ Mount App ============
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(React.createElement(React.StrictMode, null, React.createElement(App)));
