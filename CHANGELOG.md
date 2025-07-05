# Changelog

All notable changes to Image Tagger will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-05

### Added
- **Batch Processing System**
  - Recursive folder scanning for image discovery
  - Real-time progress tracking with detailed metrics
  - Duplicate detection and handling
  - Comprehensive error reporting and recovery
  - Background processing with non-blocking operations
  - Configurable processing options (thumbnail size, quality, etc.)

- **Pagination Support**
  - Server-side pagination for efficient data loading
  - Frontend pagination controls with page navigation
  - Configurable page sizes (default: 12 images per page)
  - Total count and page information display

- **Enhanced Search Functionality**
  - Full-text search across all metadata fields
  - Keyword-based search with clickable tags
  - Real-time search results
  - Search result pagination

- **Improved User Interface**
  - Batch processing dashboard with live updates
  - Enhanced gallery with pagination controls
  - Responsive design improvements
  - Better error handling and user feedback

- **Development Tools**
  - Comprehensive development scripts (setup, start, stop)
  - Cross-platform support (Unix/Linux/Mac and Windows)
  - Automated dependency management
  - Enhanced build and deployment scripts

- **Documentation**
  - Comprehensive README with batch processing guide
  - Contributing guidelines and development setup
  - API documentation with all endpoints
  - License terms and usage guidelines

### Changed
- **Database Schema**: Enhanced to support pagination and batch tracking
- **API Structure**: Reorganized routes for better organization
- **Frontend Architecture**: Improved component structure and state management
- **Error Handling**: More robust error reporting and recovery mechanisms

### Technical Improvements
- **TypeScript**: Full type safety across the application
- **Performance**: Optimized database queries and image processing
- **Scalability**: Better handling of large image collections
- **Maintainability**: Improved code organization and documentation

## [0.1.0] - 2024-11-XX (Initial Development)

### Added
- **Core Image Processing**
  - Support for JPEG, PNG, TIFF formats
  - RAW file format support (CR2, NEF, ARW, DNG, RAF, ORF, RW2)
  - Automatic thumbnail generation
  - Image metadata extraction

- **AI Analysis Integration**
  - Google Gemini AI integration
  - Automatic image description generation
  - SEO-optimized caption creation
  - Keyword extraction and tagging
  - Confidence scoring for analysis quality

- **Web Interface**
  - React-based frontend application
  - Drag-and-drop file upload
  - Image gallery with metadata display
  - Real-time processing status updates

- **Backend Services**
  - Express.js REST API
  - SQLite database for metadata storage
  - File upload and processing pipeline
  - Image analysis workflow

- **Basic Features**
  - Single image upload and processing
  - Image gallery browsing
  - Metadata viewing and editing
  - Processing status tracking

### Technical Foundation
- **Node.js Backend**: Express.js with TypeScript
- **React Frontend**: Modern React with hooks and TypeScript
- **Database**: SQLite for local data storage
- **Image Processing**: Sharp library for high-performance processing
- **AI Integration**: Google Gemini API for image analysis

---

## Release Notes

### Version 1.0.0 Highlights

This major release introduces **Batch Processing** capabilities, making Image Tagger suitable for processing large collections of images efficiently. Key improvements include:

1. **Batch Processing**: Process entire folders recursively with real-time progress tracking
2. **Enhanced Search**: Full-text search across all metadata with pagination
3. **Better Performance**: Optimized for handling large image collections
4. **Improved UX**: More intuitive interface with better error handling
5. **Developer Experience**: Comprehensive development tools and documentation

### Migration Notes

- **Database**: Existing databases are compatible with v1.0.0
- **API**: New endpoints added, existing endpoints remain unchanged
- **Configuration**: No breaking changes to environment variables
- **Dependencies**: Run `npm run install:all` to update dependencies

### Known Issues

- Batch processing of very large folders (>1000 images) may require significant processing time
- RAW file processing is slower than standard formats due to preview extraction
- Mobile interface for batch processing may have limited functionality

### Future Roadmap

- **v1.1.0**: Enhanced mobile support and offline capabilities
- **v1.2.0**: User authentication and multi-user support
- **v1.3.0**: Cloud storage integration and deployment options
- **v2.0.0**: Plugin system and additional AI provider support

---

For detailed information about each release, see the [GitHub Releases](https://github.com/obelix74/image-tagger/releases) page.
