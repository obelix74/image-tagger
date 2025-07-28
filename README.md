# AI Image Tagger

An intelligent image tagging application powered by AI that automatically generates descriptions, captions, and SEO-optimized keywords for your photos. Supports both Google's Gemini AI and local Ollama inference.

## Features

### 🔐 Multi-User Authentication
- **Username/Password Authentication**: Simple and secure login system
- **User Registration**: Create new accounts with optional email for password reset
- **User Management**: Individual user accounts with admin privileges
- **Session Management**: Secure session handling with cookies
- **User Isolation**: Each user sees only their own images and data
- **Default Admin**: Automatic admin user creation for initial setup

### 🤖 AI-Powered Analysis
- **Multiple AI Providers**: Choose between cloud and local AI:
  - **Google Gemini**: Cloud-based advanced AI analysis
  - **Ollama**: Local AI inference with privacy and no API costs
- **Comprehensive Analysis**: Generates detailed image descriptions, SEO-optimized captions, relevant keywords, and confidence scores

### 📁 Batch Processing
- **Folder Processing**: Process entire folders recursively
- **Duplicate Detection**: Automatically skip already processed images
- **Real-time Progress**: Live status updates with detailed metrics
- **Error Handling**: Comprehensive error reporting and recovery
- **Background Processing**: Non-blocking batch operations

### 🖼️ Format Support
- **Standard Formats**: JPEG, PNG, TIFF
- **RAW Formats**: CR2 (Canon), NEF (Nikon), ARW (Sony), DNG, RAF (Fujifilm), ORF (Olympus), RW2 (Panasonic)
- **Large Files**: Support for files up to 50MB

### 🔍 Search & Discovery
- **Keyword Search**: Click any keyword to find related images
- **Full-text Search**: Search across all metadata fields
- **Pagination**: Efficient browsing of large image collections
- **Real-time Filtering**: Instant search results

### 🎨 Modern Interface
- **Drag-and-drop Upload**: Intuitive file upload experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live processing status and progress
- **Gallery View**: Beautiful grid layout with metadata display

### 💾 Data Management
- **SQLite Database**: Efficient local storage
- **Metadata Preservation**: Complete EXIF data retention
- **Thumbnail Generation**: Automatic preview creation
- **Status Tracking**: Processing state management

## Tech Stack

### Backend
- **TypeScript** - Type-safe server development
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **Sharp** - High-performance image processing
- **Multer** - File upload handling
- **Gemini AI** - Google's generative AI for image analysis
- **Ollama** - Local AI inference support
- **ExifR** - EXIF data extraction and RAW preview extraction

### Frontend
- **React** - UI framework
- **TypeScript** - Type-safe frontend development
- **Vite** - Fast build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client

## Prerequisites

- Node.js 18+ 
- npm or yarn
- **For Gemini AI**: Google Gemini API key
- **For Ollama**: Ollama installation with a vision model (e.g., llava:latest)

## Installation

### Quick Setup (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd image-tagger

# Run the setup script (Unix/Linux/Mac)
./scripts/setup.sh

# Or for Windows
scripts\setup.bat
```

### Manual Setup
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd image-tagger
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Build the project**
   ```bash
   npm run build:all
   ```

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key and add it to your `.env` file

## Setup

### Authentication Setup

The application uses username/password authentication with the following features:

- **Simple Login**: Username and password authentication
- **User Registration**: Create new accounts with optional email
- **Password Reset**: Email required for password reset functionality
- **Default Admin**: Pre-created admin account for initial access

### Database Migration

Run the database migration to set up user authentication:

```bash
npm run migrate:username
```

This will:
- Create the users table with username/password authentication
- Add user_id column to existing tables
- Create a default admin user (username: `admin`, password: `admin123`)
- Assign existing images to the admin user

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`
- **Important**: Change the default password after first login!

## Usage

### Quick Start (Recommended)
```bash
# Start both server and client (Unix/Linux/Mac)
./scripts/start.sh

# Or for Windows
scripts\start.bat

# Stop both server and client (Unix/Linux/Mac)
./scripts/stop.sh

# Or for Windows
scripts\stop.bat
```

### Development Mode

