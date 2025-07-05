import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import { GeminiAnalysis } from '../types';

export class GeminiService {
  private static genAI: GoogleGenerativeAI;
  private static model: any;

  static initialize(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  static async analyzeImage(imageBuffer: Buffer, mimeType: string): Promise<Omit<GeminiAnalysis, 'id' | 'imageId' | 'analysisDate'>> {
    if (!this.model) {
      this.initialize();
    }

    const prompt = `
Analyze this image and provide the following information in JSON format:

{
  "description": "A detailed description of the image (2-3 sentences)",
  "caption": "A concise, engaging caption suitable for social media (1 sentence, max 100 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "confidence": 0.95
}

Requirements:
- Description: Describe what you see in detail, including objects, people, setting, mood, colors, and composition
- Caption: Create an engaging, shareable caption that captures the essence of the image
- Keywords: Provide 5-10 SEO-optimized keywords relevant to the image content, style, and potential use cases
- Confidence: Your confidence level in the analysis (0.0 to 1.0)

Please ensure the JSON is valid and properly formatted.
    `;

    try {
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (!analysisData.description || !analysisData.caption || !Array.isArray(analysisData.keywords)) {
        throw new Error('Invalid response structure from Gemini API');
      }

      return {
        description: analysisData.description,
        caption: analysisData.caption,
        keywords: analysisData.keywords,
        confidence: analysisData.confidence || 0.8
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Fallback analysis if Gemini fails
      return this.getFallbackAnalysis();
    }
  }

  static async analyzeImageFromPath(imagePath: string): Promise<Omit<GeminiAnalysis, 'id' | 'imageId' | 'analysisDate'>> {
    const imageBuffer = await fs.readFile(imagePath);
    const mimeType = this.getMimeTypeFromPath(imagePath);
    
    return this.analyzeImage(imageBuffer, mimeType);
  }

  private static getMimeTypeFromPath(imagePath: string): string {
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

  private static getFallbackAnalysis(): Omit<GeminiAnalysis, 'id' | 'imageId' | 'analysisDate'> {
    return {
      description: 'Image analysis temporarily unavailable. Please try again later.',
      caption: 'Image uploaded successfully',
      keywords: ['image', 'photo', 'upload', 'content'],
      confidence: 0.1
    };
  }

  static async testConnection(): Promise<boolean> {
    try {
      if (!this.model) {
        this.initialize();
      }

      // Create a simple test image (1x1 pixel)
      const testImageBuffer = Buffer.from([
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

      const result = await this.model.generateContent([
        'What do you see in this image? Respond with just "test successful"',
        {
          inlineData: {
            data: testImageBuffer.toString('base64'),
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      return response.text().length > 0;

    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}
