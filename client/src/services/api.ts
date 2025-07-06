import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Important for session cookies
});

export interface ImageMetadata {
  id: number;
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
}

export interface GeminiAnalysis {
  id: number;
  imageId: number;
  description: string;
  caption: string;
  keywords: string[];
  confidence?: number;
  analysisDate: string;
}

export interface UploadResponse {
  success: boolean;
  image?: ImageMetadata;
  error?: string;
  duplicate?: boolean;
  existingImage?: ImageMetadata;
}

export interface ImagesResponse {
  success: boolean;
  images?: ImageMetadata[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: GeminiAnalysis;
  error?: string;
}

export interface KeywordSearchResponse {
  success: boolean;
  images?: ImageMetadata[];
  keyword?: string;
  count?: number;
  error?: string;
}

export interface GeneralSearchResponse {
  success: boolean;
  images?: ImageMetadata[];
  searchTerm?: string;
  count?: number;
  error?: string;
}

export interface BatchProcessingOptions {
  thumbnailSize?: number;
  geminiImageSize?: number;
  quality?: number;
  skipDuplicates?: boolean;
  parallelConnections?: number;
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

export interface BatchProcessingResult {
  batchId: string;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  duplicateFiles: number;
  errorFiles: number;
  errors: Array<{
    file: string;
    error: string;
    type: 'duplicate' | 'processing' | 'unsupported';
  }>;
  processedImages: ImageMetadata[];
  status: 'processing' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
}

export interface BatchJob {
  id: string;
  folderPath: string;
  options: BatchProcessingOptions;
  result: BatchProcessingResult;
  createdAt: string;
}

export interface BatchResponse {
  success: boolean;
  batchId?: string;
  result?: BatchProcessingResult;
  batches?: BatchJob[];
  message?: string;
  error?: string;
}

export const imageApi = {
  // Upload an image
  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Get all images with pagination
  getAllImages: async (page?: number, limit?: number): Promise<ImagesResponse> => {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());

    const url = params.toString() ? `/images?${params.toString()}` : '/images';
    const response = await api.get(url);
    return response.data;
  },

  // Get specific image
  getImage: async (id: number): Promise<{ success: boolean; image?: ImageMetadata; error?: string }> => {
    const response = await api.get(`/images/${id}`);
    return response.data;
  },

  // Get image analysis
  getAnalysis: async (id: number): Promise<AnalysisResponse> => {
    const response = await api.get(`/images/${id}/analysis`);
    return response.data;
  },

  // Trigger manual analysis
  analyzeImage: async (id: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.post(`/images/${id}/analyze`);
    return response.data;
  },

  // Search images by keyword
  searchByKeyword: async (keyword: string): Promise<KeywordSearchResponse> => {
    const response = await api.get(`/images/search/keyword/${encodeURIComponent(keyword)}`);
    return response.data;
  },

  // General search across all metadata
  searchImages: async (searchTerm: string): Promise<GeneralSearchResponse> => {
    const response = await api.get(`/images/search?q=${encodeURIComponent(searchTerm)}`);
    return response.data;
  },

  // Batch processing
  startBatchProcessing: async (folderPath: string, options?: BatchProcessingOptions): Promise<BatchResponse> => {
    const response = await api.post('/images/batch/process', { folderPath, options });
    return response.data;
  },

  getBatchStatus: async (batchId: string): Promise<BatchResponse> => {
    const response = await api.get(`/images/batch/${batchId}`);
    return response.data;
  },

  getAllBatches: async (): Promise<BatchResponse> => {
    const response = await api.get('/images/batch');
    return response.data;
  },

  deleteBatch: async (batchId: string): Promise<BatchResponse> => {
    const response = await api.delete(`/images/batch/${batchId}`);
    return response.data;
  },

  // Get image metadata
  getImageMetadata: async (imageId: number): Promise<{ success: boolean; metadata?: ImageExifMetadata; error?: string }> => {
    const response = await api.get(`/images/${imageId}/metadata`);
    return response.data;
  },

  // Test Gemini connection
  testGemini: async (): Promise<{ success: boolean; connected?: boolean; message?: string; error?: string }> => {
    const response = await api.get('/images/test/gemini');
    return response.data;
  },

  // Get thumbnail URL
  getThumbnailUrl: (thumbnailPath: string): string => {
    return `${API_BASE_URL.replace('/api', '')}/thumbnails/${thumbnailPath.split('/').pop()}`;
  },

  // Get full image URL
  getImageUrl: (filePath: string): string => {
    return `${API_BASE_URL.replace('/api', '')}/uploads/${filePath.split('/').pop()}`;
  },

  // Get display URL (original or thumbnail)
  getDisplayUrl: (imageId: number): string => {
    return `${API_BASE_URL}/images/${imageId}/display`;
  },
};

export default api;
