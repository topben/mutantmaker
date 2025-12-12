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
