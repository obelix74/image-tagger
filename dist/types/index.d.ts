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
export interface ImageExifMetadata {
    id?: number;
    imageId: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    make?: string;
    model?: string;
    software?: string;
    iso?: number;
    fNumber?: number;
    exposureTime?: string;
    focalLength?: number;
    flash?: string;
    whiteBalance?: string;
    dateTimeOriginal?: string;
    dateTimeDigitized?: string;
    title?: string;
    description?: string;
    keywords?: string;
    creator?: string;
    copyright?: string;
    city?: string;
    state?: string;
    country?: string;
    colorSpace?: string;
    orientation?: number;
    xResolution?: number;
    yResolution?: number;
    resolutionUnit?: string;
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
//# sourceMappingURL=index.d.ts.map