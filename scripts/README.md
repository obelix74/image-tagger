# Image Tagger - Development Scripts

This directory contains helpful scripts to manage the Image Tagger application development environment.

## 🚀 Quick Start

### First Time Setup
```bash
# Make scripts executable (Unix/Mac/Linux)
chmod +x scripts/*.sh

# Run setup script
./scripts/setup.sh
```

### Start the Application
```bash
# Unix/Mac/Linux
./scripts/start.sh

# Windows
scripts\start.bat
```

### Stop the Application
```bash
# Unix/Mac/Linux
./scripts/stop.sh

# Windows
scripts\stop.bat
```

## 📋 Available Scripts

### Setup Scripts

#### `setup.sh` / `setup.bat`
- **Purpose**: Initial project setup
- **What it does**:
  - Checks Node.js installation
  - Installs all dependencies (server + client)
  - Creates `.env` file from template
  - Creates necessary directories
  - Builds the project
  - Makes scripts executable

#### `start.sh` / `start.bat`
- **Purpose**: Start both server and client
- **What it does**:
  - Checks for dependencies
  - Starts server on port 3001
  - Starts client on port 5173
  - Runs both concurrently with colored output

#### `stop.sh` / `stop.bat`
- **Purpose**: Stop all running processes
- **What it does**:
  - Kills server processes (nodemon, ts-node)
  - Kills client processes (vite)
  - Frees up ports 3001 and 5173
  - Force kills if graceful shutdown fails

## 📦 NPM Scripts

The following scripts are available via `npm run`:

### Development Scripts
```bash
npm run dev          # Start server only (same as dev:server)
npm run dev:server   # Start server only
npm run dev:client   # Start client only
npm run dev:both     # Start both server and client concurrently
```

### Build Scripts
```bash
npm run build        # Build server only
npm run build:all    # Build both server and client
```

### Installation Scripts
```bash
npm run install:all  # Install dependencies for both server and client
```

### Utility Scripts
```bash
npm run stop         # Stop all processes (Unix/Linux/Mac only)
```

## 🔧 Manual Commands

If you prefer to run commands manually:

### Server
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### Client
```bash
cd client

# Development mode
npm run dev

# Build for production
npm run build
```

## 🌍 Environment Variables

Make sure to set up your `.env` file with the following variables:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional (with defaults)
PORT=3001
NODE_ENV=development
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads
THUMBNAIL_DIR=./thumbnails
THUMBNAIL_SIZE=300
GEMINI_IMAGE_SIZE=1024
DATABASE_PATH=./database.sqlite
```

## 🐛 Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Check what's using the ports
lsof -i :3001  # Server port
lsof -i :5173  # Client port

# Kill processes manually
kill -9 <PID>

# Or use the stop script
./scripts/stop.sh
```

### Permission Denied (Unix/Linux/Mac)
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules client/node_modules
npm run install:all
```

### Build Issues
```bash
# Clean build
rm -rf dist client/dist
npm run build:all
```

## 📱 Platform Support

- **Unix/Linux/Mac**: Use `.sh` scripts
- **Windows**: Use `.bat` scripts
- **Cross-platform**: Use `npm run` commands

## 🔗 Useful URLs

When running in development mode:
- **Client**: http://localhost:5173
- **Server API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## 📚 Additional Resources

- [Node.js Installation](https://nodejs.org/)
- [Gemini API Key](https://makersuite.google.com/app/apikey)
- [Project README](../README.md)
