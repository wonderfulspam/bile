# Building Bile Userscript

This document explains how to build the Bile userscript from its modular source code.

## Overview

Bile is developed using a modular architecture with separate files for different components:

- **API Client**: OpenRouter integration and model management
- **Translation Engine**: Core translation logic and quality validation  
- **Content Extraction**: Web page content analysis and extraction
- **UI Components**: User interface and interaction handling
- **Configuration**: Model settings and site-specific rules

For distribution, these modules must be combined into a single userscript file that can be installed in Tampermonkey/Greasemonkey.

## Build Process

### Requirements

- Node.js 16.0 or higher
- Access to the source files in the `src/` directory

### Quick Build

```bash
# Using the shell script
./scripts/build.sh

# Or directly with Node.js
npm run build
```

### Manual Build

```bash
node scripts/build-userscript.js
```

### Output

The build process creates:

- `dist/bile.user.js` - Combined userscript ready for installation
- File size: ~230KB (contains all modules)
- Automatically increments version numbers
- Includes build timestamp and metadata

## Module Loading Order

The build script loads modules in dependency order:

1. **Configuration**
   - `config/userscript-header.js` - Tampermonkey metadata
   - `config/model-config.js` - OpenRouter model definitions
   - `config/site-rules.js` - Site-specific extraction rules

2. **Core Utilities**
   - `modules/utils.js` - Helper functions
   - `modules/storage.js` - Browser storage interface

3. **AI/Translation System**
   - `modules/model-manager.js` - Model selection and performance tracking
   - `modules/api-client.js` - OpenRouter API communication
   - `modules/translation-engine.js` - Translation logic and validation

4. **Content Processing**
   - `modules/content-analyzer.js` - Content analysis
   - `modules/content-extractor.js` - Web page extraction
   - `modules/tab-generator.js` - HTML output generation

5. **User Interface**
   - `modules/ui-trigger.js` - UI components and interactions
   - `bile.user.js` - Main initialization logic

## Build Features

### Module Processing

- **Import/Export Removal**: Strips ES6 imports/exports for browser compatibility
- **Node.js Compatibility**: Removes Node.js-specific code
- **Header Extraction**: Extracts userscript metadata
- **Dependency Resolution**: Ensures correct loading order

### Development Support

- **Source Maps**: Includes module boundaries for debugging
- **Version Management**: Automatic version detection and incrementing
- **Size Reporting**: Reports final file size
- **Error Handling**: Clear error messages for build failures

### Distribution

- **Single File**: Everything bundled into one userscript
- **No Dependencies**: Self-contained with all required code
- **Tampermonkey Compatible**: Includes proper metadata headers
- **Auto-Update Support**: Configurable update URLs

## Development Workflow

### Making Changes

1. Edit source files in `src/` directory
2. Run build process to generate updated userscript
3. Test in Tampermonkey by reinstalling the updated file
4. Tampermonkey will detect file changes and prompt for reload

### Testing

```bash
# Build and test
npm run build
npm run test

# Development mode (auto-rebuild)
npm run dev
```

### File Structure

```
bile/
├── src/                 # Source modules
├── scripts/            # Build tools
├── dist/               # Built userscript (generated)
├── package.json        # Node.js project config
└── BUILD.md           # This file
```

## Troubleshooting

### Common Issues

**"Module not found" warnings**

- Some optional modules may not exist yet
- Build continues with available modules

**Node.js errors**

- Ensure Node.js 16+ is installed
- Check file permissions on script files

**Large file size**

- Expected for modular architecture
- Modern browsers handle 200KB+ userscripts fine
- Consider module splitting for very large codebases

### Build Configuration

Edit `scripts/build-userscript.js` to customize:

- Module loading order
- Output file location  
- Processing rules
- Version numbering

### Manual Installation

1. Build the userscript: `npm run build`
2. Open Tampermonkey dashboard
3. Create new script or import file
4. Paste contents of `dist/bile.user.js`
5. Save and enable the script

## Version History

- **v3.0.0**: Modular architecture with OpenRouter integration
- **v2.0.0**: Content extraction system
- **v1.0.0**: Basic Claude API integration

The build system automatically updates version numbers based on changes and release status.
