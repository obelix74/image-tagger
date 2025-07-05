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
        // Extract comprehensive EXIF/IPTC data
        let metadata;
        try {
            metadata = await this.extractComprehensiveMetadata(imageBuffer);
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
        const safeName = this.sanitizeFilename(name);
        return `${safeName}_processed.jpg`;
    }
    static getThumbnailFilename(originalFilename) {
        const name = path_1.default.parse(originalFilename).name;
        const safeName = this.sanitizeFilename(name);
        return `${safeName}_thumb.jpg`;
    }
    static sanitizeFilename(filename) {
        // Maximum filename length for components (reserve space for suffixes)
        const maxLength = 200;
        let safeName = filename;
        // Truncate if too long
        if (safeName.length > maxLength) {
            safeName = safeName.substring(0, maxLength);
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
        return safeName;
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
    static async extractComprehensiveMetadata(imageBuffer) {
        try {
            // Limit buffer size to prevent memory issues
            const maxBufferSize = 50 * 1024 * 1024; // 50MB limit
            if (imageBuffer.length > maxBufferSize) {
                console.warn(`Image buffer too large (${imageBuffer.length} bytes), skipping EXIF extraction`);
                return null;
            }
            // Extract essential EXIF, IPTC, and XMP data with memory-conscious options
            const exifData = await exifr_1.default.parse(imageBuffer, {
                exif: true,
                iptc: true,
                xmp: true,
                icc: false, // Skip ICC profiles to save memory
                gps: true,
                interop: false, // Skip interop to save memory
                makerNote: false, // Skip maker notes to avoid large data
                multiSegment: false // Disable multi-segment parsing to save memory
            });
            if (!exifData) {
                return null;
            }
            // Extract GPS coordinates
            let latitude;
            let longitude;
            let altitude;
            if (exifData.latitude && exifData.longitude) {
                latitude = exifData.latitude;
                longitude = exifData.longitude;
                altitude = exifData.altitude;
            }
            else if (exifData.GPSLatitude && exifData.GPSLongitude) {
                // Handle different GPS coordinate formats
                latitude = this.convertGPSCoordinate(exifData.GPSLatitude, exifData.GPSLatitudeRef);
                longitude = this.convertGPSCoordinate(exifData.GPSLongitude, exifData.GPSLongitudeRef);
                altitude = exifData.GPSAltitude;
            }
            // Extract IPTC keywords
            let keywords;
            if (exifData.Keywords) {
                if (Array.isArray(exifData.Keywords)) {
                    keywords = exifData.Keywords.join(', ');
                }
                else {
                    keywords = exifData.Keywords;
                }
            }
            return {
                // GPS Location
                latitude,
                longitude,
                altitude,
                // Camera Information
                make: exifData.Make,
                model: exifData.Model,
                software: exifData.Software,
                // Photo Settings
                iso: exifData.ISO,
                fNumber: exifData.FNumber,
                exposureTime: exifData.ExposureTime?.toString(),
                focalLength: exifData.FocalLength,
                flash: exifData.Flash?.toString(),
                whiteBalance: exifData.WhiteBalance?.toString(),
                // Date/Time
                dateTimeOriginal: exifData.DateTimeOriginal?.toISOString?.() || exifData.DateTimeOriginal,
                dateTimeDigitized: exifData.DateTimeDigitized?.toISOString?.() || exifData.DateTimeDigitized,
                // IPTC/XMP Data
                title: exifData.Title || exifData.ObjectName,
                description: exifData.Description || exifData.Caption || exifData.ImageDescription,
                keywords,
                creator: exifData.Creator || exifData.Artist || exifData.By,
                copyright: exifData.Copyright || exifData.CopyrightNotice,
                city: exifData.City,
                state: exifData.State || exifData.Province,
                country: exifData.Country,
                // Technical
                colorSpace: exifData.ColorSpace?.toString(),
                orientation: exifData.Orientation,
                xResolution: exifData.XResolution,
                yResolution: exifData.YResolution,
                resolutionUnit: exifData.ResolutionUnit?.toString(),
                // Raw EXIF JSON for advanced users (limited to prevent memory issues)
                rawExif: this.sanitizeExifData(exifData)
            };
        }
        catch (error) {
            console.warn('Failed to extract comprehensive metadata:', error);
            return null;
        }
    }
    static convertGPSCoordinate(coordinate, ref) {
        if (typeof coordinate === 'number') {
            return ref === 'S' || ref === 'W' ? -coordinate : coordinate;
        }
        if (Array.isArray(coordinate) && coordinate.length >= 3) {
            const decimal = coordinate[0] + coordinate[1] / 60 + coordinate[2] / 3600;
            return ref === 'S' || ref === 'W' ? -decimal : decimal;
        }
        return undefined;
    }
    static sanitizeExifData(exifData) {
        try {
            // Create a sanitized version of EXIF data to prevent memory issues
            const sanitized = {};
            // Include only essential fields to limit size
            const allowedFields = [
                'Make', 'Model', 'Software', 'DateTime', 'DateTimeOriginal', 'DateTimeDigitized',
                'ISO', 'FNumber', 'ExposureTime', 'FocalLength', 'Flash', 'WhiteBalance',
                'ColorSpace', 'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit',
                'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
                'ImageWidth', 'ImageHeight', 'BitsPerSample', 'Compression'
            ];
            for (const field of allowedFields) {
                if (exifData[field] !== undefined) {
                    // Limit string fields to reasonable lengths
                    if (typeof exifData[field] === 'string' && exifData[field].length > 500) {
                        sanitized[field] = exifData[field].substring(0, 500) + '...';
                    }
                    else {
                        sanitized[field] = exifData[field];
                    }
                }
            }
            const jsonString = JSON.stringify(sanitized);
            // Limit total JSON size to 10KB
            if (jsonString.length > 10240) {
                return JSON.stringify({ error: 'EXIF data too large, truncated for memory safety' });
            }
            return jsonString;
        }
        catch (error) {
            console.warn('Failed to sanitize EXIF data:', error);
            return JSON.stringify({ error: 'Failed to process EXIF data' });
        }
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