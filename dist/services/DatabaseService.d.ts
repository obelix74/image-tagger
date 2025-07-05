import { ImageMetadata, GeminiAnalysis, ImageExifMetadata } from '../types';
export declare class DatabaseService {
    private static db;
    static initialize(): Promise<void>;
    private static createTables;
    static insertImage(imageData: Omit<ImageMetadata, 'id'>): Promise<number>;
    static updateImageStatus(id: number, status: string, errorMessage?: string): Promise<void>;
    static getImage(id: number): Promise<ImageMetadata | null>;
    static getAllImages(page?: number, limit?: number): Promise<{
        images: ImageMetadata[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static findDuplicateImage(originalName: string, fileSize: number): Promise<ImageMetadata | null>;
    static searchImagesByKeyword(keyword: string): Promise<ImageMetadata[]>;
    static searchImages(searchTerm: string): Promise<ImageMetadata[]>;
    static insertAnalysis(analysisData: Omit<GeminiAnalysis, 'id'>): Promise<number>;
    static getAnalysis(imageId: number): Promise<GeminiAnalysis | null>;
    private static mapRowToImageMetadata;
    static insertImageMetadata(metadataData: Omit<ImageExifMetadata, 'id'>): Promise<number>;
    static getImageMetadata(imageId: number): Promise<ImageExifMetadata | null>;
    private static mapRowToImageExifMetadata;
    static close(): Promise<void>;
}
//# sourceMappingURL=DatabaseService.d.ts.map