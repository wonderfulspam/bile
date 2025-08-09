#!/bin/bash
# HTML validation and linting command using tidy

set -e

# Check if tidy is installed
if ! command -v tidy &> /dev/null; then
    echo "Error: tidy is not installed. Install with:"
    echo "  Ubuntu/Debian: sudo apt-get install tidy"
    echo "  macOS: brew install tidy-html5"
    echo "  CentOS/RHEL: sudo yum install tidy"
    exit 1
fi

# Default to checking all HTML files if no arguments provided
if [ $# -eq 0 ]; then
    HTML_FILES=$(find . -name "*.html" -type f)
    if [ -z "$HTML_FILES" ]; then
        echo "No HTML files found in current directory tree"
        exit 0
    fi
else
    HTML_FILES="$@"
fi

echo "Checking HTML files with tidy..."

ERRORS_FOUND=0

for file in $HTML_FILES; do
    if [ ! -f "$file" ]; then
        echo "Error: File '$file' not found"
        ERRORS_FOUND=1
        continue
    fi
    
    echo "Checking: $file"
    
    # Run tidy with error checking
    # -e: show only errors and warnings
    # -q: suppress non-essential output
    # --drop-proprietary-attributes: ignore non-standard attributes
    if ! tidy -e -q --drop-proprietary-attributes no "$file" 2>&1; then
        ERRORS_FOUND=1
    fi
    
    echo ""
done

if [ $ERRORS_FOUND -eq 0 ]; then
    echo "✓ All HTML files are valid"
else
    echo "✗ HTML validation errors found"
    exit 1
fi