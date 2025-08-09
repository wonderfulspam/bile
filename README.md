# Bilingual Web Page Converter (Bile)

A browser-based language learning tool that transforms web articles into interactive, bilingual reading experiences.

## What It Does

Bile helps language learners bridge the gap between textbook knowledge and real-world content by:

- Converting any web article into a clean, bilingual format
- Automatically detecting the source language
- Preserving slang, idioms, and culturally significant terms with explanations
- Creating clickable tooltips for cultural and linguistic context
- Providing instant language toggle functionality
- Removing ads, popups, and distractions for focused learning

## Key Features

- **Slang Preservation**: Original terms stay intact with translations and cultural context
- **Interactive Learning**: Click any highlighted term for deeper explanations
- **Clean Interface**: Distraction-free reading environment
- **Universal Compatibility**: Works on any article webpage
- **Self-contained Output**: Generated HTML files work offline

## Project Status

This project is currently in the specification phase. See the full technical specification and implementation roadmap in [SPECIFICATION.md](SPECIFICATION.md).

## Documentation

- **[SPECIFICATION.md](SPECIFICATION.md)** - Complete technical specification and implementation roadmap
- **[CLAUDE.md](CLAUDE.md)** - Instructions for Claude AI assistant
- **[GEMINI.md](GEMINI.md)** - Instructions for Gemini AI assistant
- **[AGENTS.md](AGENTS.md)** - General AI agent instructions

## Implementation Approach

The project follows a 6-phase development approach:

1. **Core Infrastructure** - Basic userscript setup and API integration
2. **Content Extraction** - Article detection and cleaning
3. **Language Processing** - API communication and response handling
4. **HTML Generation** - Interactive bilingual interface creation
5. **Polish & Extended Features** - Settings, caching, error handling
6. **Testing & Optimization** - Cross-site compatibility and performance

## Technical Architecture

Bile will be implemented as a userscript/bookmarklet with these core components:

- **Content Extractor** - Intelligently identifies and extracts article content
- **Language Processor** - Uses OpenRouter free models to detect language and create translations
- **HTML Generator** - Creates interactive bilingual output
- **API Handler** - Manages communication with translation services

For detailed technical specifications, see [SPECIFICATION.md](SPECIFICATION.md).