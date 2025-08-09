#!/bin/bash

# Quick script to open the built userscript in default browser
# This triggers Tampermonkey's update prompt

USERSCRIPT_PATH="$(dirname "$0")/../dist/bile.user.js"

# Check if built userscript exists
if [ ! -f "$USERSCRIPT_PATH" ]; then
    echo "Error: Built userscript not found at $USERSCRIPT_PATH"
    echo "Run 'npm run build' first to generate the userscript."
    exit 1
fi

# Open in default browser using file:// URL
echo "Opening userscript in default browser..."
ABSOLUTE_PATH=$(realpath "$USERSCRIPT_PATH")

# Try different browsers in order of preference
if command -v firefox &> /dev/null; then
    firefox "file://$ABSOLUTE_PATH"
elif command -v google-chrome &> /dev/null; then
    google-chrome "file://$ABSOLUTE_PATH"
elif command -v chromium-browser &> /dev/null; then
    chromium-browser "file://$ABSOLUTE_PATH"
else
    echo "Warning: No supported browser found. Opening with xdg-open..."
    xdg-open "file://$ABSOLUTE_PATH"
fi

echo "Tampermonkey should prompt to install/update the script."
echo "Built userscript size: $(du -h "$USERSCRIPT_PATH" | cut -f1)"
