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
                skipDuplicates: options.skipDuplicates !== false,
                parallelConnections: options.parallelConnections || 1
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
            // Process images with parallel connections
            const parallelConnections = batchJob.options.parallelConnections || 1;
            if (parallelConnections === 1) {
                // Sequential processing (original behavior)
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
            }
            else {
                // Parallel processing
                console.log(`🚀 Processing ${imageFiles.length} images with ${parallelConnections} parallel connections`);
                await this.processImagesInParallel(batchJob, imageFiles, uploadDir, thumbnailDir, parallelConnections);
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
        // Generate unique filename with length handling
        const uniqueFilename = this.generateSafeFilename(fileName);
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
                originalPath: filePath, // Store the original file path
                thumbnailPath: processedResult.thumbnailPath,
                fileSize: stats.size,
                mimeType: ImageProcessingService_1.ImageProcessingService.getMimeType(fileName),
                width: processedResult.width,
                height: processedResult.height,
                uploadedAt: new Date().toISOString(),
                status: 'uploaded',
                userId: 1 // Default to admin user for batch processing
            };
            // Save to database
            const imageId = await DatabaseService_1.DatabaseService.insertImage(imageMetadata);
            const savedImage = await DatabaseService_1.DatabaseService.getImage(imageId);
            if (savedImage) {
                batchJob.result.processedImages.push(savedImage);
                // Store EXIF/IPTC metadata if available
                if (processedResult.metadata) {
                    try {
                        const metadataToStore = {
                            ...processedResult.metadata,
                            imageId,
                            extractedAt: new Date().toISOString()
                        };
                        await DatabaseService_1.DatabaseService.insertImageMetadata(metadataToStore);
                        console.log(`📋 Stored metadata for image ${imageId}`);
                    }
                    catch (metadataError) {
                        console.warn(`Failed to store metadata for image ${imageId}:`, metadataError);
                    }
                }
                // Start AI analysis (parallel or sequential based on settings)
                if (batchJob.options.parallelConnections === 1) {
                    // Sequential: wait for AI analysis to complete
                    console.log(`Starting sequential AI analysis for image ${imageId}`);
                    await this.processImageAnalysisInBackground(imageId, processedResult.processedPath);
                    console.log(`Completed AI analysis for image ${imageId}, ready for next image`);
                }
                else {
                    // Parallel: start AI analysis in background without waiting
                    console.log(`Starting parallel AI analysis for image ${imageId}`);
                    this.processImageAnalysisInBackground(imageId, processedResult.processedPath)
                        .then(() => {
                        // Clean up uploaded file after AI analysis is complete
                        this.cleanupUploadedFile(destinationPath);
                    })
                        .catch(error => {
                        console.error(`AI analysis failed for image ${imageId}:`, error);
                        // Still clean up the uploaded file even if analysis failed
                        this.cleanupUploadedFile(destinationPath);
                    });
                }
                // For sequential processing, clean up after AI analysis
                if (batchJob.options.parallelConnections === 1) {
                    this.cleanupUploadedFile(destinationPath);
                }
                // Force garbage collection every 10 images to prevent memory buildup
                if (batchJob.result.processedFiles % 10 === 0) {
                    if (global.gc) {
                        global.gc();
                        console.log(`🗑️ Forced garbage collection after ${batchJob.result.processedFiles} images`);
                    }
                }
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
    static async processImagesInParallel(batchJob, imageFiles, uploadDir, thumbnailDir, parallelConnections) {
        const semaphore = new Array(parallelConnections).fill(null);
        let currentIndex = 0;
        const processNext = async () => {
            while (currentIndex < imageFiles.length) {
                const index = currentIndex++;
                const filePath = imageFiles[index];
                console.log(`📸 Processing image ${index + 1}/${imageFiles.length}: ${path_1.default.basename(filePath)}`);
                try {
                    await this.processFile(filePath, batchJob, uploadDir, thumbnailDir);
                    console.log(`✅ Successfully processed image ${index + 1}/${imageFiles.length}`);
                    batchJob.result.successfulFiles++;
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
                // Log progress with memory usage
                const progress = Math.round((batchJob.result.processedFiles / batchJob.result.totalFiles) * 100);
                const memUsage = process.memoryUsage();
                const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
                console.log(`📊 Batch progress: ${batchJob.result.processedFiles}/${batchJob.result.totalFiles} (${progress}%) | Memory: ${memUsedMB}MB`);
            }
        };
        // Start parallel workers
        const workers = semaphore.map(() => processNext());
        await Promise.all(workers);
    }
    static generateSafeFilename(originalFilename) {
        const uuid = (0, uuid_1.v4)();
        const ext = path_1.default.extname(originalFilename);
        const baseName = path_1.default.parse(originalFilename).name;
        // Maximum filename length (most filesystems support 255 characters)
        // Reserve space for UUID (36 chars) + underscore (1) + extension
        const maxBaseNameLength = 255 - 36 - 1 - ext.length;
        let safeName = baseName;
        // Truncate if too long
        if (safeName.length > maxBaseNameLength) {
            safeName = safeName.substring(0, maxBaseNameLength);
            console.log(`Truncated long filename: "${originalFilename}" -> "${safeName}${ext}"`);
        }
        // Remove or replace problematic characters
        safeName = safeName
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace invalid characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
        // Ensure we have a valid name
        if (!safeName) {
            safeName = 'image';
        }
        return `${uuid}_${safeName}${ext}`;
    }
    static async cleanupUploadedFile(filePath) {
        try {
            await fs_1.promises.unlink(filePath);
            console.log(`🗑️ Cleaned up uploaded file: ${path_1.default.basename(filePath)}`);
        }
        catch (error) {
            console.warn(`Failed to cleanup uploaded file ${filePath}:`, error);
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