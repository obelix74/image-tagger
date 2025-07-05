"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageRoutes = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const uuid_1 = require("uuid");
const DatabaseService_1 = require("../services/DatabaseService");
const ImageProcessingService_1 = require("../services/ImageProcessingService");
const GeminiService_1 = require("../services/GeminiService");
const BatchProcessingService_1 = require("../services/BatchProcessingService");
const router = express_1.default.Router();
exports.imageRoutes = router;
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_DIR || './uploads');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}_${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000') // 50MB default
    },
    fileFilter: (req, file, cb) => {
        if (ImageProcessingService_1.ImageProcessingService.isSupported(file.originalname)) {
            cb(null, true);
        }
        else {
            cb(new Error('Unsupported file format'));
        }
    }
});
// Upload and process image
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: 'No file uploaded' });
            return;
        }
        // Check for duplicate files
        const existingImage = await DatabaseService_1.DatabaseService.findDuplicateImage(req.file.originalname, req.file.size);
        if (existingImage) {
            // Delete the uploaded file since it's a duplicate
            try {
                await fs_1.promises.unlink(req.file.path);
            }
            catch (cleanupError) {
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
        await ImageProcessingService_1.ImageProcessingService.ensureDirectoryExists(uploadDir);
        await ImageProcessingService_1.ImageProcessingService.ensureDirectoryExists(thumbnailDir);
        // Process the image
        const processingOptions = {
            thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE || '300'),
            geminiImageSize: parseInt(process.env.GEMINI_IMAGE_SIZE || '1024'),
            quality: 85
        };
        const processedResult = await ImageProcessingService_1.ImageProcessingService.processImage(req.file.path, uploadDir, thumbnailDir, req.file.filename, processingOptions);
        // Create image metadata
        const imageMetadata = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            filePath: req.file.path,
            thumbnailPath: processedResult.thumbnailPath,
            fileSize: req.file.size,
            mimeType: ImageProcessingService_1.ImageProcessingService.getMimeType(req.file.originalname),
            width: processedResult.width,
            height: processedResult.height,
            uploadedAt: new Date().toISOString(),
            status: 'uploaded'
        };
        // Save to database
        const imageId = await DatabaseService_1.DatabaseService.insertImage(imageMetadata);
        const savedImage = await DatabaseService_1.DatabaseService.getImage(imageId);
        // Store EXIF/IPTC metadata if available
        if (processedResult.metadata) {
            try {
                const metadataToStore = {
                    ...processedResult.metadata,
                    imageId,
                    extractedAt: new Date().toISOString()
                };
                await DatabaseService_1.DatabaseService.insertImageMetadata(metadataToStore);
                console.log(`📋 Stored metadata for uploaded image ${imageId}`);
            }
            catch (metadataError) {
                console.warn(`Failed to store metadata for uploaded image ${imageId}:`, metadataError);
            }
        }
        // Start background processing
        processImageInBackground(imageId, processedResult.processedPath);
        const response = {
            success: true,
            image: savedImage
        };
        res.json(response);
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed'
        });
    }
});
// General search across all metadata (must come before /:id route)
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm || searchTerm.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Search term is required'
            });
            return;
        }
        const images = await DatabaseService_1.DatabaseService.searchImages(searchTerm.trim());
        res.json({
            success: true,
            images,
            searchTerm,
            count: images.length
        });
    }
    catch (error) {
        console.error('General search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search images'
        });
    }
});
// Get all images with pagination
router.get('/', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const result = await DatabaseService_1.DatabaseService.getAllImages(page, limit);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Get images error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve images'
        });
    }
});
// Batch processing routes
// Start batch processing
router.post('/batch/process', async (req, res) => {
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
        let normalizedPath;
        try {
            // Trim whitespace and normalize the path
            normalizedPath = path_1.default.resolve(folderPath.trim());
            console.log(`Batch processing request for path: "${folderPath}" -> normalized: "${normalizedPath}"`);
        }
        catch (error) {
            console.error('Path normalization error:', error);
            res.status(400).json({
                success: false,
                error: 'Invalid folder path format'
            });
            return;
        }
        // Check if folder exists and is accessible
        try {
            const stats = await fs_1.promises.stat(normalizedPath);
            if (!stats.isDirectory()) {
                res.status(400).json({
                    success: false,
                    error: 'Path exists but is not a directory'
                });
                return;
            }
            // Test read access
            await fs_1.promises.access(normalizedPath, fs_1.promises.constants.R_OK);
            console.log(`Directory access confirmed: "${normalizedPath}"`);
        }
        catch (error) {
            console.error(`Directory access error for "${normalizedPath}":`, error);
            res.status(400).json({
                success: false,
                error: `Folder path does not exist or is not accessible: ${normalizedPath}`
            });
            return;
        }
        const batchId = await BatchProcessingService_1.BatchProcessingService.startBatchProcessing(normalizedPath, options);
        res.json({
            success: true,
            batchId,
            message: 'Batch processing started'
        });
    }
    catch (error) {
        console.error('Batch processing start error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start batch processing'
        });
    }
});
// Get batch status
router.get('/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const result = await BatchProcessingService_1.BatchProcessingService.getBatchStatus(batchId);
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
    }
    catch (error) {
        console.error('Get batch status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get batch status'
        });
    }
});
// Get all batches
router.get('/batch', async (req, res) => {
    try {
        const batches = await BatchProcessingService_1.BatchProcessingService.getAllBatches();
        res.json({
            success: true,
            batches
        });
    }
    catch (error) {
        console.error('Get all batches error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get batches'
        });
    }
});
// Delete batch
router.delete('/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const deleted = await BatchProcessingService_1.BatchProcessingService.deleteBatch(batchId);
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
    }
    catch (error) {
        console.error('Delete batch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete batch'
        });
    }
});
// Get specific image
router.get('/:id', async (req, res) => {
    try {
        const imageId = parseInt(req.params.id);
        const image = await DatabaseService_1.DatabaseService.getImage(imageId);
        if (!image) {
            res.status(404).json({
                success: false,
                error: 'Image not found'
            });
            return;
        }
        res.json({ success: true, image });
    }
    catch (error) {
        console.error('Get image error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve image'
        });
    }
});
// Get image analysis
router.get('/:id/analysis', async (req, res) => {
    try {
        const imageId = parseInt(req.params.id);
        const analysis = await DatabaseService_1.DatabaseService.getAnalysis(imageId);
        if (!analysis) {
            res.status(404).json({
                success: false,
                error: 'Analysis not found'
            });
            return;
        }
        const response = {
            success: true,
            analysis
        };
        res.json(response);
    }
    catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analysis'
        });
    }
});
// Get image metadata
router.get('/:id/metadata', async (req, res) => {
    try {
        const imageId = parseInt(req.params.id);
        if (isNaN(imageId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid image ID'
            });
            return;
        }
        const metadata = await DatabaseService_1.DatabaseService.getImageMetadata(imageId);
        res.json({
            success: true,
            metadata
        });
    }
    catch (error) {
        console.error('Get metadata error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get metadata'
        });
    }
});
// Trigger manual analysis
router.post('/:id/analyze', async (req, res) => {
    try {
        const imageId = parseInt(req.params.id);
        const { useFallback } = req.body;
        const image = await DatabaseService_1.DatabaseService.getImage(imageId);
        if (!image) {
            res.status(404).json({
                success: false,
                error: 'Image not found'
            });
            return;
        }
        // Start analysis
        await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'processing');
        // Process in background with optional fallback
        processImageInBackground(imageId, image.filePath, useFallback);
        res.json({
            success: true,
            message: useFallback ? 'Analysis started with fallback mode' : 'Analysis started'
        });
    }
    catch (error) {
        console.error('Manual analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start analysis'
        });
    }
});
// Search images by keyword
router.get('/search/keyword/:keyword', async (req, res) => {
    try {
        const keyword = decodeURIComponent(req.params.keyword);
        const images = await DatabaseService_1.DatabaseService.searchImagesByKeyword(keyword);
        res.json({
            success: true,
            images,
            keyword,
            count: images.length
        });
    }
    catch (error) {
        console.error('Keyword search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search images by keyword'
        });
    }
});
// Test Gemini connection
router.get('/test/gemini', async (req, res) => {
    try {
        const isConnected = await GeminiService_1.GeminiService.testConnection();
        res.json({
            success: true,
            connected: isConnected,
            message: isConnected ? 'Gemini API is working' : 'Gemini API connection failed'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to test Gemini connection'
        });
    }
});
// Background processing function
async function processImageInBackground(imageId, imagePath, useFallback = false) {
    try {
        await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'processing');
        console.log(`Starting AI analysis for image ${imageId}${useFallback ? ' (fallback mode)' : ''}`);
        // Resize image for Gemini if needed
        const geminiImageSize = parseInt(process.env.GEMINI_IMAGE_SIZE || '1024');
        const resizedBuffer = await ImageProcessingService_1.ImageProcessingService.resizeForGemini(imagePath, geminiImageSize);
        // Analyze with Gemini
        const analysis = await GeminiService_1.GeminiService.analyzeImage(resizedBuffer, 'image/jpeg', useFallback);
        // Save analysis to database
        const analysisData = {
            ...analysis,
            imageId,
            analysisDate: new Date().toISOString()
        };
        await DatabaseService_1.DatabaseService.insertAnalysis(analysisData);
        // Update status to completed
        await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'completed');
        console.log(`AI analysis completed successfully for image ${imageId}${useFallback ? ' (using fallback)' : ''}`);
    }
    catch (error) {
        console.error(`AI analysis failed for image ${imageId}:`, error);
        // Update status to error with detailed error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown AI analysis error';
        await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'error', `AI analysis failed: ${errorMessage}`);
        console.log(`Image ${imageId} marked as failed due to AI analysis error`);
    }
}
//# sourceMappingURL=imageRoutes.js.map