#### Start Both Services
```bash
npm run dev:both
```

#### Start Services Individually
1. **Start the backend server**
   ```bash
   npm run dev:server
   ```
   Server will run on http://localhost:3001

2. **Start the frontend development server**
   ```bash
   npm run dev:client
   ```
   Frontend will run on http://localhost:5173

3. **Open your browser** and navigate to http://localhost:5173

### Production Build

```bash
# Build both server and client
npm run build:all

# Start the production server
npm start
```

## Available Scripts

### Development Scripts
- `./scripts/setup.sh` - Initial project setup (Unix/Linux/Mac)
- `./scripts/start.sh` - Start both server and client (Unix/Linux/Mac)
- `./scripts/stop.sh` - Stop all processes (Unix/Linux/Mac)
- `scripts\setup.bat` - Initial project setup (Windows)
- `scripts\start.bat` - Start both server and client (Windows)
- `scripts\stop.bat` - Stop all processes (Windows)

### NPM Scripts
- `npm run dev` - Start server only
- `npm run dev:server` - Start server only
- `npm run dev:client` - Start client only
- `npm run dev:both` - Start both server and client concurrently
- `npm run build` - Build server only
- `npm run build:all` - Build both server and client
- `npm run install:all` - Install dependencies for both server and client
- `npm run stop` - Stop all processes (Unix/Linux/Mac only)
- `npm start` - Start production server

For detailed script documentation, see [scripts/README.md](scripts/README.md).

## 📁 Batch Processing

Image Tagger includes powerful batch processing capabilities for handling large collections of images efficiently.

### Features

- **Recursive Folder Scanning**: Automatically discovers all images in folders and subfolders
- **Duplicate Detection**: Skips files that have already been processed (configurable)
- **Real-time Progress**: Live updates showing processing status and metrics
- **Error Handling**: Comprehensive error reporting with detailed logs
- **Background Processing**: Non-blocking operations that don't freeze the UI
- **Configurable Options**: Customize thumbnail size, quality, and processing behavior

### How to Use Batch Processing

#### 1. Access Batch Processing
- Navigate to the main gallery page
- Click the **"Batch Processing"** button in the header
- Or visit http://localhost:5173/batch directly

#### 2. Configure Batch Job
```
Folder Path: /path/to/your/images/folder
Thumbnail Size: 300px (default)
AI Analysis Size: 1024px (default)
JPEG Quality: 85% (default)
Skip Duplicates: ✓ (recommended)
```

#### 3. Start Processing
- Click **"Start Batch Processing"**
- Monitor real-time progress with detailed metrics
- View processing status: Total, Processed, Success, Duplicates, Errors

#### 4. Review Results
- **Successful Files**: Appear in the main gallery with AI analysis
- **Duplicate Files**: Listed in the error report (if skip duplicates is enabled)
- **Error Files**: Detailed error messages for troubleshooting

### Supported Scenarios

#### Large Photo Collections
```bash
# Example folder structure
/Photos/
├── 2023/
│   ├── Vacation/
│   │   ├── IMG_001.jpg
│   │   ├── IMG_002.CR2
│   │   └── ...
│   └── Events/
│       ├── Wedding/
│       └── Birthday/
└── 2024/
    ├── Travel/
    └── Family/
```

#### Mixed File Types
- **JPEG/PNG**: Standard web formats
- **TIFF**: High-quality images
- **RAW Files**: CR2, NEF, ARW, DNG, RAF, ORF, RW2
- **Large Files**: Up to 50MB per file

#### Error Handling
The system gracefully handles:
- **Unsupported formats**: Skipped with clear error messages
- **Corrupted files**: Logged and processing continues
- **Permission issues**: Detailed error reporting
- **Network interruptions**: Automatic retry mechanisms

### Performance Considerations

- **Processing Speed**: ~2-5 seconds per image (depending on size and AI analysis)
- **Memory Usage**: Optimized for large batches with streaming processing
- **Storage**: Thumbnails and processed images stored efficiently
- **Concurrent Processing**: Background AI analysis doesn't block file processing

### Monitoring and Logs

