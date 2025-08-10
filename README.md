# Bilingual Web Page Converter (Bile)

A bilingual web page converter that transforms articles into interactive language learning tools. Available as both a **browser userscript** and **CLI tool** for rapid development and testing.

## What It Does

Bile helps language learners bridge the gap between textbook knowledge and real-world content by:

- Converting web articles into clean, bilingual formats
- Automatically detecting source languages
- Preserving slang, idioms, and culturally significant terms with explanations
- Creating clickable tooltips for cultural and linguistic context
- Providing instant language toggle functionality
- Removing ads, popups, and distractions for focused learning

## Dual Architecture

**🌐 Browser Userscript** - Production use on news websites

- Install via Tampermonkey/Greasemonkey
- Works on major news sites (BBC, TAZ, Spiegel, etc.)
- Click button → get bilingual article in new tab

**⚡ CLI Tool** - Development and testing

- Fast iteration cycle (<10 seconds vs 5+ minutes)
- Direct API testing without browser simulation
- Content analysis and translation testing

## Project Status

✅ **Phase 1-3 Completed** - Working browser userscript with OpenRouter API integration
✅ **CLI Ready** - Development environment with clean core/browser separation
📋 **Active Development** - See [ai/plans/STATUS.md](ai/plans/STATUS.md) for current state

## File Structure

```
bile/
├── src/
│   ├── core/                    # CLI-ready modules (no browser dependencies)
│   │   ├── config.js           # Shared constants & API settings
│   │   ├── utils.js            # Environment-agnostic helpers
│   │   ├── api-client.js       # OpenRouter API communication
│   │   ├── translation-engine.js
│   │   ├── content-analyzer.js
│   │   ├── model-manager.js
│   │   └── model-config.js     # Model selection & preferences
│   ├── browser/                # Browser-specific functionality
│   │   ├── config.js           # UI selectors & browser constants
│   │   ├── utils.js            # DOM, localStorage, navigator APIs
│   │   ├── storage.js          # Greasemonkey storage wrapper
│   │   ├── content-extractor.js # DOM parsing & article detection
│   │   ├── tab-generator.js    # HTML generation for new tabs
│   │   ├── ui-trigger.js       # Button & modal UI components
│   │   ├── site-rules.js       # Site-specific DOM selectors
│   │   ├── userscript-header.js # Tampermonkey metadata
│   └── cli.js                  # CLI entry point
├── scripts/
│   ├── build-userscript.js     # Build system (generates dist/bile.user.js)
│   └── test-cli.js             # CLI test suite
├── dist/
│   └── bile.user.js            # Generated userscript (209KB)
└── ai/                         # AI assistant instructions & planning
    ├── instructions.md         # Development guidance for AI agents
    └── plans/STATUS.md         # Current implementation status
```

## Quick Start

### Browser Userscript

```bash
npm run build          # Generate dist/bile.user.js
# Install in Tampermonkey → visit news site → click 🌐 button
```

### CLI Development

```bash
npm test               # Test core functionality
node src/cli.js help   # Show CLI commands
node src/cli.js models # List available models
```

## Documentation

- **[SPECIFICATION.md](SPECIFICATION.md)** - Technical specification with browser/CLI architecture
- **[ai/instructions.md](ai/instructions.md)** - AI development guidance
- **[ai/plans/STATUS.md](ai/plans/STATUS.md)** - Current implementation status
