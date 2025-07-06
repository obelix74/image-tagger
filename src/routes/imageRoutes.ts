import express from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/DatabaseService';
import { ImageProcessingService } from '../services/ImageProcessingService';
import { GeminiService } from '../services/GeminiService';
import { BatchProcessingService } from '../services/BatchProcessingService';
import { ImageMetadata, UploadResponse, AnalysisResponse } from '../types';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { UserService } from '../services/UserService';

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
router.post('/upload', upload.single('image'), requireAuth, async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    // Get current user or default admin
    let currentUser = req.user as any;
    if (!currentUser) {
      currentUser = await UserService.getDefaultAdminUser();
    }

    // Check for duplicate files
    const existingImage = await DatabaseService.findDuplicateImage(
      req.file.originalname,
      req.file.size
    );

    if (existingImage) {
      // Delete the uploaded file since it's a duplicate
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup duplicate file:', cleanupError);
      }

      res.status(409).json({
        success: false,
        error: 'This file has already been uploaded',
        duplicate: true,
        existingImage: existingImage
      });
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
      originalPath: undefined, // For uploads, we don't have an original path
      thumbnailPath: processedResult.thumbnailPath,
      fileSize: req.file.size,
      mimeType: ImageProcessingService.getMimeType(req.file.originalname),
      width: processedResult.width,
      height: processedResult.height,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      userId: currentUser.id!
    };

    // Save to database
    const imageId = await DatabaseService.insertImage(imageMetadata);
    const savedImage = await DatabaseService.getImage(imageId);

    // Store EXIF/IPTC metadata if available
    if (processedResult.metadata) {
      try {
        const metadataToStore = {
          ...processedResult.metadata,
          imageId,
          extractedAt: new Date().toISOString()
        };
        await DatabaseService.insertImageMetadata(metadataToStore);
        console.log(`📋 Stored metadata for uploaded image ${imageId}`);
      } catch (metadataError) {
        console.warn(`Failed to store metadata for uploaded image ${imageId}:`, metadataError);
      }
    }

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

// General search across all metadata (must come before /:id route)
router.get('/search', optionalAuth, async (req, res): Promise<void> => {
  try {
    const searchTerm = req.query.q as string;

    if (!searchTerm || searchTerm.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Search term is required'
      });
      return;
    }

    // Get current user or default admin for filtering
    let currentUser = req.user as any;
    if (!currentUser) {
      currentUser = await UserService.getDefaultAdminUser();
    }

    const images = await DatabaseService.searchImages(searchTerm.trim(), currentUser.id);

    res.json({
      success: true,
      images,
      searchTerm,
      count: images.length
    });
  } catch (error) {
    console.error('General search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search images'
    });
  }
});

// Get all images with pagination
router.get('/', optionalAuth, async (req, res): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    // Get current user or default admin for filtering
    let currentUser = req.user as any;
    if (!currentUser) {
      currentUser = await UserService.getDefaultAdminUser();
    }

    const result = await DatabaseService.getAllImages(page, limit, currentUser.id);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve images'
    });
  }
});

// Batch processing routes

// Start batch processing
router.post('/batch/process', async (req, res): Promise<void> => {
  try {
    const { folderPath, options } = req.body;

    if (!folderPath) {
      res.status(400).json({
        success: false,
        error: 'Folder path is required'
      });
      return;
    }

    // Normalize and validate the folder path
    let normalizedPath: string;
    try {
      // Trim whitespace and normalize the path
      normalizedPath = path.resolve(folderPath.trim());
      console.log(`Batch processing request for path: "${folderPath}" -> normalized: "${normalizedPath}"`);
    } catch (error) {
      console.error('Path normalization error:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid folder path format'
      });
      return;
    }

    // Check if folder exists and is accessible
    try {
      const stats = await fs.stat(normalizedPath);
      if (!stats.isDirectory()) {
        res.status(400).json({
          success: false,
          error: 'Path exists but is not a directory'
        });
        return;
      }

      // Test read access
      await fs.access(normalizedPath, fs.constants.R_OK);
      console.log(`Directory access confirmed: "${normalizedPath}"`);
    } catch (error) {
      console.error(`Directory access error for "${normalizedPath}":`, error);
      res.status(400).json({
        success: false,
        error: `Folder path does not exist or is not accessible: ${normalizedPath}`
      });
      return;
    }

    const batchId = await BatchProcessingService.startBatchProcessing(normalizedPath, options);

    res.json({
      success: true,
      batchId,
      message: 'Batch processing started'
    });
  } catch (error) {
    console.error('Batch processing start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start batch processing'
    });
  }
});

