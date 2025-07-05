import { GeminiAnalysis } from '../types';
export declare class GeminiService {
    private static genAI;
    private static model;
    private static lastRequestTime;
    private static readonly MIN_REQUEST_INTERVAL;
    private static readonly MAX_RETRIES;
    static initialize(): void;
    private static rateLimitDelay;
    static analyzeImage(imageBuffer: Buffer, mimeType: string, useFallback?: boolean): Promise<Omit<GeminiAnalysis, 'id' | 'imageId' | 'analysisDate'>>;
    static analyzeImageFromPath(imagePath: string, useFallback?: boolean): Promise<Omit<GeminiAnalysis, 'id' | 'imageId' | 'analysisDate'>>;
    private static getMimeTypeFromPath;
    private static getFallbackAnalysis;
    static testConnection(): Promise<boolean>;
    private static prepareImageForGemini;
}
//# sourceMappingURL=GeminiService.d.ts.map