#!/bin/bash

# Racers.fun Backend Startup Script
echo "🚀 Starting Racers.fun Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in backend directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ] && [ ! -f "env" ]; then
    echo "⚠️  No environment file found. Creating from example..."
    if [ -f "env.example" ]; then
        cp env.example env
        echo "✅ Created env file from example. Please update with your credentials."
    else
        echo "❌ No env.example file found. Please create environment configuration."
        exit 1
    fi
fi

# Start the server
echo "🎮 Starting the game server..."
echo "📍 Backend will be available at: http://localhost:3001"
echo "🔌 WebSocket will be available at: ws://localhost:3001"
echo "📊 Health check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start with nodemon for development
if command -v nodemon &> /dev/null; then
    echo "🔄 Starting with nodemon (auto-restart on changes)..."
    nodemon server.js
else
    echo "🔄 Starting with node..."
    node server.js
fi
