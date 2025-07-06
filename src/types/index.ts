export interface User {
  id?: number;
  username: string;
  email?: string;
  name: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ImageMetadata {
  id?: number;
  filename: string;
  originalName: string;
  filePath: string;
  originalPath?: string;
  thumbnailPath: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadedAt: string;
  processedAt?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  userId: number;
}

export interface ImageExifMetadata {
  id?: number;
  imageId: number;
  // GPS Location
  latitude?: number;
  longitude?: number;
  altitude?: number;
  // Camera Information
  make?: string;
  model?: string;
  software?: string;
  // Photo Settings
  iso?: number;
  fNumber?: number;
  exposureTime?: string;
  focalLength?: number;
  flash?: string;
  whiteBalance?: string;
  // Date/Time
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  // IPTC/XMP Data
  title?: string;
  description?: string;
  keywords?: string;
  creator?: string;
  copyright?: string;
  city?: string;
  state?: string;
  country?: string;
  // Technical
  colorSpace?: string;
  orientation?: number;
  xResolution?: number;
  yResolution?: number;
  resolutionUnit?: string;
  // Raw EXIF JSON for advanced users
  rawExif?: string;
  extractedAt: string;
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

export interface BatchProcessingOptions {
  thumbnailSize?: number;
  geminiImageSize?: number;
  quality?: number;
  skipDuplicates?: boolean;
  parallelConnections?: number;
}

export interface ImageProcessingOptions {
  thumbnailSize: number;
  geminiImageSize: number;
  quality: number;
}

export interface UserResponse {
  id: number;
  username: string;
  email?: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserResponse;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name: string;
  email?: string;
}
