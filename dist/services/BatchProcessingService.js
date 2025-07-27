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
                parallelConnections: options.parallelConnections || 1,
                maxRetries: options.maxRetries ?? this.DEFAULT_OPTIONS.maxRetries,
                retryDelay: options.retryDelay ?? this.DEFAULT_OPTIONS.retryDelay,
                enableRateLimit: options.enableRateLimit ?? this.DEFAULT_OPTIONS.enableRateLimit,
                maxConcurrentAnalysis: options.maxConcurrentAnalysis ?? this.DEFAULT_OPTIONS.maxConcurrentAnalysis
            },
            result: {
                batchId,
                totalFiles: 0,
                processedFiles: 0,
                successfulFiles: 0,
                duplicateFiles: 0,
                errorFiles: 0,
                retryingFiles: 0,
                pendingAnalysis: 0,
                completedAnalysis: 0,
                failedAnalysis: 0,
                errors: [],
                processedImages: [],
                status: 'processing',
                startTime,
                currentPhase: 'discovery',
                processingRate: 0,
                memoryUsage: this.getMemoryUsage()
            },
            createdAt: startTime
        };
        this.activeBatches.set(batchId, batchJob);
        // Initialize tracking structures
        this.analysisQueue.set(batchId, []);
        this.activeAnalysis.set(batchId, new Set());
        this.processingMetrics.set(batchId, {
            startTime: Date.now(),
            lastUpdateTime: Date.now(),
            processedCount: 0,
            totalFileSize: 0,
            processedFileSize: 0
        });
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
    static async pauseBatch(batchId) {
        const batch = this.activeBatches.get(batchId);
        if (!batch || batch.result.status !== 'processing') {
            return false;
        }
        batch.result.pauseRequested = true;
        console.log(`🛑 Pause requested for batch ${batchId}`);
        return true;
    }
    static async resumeBatch(batchId) {
        const batch = this.activeBatches.get(batchId);
        if (!batch || batch.result.status !== 'paused') {
            return false;
        }
        batch.result.status = 'processing';
        batch.result.pauseRequested = false;
        console.log(`▶️ Resuming batch ${batchId}`);
        // Resume processing
        this.processBatchInBackground(batch);
        return true;
    }
    static getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            used: Math.round(usage.heapUsed / 1024 / 1024),
            total: Math.round(usage.heapTotal / 1024 / 1024),
            percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
        };
    }
    static updateProcessingMetrics(batchId, fileSize = 0) {
        const metrics = this.processingMetrics.get(batchId);
        const batch = this.activeBatches.get(batchId);
        if (!metrics || !batch)
            return;
        const now = Date.now();
        metrics.processedCount++;
        metrics.processedFileSize += fileSize;
        // Calculate processing rate (files per minute)
        const elapsed = (now - metrics.startTime) / 1000 / 60;
        batch.result.processingRate = elapsed > 0 ? Math.round(metrics.processedCount / elapsed) : 0;
        // Estimate time remaining
        if (batch.result.processingRate > 0 && batch.result.totalFiles > 0) {
            const remaining = batch.result.totalFiles - batch.result.processedFiles;
            const minutesRemaining = remaining / batch.result.processingRate;
            if (minutesRemaining < 60) {
                batch.result.estimatedTimeRemaining = `${Math.round(minutesRemaining)}m`;
            }
            else {
                const hours = Math.floor(minutesRemaining / 60);
                const minutes = Math.round(minutesRemaining % 60);
                batch.result.estimatedTimeRemaining = `${hours}h ${minutes}m`;
            }
        }
        // Update memory usage
        batch.result.memoryUsage = this.getMemoryUsage();
        metrics.lastUpdateTime = now;
    }
    static async processBatchInBackground(batchJob) {
        try {
            console.log(`Starting batch processing for folder: ${batchJob.folderPath}`);
            // Check for pause before starting
            if (batchJob.result.pauseRequested) {
                batchJob.result.status = 'paused';
                console.log(`🛑 Batch ${batchJob.id} paused during initialization`);
                return;
            }
            // Discover all image files recursively
            batchJob.result.currentPhase = 'discovery';
            const imageFiles = await this.discoverImageFiles(batchJob.folderPath);
            batchJob.result.totalFiles = imageFiles.length;
            console.log(`Found ${imageFiles.length} image files to process`);
            if (imageFiles.length === 0) {
                batchJob.result.status = 'completed';
                batchJob.result.endTime = new Date().toISOString();
                console.log(`No images found in ${batchJob.folderPath}`);
                return;
            }
            // Update phase to uploading
            batchJob.result.currentPhase = 'uploading';
            const uploadDir = process.env.UPLOAD_DIR || './uploads';
            const thumbnailDir = process.env.THUMBNAIL_DIR || './thumbnails';
            // Ensure directories exist
            await ImageProcessingService_1.ImageProcessingService.ensureDirectoryExists(uploadDir);
            await ImageProcessingService_1.ImageProcessingService.ensureDirectoryExists(thumbnailDir);
            // Process images with enhanced parallel processing
            const parallelConnections = batchJob.options.parallelConnections || 1;
            if (parallelConnections === 1) {
                // Sequential processing with pause support
                for (let i = 0; i < imageFiles.length; i++) {
                    // Check for pause request
                    if (batchJob.result.pauseRequested) {
                        batchJob.result.status = 'paused';
                        console.log(`🛑 Batch ${batchJob.id} paused at image ${i + 1}/${imageFiles.length}`);
                        return;
                    }
                    const filePath = imageFiles[i];
                    console.log(`📸 Processing image ${i + 1}/${imageFiles.length}: ${path_1.default.basename(filePath)}`);
                    try {
                        const fileStats = await fs_1.promises.stat(filePath);
                        await this.processFile(filePath, batchJob, uploadDir, thumbnailDir);
                        console.log(`✅ Successfully processed image ${i + 1}/${imageFiles.length}`);
                        batchJob.result.successfulFiles++;
                        this.updateProcessingMetrics(batchJob.id, fileStats.size);
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
                    // Log progress with enhanced metrics
                    const progress = Math.round((batchJob.result.processedFiles / batchJob.result.totalFiles) * 100);
                    const memUsage = batchJob.result.memoryUsage;
                    console.log(`📊 Batch progress: ${batchJob.result.processedFiles}/${batchJob.result.totalFiles} (${progress}%) | Rate: ${batchJob.result.processingRate}/min | Memory: ${memUsage?.used}MB (${memUsage?.percentage}%)`);
                }
            }
            else {
                // Enhanced parallel processing
                console.log(`🚀 Processing ${imageFiles.length} images with ${parallelConnections} parallel connections`);
                await this.processImagesInParallelEnhanced(batchJob, imageFiles, uploadDir, thumbnailDir, parallelConnections);
            }
            // Start analysis phase
            batchJob.result.currentPhase = 'analysis';
            await this.processAnalysisQueue(batchJob.id);
            // Finalization phase
            batchJob.result.currentPhase = 'finalizing';
            // Wait for any remaining analysis tasks
            await this.waitForAnalysisCompletion(batchJob.id);
            // Mark batch as completed
            batchJob.result.status = 'completed';
            batchJob.result.endTime = new Date().toISOString();
            console.log(`🎉 Batch processing completed!`);
            console.log(`📊 Final Results:`);
            console.log(`   ✅ Successful: ${batchJob.result.successfulFiles}`);
            console.log(`   🔄 Duplicates: ${batchJob.result.duplicateFiles}`);
            console.log(`   ❌ Errors: ${batchJob.result.errorFiles}`);
            console.log(`   📁 Total Files: ${batchJob.result.totalFiles}`);
            console.log(`   🤖 AI Analysis - Completed: ${batchJob.result.completedAnalysis}, Failed: ${batchJob.result.failedAnalysis}`);
            console.log(`   ⏱️ Total Duration: ${this.formatDuration(batchJob.result.startTime, batchJob.result.endTime)}`);
            // Cleanup tracking structures
            this.cleanupBatchTracking(batchJob.id);
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
                // Queue AI analysis task for later processing
                const queue = this.analysisQueue.get(batchJob.id);
                if (queue) {
                    queue.push({
                        imageId,
                        imagePath: processedResult.processedPath,
                        retryCount: 0,
                        batchId: batchJob.id
                    });
                    console.log(`📋 Queued AI analysis for image ${imageId} (queue length: ${queue.length})`);
                }
                // Clean up uploaded file immediately (processed file is kept for analysis)
                this.cleanupUploadedFile(destinationPath);
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
    static async processImagesInParallelEnhanced(batchJob, imageFiles, uploadDir, thumbnailDir, parallelConnections) {
        const semaphore = new Array(parallelConnections).fill(null);
        let currentIndex = 0;
        const processNext = async () => {
            while (currentIndex < imageFiles.length && !batchJob.result.pauseRequested) {
                const index = currentIndex++;
                const filePath = imageFiles[index];
                console.log(`📸 Processing image ${index + 1}/${imageFiles.length}: ${path_1.default.basename(filePath)}`);
                try {
                    const fileStats = await fs_1.promises.stat(filePath);
                    await this.processFile(filePath, batchJob, uploadDir, thumbnailDir);
                    console.log(`✅ Successfully processed image ${index + 1}/${imageFiles.length}`);
                    batchJob.result.successfulFiles++;
                    this.updateProcessingMetrics(batchJob.id, fileStats.size);
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
                // Enhanced progress logging
                const progress = Math.round((batchJob.result.processedFiles / batchJob.result.totalFiles) * 100);
                const memUsage = batchJob.result.memoryUsage;
                console.log(`📊 Batch progress: ${batchJob.result.processedFiles}/${batchJob.result.totalFiles} (${progress}%) | Rate: ${batchJob.result.processingRate}/min | Memory: ${memUsage?.used}MB (${memUsage?.percentage}%) | ETA: ${batchJob.result.estimatedTimeRemaining || 'calculating...'}`);
                // Force garbage collection periodically
                if (batchJob.result.processedFiles % 5 === 0 && global.gc) {
                    global.gc();
                }
            }
        };
        // Start parallel workers
        const workers = semaphore.map(() => processNext());
        await Promise.all(workers);
        // Check if paused during processing
        if (batchJob.result.pauseRequested) {
            batchJob.result.status = 'paused';
            console.log(`🛑 Batch ${batchJob.id} paused during parallel processing`);
        }
    }
    static async processAnalysisQueue(batchId) {
        const batch = this.activeBatches.get(batchId);
        const queue = this.analysisQueue.get(batchId);
        const activeSet = this.activeAnalysis.get(batchId);
        if (!batch || !queue || !activeSet)
            return;
        const maxConcurrent = batch.options.maxConcurrentAnalysis || this.DEFAULT_OPTIONS.maxConcurrentAnalysis;
        while (queue.length > 0 && !batch.result.pauseRequested) {
            // Process analysis tasks with concurrency limit
            const currentBatch = queue.splice(0, Math.min(maxConcurrent, queue.length));
            batch.result.pendingAnalysis = queue.length;
            const analysisPromises = currentBatch.map(task => this.processAnalysisTaskWithRetry(task, batch));
            await Promise.allSettled(analysisPromises);
            // Wait a bit if rate limiting is enabled
            if (batch.options.enableRateLimit) {
                await this.applyRateLimit(batchId);
            }
        }
    }
    static async processAnalysisTaskWithRetry(task, batch) {
        const activeSet = this.activeAnalysis.get(task.batchId);
        if (!activeSet)
            return;
        activeSet.add(task.imageId);
        try {
            await this.processImageAnalysisInBackgroundEnhanced(task.imageId, task.imagePath, batch);
            batch.result.completedAnalysis++;
            console.log(`✅ AI analysis completed for image ${task.imageId} (attempt ${task.retryCount + 1})`);
        }
        catch (error) {
            console.error(`❌ AI analysis failed for image ${task.imageId} (attempt ${task.retryCount + 1}):`, error);
            if (task.retryCount < (batch.options.maxRetries || this.DEFAULT_OPTIONS.maxRetries)) {
                // Retry the task
                task.retryCount++;
                batch.result.retryingFiles++;
                console.log(`🔄 Retrying AI analysis for image ${task.imageId} (attempt ${task.retryCount + 1})`);
                // Add delay before retry
                await new Promise(resolve => setTimeout(resolve, batch.options.retryDelay || this.DEFAULT_OPTIONS.retryDelay));
                // Re-queue the task
                const queue = this.analysisQueue.get(task.batchId);
                if (queue) {
                    queue.push(task);
                }
                batch.result.retryingFiles--;
            }
            else {
                // Max retries exhausted
                batch.result.failedAnalysis++;
                batch.result.errors.push({
                    file: `Image ID: ${task.imageId}`,
                    error: error instanceof Error ? error.message : 'Unknown analysis error',
                    type: 'retry_exhausted',
                    retryCount: task.retryCount
                });
                // Mark image as failed in database
                await DatabaseService_1.DatabaseService.updateImageStatus(task.imageId, 'error', `AI analysis failed after ${task.retryCount} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        finally {
            activeSet.delete(task.imageId);
        }
    }
    static async waitForAnalysisCompletion(batchId) {
        const batch = this.activeBatches.get(batchId);
        const activeSet = this.activeAnalysis.get(batchId);
        const queue = this.analysisQueue.get(batchId);
        if (!batch || !activeSet || !queue)
            return;
        // Wait for all active analysis tasks to complete
        while ((activeSet.size > 0 || queue.length > 0) && !batch.result.pauseRequested) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Update pending count
            batch.result.pendingAnalysis = queue.length + activeSet.size;
            console.log(`⏳ Waiting for ${activeSet.size} active and ${queue.length} queued analysis tasks to complete...`);
        }
    }
    static async applyRateLimit(batchId) {
        const lastCall = this.rateLimiter.get(batchId) || 0;
        const now = Date.now();
        const minInterval = 100; // Minimum 100ms between batches of API calls
        const elapsed = now - lastCall;
        if (elapsed < minInterval) {
            await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
        }
        this.rateLimiter.set(batchId, Date.now());
    }
    static cleanupBatchTracking(batchId) {
        this.analysisQueue.delete(batchId);
        this.activeAnalysis.delete(batchId);
        this.processingMetrics.delete(batchId);
        this.rateLimiter.delete(batchId);
        console.log(`🧹 Cleaned up tracking structures for batch ${batchId}`);
    }
    static formatDuration(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.round((end.getTime() - start.getTime()) / 1000);
        if (duration < 60)
            return `${duration}s`;
        if (duration < 3600)
            return `${Math.floor(duration / 60)}m ${duration % 60}s`;
        return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
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
    static async processImageAnalysisInBackgroundEnhanced(imageId, imagePath, batch) {
        try {
            // Update status to processing
            await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'processing');
            console.log(`Starting enhanced AI analysis for image ${imageId}`);
            // Use localized prompts if available
            const prompt = batch.options.customPrompt || undefined;
            // Analyze with Gemini (this will now throw errors instead of returning fallback)
            const analysis = await GeminiService_1.GeminiService.analyzeImageFromPath(imagePath, false, prompt);
            // Save analysis to database with extended metadata
            const analysisData = {
                imageId,
                description: analysis.description,
                caption: analysis.caption,
                keywords: analysis.keywords,
                title: analysis.title,
                headline: analysis.headline,
                instructions: analysis.instructions,
                location: analysis.location,
                confidence: analysis.confidence,
                analysisDate: new Date().toISOString()
            };
            await DatabaseService_1.DatabaseService.insertAnalysis(analysisData);
            // Update status to completed only if AI analysis succeeded
            await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'completed');
            console.log(`✅ Enhanced AI analysis completed successfully for image ${imageId}`);
        }
        catch (error) {
            console.error(`❌ Enhanced AI analysis failed for image ${imageId}:`, error);
            // Update status to error with detailed error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown AI analysis error';
            await DatabaseService_1.DatabaseService.updateImageStatus(imageId, 'error', `AI analysis failed: ${errorMessage}`);
            console.log(`🚫 Image ${imageId} marked as failed due to AI analysis error`);
            // Re-throw the error so batch processing can handle it appropriately
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
BatchProcessingService.analysisQueue = new Map();
BatchProcessingService.activeAnalysis = new Map();
BatchProcessingService.processingMetrics = new Map();
BatchProcessingService.rateLimiter = new Map();
BatchProcessingService.SUPPORTED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.tiff', '.tif',
    '.cr2', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2'
];
BatchProcessingService.DEFAULT_OPTIONS = {
    maxRetries: 3,
    retryDelay: 2000,
    enableRateLimit: true,
    maxConcurrentAnalysis: 5
};
//# sourceMappingURL=BatchProcessingService.js.map