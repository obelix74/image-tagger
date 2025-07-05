import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { ImageProcessingService } from './ImageProcessingService';
import { GeminiService } from './GeminiService';
import { ImageMetadata } from '../types';

export interface BatchProcessingOptions {
  thumbnailSize?: number;
  geminiImageSize?: number;
  quality?: number;
  skipDuplicates?: boolean;
  parallelConnections?: number;
}

export interface BatchProcessingResult {
  batchId: string;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  duplicateFiles: number;
  errorFiles: number;
  errors: Array<{
    file: string;
    error: string;
    type: 'duplicate' | 'processing' | 'unsupported';
  }>;
  processedImages: ImageMetadata[];
  status: 'processing' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
}

export interface BatchJob {
  id: string;
  folderPath: string;
  options: BatchProcessingOptions;
  result: BatchProcessingResult;
  createdAt: string;
}

export class BatchProcessingService {
  private static activeBatches = new Map<string, BatchJob>();
  private static readonly SUPPORTED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.tiff', '.tif', 
    '.cr2', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2'
  ];

  static async startBatchProcessing(
    folderPath: string, 
    options: BatchProcessingOptions = {}
  ): Promise<string> {
    const batchId = uuidv4();
    const startTime = new Date().toISOString();

    // Initialize batch job
    const batchJob: BatchJob = {
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

  static async getBatchStatus(batchId: string): Promise<BatchProcessingResult | null> {
    const batch = this.activeBatches.get(batchId);
    return batch ? batch.result : null;
  }

  static async getAllBatches(): Promise<BatchJob[]> {
    return Array.from(this.activeBatches.values());
  }

  private static async processBatchInBackground(batchJob: BatchJob): Promise<void> {
    try {
      console.log(`Starting batch processing for folder: ${batchJob.folderPath}`);
      
      // Discover all image files recursively
      const imageFiles = await this.discoverImageFiles(batchJob.folderPath);
      batchJob.result.totalFiles = imageFiles.length;

      console.log(`Found ${imageFiles.length} image files to process`);

      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const thumbnailDir = process.env.THUMBNAIL_DIR || './thumbnails';

      // Ensure directories exist
      await ImageProcessingService.ensureDirectoryExists(uploadDir);
      await ImageProcessingService.ensureDirectoryExists(thumbnailDir);

      // Process images with parallel connections
      const parallelConnections = batchJob.options.parallelConnections || 1;

      if (parallelConnections === 1) {
        // Sequential processing (original behavior)
        for (let i = 0; i < imageFiles.length; i++) {
          const filePath = imageFiles[i];
          console.log(`📸 Processing image ${i + 1}/${imageFiles.length}: ${path.basename(filePath)}`);

          try {
            await this.processFile(filePath, batchJob, uploadDir, thumbnailDir);
            console.log(`✅ Successfully processed image ${i + 1}/${imageFiles.length}`);
          } catch (error) {
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
      } else {
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

    } catch (error) {
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

  private static async discoverImageFiles(folderPath: string): Promise<string[]> {
    const imageFiles: string[] = [];

    async function scanDirectory(dirPath: string): Promise<void> {
      try {
        console.log(`Scanning directory: "${dirPath}"`);
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          console.log(`Processing entry: "${entry.name}" -> "${fullPath}"`);

          if (entry.isDirectory()) {
            // Recursively scan subdirectories
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            // Check if file is a supported image format
            const ext = path.extname(entry.name).toLowerCase();
            if (BatchProcessingService.SUPPORTED_EXTENSIONS.includes(ext)) {
              console.log(`Found supported image: "${fullPath}"`);
              imageFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
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

  private static async processFile(
    filePath: string,
    batchJob: BatchJob,
    uploadDir: string,
    thumbnailDir: string
  ): Promise<void> {
    console.log(`Processing file: "${filePath}"`);
    const fileName = path.basename(filePath);

    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch (error) {
      console.error(`Failed to get file stats for "${filePath}":`, error);
      throw new Error(`Cannot access file: ${filePath}`);
    }

    // Check for duplicates if enabled
    if (batchJob.options.skipDuplicates) {
      const existingImage = await DatabaseService.findDuplicateImage(fileName, stats.size);
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
    const destinationPath = path.join(uploadDir, uniqueFilename);

    // Copy file to upload directory
    try {
      console.log(`Copying file from "${filePath}" to "${destinationPath}"`);
      await fs.copyFile(filePath, destinationPath);
    } catch (error) {
      console.error(`Failed to copy file from "${filePath}" to "${destinationPath}":`, error);
      throw new Error(`Failed to copy file: ${filePath}`);
    }

    try {
      // Process the image
      const processingOptions = {
        thumbnailSize: batchJob.options.thumbnailSize!,
        geminiImageSize: batchJob.options.geminiImageSize!,
        quality: batchJob.options.quality!
      };

      const processedResult = await ImageProcessingService.processImage(
        destinationPath,
        uploadDir,
        thumbnailDir,
        uniqueFilename,
        processingOptions
      );

      // Create image metadata
      const imageMetadata: Omit<ImageMetadata, 'id'> = {
        filename: uniqueFilename,
        originalName: fileName,
        filePath: destinationPath,
        thumbnailPath: processedResult.thumbnailPath,
        fileSize: stats.size,
        mimeType: ImageProcessingService.getMimeType(fileName),
        width: processedResult.width,
        height: processedResult.height,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      };

      // Save to database
      const imageId = await DatabaseService.insertImage(imageMetadata);
      const savedImage = await DatabaseService.getImage(imageId);

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
            await DatabaseService.insertImageMetadata(metadataToStore);
            console.log(`📋 Stored metadata for image ${imageId}`);
          } catch (metadataError) {
            console.warn(`Failed to store metadata for image ${imageId}:`, metadataError);
          }
        }

        // Start AI analysis (parallel or sequential based on settings)
        if (batchJob.options.parallelConnections === 1) {
          // Sequential: wait for AI analysis to complete
          console.log(`Starting sequential AI analysis for image ${imageId}`);
          await this.processImageAnalysisInBackground(imageId, processedResult.processedPath);
          console.log(`Completed AI analysis for image ${imageId}, ready for next image`);
        } else {
          // Parallel: start AI analysis in background without waiting
          console.log(`Starting parallel AI analysis for image ${imageId}`);
          this.processImageAnalysisInBackground(imageId, processedResult.processedPath)
            .catch(error => {
              console.error(`AI analysis failed for image ${imageId}:`, error);
            });
        }
      }

    } catch (error) {
      // Clean up the copied file if processing failed
      try {
        await fs.unlink(destinationPath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file after processing error:', cleanupError);
      }
      throw error;
    }
  }

  private static async processImagesInParallel(
    batchJob: BatchJob,
    imageFiles: string[],
    uploadDir: string,
    thumbnailDir: string,
    parallelConnections: number
  ): Promise<void> {
    const semaphore = new Array(parallelConnections).fill(null);
    let currentIndex = 0;

    const processNext = async (): Promise<void> => {
      while (currentIndex < imageFiles.length) {
        const index = currentIndex++;
        const filePath = imageFiles[index];

        console.log(`📸 Processing image ${index + 1}/${imageFiles.length}: ${path.basename(filePath)}`);

        try {
          await this.processFile(filePath, batchJob, uploadDir, thumbnailDir);
          console.log(`✅ Successfully processed image ${index + 1}/${imageFiles.length}`);
          batchJob.result.successfulFiles++;
        } catch (error) {
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
    };

    // Start parallel workers
    const workers = semaphore.map(() => processNext());
    await Promise.all(workers);
  }

  private static generateSafeFilename(originalFilename: string): string {
    const uuid = uuidv4();
    const ext = path.extname(originalFilename);
    const baseName = path.parse(originalFilename).name;

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

  private static async processImageAnalysisInBackground(imageId: number, imagePath: string): Promise<void> {
    try {
      // Update status to processing
      await DatabaseService.updateImageStatus(imageId, 'processing');

      console.log(`Starting AI analysis for image ${imageId}`);

      // Analyze with Gemini (this will now throw errors instead of returning fallback)
      const analysis = await GeminiService.analyzeImageFromPath(imagePath, false);

      // Save analysis to database
      const analysisData = {
        imageId,
        description: analysis.description,
        caption: analysis.caption,
        keywords: analysis.keywords,
        confidence: analysis.confidence,
        analysisDate: new Date().toISOString()
      };
      await DatabaseService.insertAnalysis(analysisData);

      // Update status to completed only if AI analysis succeeded
      await DatabaseService.updateImageStatus(imageId, 'completed');

      console.log(`✅ AI analysis completed successfully for image ${imageId}`);
    } catch (error) {
      console.error(`❌ AI analysis failed for image ${imageId}:`, error);

      // Update status to error with detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI analysis error';
      await DatabaseService.updateImageStatus(imageId, 'error', `AI analysis failed: ${errorMessage}`);

      console.log(`🚫 Image ${imageId} marked as failed due to AI analysis error`);

      // Re-throw the error so batch processing can handle it appropriately
      throw error;
    }
  }

  static async deleteBatch(batchId: string): Promise<boolean> {
    return this.activeBatches.delete(batchId);
  }

  static async clearCompletedBatches(): Promise<number> {
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