#### Real-time Dashboard
- **Progress Bar**: Visual progress indicator
- **Live Metrics**: Updated every 2 seconds
- **Status Indicators**: Processing, completed, error states
- **Time Estimates**: Duration and remaining time

#### Error Reporting
- **Categorized Errors**: Duplicates, processing errors, unsupported files
- **File-specific Details**: Exact error messages for each failed file
- **Expandable Lists**: Click to view detailed error information

### API Endpoints

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

### Best Practices

1. **Organize Your Images**: Use clear folder structures for better organization
2. **Check Disk Space**: Ensure sufficient space for thumbnails and processed images
3. **Monitor Progress**: Keep the batch processing page open to monitor progress
4. **Handle Errors**: Review error reports and fix issues before reprocessing
5. **Backup Important Files**: Always backup original images before processing

## Project Structure

```
image-tagger/
├── src/                    # Backend source code
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── models/            # Database models
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client services
│   │   └── assets/        # Static assets
├── uploads/               # Uploaded images storage
├── thumbnails/            # Generated thumbnails
├── database.sqlite        # SQLite database file
└── dist/                  # Compiled backend code
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/register` - Register new user account
- `GET /api/auth/user` - Get current user information
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - Logout current user

### Core Image Operations
- `GET /api/health` - Health check
- `GET /api/images` - Get all images (supports pagination: `?page=1&limit=12`)
- `GET /api/images/:id` - Get specific image
- `GET /api/images/:id/analysis` - Get image analysis
- `POST /api/images/upload` - Upload new image
- `POST /api/images/:id/analyze` - Trigger manual analysis

### Search Operations
- `GET /api/images/search?q=searchTerm` - Search across all metadata fields
- `GET /api/images/search/keyword/:keyword` - Search by specific keyword

### Batch Processing
- `POST /api/images/batch/process` - Start batch processing
- `GET /api/images/batch` - Get all batch jobs
- `GET /api/images/batch/:batchId` - Get specific batch status
- `DELETE /api/images/batch/:batchId` - Delete batch job

### System
- `GET /api/images/test/gemini` - Test Gemini API connection

## Configuration

Environment variables in `.env`:

```bash
# AI Provider Configuration
AI_PROVIDER=gemini                    # 'gemini' or 'ollama'

# Gemini AI Configuration (when AI_PROVIDER=gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# Ollama Configuration (when AI_PROVIDER=ollama)
OLLAMA_BASE_URL=http://localhost:11434  # Ollama server URL
OLLAMA_MODEL=llava:latest               # Vision model name
OLLAMA_TIMEOUT=300000                   # Request timeout (5 minutes)

# Authentication Configuration
SESSION_SECRET=your-super-secret-session-key-change-in-production

# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Configuration
DATABASE_PATH=./database.sqlite

# Upload Configuration
UPLOAD_DIR=./uploads
THUMBNAIL_DIR=./thumbnails
MAX_FILE_SIZE=50000000

# Image Processing Configuration
THUMBNAIL_SIZE=300
AI_IMAGE_SIZE=1024                     # Image size for AI analysis
```

## Supported Image Formats

- **Standard**: JPG, JPEG, PNG, TIFF, TIF
- **RAW**: CR2 (Canon), NEF (Nikon), ARW (Sony), DNG (Adobe), RAF (Fujifilm), ORF (Olympus), RW2 (Panasonic)

## AI Provider Setup

### Using Gemini AI (Cloud-based)

1. **Get a Gemini API key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file as `GEMINI_API_KEY`

2. **Set the provider**:
   ```bash
   AI_PROVIDER=gemini
   ```

