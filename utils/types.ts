export interface UploadedImage {
  file: File;
  previewUrl: string;
  base64: string;
}

export enum GenerationStatus {
  IDLE = "IDLE",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export interface GenerationResult {
  imageUrl: string;
  description?: string;
}

export type FusionMode = "style" | "balanced" | "cosplay";

// Web3 Type Definitions
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener?: (eventName: string, callback: (...args: any[]) => void) => void;
    };
    RECEIVING_WALLET_ADDRESS?: string;
    APE_PAYMENT_AMOUNT?: string;
  }
}

export {};
