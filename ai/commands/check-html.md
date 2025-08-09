---
name: checkhtml
description: Validate and lint HTML files using tidy
---

# HTML Validation

Validates and lints HTML files using the `tidy` command-line tool.

## What it does

- Checks HTML files for syntax errors and validation issues
- Uses `tidy` with error checking and proprietary attribute handling
- Supports checking single files or all HTML files in directory tree
- Provides clear error reporting and exit codes

## Prerequisites

Requires `tidy` to be installed:
- **Ubuntu/Debian**: `sudo apt-get install tidy`
- **macOS**: `brew install tidy-html5` 
- **CentOS/RHEL**: `sudo yum install tidy`

## Usage

### Check all HTML files
```bash
./ai/commands/check-html.sh
```

### Check specific files
```bash
./ai/commands/check-html.sh file1.html file2.html
```

## Tidy Options Used

- `-e`: Show only errors and warnings
- `-q`: Suppress non-essential output  
- `--drop-proprietary-attributes no`: Don't ignore non-standard attributes

## Exit Codes

- **0**: All HTML files are valid
- **1**: HTML validation errors found or missing files