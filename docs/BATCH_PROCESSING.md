# Batch Processing Guide

This guide provides comprehensive information about using Image Tagger's batch processing capabilities to efficiently process large collections of images.

## Overview

Batch processing allows you to process entire folders of images automatically, including all subfolders. This is ideal for:

- **Photo Collections**: Process vacation photos, event galleries, or archived images
- **Professional Workflows**: Handle client photo shoots or stock photography
- **Digital Asset Management**: Organize and analyze large image libraries
- **Content Creation**: Generate metadata for websites, blogs, or social media

## Getting Started

### 1. Access Batch Processing

Navigate to the batch processing interface:
- **From Gallery**: Click the "Batch Processing" button in the main gallery
- **Direct URL**: Visit `http://localhost:5173/batch`

### 2. Prepare Your Images

Organize your images in a folder structure:
```
/Photos/
├── 2023/
│   ├── Vacation/
│   │   ├── IMG_001.jpg
│   │   ├── IMG_002.CR2
│   │   └── IMG_003.png
│   └── Events/
│       ├── Wedding/
│       └── Birthday/
└── 2024/
    ├── Travel/
    └── Family/
```

### 3. Configure Batch Settings

#### Folder Path
- Enter the full path to your image folder
- Example: `/Users/username/Photos/2023/Vacation`
- The system will scan this folder and all subfolders recursively

#### Processing Options

**Thumbnail Size** (100-800px, default: 300px)
- Size of generated thumbnail images
- Larger thumbnails provide better quality but use more storage
- Recommended: 300px for web galleries, 500px for high-quality previews

**AI Analysis Size** (512-2048px, default: 1024px)
- Size of images sent to Gemini AI for analysis
- Larger sizes may provide more detailed analysis but take longer
- Recommended: 1024px for balanced quality and speed

**JPEG Quality** (50-100%, default: 85%)
- Compression quality for processed JPEG images
- Higher quality preserves more detail but creates larger files
- Recommended: 85% for web use, 95% for archival quality

**Skip Duplicates** (default: enabled)
- Automatically skip files that have already been processed
- Based on filename and file size comparison
- Recommended: Keep enabled to avoid reprocessing

## Supported File Formats

### Standard Formats
- **JPEG** (.jpg, .jpeg) - Most common web format
- **PNG** (.png) - Lossless compression with transparency
- **TIFF** (.tiff, .tif) - High-quality uncompressed format

### RAW Formats
- **Canon**: CR2
- **Nikon**: NEF
- **Sony**: ARW
- **Adobe**: DNG
- **Fujifilm**: RAF
- **Olympus**: ORF
- **Panasonic**: RW2

### File Size Limits
- Maximum file size: 50MB per image
- Recommended: Keep files under 25MB for optimal processing speed

## Processing Workflow

### 1. File Discovery
- Scans the specified folder recursively
- Identifies supported image formats
- Counts total files to be processed

### 2. Duplicate Detection
- Compares filename and file size with existing database entries
- Skips duplicates if option is enabled
- Reports duplicate files in the error list

### 3. File Processing
For each image:
1. **Copy to Upload Directory**: Secure file handling
2. **Generate Thumbnail**: Create preview image
3. **Extract Metadata**: Read EXIF data and image properties
4. **Database Storage**: Save image information
5. **AI Analysis**: Send to Gemini AI for description and keywords
6. **Status Update**: Mark as completed or error

### 4. Background Analysis
- AI analysis runs in the background after file processing
- Images appear in gallery immediately with basic metadata
- AI-generated content appears when analysis completes

## Monitoring Progress

### Real-time Dashboard
The batch processing interface provides live updates:

**Progress Metrics**
- **Total Files**: Number of images discovered
- **Processed**: Files that have been handled (success + error)
- **Successful**: Files processed without errors
- **Duplicates**: Files skipped due to duplicate detection
- **Errors**: Files that failed processing

**Progress Bar**
- Visual indicator of completion percentage
- Updates in real-time as files are processed
- Color-coded based on batch status

**Status Indicators**
- **⏳ Processing**: Batch is currently running
- **✅ Completed**: All files have been processed
- **❌ Error**: Batch encountered critical errors