// Get batch status
router.get('/batch/:batchId', async (req, res): Promise<void> => {
  try {
    const { batchId } = req.params;
    const result = await BatchProcessingService.getBatchStatus(batchId);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
      return;
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Get batch status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get batch status'
    });
  }
});

// Get all batches
router.get('/batch', async (req, res): Promise<void> => {
  try {
    const batches = await BatchProcessingService.getAllBatches();
    res.json({
      success: true,
      batches
    });
  } catch (error) {
    console.error('Get all batches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get batches'
    });
  }
});

// Delete batch
router.delete('/batch/:batchId', async (req, res): Promise<void> => {
  try {
    const { batchId } = req.params;
    const deleted = await BatchProcessingService.deleteBatch(batchId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete batch'
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

// Get image metadata
router.get('/:id/metadata', async (req, res): Promise<void> => {
  try {
    const imageId = parseInt(req.params.id);

    if (isNaN(imageId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid image ID'
      });
      return;
    }

    const metadata = await DatabaseService.getImageMetadata(imageId);

    res.json({
      success: true,
      metadata
    });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metadata'
    });
  }
});

// Trigger manual analysis
router.post('/:id/analyze', async (req, res): Promise<void> => {
  try {
    const imageId = parseInt(req.params.id);
    const { useFallback } = req.body;
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

    // Process in background with optional fallback
    processImageInBackground(imageId, image.filePath, useFallback);

    res.json({
      success: true,
      message: useFallback ? 'Analysis started with fallback mode' : 'Analysis started'
    });

  } catch (error) {
    console.error('Manual analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start analysis'
    });
  }
});

// Search images by keyword
router.get('/search/keyword/:keyword', optionalAuth, async (req, res): Promise<void> => {
  try {
    const keyword = decodeURIComponent(req.params.keyword);

    // Get current user or default admin for filtering
    let currentUser = req.user as any;
    if (!currentUser) {
      currentUser = await UserService.getDefaultAdminUser();
    }

    const images = await DatabaseService.searchImagesByKeyword(keyword, currentUser.id);

    res.json({
      success: true,
      images,
      keyword,
      count: images.length
    });
  } catch (error) {
    console.error('Keyword search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search images by keyword'
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
async function processImageInBackground(imageId: number, imagePath: string, useFallback: boolean = false): Promise<void> {
  try {
    await DatabaseService.updateImageStatus(imageId, 'processing');

    console.log(`Starting AI analysis for image ${imageId}${useFallback ? ' (fallback mode)' : ''}`);

    // Resize image for Gemini if needed
    const geminiImageSize = parseInt(process.env.GEMINI_IMAGE_SIZE || '1024');
    const resizedBuffer = await ImageProcessingService.resizeForGemini(imagePath, geminiImageSize);

    // Analyze with Gemini
    const analysis = await GeminiService.analyzeImage(resizedBuffer, 'image/jpeg', useFallback);

    // Save analysis to database
    const analysisData = {
      ...analysis,
      imageId,
      analysisDate: new Date().toISOString()
    };

    await DatabaseService.insertAnalysis(analysisData);

    // Update status to completed
    await DatabaseService.updateImageStatus(imageId, 'completed');

    // Clean up uploaded file after processing is complete
    try {
      await ImageProcessingService.deleteFile(imagePath);
      console.log(`🗑️ Cleaned up uploaded file for image ${imageId}`);
    } catch (cleanupError) {
      console.warn(`Failed to cleanup uploaded file for image ${imageId}:`, cleanupError);
    }

    console.log(`AI analysis completed successfully for image ${imageId}${useFallback ? ' (using fallback)' : ''}`);

  } catch (error) {
    console.error(`AI analysis failed for image ${imageId}:`, error);

    // Update status to error with detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown AI analysis error';
    await DatabaseService.updateImageStatus(imageId, 'error', `AI analysis failed: ${errorMessage}`);

    console.log(`Image ${imageId} marked as failed due to AI analysis error`);
  }
}

// Serve original image if it exists, otherwise serve thumbnail
router.get('/:id/display', async (req, res): Promise<void> => {
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

    // Try to serve original file first (for batch processed images)
    if (image.originalPath) {
      try {
        await fs.access(image.originalPath);
        res.sendFile(path.resolve(image.originalPath));
        return;
      } catch (error) {
        console.log(`Original file not accessible: ${image.originalPath}`);
      }
    }

    // Fallback to thumbnail
    try {
      const thumbnailPath = path.resolve(image.thumbnailPath);
      await fs.access(thumbnailPath);
      res.sendFile(thumbnailPath);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Image file not found'
      });
    }
  } catch (error) {
    console.error('Display image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve image'
    });
  }
});

export { router as imageRoutes };
