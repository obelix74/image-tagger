import fs from 'fs/promises';
import { BaseAIProvider, AnalysisResult } from './AIProvider';
import { PromptPresets } from './PromptPresets';

export class OllamaProvider extends BaseAIProvider {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor() {
    super();
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llava:latest';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '300000'); // 5 minutes default
  }

  initialize(): void {
    // Ollama doesn't require initialization like API keys
    console.log(`Ollama provider initialized with model: ${this.model} at ${this.baseUrl}`);
  }

  async analyzeImage(imageBuffer: Buffer, mimeType: string, useFallback: boolean = false, customPrompt?: string, metadata?: any): Promise<AnalysisResult> {
    // If fallback is requested, return fallback immediately
    if (useFallback) {
      console.log('Using fallback analysis as requested');
      return super.getFallbackAnalysis();
    }

    let prompt = customPrompt || PromptPresets.getDefaultPrompt();
    
    // Enhance prompt with EXIF metadata context if available
    if (metadata) {
      const metadataContext = super.buildMetadataContext(metadata);
      if (metadataContext) {
        prompt = `${metadataContext}\n\n${prompt}`;
      }
    }

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= BaseAIProvider.MAX_RETRIES; attempt++) {
      try {
        // Apply rate limiting
        await super.rateLimitDelay();

        console.log(`Ollama API request attempt ${attempt}/${BaseAIProvider.MAX_RETRIES}`);

        // Make request to Ollama API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            prompt: prompt,
            images: [base64Image],
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 1000
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Ollama API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.response) {
          throw new Error('No response from Ollama API');
        }

        // Parse the response to extract structured data
        const analysisResult = this.parseResponse(result.response);

        console.log(`Ollama API request successful on attempt ${attempt}`);
        return analysisResult;

      } catch (error) {
        lastError = error as Error;
        console.error(`Ollama API error on attempt ${attempt}:`, error);

        // If this is the last attempt, break
        if (attempt === BaseAIProvider.MAX_RETRIES) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // All retries failed, throw the last error
    console.error(`Ollama API failed after ${BaseAIProvider.MAX_RETRIES} attempts`);
    throw new Error(`Ollama AI analysis failed: ${lastError?.message || 'Unknown error'}`);
  }

  async analyzeImageFromPath(imagePath: string, useFallback: boolean = false, customPrompt?: string, metadata?: any): Promise<AnalysisResult> {
    const imageBuffer = await fs.readFile(imagePath);
    const mimeType = super.getMimeTypeFromPath(imagePath);

    return this.analyzeImage(imageBuffer, mimeType, useFallback, customPrompt, metadata);
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log(`Testing Ollama connection at ${this.baseUrl}`);

      // First, check if Ollama is running
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error(`Ollama server not accessible: ${response.status}`);
        return false;
      }

      const tags = await response.json();
      
      // Check if our model is available
      const modelExists = tags.models?.some((model: any) => 
        model.name === this.model || model.name.startsWith(this.model.split(':')[0])
      );

      if (!modelExists) {
        console.error(`Model ${this.model} not found in Ollama. Available models:`, 
          tags.models?.map((m: any) => m.name) || 'none');
        return false;
      }

      // Test with a simple image analysis
      const testImageBuffer = this.createMinimalTestImage();
      
      const testResponse = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: 'What do you see in this image? Respond with just "test successful"',
          images: [testImageBuffer.toString('base64')],
          stream: false,
          options: {
            num_predict: 10
          }
        })
      });

      if (!testResponse.ok) {
        console.error(`Ollama test request failed: ${testResponse.status}`);
        return false;
      }

      const testResult = await testResponse.json();
      console.log('Ollama connection test successful');
      return testResult.response && testResult.response.length > 0;

    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  private parseResponse(response: string): AnalysisResult {
    try {
      // First, try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0]);
        
        // Validate the response structure
        if (analysisData.caption && Array.isArray(analysisData.keywords)) {
          return {
            description: analysisData.headline || analysisData.description || analysisData.caption,
            caption: analysisData.caption,
            keywords: analysisData.keywords,
            confidence: analysisData.confidence || 0.8,
            title: analysisData.title,
            headline: analysisData.headline,
            instructions: analysisData.instructions,
            location: analysisData.location
          };
        }
      }

      // If no valid JSON, try to parse structured text response
      return this.parseTextResponse(response);

    } catch (error) {
      console.warn('Failed to parse Ollama response as JSON, falling back to text parsing:', error);
      return this.parseTextResponse(response);
    }
  }

  private parseTextResponse(response: string): AnalysisResult {
    // Try to extract information from natural language response
    const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let caption = '';
    let description = '';
    let keywords: string[] = [];
    let title = '';
    let headline = '';

    // Look for common patterns in the response
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('caption:') || lowerLine.includes('description:')) {
        caption = line.split(':').slice(1).join(':').trim();
      } else if (lowerLine.includes('keywords:') || lowerLine.includes('tags:')) {
        const keywordText = line.split(':').slice(1).join(':').trim();
        keywords = keywordText.split(',').map(k => k.trim()).filter(k => k.length > 0);
      } else if (lowerLine.includes('title:')) {
        title = line.split(':').slice(1).join(':').trim();
      } else if (lowerLine.includes('headline:')) {
        headline = line.split(':').slice(1).join(':').trim();
      } else if (!caption && line.length > 10) {
        // Use the first substantial line as caption if no explicit caption found
        caption = line;
      }
    }

    // If we still don't have a caption, use the full response truncated
    if (!caption) {
      caption = response.substring(0, 200).trim();
      if (response.length > 200) caption += '...';
    }

    // If we don't have description, use caption
    if (!description) {
      description = caption;
    }

    // Generate some basic keywords if none were found
    if (keywords.length === 0) {
      keywords = this.extractBasicKeywords(response);
    }

    return {
      description,
      caption,
      keywords,
      confidence: 0.7, // Lower confidence for text parsing
      title: title || undefined,
      headline: headline || undefined,
      instructions: undefined,
      location: undefined
    };
  }

  private extractBasicKeywords(text: string): string[] {
    // Extract potential keywords from the text
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const commonWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'there', 'would', 'could', 'should', 'about', 'after', 'before', 'during', 'through', 'between', 'under', 'above']);
    
    const keywords = [...new Set(words)]
      .filter(word => !commonWords.has(word))
      .slice(0, 10); // Limit to 10 keywords

    return keywords.length > 0 ? keywords : ['image', 'photo', 'visual', 'content'];
  }

  private createMinimalTestImage(): Buffer {
    // Create a minimal JPEG image for testing
    return Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x80, 0xFF, 0xD9
    ]);
  }
}