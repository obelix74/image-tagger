# AI Image Tagger

An intelligent image tagging application powered by Google's Gemini AI that automatically generates descriptions, captions, and SEO-optimized keywords for your photos.

## Features

- **Multi-format Support**: Handles JPG, TIFF, PNG, and RAW formats (CR2, NEF, ARW, DNG, RAF, ORF, RW2)
- **RAW Processing**: Automatically extracts preview images from RAW files
- **AI Analysis**: Uses Gemini AI to generate:
  - Detailed image descriptions
  - Social media-ready captions
  - SEO-optimized keywords
- **Image Processing**: Automatic resizing and thumbnail generation
- **Modern UI**: Clean React interface with drag-and-drop upload
- **Real-time Status**: Track processing progress and analysis status
- **Database Storage**: SQLite database for metadata persistence

## Tech Stack

### Backend
- **TypeScript** - Type-safe server development
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **Sharp** - High-performance image processing
- **Multer** - File upload handling
- **Gemini AI** - Google's generative AI for image analysis
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
- Google Gemini API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd image-tagger
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key and add it to your `.env` file

## Usage

### Development Mode

1. **Start the backend server**
   ```bash
   npm run dev
   ```
   Server will run on http://localhost:3001

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```
   Frontend will run on http://localhost:5173

3. **Open your browser** and navigate to http://localhost:5173

### Production Build

1. **Build the backend**
   ```bash
   npm run build
   ```

2. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

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

- `GET /api/health` - Health check
- `GET /api/images` - Get all images
- `GET /api/images/:id` - Get specific image
- `GET /api/images/:id/analysis` - Get image analysis
- `POST /api/images/upload` - Upload new image
- `POST /api/images/:id/analyze` - Trigger manual analysis
- `GET /api/images/test/gemini` - Test Gemini API connection

## Configuration

Environment variables in `.env`:

```bash
# Gemini AI API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_PATH=./database.sqlite

# Upload Configuration
UPLOAD_DIR=./uploads
THUMBNAIL_DIR=./thumbnails
MAX_FILE_SIZE=50000000

# Image Processing Configuration
THUMBNAIL_SIZE=300
GEMINI_IMAGE_SIZE=1024
```

## Supported Image Formats

- **Standard**: JPG, JPEG, PNG, TIFF, TIF
- **RAW**: CR2 (Canon), NEF (Nikon), ARW (Sony), DNG (Adobe), RAF (Fujifilm), ORF (Olympus), RW2 (Panasonic)

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY environment variable is required"**
   - Make sure you've set up your `.env` file with a valid Gemini API key

2. **"Failed to extract RAW preview"**
   - Some RAW formats may not be fully supported
   - Try converting to JPEG/TIFF first

3. **Upload fails with large files**
   - Check the `MAX_FILE_SIZE` setting in `.env`
   - Default limit is 50MB

4. **Database errors**
   - Delete `database.sqlite` to reset the database
   - The database will be recreated automatically

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Acknowledgments

- Google Gemini AI for image analysis capabilities
- Sharp library for high-performance image processing
- ExifR for RAW file support
