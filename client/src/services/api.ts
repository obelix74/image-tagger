import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface ImageMetadata {
  id: number;
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
}

export interface ImagesResponse {
  success: boolean;
  images?: ImageMetadata[];
  error?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: GeminiAnalysis;
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

  // Get all images
  getAllImages: async (): Promise<ImagesResponse> => {
    const response = await api.get('/images');
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
};

export default api;
