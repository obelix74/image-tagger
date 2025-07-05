@echo off
REM Image Tagger - Stop Script for Windows
REM This script stops both the server and client processes

echo 🛑 Stopping Image Tagger Application...

echo 🔄 Stopping Node.js processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im "ts-node.exe" >nul 2>&1

echo 🔄 Stopping processes on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo 🔄 Stopping processes on port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo ✅ All Image Tagger processes stopped
echo 📍 Ports 3001 and 5173 are now available
pause
