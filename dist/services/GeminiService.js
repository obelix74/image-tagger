"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
class GeminiService {
    static initialize() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    static async rateLimitDelay() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            const delayTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
            console.log(`Rate limiting: waiting ${delayTime}ms before next Gemini request`);
            await new Promise(resolve => setTimeout(resolve, delayTime));
        }
        this.lastRequestTime = Date.now();
    }
    static async analyzeImage(imageBuffer, mimeType, useFallback = false) {
        if (!this.model) {
            this.initialize();
        }
        // If fallback is requested, return fallback immediately
        if (useFallback) {
            console.log('Using fallback analysis as requested');
            return this.getFallbackAnalysis();
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
        // Prepare image for Gemini API with size limits
        const processedImageBuffer = await this.prepareImageForGemini(imageBuffer);
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                // Apply rate limiting
                await this.rateLimitDelay();
                console.log(`Gemini API request attempt ${attempt}/${this.MAX_RETRIES}`);
                const imagePart = {
                    inlineData: {
                        data: processedImageBuffer.toString('base64'),
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
                console.log(`Gemini API request successful on attempt ${attempt}`);
                return {
                    description: analysisData.description,
                    caption: analysisData.caption,
                    keywords: analysisData.keywords,
                    confidence: analysisData.confidence || 0.8
                };
            }
            catch (error) {
                lastError = error;
                console.error(`Gemini API error on attempt ${attempt}:`, error);
                // If this is the last attempt, throw the error
                if (attempt === this.MAX_RETRIES) {
                    break;
                }
                // Wait before retrying (exponential backoff)
                const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        // All retries failed, throw the last error
        console.error(`Gemini API failed after ${this.MAX_RETRIES} attempts`);
        throw new Error(`Gemini AI analysis failed: ${lastError?.message || 'Unknown error'}`);
    }
    static async analyzeImageFromPath(imagePath, useFallback = false) {
        const imageBuffer = await promises_1.default.readFile(imagePath);
        const mimeType = this.getMimeTypeFromPath(imagePath);
        return this.analyzeImage(imageBuffer, mimeType, useFallback);
    }
    static getMimeTypeFromPath(imagePath) {
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
    static getFallbackAnalysis() {
        return {
            description: 'Image analysis temporarily unavailable. Please try again later.',
            caption: 'Image uploaded successfully',
            keywords: ['image', 'photo', 'upload', 'content'],
            confidence: 0.1
        };
    }
    static async testConnection() {
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
        }
        catch (error) {
            console.error('Gemini connection test failed:', error);
            return false;
        }
    }
    static async prepareImageForGemini(imageBuffer) {
        try {
            // Check buffer size - if it's too large, it will cause string conversion issues
            const maxBufferSize = 20 * 1024 * 1024; // 20MB limit for base64 conversion
            if (imageBuffer.length > maxBufferSize) {
                console.log(`Image buffer too large (${Math.round(imageBuffer.length / 1024 / 1024)}MB), resizing for Gemini API`);
                // Resize image to reduce buffer size
                const resizedBuffer = await (0, sharp_1.default)(imageBuffer)
                    .resize(1024, 1024, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({
                    quality: 80,
                    progressive: true
                })
                    .toBuffer();
                console.log(`Resized image from ${Math.round(imageBuffer.length / 1024 / 1024)}MB to ${Math.round(resizedBuffer.length / 1024 / 1024)}MB`);
                return resizedBuffer;
            }
            // Check if we can safely convert to base64 string
            // JavaScript max string length is about 1GB, but base64 increases size by ~33%
            const estimatedBase64Size = imageBuffer.length * 1.33;
            const maxSafeStringSize = 500 * 1024 * 1024; // 500MB safety limit
            if (estimatedBase64Size > maxSafeStringSize) {
                console.log(`Estimated base64 size too large (${Math.round(estimatedBase64Size / 1024 / 1024)}MB), resizing for safety`);
                // Calculate target size to stay under limit
                const targetBufferSize = Math.floor(maxSafeStringSize / 1.33);
                const scaleFactor = Math.sqrt(targetBufferSize / imageBuffer.length);
                const targetWidth = Math.floor(1024 * scaleFactor);
                const resizedBuffer = await (0, sharp_1.default)(imageBuffer)
                    .resize(targetWidth, targetWidth, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({
                    quality: 75,
                    progressive: true
                })
                    .toBuffer();
                console.log(`Resized image for base64 safety from ${Math.round(imageBuffer.length / 1024 / 1024)}MB to ${Math.round(resizedBuffer.length / 1024 / 1024)}MB`);
                return resizedBuffer;
            }
            // Image is already a safe size
            return imageBuffer;
        }
        catch (error) {
            console.error('Error preparing image for Gemini:', error);
            // Fallback: create a very small version
            try {
                const fallbackBuffer = await (0, sharp_1.default)(imageBuffer)
                    .resize(512, 512, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({
                    quality: 60
                })
                    .toBuffer();
                console.log('Created fallback resized image for Gemini API');
                return fallbackBuffer;
            }
            catch (fallbackError) {
                console.error('Failed to create fallback image:', fallbackError);
                throw new Error('Unable to prepare image for Gemini API');
            }
        }
    }
}
exports.GeminiService = GeminiService;
GeminiService.lastRequestTime = 0;
GeminiService.MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
GeminiService.MAX_RETRIES = 3;
//# sourceMappingURL=GeminiService.js.map