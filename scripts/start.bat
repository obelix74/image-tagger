@echo off
REM Image Tagger - Start Script for Windows
REM This script starts both the server and client in development mode

echo 🚀 Starting Image Tagger Application...
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing server dependencies...
    npm install
)

REM Check if client node_modules exists
if not exist "client\node_modules" (
    echo 📦 Installing client dependencies...
    cd client
    npm install
    cd ..
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  Warning: .env file not found. Please create one with your Gemini API key.
    echo    Copy .env.example to .env and add your GEMINI_API_KEY
    echo.
)

echo 🔧 Starting development servers...
echo.
echo 📍 Server will be available at: http://localhost:3001
echo 📍 Client will be available at: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start both server and client concurrently
npm run dev:both
