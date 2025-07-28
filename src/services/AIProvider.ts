export interface AnalysisResult {
  description: string;
  caption: string;
  keywords: string[];
  confidence: number;
  title?: string;
  headline?: string;
  instructions?: string;
  location?: string;
}

export interface AIProvider {
  analyzeImage(
    imageBuffer: Buffer, 
    mimeType: string, 
    useFallback?: boolean, 
    customPrompt?: string, 
    metadata?: any
  ): Promise<AnalysisResult>;
  
  analyzeImageFromPath(
    imagePath: string, 
    useFallback?: boolean, 
    customPrompt?: string, 
    metadata?: any
  ): Promise<AnalysisResult>;
  
  testConnection(): Promise<boolean>;
  initialize(): void;
}

export abstract class BaseAIProvider implements AIProvider {
  protected static readonly MAX_RETRIES = 3;
  protected static readonly MIN_REQUEST_INTERVAL = 1000;
  protected static lastRequestTime: number = 0;

  abstract initialize(): void;
  abstract testConnection(): Promise<boolean>;
  abstract analyzeImage(
    imageBuffer: Buffer, 
    mimeType: string, 
    useFallback?: boolean, 
    customPrompt?: string, 
    metadata?: any
  ): Promise<AnalysisResult>;
  abstract analyzeImageFromPath(
    imagePath: string, 
    useFallback?: boolean, 
    customPrompt?: string, 
    metadata?: any
  ): Promise<AnalysisResult>;

  protected async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - BaseAIProvider.lastRequestTime;

    if (timeSinceLastRequest < BaseAIProvider.MIN_REQUEST_INTERVAL) {
      const delayTime = BaseAIProvider.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${delayTime}ms before next AI request`);
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }

    BaseAIProvider.lastRequestTime = Date.now();
  }

  protected getFallbackAnalysis(): AnalysisResult {
    return {
      description: 'Image analysis temporarily unavailable. Please try again later.',
      caption: 'Image uploaded successfully',
      keywords: ['image', 'photo', 'upload', 'content'],
      confidence: 0.1
    };
  }

  protected getMimeTypeFromPath(imagePath: string): string {
    const ext = imagePath.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'tiff':
      case 'tif':
        return 'image/tiff';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  protected getSeason(month: number): string {
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  protected getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 8) return 'early morning';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    if (hour >= 20 && hour < 22) return 'dusk';
    return 'night';
  }

  protected buildMetadataContext(metadata: any): string | null {
    if (!metadata) return null;

    const contextParts: string[] = [];

    if (metadata.make || metadata.model || metadata.lens) {
      const camera = [metadata.make, metadata.model].filter(Boolean).join(' ');
      const lens = metadata.lens;
      
      if (camera && lens) {
        contextParts.push(`Camera: ${camera} with ${lens}`);
      } else if (camera) {
        contextParts.push(`Camera: ${camera}`);
      } else if (lens) {
        contextParts.push(`Lens: ${lens}`);
      }
    }

    const settings: string[] = [];
    if (metadata.iso) settings.push(`ISO ${metadata.iso}`);
    if (metadata.fNumber) settings.push(`f/${metadata.fNumber}`);
    if (metadata.exposureTime) settings.push(`${metadata.exposureTime}s`);
    if (metadata.focalLength) settings.push(`${metadata.focalLength}mm`);
    
    if (settings.length > 0) {
      contextParts.push(`Settings: ${settings.join(', ')}`);
    }

    if (metadata.gps && metadata.gps.latitude && metadata.gps.longitude) {
      contextParts.push(`GPS: ${metadata.gps.latitude}, ${metadata.gps.longitude}`);
    } else if (metadata.latitude && metadata.longitude) {
      contextParts.push(`GPS: ${metadata.latitude}, ${metadata.longitude}`);
    }

    if (metadata.city || metadata.state || metadata.country) {
      const location = [metadata.city, metadata.state, metadata.country].filter(Boolean).join(', ');
      contextParts.push(`Location: ${location}`);
    }

    if (metadata.creator || metadata.copyright) {
      const rights = [metadata.creator, metadata.copyright].filter(Boolean).join(' - ');
      contextParts.push(`Rights: ${rights}`);
    }

    if (metadata.dateTimeOriginal) {
      try {
        const date = new Date(metadata.dateTimeOriginal);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const season = this.getSeason(month);
        const timeOfDay = this.getTimeOfDay(date.getHours());
        contextParts.push(`Captured: ${year} ${season}, ${timeOfDay}`);
      } catch (e) {
        // Ignore date parsing errors
      }
    }

    if (contextParts.length === 0) return null;

    return `METADATA CONTEXT for AI analysis:
${contextParts.join('\n')}

Please use this technical metadata to enhance your analysis with relevant context about the camera settings, location, and shooting conditions.`;
  }
}