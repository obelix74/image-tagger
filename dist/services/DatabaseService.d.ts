import { ImageMetadata, GeminiAnalysis } from '../types';
export declare class DatabaseService {
    private static db;
    static initialize(): Promise<void>;
    private static createTables;
    static insertImage(imageData: Omit<ImageMetadata, 'id'>): Promise<number>;
    static updateImageStatus(id: number, status: string, errorMessage?: string): Promise<void>;
    static getImage(id: number): Promise<ImageMetadata | null>;
    static getAllImages(): Promise<ImageMetadata[]>;
    static insertAnalysis(analysisData: Omit<GeminiAnalysis, 'id'>): Promise<number>;
    static getAnalysis(imageId: number): Promise<GeminiAnalysis | null>;
    private static mapRowToImageMetadata;
    static close(): Promise<void>;
}
//# sourceMappingURL=DatabaseService.d.ts.map