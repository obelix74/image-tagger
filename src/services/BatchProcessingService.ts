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

      // Process each file
      for (const filePath of imageFiles) {
        try {
          await this.processFile(filePath, batchJob, uploadDir, thumbnailDir);
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
          batchJob.result.errorFiles++;
          batchJob.result.errors.push({
            file: filePath,
            error: error instanceof Error ? error.message : 'Unknown error',
            type: 'processing'
          });
        }
        
        batchJob.result.processedFiles++;
      }

      // Mark batch as completed
      batchJob.result.status = 'completed';
      batchJob.result.endTime = new Date().toISOString();

      console.log(`Batch processing completed. Processed: ${batchJob.result.successfulFiles}, Duplicates: ${batchJob.result.duplicateFiles}, Errors: ${batchJob.result.errorFiles}`);

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
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Recursively scan subdirectories
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            // Check if file is a supported image format
            const ext = path.extname(entry.name).toLowerCase();
            if (BatchProcessingService.SUPPORTED_EXTENSIONS.includes(ext)) {
              imageFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
      }
    }

    await scanDirectory(folderPath);
    return imageFiles;
  }

  private static async processFile(
    filePath: string,
    batchJob: BatchJob,
    uploadDir: string,
    thumbnailDir: string
  ): Promise<void> {
    const fileName = path.basename(filePath);
    const stats = await fs.stat(filePath);

    // Check for duplicates if enabled
    if (batchJob.options.skipDuplicates) {
      const existingImage = await DatabaseService.findDuplicateImage(fileName, stats.size);
      if (existingImage) {
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
    const uniqueFilename = `${uuidv4()}_${fileName}`;
    const destinationPath = path.join(uploadDir, uniqueFilename);

    // Copy file to upload directory
    await fs.copyFile(filePath, destinationPath);

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
        batchJob.result.successfulFiles++;

        // Start background AI analysis
        this.processImageAnalysisInBackground(imageId, processedResult.processedPath);
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

  private static async processImageAnalysisInBackground(imageId: number, imagePath: string): Promise<void> {
    try {
      // Update status to processing
      await DatabaseService.updateImageStatus(imageId, 'processing');

      // Analyze with Gemini
      const analysis = await GeminiService.analyzeImageFromPath(imagePath);

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

      // Update status to completed
      await DatabaseService.updateImageStatus(imageId, 'completed');

      console.log(`Image ${imageId} processed successfully`);
    } catch (error) {
      console.error(`Failed to process image ${imageId}:`, error);
      await DatabaseService.updateImageStatus(imageId, 'error', error instanceof Error ? error.message : 'Processing failed');
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
