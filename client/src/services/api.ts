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
  // Extended metadata fields from Lightroom version
  title?: string;
  headline?: string;
  instructions?: string;
  location?: string;
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
  maxRetries?: number;
  retryDelay?: number;
  enableRateLimit?: boolean;
  maxConcurrentAnalysis?: number;
  customPrompt?: string;
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
  lens?: string;
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
  retryingFiles: number;
  pendingAnalysis: number;
  completedAnalysis: number;
  failedAnalysis: number;
  errors: Array<{
    file: string;
    error: string;
    type: 'duplicate' | 'processing' | 'unsupported' | 'analysis' | 'retry_exhausted';
    retryCount?: number;
  }>;
  processedImages: ImageMetadata[];
  status: 'processing' | 'completed' | 'error' | 'paused';
  startTime: string;
  endTime?: string;
  estimatedTimeRemaining?: string;
  processingRate?: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  currentPhase: 'discovery' | 'uploading' | 'analysis' | 'finalizing';
  pauseRequested?: boolean;
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

export interface Collection {
  id?: number;
  name: string;
  description?: string;
  type: 'manual' | 'smart' | 'keyword' | 'location' | 'camera' | 'date';
  rules?: CollectionRule[];
  imageCount?: number;
  createdAt: string;
  updatedAt: string;
  userId: number;
}

export interface CollectionRule {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than' | 'between' | 'in_range';
  value: string | number;
  value2?: string | number; // For range operations
}

export interface CollectionResponse {
  success: boolean;
  collection?: Collection;
  collections?: Collection[];
  images?: ImageMetadata[];
  error?: string;
}

export const imageApi = {
  // Upload an image
  uploadImage: async (file: File, customPrompt?: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('image', file);
    if (customPrompt) {
      formData.append('customPrompt', customPrompt);
    }

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

  pauseBatch: async (batchId: string): Promise<BatchResponse> => {
    const response = await api.put(`/images/batch/${batchId}/pause`);
    return response.data;
  },

  resumeBatch: async (batchId: string): Promise<BatchResponse> => {
    const response = await api.put(`/images/batch/${batchId}/resume`);
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

  // Get AI provider info
  getAIProviderInfo: async (): Promise<{ 
    success: boolean; 
    provider: 'gemini' | 'ollama'; 
    status: 'connected' | 'disconnected';
    error?: string;
  }> => {
    const response = await api.get('/images/ai/provider/info');
    return response.data;
  },

  // Get thumbnail URL by path (for gallery)
  getThumbnailUrl: (thumbnailPath: string): string => {
    return `${API_BASE_URL.replace('/api', '')}/thumbnails/${thumbnailPath.split('/').pop()}`;
  },

  // Get thumbnail URL by image ID (for detail page)
  getThumbnailUrlById: (imageId: number): string => {
    return `${API_BASE_URL}/images/${imageId}/thumbnail`;
  },

  // Get full image URL
  getImageUrl: (filePath: string): string => {
    return `${API_BASE_URL.replace('/api', '')}/uploads/${filePath.split('/').pop()}`;
  },

  // Get display URL (original or thumbnail)
  getDisplayUrl: (imageId: number): string => {
    return `${API_BASE_URL}/images/${imageId}/display`;
  },

  // Collections API
  // Get all collections
  getAllCollections: async (): Promise<CollectionResponse> => {
    const response = await api.get('/collections');
    return response.data;
  },

  // Create a new collection
  createCollection: async (collection: Omit<Collection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<CollectionResponse> => {
    const response = await api.post('/collections', collection);
    return response.data;
  },

  // Get a specific collection
  getCollection: async (id: number): Promise<CollectionResponse> => {
    const response = await api.get(`/collections/${id}`);
    return response.data;
  },

  // Update a collection
  updateCollection: async (id: number, updates: Partial<Collection>): Promise<CollectionResponse> => {
    const response = await api.put(`/collections/${id}`, updates);
    return response.data;
  },

  // Delete a collection
  deleteCollection: async (id: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.delete(`/collections/${id}`);
    return response.data;
  },

  // Get images in a collection
  getCollectionImages: async (id: number): Promise<CollectionResponse> => {
    const response = await api.get(`/collections/${id}/images`);
    return response.data;
  },

  // Add image to collection
  addImageToCollection: async (collectionId: number, imageId: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.post(`/collections/${collectionId}/images/${imageId}`);
    return response.data;
  },

  // Remove image from collection
  removeImageFromCollection: async (collectionId: number, imageId: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.delete(`/collections/${collectionId}/images/${imageId}`);
    return response.data;
  },

  // Setup default collections
  setupDefaultCollections: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.post('/collections/setup-defaults');
    return response.data;
  },

  // Auto-organize images into collections
  autoOrganizeImages: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await api.post('/collections/auto-organize');
    return response.data;
  },
};

export default api;
