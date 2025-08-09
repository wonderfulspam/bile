#!/bin/bash

# Build script for Bile userscript
# Makes the Node.js build process easily executable

set -e

echo "🔨 Building Bile userscript..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Run the build
node scripts/build-userscript.js

echo "🚀 Build complete! Install the userscript from: dist/bile.user.js"