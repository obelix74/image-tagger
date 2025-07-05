import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/DatabaseService';
import { ImageProcessingService } from '../services/ImageProcessingService';
import { GeminiService } from '../services/GeminiService';
import { ImageMetadata, UploadResponse, AnalysisResponse } from '../types';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000') // 50MB default
  },
  fileFilter: (req, file, cb) => {
    if (ImageProcessingService.isSupported(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format'));
    }
  }
});

// Upload and process image
router.post('/upload', upload.single('image'), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const thumbnailDir = process.env.THUMBNAIL_DIR || './thumbnails';
    
    // Ensure directories exist
    await ImageProcessingService.ensureDirectoryExists(uploadDir);
    await ImageProcessingService.ensureDirectoryExists(thumbnailDir);

    // Process the image
    const processingOptions = {
      thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE || '300'),
      geminiImageSize: parseInt(process.env.GEMINI_IMAGE_SIZE || '1024'),
      quality: 85
    };

    const processedResult = await ImageProcessingService.processImage(
      req.file.path,
      uploadDir,
      thumbnailDir,
      req.file.filename,
      processingOptions
    );

    // Create image metadata
    const imageMetadata: Omit<ImageMetadata, 'id'> = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      thumbnailPath: processedResult.thumbnailPath,
      fileSize: req.file.size,
      mimeType: ImageProcessingService.getMimeType(req.file.originalname),
      width: processedResult.width,
      height: processedResult.height,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded'
    };

    // Save to database
    const imageId = await DatabaseService.insertImage(imageMetadata);
    const savedImage = await DatabaseService.getImage(imageId);

    // Start background processing
    processImageInBackground(imageId, processedResult.processedPath);

    const response: UploadResponse = {
      success: true,
      image: savedImage!
    };

    res.json(response);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

// Get all images
router.get('/', async (req, res): Promise<void> => {
  try {
    const images = await DatabaseService.getAllImages();
    res.json({ success: true, images });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve images'
    });
  }
});

// Get specific image
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const imageId = parseInt(req.params.id);
    const image = await DatabaseService.getImage(imageId);
    
    if (!image) {
      res.status(404).json({
        success: false,
        error: 'Image not found'
      });
      return;
    }

    res.json({ success: true, image });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve image'
    });
  }
});

// Get image analysis
router.get('/:id/analysis', async (req, res): Promise<void> => {
  try {
    const imageId = parseInt(req.params.id);
    const analysis = await DatabaseService.getAnalysis(imageId);
    
    if (!analysis) {
      res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
      return;
    }

    const response: AnalysisResponse = {
      success: true,
      analysis
    };

    res.json(response);
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis'
    });
  }
});

// Trigger manual analysis
router.post('/:id/analyze', async (req, res): Promise<void> => {
  try {
    const imageId = parseInt(req.params.id);
    const image = await DatabaseService.getImage(imageId);
    
    if (!image) {
      res.status(404).json({
        success: false,
        error: 'Image not found'
      });
      return;
    }

    // Start analysis
    await DatabaseService.updateImageStatus(imageId, 'processing');
    
    // Process in background
    processImageInBackground(imageId, image.filePath);

    res.json({
      success: true,
      message: 'Analysis started'
    });

  } catch (error) {
    console.error('Manual analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start analysis'
    });
  }
});

// Test Gemini connection
router.get('/test/gemini', async (req, res): Promise<void> => {
  try {
    const isConnected = await GeminiService.testConnection();
    res.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'Gemini API is working' : 'Gemini API connection failed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test Gemini connection'
    });
  }
});

// Background processing function
async function processImageInBackground(imageId: number, imagePath: string): Promise<void> {
  try {
    await DatabaseService.updateImageStatus(imageId, 'processing');

    // Resize image for Gemini if needed
    const geminiImageSize = parseInt(process.env.GEMINI_IMAGE_SIZE || '1024');
    const resizedBuffer = await ImageProcessingService.resizeForGemini(imagePath, geminiImageSize);

    // Analyze with Gemini
    const analysis = await GeminiService.analyzeImage(resizedBuffer, 'image/jpeg');

    // Save analysis to database
    const analysisData = {
      ...analysis,
      imageId,
      analysisDate: new Date().toISOString()
    };

    await DatabaseService.insertAnalysis(analysisData);
    await DatabaseService.updateImageStatus(imageId, 'completed');

    console.log(`Image ${imageId} processed successfully`);

  } catch (error) {
    console.error(`Failed to process image ${imageId}:`, error);
    await DatabaseService.updateImageStatus(
      imageId, 
      'error', 
      error instanceof Error ? error.message : 'Processing failed'
    );
  }
}

export { router as imageRoutes };
