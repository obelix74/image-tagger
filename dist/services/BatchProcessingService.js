"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessingService = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const DatabaseService_1 = require("./DatabaseService");
const ImageProcessingService_1 = require("./ImageProcessingService");
const GeminiService_1 = require("./GeminiService");
class BatchProcessingService {
    static async startBatchProcessing(folderPath, options = {}) {
        const batchId = (0, uuid_1.v4)();
        const startTime = new Date().toISOString();
        // Initialize batch job
        const batchJob = {
            id: batchId,
            folderPath,
            options: {
                thumbnailSize: options.thumbnailSize || parseInt(process.env.THUMBNAIL_SIZE || '300'),
                geminiImageSize: options.geminiImageSize || parseInt(process.env.GEMINI_IMAGE_SIZE || '1024'),
                quality: options.quality || 85,
                skipDuplicates: options.skipDuplicates !== false
            },
            result: {
                batchId,
                totalFiles: 0,
                processedFiles: 0,
                successfulFiles: 0,
                duplicateFiles: 0,
                errorFiles: 0,
                errors: [],
                processedImages: [],
                status: 'processing',
                startTime
            },
            createdAt: startTime
        };
        this.activeBatches.set(batchId, batchJob);
        // Start processing in background
        this.processBatchInBackground(batchJob);
        return batchId;
    }
    static async getBatchStatus(batchId) {
        const batch = this.activeBatches.get(batchId);
        return batch ? batch.result : null;
    }
    static async getAllBatches() {
        return Array.from(this.activeBatches.values());
    }
    static async processBatchInBackground(batchJob) {
        try {
            console.log(`Starting batch processing for folder: ${batchJob.folderPath}`);
            // Discover all image files recursively
            const imageFiles = await this.discoverImageFiles(batchJob.folderPath);
            batchJob.result.totalFiles = imageFiles.length;
            console.log(`Found ${imageFiles.length} image files to process`);
            const uploadDir = process.env.UPLOAD_DIR || './uploads';
            const thumbnailDir = process.env.THUMBNAIL_DIR || './thumbnails';
            // Ensure directories exist
            await ImageProcessingService_1.ImageProcessingService.ensureDirectoryExists(uploadDir);
            await ImageProcessingService_1.ImageProcessingService.ensureDirectoryExists(thumbnailDir);
            // Process each file sequentially (including AI analysis)
            for (let i = 0; i < imageFiles.length; i++) {
                const filePath = imageFiles[i];
                console.log(`📸 Processing image ${i + 1}/${imageFiles.length}: ${path_1.default.basename(filePath)}`);
                try {
                    await this.processFile(filePath, batchJob, uploadDir, thumbnailDir);
                    console.log(`✅ Successfully processed image ${i + 1}/${imageFiles.length}`);
                }
                catch (error) {
                    console.error(`❌ Error processing file ${filePath}:`, error);
                    batchJob.result.errorFiles++;
                    batchJob.result.errors.push({
                        file: filePath,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        type: 'processing'
                    });
                }
                batchJob.result.processedFiles++;
                // Log progress
                const progress = Math.round((batchJob.result.processedFiles / batchJob.result.totalFiles) * 100);
                console.log(`📊 Batch progress: ${batchJob.result.processedFiles}/${batchJob.result.totalFiles} (${progress}%)`);
            }
            // Mark batch as completed
            batchJob.result.status = 'completed';
            batchJob.result.endTime = new Date().toISOString();
            console.log(`🎉 Batch processing completed!`);
            console.log(`📊 Final Results:`);
            console.log(`   ✅ Successful: ${batchJob.result.successfulFiles}`);
            console.log(`   🔄 Duplicates: ${batchJob.result.duplicateFiles}`);
            console.log(`   ❌ Errors: ${batchJob.result.errorFiles}`);
            console.log(`   📁 Total Files: ${batchJob.result.totalFiles}`);
        }
        catch (error) {
            console.error('Batch processing failed:', error);
            batchJob.result.status = 'error';
            batchJob.result.endTime = new Date().toISOString();
            batchJob.result.errors.push({
                file: batchJob.folderPath,
                error: error instanceof Error ? error.message : 'Batch processing failed',
                type: 'processing'
            });
        }
    }
    static async discoverImageFiles(folderPath) {
        const imageFiles = [];
        async function scanDirectory(dirPath) {
            try {
                console.log(`Scanning directory: "${dirPath}"`);
                const entries = await fs_1.promises.readdir(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path_1.default.join(dirPath, entry.name);
                    console.log(`Processing entry: "${entry.name}" -> "${fullPath}"`);
                    if (entry.isDirectory()) {
                        // Recursively scan subdirectories
                        await scanDirectory(fullPath);
                    }
                    else if (entry.isFile()) {
                        // Check if file is a supported image format
                        const ext = path_1.default.extname(entry.name).toLowerCase();
                        if (BatchProcessingService.SUPPORTED_EXTENSIONS.includes(ext)) {
                            console.log(`Found supported image: "${fullPath}"`);
                            imageFiles.push(fullPath);
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Failed to scan directory "${dirPath}":`, error);
                // Re-throw the error if it's a critical directory access issue
                if (error instanceof Error && error.message.includes('ENOENT')) {
                    throw new Error(`Directory not found: "${dirPath}"`);
                }
                if (error instanceof Error && error.message.includes('EACCES')) {
                    throw new Error(`Permission denied accessing directory: "${dirPath}"`);
                }
            }
        }
        await scanDirectory(folderPath);
        console.log(`Total image files discovered: ${imageFiles.length}`);
        return imageFiles;
    }
    static async processFile(filePath, batchJob, uploadDir, thumbnailDir) {
        console.log(`Processing file: "${filePath}"`);
        const fileName = path_1.default.basename(filePath);
        let stats;
        try {
            stats = await fs_1.promises.stat(filePath);
        }
        catch (error) {
            console.error(`Failed to get file stats for "${filePath}":`, error);
            throw new Error(`Cannot access file: ${filePath}`);
        }
        // Check for duplicates if enabled
        if (batchJob.options.skipDuplicates) {
            const existingImage = await DatabaseService_1.DatabaseService.findDuplicateImage(fileName, stats.size);
            if (existingImage) {
                console.log(`Skipping duplicate file: "${filePath}"`);
                batchJob.result.duplicateFiles++;
                batchJob.result.errors.push({
                    file: filePath,
                    error: 'File already exists in database',
                    type: 'duplicate'
                });
                return;
            }
        }
        // Generate unique filename
        const uniqueFilename = `${(0, uuid_1.v4)()}_${fileName}`;
        const destinationPath = path_1.default.join(uploadDir, uniqueFilename);
        // Copy file to upload directory
        try {
            console.log(`Copying file from "${filePath}" to "${destinationPath}"`);
            await fs_1.promises.copyFile(filePath, destinationPath);
        }
        catch (error) {
            console.error(`Failed to copy file from "${filePath}" to "${destinationPath}":`, error);
            throw new Error(`Failed to copy file: ${filePath}`);
        }
        try {
            // Process the image
            const processingOptions = {
                thumbnailSize: batchJob.options.thumbnailSize,
                geminiImageSize: batchJob.options.geminiImageSize,
                quality: batchJob.options.quality
            };
            const processedResult = await ImageProcessingService_1.ImageProcessingService.processImage(destinationPath, uploadDir, thumbnailDir, uniqueFilename, processingOptions);
            // Create image metadata
            const imageMetadata = {
                filename: uniqueFilename,
                originalName: fileName,
                filePath: destinationPath,
                thumbnailPath: processedResult.thumbnailPath,
                fileSize: stats.size,
                mimeType: ImageProcessingService_1.ImageProcessingService.getMimeType(fileName),
                width: processedResult.width,
                height: processedResult.height,
                uploadedAt: new Date().toISOString(),
                status: 'uploaded'
            };
            // Save to database
            const imageId = await DatabaseService_1.DatabaseService.insertImage(imageMetadata);
            const savedImage = await DatabaseService_1.DatabaseService.getImage(imageId);
            if (savedImage) {
                batchJob.result.processedImages.push(savedImage);
                batchJob.result.successfulFiles++;
                // Wait for AI analysis to complete before processing next image
                console.log(`Starting sequential AI analysis for image ${imageId}`);
                await this.processImageAnalysisInBackground(imageId, processedResult.processedPath);
                console.log(`Completed AI analysis for image ${imageId}, ready for next image`);
            }
        }
        catch (error) {
            // Clean up the copied file if processing failed
            try {
                await fs_1.promises.unlink(destinationPath);
            }
            catch (cleanupError) {
                console.warn('Failed to cleanup file after processing error:', cleanupError);
            }
            throw error;
        }
    }
    static async processImageAnalysisInBackground(imageId, imagePath) {
        try {
            // Update status to processing
            await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'processing');
            console.log(`Starting AI analysis for image ${imageId}`);
            // Analyze with Gemini (this will now throw errors instead of returning fallback)
            const analysis = await GeminiService_1.GeminiService.analyzeImageFromPath(imagePath, false);
            // Save analysis to database
            const analysisData = {
                imageId,
                description: analysis.description,
                caption: analysis.caption,
                keywords: analysis.keywords,
                confidence: analysis.confidence,
                analysisDate: new Date().toISOString()
            };
            await DatabaseService_1.DatabaseService.insertAnalysis(analysisData);
            // Update status to completed only if AI analysis succeeded
            await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'completed');
            console.log(`✅ AI analysis completed successfully for image ${imageId}`);
        }
        catch (error) {
            console.error(`❌ AI analysis failed for image ${imageId}:`, error);
            // Update status to error with detailed error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown AI analysis error';
            await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'error', `AI analysis failed: ${errorMessage}`);
            console.log(`🚫 Image ${imageId} marked as failed due to AI analysis error`);
            // Re-throw the error so batch processing can handle it appropriately
            throw error;
        }
    }
    static async deleteBatch(batchId) {
        return this.activeBatches.delete(batchId);
    }
    static async clearCompletedBatches() {
        let cleared = 0;
        for (const [id, batch] of this.activeBatches.entries()) {
            if (batch.result.status === 'completed' || batch.result.status === 'error') {
                this.activeBatches.delete(id);
                cleared++;
            }
        }
        return cleared;
    }
}
exports.BatchProcessingService = BatchProcessingService;
BatchProcessingService.activeBatches = new Map();
BatchProcessingService.SUPPORTED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.tiff', '.tif',
    '.cr2', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2'
];
//# sourceMappingURL=BatchProcessingService.js.map