#!/bin/bash

# Image Tagger - Stop Script
# This script stops both the server and client processes

echo "🛑 Stopping Image Tagger Application..."

# Function to kill processes by name
kill_process() {
    local process_name="$1"
    local pids=$(pgrep -f "$process_name")
    
    if [ -n "$pids" ]; then
        echo "🔄 Stopping $process_name processes..."
        echo "$pids" | xargs kill -TERM 2>/dev/null
        sleep 2
        
        # Force kill if still running
        local remaining_pids=$(pgrep -f "$process_name")
        if [ -n "$remaining_pids" ]; then
            echo "🔨 Force stopping remaining $process_name processes..."
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null
        fi
    fi
}

# Stop server processes
kill_process "ts-node src/index.ts"
kill_process "nodemon"

# Stop client processes  
kill_process "vite"

# Stop any processes on the specific ports
echo "🔄 Checking ports 3001 and 5173..."

# Kill processes on port 3001 (server)
server_pid=$(lsof -ti:3001 2>/dev/null)
if [ -n "$server_pid" ]; then
    echo "🔄 Stopping process on port 3001..."
    kill -TERM $server_pid 2>/dev/null
    sleep 1
    # Force kill if still running
    if kill -0 $server_pid 2>/dev/null; then
        kill -KILL $server_pid 2>/dev/null
    fi
fi

# Kill processes on port 5173 (client)
client_pid=$(lsof -ti:5173 2>/dev/null)
if [ -n "$client_pid" ]; then
    echo "🔄 Stopping process on port 5173..."
    kill -TERM $client_pid 2>/dev/null
    sleep 1
    # Force kill if still running
    if kill -0 $client_pid 2>/dev/null; then
        kill -KILL $client_pid 2>/dev/null
    fi
fi

echo "✅ All Image Tagger processes stopped"
echo "📍 Ports 3001 and 5173 are now available"
