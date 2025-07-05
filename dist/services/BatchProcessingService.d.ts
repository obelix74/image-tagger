import { ImageMetadata } from '../types';
export interface BatchProcessingOptions {
    thumbnailSize?: number;
    geminiImageSize?: number;
    quality?: number;
    skipDuplicates?: boolean;
    parallelConnections?: number;
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
export declare class BatchProcessingService {
    private static activeBatches;
    private static readonly SUPPORTED_EXTENSIONS;
    static startBatchProcessing(folderPath: string, options?: BatchProcessingOptions): Promise<string>;
    static getBatchStatus(batchId: string): Promise<BatchProcessingResult | null>;
    static getAllBatches(): Promise<BatchJob[]>;
    private static processBatchInBackground;
    private static discoverImageFiles;
    private static processFile;
    private static processImagesInParallel;
    private static generateSafeFilename;
    private static cleanupUploadedFile;
    private static processImageAnalysisInBackground;
    static deleteBatch(batchId: string): Promise<boolean>;
    static clearCompletedBatches(): Promise<number>;
}
//# sourceMappingURL=BatchProcessingService.d.ts.map