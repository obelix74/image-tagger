#!/bin/bash

# Image Tagger - Setup Script
# This script sets up the entire project for development

echo "🔧 Setting up Image Tagger Application..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $node_version"

# Check npm version
npm_version=$(npm --version 2>/dev/null)
echo "✅ npm version: $npm_version"
echo ""

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install server dependencies"
    exit 1
fi

echo "✅ Server dependencies installed"
echo ""

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install client dependencies"
    exit 1
fi

cd ..
echo "✅ Client dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env file created from .env.example"
    else
        cat > .env << EOF
# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads
THUMBNAIL_DIR=./thumbnails
THUMBNAIL_SIZE=300
GEMINI_IMAGE_SIZE=1024

# Database Configuration
DATABASE_PATH=./database.sqlite
EOF
        echo "✅ .env file created with default values"
    fi
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your Gemini API key"
    echo "   Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p thumbnails
mkdir -p dist
echo "✅ Directories created"
echo ""

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to build the project"
    exit 1
fi

echo "✅ Project built successfully"
echo ""

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh
echo "✅ Scripts are now executable"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env and add your Gemini API key"
echo "   2. Run './scripts/start.sh' to start the application"
echo "   3. Visit http://localhost:5173 to use the app"
echo ""
echo "📚 Available commands:"
echo "   ./scripts/start.sh  - Start both server and client"
echo "   ./scripts/stop.sh   - Stop both server and client"
echo "   npm run dev:server  - Start only the server"
echo "   npm run dev:client  - Start only the client"
echo "   npm run dev:both    - Start both (requires concurrently)"
