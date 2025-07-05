import { ImageProcessingOptions } from '../types';
export declare class ImageProcessingService {
    private static readonly SUPPORTED_FORMATS;
    static isSupported(filename: string): boolean;
    static isRawFormat(filename: string): boolean;
    static getMimeType(filename: string): string;
    static processImage(inputPath: string, outputDir: string, thumbnailDir: string, filename: string, options: ImageProcessingOptions): Promise<{
        processedPath: string;
        thumbnailPath: string;
        width: number;
        height: number;
        metadata?: any;
    }>;
    private static extractRawPreview;
    static resizeForGemini(imagePath: string, maxSize?: number): Promise<Buffer>;
    private static getProcessedFilename;
    private static getThumbnailFilename;
    private static sanitizeFilename;
    static ensureDirectoryExists(dirPath: string): Promise<void>;
    static deleteFile(filePath: string): Promise<void>;
    static getFileSize(filePath: string): Promise<number>;
    private static extractComprehensiveMetadata;
    private static convertGPSCoordinate;
}
//# sourceMappingURL=ImageProcessingService.d.ts.map