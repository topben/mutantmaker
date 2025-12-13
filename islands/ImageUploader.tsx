import { X, UploadCloud } from "lucide-preact";
import type { UploadedImage } from "../utils/types.ts";

interface ImageUploaderProps {
  label: string;
  description: string;
  image: UploadedImage | null;
  onImageUpload: (img: UploadedImage | null) => void;
  id: string;
}

export default function ImageUploader({
  label,
  description,
  image,
  onImageUpload,
  id,
}: ImageUploaderProps) {
  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload({
          file,
          previewUrl: URL.createObjectURL(file),
          base64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    onImageUpload(null);
  };

  return (
    <div class="flex flex-col gap-2 w-full">
      <div class="flex items-center justify-between">
        <label class="font-['Bangers'] text-2xl tracking-wide text-white drop-shadow-md">
          {label}
        </label>
        {!image && (
          <span class="text-xs font-bold bg-fuchsia-500 text-black px-2 py-0.5 border-2 border-black -rotate-2">
            REQUIRED
          </span>
        )}
      </div>

      <div
        class={`
          relative border-4 rounded-xl h-64 flex items-center justify-center overflow-hidden transition-all duration-300
          shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]
          ${
            image
              ? "border-lime-400 bg-slate-900"
              : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-cyan-400 border-dashed"
          }
        `}
      >
        {image ? (
          <div class="relative w-full h-full group">
            <img
              src={image.previewUrl}
              alt="Preview"
              class="w-full h-full object-cover"
            />
            {/* Scanline overlay effect */}
            <div
              class="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]"
            />

            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
              <button
                onClick={handleClear}
                class="p-3 bg-red-500 border-4 border-black text-white rounded-none hover:bg-red-600 hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <X size={32} strokeWidth={3} />
              </button>
            </div>
          </div>
        ) : (
          <div
            class="text-center p-6 cursor-pointer w-full h-full flex flex-col items-center justify-center group"
            onClick={() => document.getElementById(id)?.click()}
          >
            <div class="relative mb-4">
              <div class="absolute inset-0 bg-cyan-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div class="bg-slate-900 border-4 border-slate-600 group-hover:border-cyan-400 w-20 h-20 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 transition-colors transform group-hover:-translate-y-2 duration-300 rounded-lg">
                <UploadCloud size={40} strokeWidth={2.5} />
              </div>
            </div>
            <p class="text-slate-300 font-bold text-lg group-hover:text-white uppercase tracking-wider">
              {description}
            </p>
            <p class="text-slate-500 text-xs mt-2 font-mono">
              JPG / PNG / WEBP
            </p>
          </div>
        )}

        <input
          id={id}
          type="file"
          accept="image/*"
          class="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
