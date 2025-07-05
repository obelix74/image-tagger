export interface ImageMetadata {
  id?: number;
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadedAt: string;
  processedAt?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export interface GeminiAnalysis {
  id?: number;
  imageId: number;
  description: string;
  caption: string;
  keywords: string[];
  confidence?: number;
  analysisDate: string;
}

export interface ProcessingStatus {
  imageId: number;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  progress?: number;
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  image?: ImageMetadata;
  error?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: GeminiAnalysis;
  error?: string;
}

export interface SupportedFormat {
  extension: string;
  mimeType: string;
  isRaw: boolean;
}

export interface ImageProcessingOptions {
  thumbnailSize: number;
  geminiImageSize: number;
  quality: number;
}
