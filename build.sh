#!/bin/bash

# Build scripts for Waali Gas Station

echo "🚀 Building Waali Gas Station..."

# Build web version
echo "📦 Building web version..."
npm run build

# Build native desktop app
echo "🖥️ Building native desktop app..."
npx tauri build

# Build Windows installer (requires Inno Setup)
echo "💿 Building Windows installer..."
if command -v iscc &> /dev/null; then
    iscc installer.iss
    echo "✅ Windows installer created successfully!"
else
    echo "⚠️ Inno Setup not found. Please install Inno Setup to create Windows installer."
fi

echo "✅ Build process completed!"