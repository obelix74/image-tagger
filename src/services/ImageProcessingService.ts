import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import exifr from 'exifr';
import { SupportedFormat, ImageProcessingOptions } from '../types';

export class ImageProcessingService {
  private static readonly SUPPORTED_FORMATS: SupportedFormat[] = [
    { extension: 'jpg', mimeType: 'image/jpeg', isRaw: false },
    { extension: 'jpeg', mimeType: 'image/jpeg', isRaw: false },
    { extension: 'png', mimeType: 'image/png', isRaw: false },
    { extension: 'tiff', mimeType: 'image/tiff', isRaw: false },
    { extension: 'tif', mimeType: 'image/tiff', isRaw: false },
    { extension: 'cr2', mimeType: 'image/x-canon-cr2', isRaw: true },
    { extension: 'nef', mimeType: 'image/x-nikon-nef', isRaw: true },
    { extension: 'arw', mimeType: 'image/x-sony-arw', isRaw: true },
    { extension: 'dng', mimeType: 'image/x-adobe-dng', isRaw: true },
    { extension: 'raf', mimeType: 'image/x-fuji-raf', isRaw: true },
    { extension: 'orf', mimeType: 'image/x-olympus-orf', isRaw: true },
    { extension: 'rw2', mimeType: 'image/x-panasonic-rw2', isRaw: true }
  ];

  static isSupported(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return this.SUPPORTED_FORMATS.some(format => format.extension === ext);
  }

  static isRawFormat(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase().slice(1);
    const format = this.SUPPORTED_FORMATS.find(f => f.extension === ext);
    return format?.isRaw || false;
  }

  static getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase().slice(1);
    const format = this.SUPPORTED_FORMATS.find(f => f.extension === ext);
    return format?.mimeType || 'application/octet-stream';
  }

  static async processImage(
    inputPath: string,
    outputDir: string,
    thumbnailDir: string,
    filename: string,
    options: ImageProcessingOptions
  ): Promise<{
    processedPath: string;
    thumbnailPath: string;
    width: number;
    height: number;
    metadata?: any;
  }> {
    const isRaw = this.isRawFormat(filename);
    let processedPath: string;
    let imageBuffer: Buffer;

    if (isRaw) {
      // For RAW files, extract preview and process it
      const previewBuffer = await this.extractRawPreview(inputPath);
      imageBuffer = previewBuffer;
      
      // Save the processed preview
      const processedFilename = this.getProcessedFilename(filename);
      processedPath = path.join(outputDir, processedFilename);
      
      await sharp(previewBuffer)
        .resize(options.geminiImageSize, options.geminiImageSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: options.quality })
        .toFile(processedPath);
    } else {
      // For standard formats, process directly
      processedPath = inputPath;
      imageBuffer = await fs.readFile(inputPath);
    }

    // Create thumbnail
    const thumbnailFilename = this.getThumbnailFilename(filename);
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
    
    const thumbnailInfo = await sharp(imageBuffer)
      .resize(options.thumbnailSize, options.thumbnailSize, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Get image dimensions
    const imageInfo = await sharp(imageBuffer).metadata();
    
    // Extract EXIF data
    let metadata;
    try {
      metadata = await exifr.parse(imageBuffer);
    } catch (error) {
      console.warn('Failed to extract EXIF data:', error);
      metadata = null;
    }

    return {
      processedPath,
      thumbnailPath,
      width: imageInfo.width || 0,
      height: imageInfo.height || 0,
      metadata
    };
  }

  private static async extractRawPreview(rawFilePath: string): Promise<Buffer> {
    try {
      // Try to extract preview using exifr
      const preview = await exifr.thumbnail(rawFilePath);
      if (preview) {
        return Buffer.from(preview);
      }
    } catch (error) {
      console.warn('Failed to extract RAW preview with exifr:', error);
    }

    // Fallback: try to process with sharp (may not work for all RAW formats)
    try {
      const buffer = await sharp(rawFilePath)
        .jpeg()
        .toBuffer();
      return buffer;
    } catch (error) {
      throw new Error(`Unable to process RAW file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async resizeForGemini(imagePath: string, maxSize: number = 1024): Promise<Buffer> {
    return await sharp(imagePath)
      .resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  private static getProcessedFilename(originalFilename: string): string {
    const name = path.parse(originalFilename).name;
    return `${name}_processed.jpg`;
  }

  private static getThumbnailFilename(originalFilename: string): string {
    const name = path.parse(originalFilename).name;
    return `${name}_thumb.jpg`;
  }

  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete file ${filePath}:`, error);
    }
  }

  static getFileSize(filePath: string): Promise<number> {
    return fs.stat(filePath).then(stats => stats.size);
  }
}