### Using Ollama (Local)

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows: Download from https://ollama.ai/download
   ```

2. **Install a vision model**:
   ```bash
   ollama pull llava:latest
   # Or other vision models like:
   # ollama pull llava:13b
   # ollama pull bakllava:latest
   ```

3. **Start Ollama server**:
   ```bash
   ollama serve
   ```

4. **Configure the application**:
   ```bash
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llava:latest
   ```

### Provider-specific Features

- **Gemini**: 
  - Higher accuracy for complex scenes
  - Better language understanding
  - Requires internet connection
  - API costs apply

- **Ollama**:
  - Complete privacy (local processing)
  - No API costs after setup
  - Works offline
  - Requires more local resources

## API Endpoints

The application provides several new endpoints for AI provider management:

- `GET /api/images/ai/provider/info` - Get current provider information
- `GET /api/images/ai/providers` - List all available providers
- `GET /api/images/ai/provider/test` - Test current provider connection
- `GET /api/images/test/gemini` - Legacy endpoint (now tests current provider)

## Troubleshooting

### Common Issues

#### General Issues

1. **Upload fails with large files**
   - Check the `MAX_FILE_SIZE` setting in `.env`
   - Default limit is 50MB

2. **"Failed to extract RAW preview"**
   - Some RAW formats may not be fully supported
   - Try converting to JPEG/TIFF first

#### Gemini AI Issues

3. **"GEMINI_API_KEY environment variable is required"**
   - Make sure you've set up your `.env` file with a valid Gemini API key
   - Ensure `AI_PROVIDER=gemini` is set

4. **Gemini API connection fails**
   - Check your API key is valid and active
   - Verify internet connectivity
   - Check API quotas and billing in Google Cloud Console

#### Ollama Issues

5. **"Ollama server not accessible"**
   - Ensure Ollama is running: `ollama serve`
   - Check if the base URL is correct in `.env`
   - Verify port 11434 is not blocked by firewall

6. **"Model not found in Ollama"**
   - Install the vision model: `ollama pull llava:latest`
   - Check available models: `ollama list`
   - Verify the model name in `OLLAMA_MODEL` matches exactly

7. **Ollama requests timeout**
   - Increase `OLLAMA_TIMEOUT` for large images
   - Consider using a smaller/faster model
   - Check system resources (RAM, CPU)

8. **Poor quality results with Ollama**
   - Try a larger model: `ollama pull llava:13b`
   - Experiment with different vision models
   - Adjust the custom prompt for better results

4. **Database errors**
   - Delete `database.sqlite` to reset the database
   - The database will be recreated automatically

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or suggesting enhancements, your help is appreciated.

### Quick Start for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment**:
   ```bash
   ./scripts/setup.sh
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. **Make your changes** and test thoroughly
6. **Submit a pull request** with a clear description

### Areas We Need Help With

- **🧪 Testing**: Add unit and integration tests
- **📚 Documentation**: Improve guides and API docs
- **🐛 Bug Fixes**: Fix issues and improve stability
- **✨ New Features**: Add new functionality
- **🎨 UI/UX**: Enhance user interface and experience
- **⚡ Performance**: Optimize code and improve speed

### Before Contributing

- Check existing [issues](https://github.com/obelix74/image-tagger/issues) and [pull requests](https://github.com/obelix74/image-tagger/pulls)
- Read our [Contributing Guidelines](CONTRIBUTING.md)
- Follow our coding standards and best practices
- Test your changes thoroughly

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

**Image Tagger** is licensed under a **Non-Commercial Use License**.

### ✅ You can:
- Use for personal, educational, and non-commercial purposes
- Study, modify, and distribute the source code
- Create derivative works for non-commercial use

### ❌ You cannot:
- Use for commercial purposes without permission
- Sell, rent, or lease the software
- Use in commercial products or services

For commercial licensing, please contact: lists@anands.net

See [LICENSE.md](LICENSE.md) for complete license terms.

## 🙏 Acknowledgments

- **Google Gemini AI** - Advanced image analysis capabilities
- **Sharp** - High-performance image processing library
- **ExifR** - Comprehensive RAW file format support
- **React** - Modern frontend framework
- **Express.js** - Fast, minimalist web framework
- **SQLite** - Reliable embedded database
- **TypeScript** - Type-safe JavaScript development

## 📞 Support

- **Documentation**: Check this README and [CONTRIBUTING.md](CONTRIBUTING.md)
- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/obelix74/image-tagger/issues)
- **Discussions**: Join conversations on [GitHub Discussions](https://github.com/obelix74/image-tagger/discussions)
- **Email**: Contact the maintainer at lists@anands.net

---

**Made with ❤️ by [Anand Kumar Sankaran](https://github.com/obelix74)**
