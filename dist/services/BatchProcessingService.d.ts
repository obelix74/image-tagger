import { ImageMetadata } from '../types';
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
export declare class BatchProcessingService {
    private static activeBatches;
    private static analysisQueue;
    private static activeAnalysis;
    private static processingMetrics;
    private static rateLimiter;
    private static readonly SUPPORTED_EXTENSIONS;
    private static readonly DEFAULT_OPTIONS;
    static startBatchProcessing(folderPath: string, options?: BatchProcessingOptions): Promise<string>;
    static getBatchStatus(batchId: string): Promise<BatchProcessingResult | null>;
    static getAllBatches(): Promise<BatchJob[]>;
    static pauseBatch(batchId: string): Promise<boolean>;
    static resumeBatch(batchId: string): Promise<boolean>;
    private static getMemoryUsage;
    private static updateProcessingMetrics;
    private static processBatchInBackground;
    private static discoverImageFiles;
    private static processFile;
    private static processImagesInParallel;
    private static processImagesInParallelEnhanced;
    private static processAnalysisQueue;
    private static processAnalysisTaskWithRetry;
    private static waitForAnalysisCompletion;
    private static applyRateLimit;
    private static cleanupBatchTracking;
    private static formatDuration;
    private static generateSafeFilename;
    private static cleanupUploadedFile;
    private static processImageAnalysisInBackgroundEnhanced;
    private static processImageAnalysisInBackground;
    static deleteBatch(batchId: string): Promise<boolean>;
    static clearCompletedBatches(): Promise<number>;
}
//# sourceMappingURL=BatchProcessingService.d.ts.map