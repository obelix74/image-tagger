#!/bin/bash

# Image Tagger - Start Script
# This script starts both the server and client in development mode

echo "🚀 Starting Image Tagger Application..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

# Check if client node_modules exists
if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Please create one with your Gemini API key."
    echo "   Copy .env.example to .env and add your GEMINI_API_KEY"
    echo ""
fi

echo "🔧 Starting development servers..."
echo ""
echo "📍 Server will be available at: http://localhost:3001"
echo "📍 Client will be available at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both server and client concurrently
npm run dev:both