### Time Estimates
- **Duration**: Time elapsed since batch started
- **Estimated Completion**: Based on current processing speed
- **Average Time per Image**: Performance metric

## Error Handling

### Error Categories

**Duplicate Files**
- Files that already exist in the database
- Only reported if "Skip Duplicates" is enabled
- Not counted as errors in processing statistics

**Processing Errors**
- File corruption or invalid format
- Insufficient disk space
- Permission issues
- Network connectivity problems

**Unsupported Files**
- File formats not supported by the system
- Files that don't match image format criteria
- Zero-byte or extremely small files

### Error Resolution

**Common Issues and Solutions**

1. **Permission Denied**
   ```
   Error: EACCES: permission denied
   Solution: Check folder permissions, run with appropriate user rights
   ```

2. **File Not Found**
   ```
   Error: ENOENT: no such file or directory
   Solution: Verify folder path exists and is accessible
   ```

3. **Disk Space**
   ```
   Error: ENOSPC: no space left on device
   Solution: Free up disk space or use different storage location
   ```

4. **Corrupted Files**
   ```
   Error: Invalid image format
   Solution: Check file integrity, re-download or re-export image
   ```

### Error Reporting
- **Expandable Error Lists**: Click to view detailed error information
- **File-specific Details**: Exact error message for each failed file
- **Error Categories**: Organized by error type for easier troubleshooting

## Performance Optimization

### Processing Speed
- **Average**: 2-5 seconds per image
- **Factors**: File size, format, AI analysis complexity
- **RAW Files**: Slower due to preview extraction (5-10 seconds)

### System Resources
- **CPU**: Moderate usage during image processing
- **Memory**: ~100-200MB per concurrent operation
- **Disk I/O**: Intensive during file copying and thumbnail generation
- **Network**: Used only for AI analysis requests

### Optimization Tips

1. **Organize Files**: Group similar images together
2. **Check Disk Space**: Ensure 2x the source folder size is available
3. **Close Other Applications**: Free up system resources
4. **Use SSD Storage**: Faster disk I/O improves performance
5. **Stable Internet**: Required for AI analysis

## Best Practices

### Before Processing
1. **Backup Important Files**: Always backup originals before processing
2. **Organize Folder Structure**: Use clear, logical folder organization
3. **Check Available Space**: Ensure sufficient disk space
4. **Test Small Batches**: Start with a small folder to test settings

### During Processing
1. **Monitor Progress**: Keep the batch processing page open
2. **Avoid System Sleep**: Prevent computer from sleeping during processing
3. **Stable Network**: Maintain internet connection for AI analysis
4. **Don't Interrupt**: Let the batch complete naturally

### After Processing
1. **Review Error Reports**: Check for any failed files
2. **Verify Results**: Spot-check processed images in the gallery
3. **Clean Up**: Delete batch jobs when no longer needed
4. **Backup Database**: Save the SQLite database file

## Troubleshooting

### Common Problems

**Batch Doesn't Start**
- Check folder path exists and is accessible
- Verify folder contains supported image formats
- Ensure sufficient disk space

**Processing Stops Unexpectedly**
- Check system resources (CPU, memory, disk space)
- Verify network connectivity for AI analysis
- Review error logs for specific issues

**Slow Processing**
- Large files take longer to process
- RAW files require additional processing time
- Network speed affects AI analysis

**Missing AI Analysis**
- Check Gemini API key configuration
- Verify internet connectivity
- Review API usage limits

### Getting Help

If you encounter issues:
1. Check the error messages in the batch processing interface
2. Review the troubleshooting section in the main README
3. Search existing GitHub issues
4. Create a new issue with detailed error information

## API Reference

For developers integrating with the batch processing system:

```bash
# Start batch processing
POST /api/images/batch/process
{
  "folderPath": "/path/to/images",
  "options": {
    "skipDuplicates": true,
    "thumbnailSize": 300,
    "geminiImageSize": 1024,
    "quality": 85
  }
}

# Get batch status
GET /api/images/batch/:batchId

# Get all batches
GET /api/images/batch

# Delete batch
DELETE /api/images/batch/:batchId
```

For complete API documentation, see the main README file.
