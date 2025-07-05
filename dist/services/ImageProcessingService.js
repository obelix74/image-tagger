"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageProcessingService = void 0;
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const exifr_1 = __importDefault(require("exifr"));
class ImageProcessingService {
    static isSupported(filename) {
        const ext = path_1.default.extname(filename).toLowerCase().slice(1);
        return this.SUPPORTED_FORMATS.some(format => format.extension === ext);
    }
    static isRawFormat(filename) {
        const ext = path_1.default.extname(filename).toLowerCase().slice(1);
        const format = this.SUPPORTED_FORMATS.find(f => f.extension === ext);
        return format?.isRaw || false;
    }
    static getMimeType(filename) {
        const ext = path_1.default.extname(filename).toLowerCase().slice(1);
        const format = this.SUPPORTED_FORMATS.find(f => f.extension === ext);
        return format?.mimeType || 'application/octet-stream';
    }
    static async processImage(inputPath, outputDir, thumbnailDir, filename, options) {
        const isRaw = this.isRawFormat(filename);
        let processedPath;
        let imageBuffer;
        if (isRaw) {
            // For RAW files, extract preview and process it
            const previewBuffer = await this.extractRawPreview(inputPath);
            imageBuffer = previewBuffer;
            // Save the processed preview
            const processedFilename = this.getProcessedFilename(filename);
            processedPath = path_1.default.join(outputDir, processedFilename);
            await (0, sharp_1.default)(previewBuffer)
                .resize(options.geminiImageSize, options.geminiImageSize, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .jpeg({ quality: options.quality })
                .toFile(processedPath);
        }
        else {
            // For standard formats, process directly
            processedPath = inputPath;
            imageBuffer = await promises_1.default.readFile(inputPath);
        }
        // Create thumbnail
        const thumbnailFilename = this.getThumbnailFilename(filename);
        const thumbnailPath = path_1.default.join(thumbnailDir, thumbnailFilename);
        const thumbnailInfo = await (0, sharp_1.default)(imageBuffer)
            .resize(options.thumbnailSize, options.thumbnailSize, {
            fit: 'inside',
            withoutEnlargement: true
        })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
        // Get image dimensions
        const imageInfo = await (0, sharp_1.default)(imageBuffer).metadata();
        // Extract EXIF data
        let metadata;
        try {
            metadata = await exifr_1.default.parse(imageBuffer);
        }
        catch (error) {
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
    static async extractRawPreview(rawFilePath) {
        try {
            // Try to extract preview using exifr
            const preview = await exifr_1.default.thumbnail(rawFilePath);
            if (preview) {
                return Buffer.from(preview);
            }
        }
        catch (error) {
            console.warn('Failed to extract RAW preview with exifr:', error);
        }
        // Fallback: try to process with sharp (may not work for all RAW formats)
        try {
            const buffer = await (0, sharp_1.default)(rawFilePath)
                .jpeg()
                .toBuffer();
            return buffer;
        }
        catch (error) {
            throw new Error(`Unable to process RAW file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async resizeForGemini(imagePath, maxSize = 1024) {
        return await (0, sharp_1.default)(imagePath)
            .resize(maxSize, maxSize, {
            fit: 'inside',
            withoutEnlargement: true
        })
            .jpeg({ quality: 85 })
            .toBuffer();
    }
    static getProcessedFilename(originalFilename) {
        const name = path_1.default.parse(originalFilename).name;
        return `${name}_processed.jpg`;
    }
    static getThumbnailFilename(originalFilename) {
        const name = path_1.default.parse(originalFilename).name;
        return `${name}_thumb.jpg`;
    }
    static async ensureDirectoryExists(dirPath) {
        try {
            await promises_1.default.access(dirPath);
        }
        catch {
            await promises_1.default.mkdir(dirPath, { recursive: true });
        }
    }
    static async deleteFile(filePath) {
        try {
            await promises_1.default.unlink(filePath);
        }
        catch (error) {
            console.warn(`Failed to delete file ${filePath}:`, error);
        }
    }
    static getFileSize(filePath) {
        return promises_1.default.stat(filePath).then(stats => stats.size);
    }
}
exports.ImageProcessingService = ImageProcessingService;
ImageProcessingService.SUPPORTED_FORMATS = [
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
//# sourceMappingURL=ImageProcessingService.js.map