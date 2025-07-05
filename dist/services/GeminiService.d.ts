import { GeminiAnalysis } from '../types';
export declare class GeminiService {
    private static genAI;
    private static model;
    static initialize(): void;
    static analyzeImage(imageBuffer: Buffer, mimeType: string): Promise<Omit<GeminiAnalysis, 'id' | 'imageId' | 'analysisDate'>>;
    static analyzeImageFromPath(imagePath: string): Promise<Omit<GeminiAnalysis, 'id' | 'imageId' | 'analysisDate'>>;
    private static getMimeTypeFromPath;
    private static getFallbackAnalysis;
    static testConnection(): Promise<boolean>;
}
//# sourceMappingURL=GeminiService.d.ts.map