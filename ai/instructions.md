# AI instructions

This file provides guidance to coding agents like `claude` or `gemini` when working with code in this repository.

**Note:** CLAUDE.md, GEMINI.md, and AGENTS.md are symlinks to this file. Always edit ai/instructions.md directly.

## Project Information

Bile is a bilingual web page converter for language learning using OpenRouter's free AI models. For complete project details, architecture, and implementation roadmap, see [SPECIFICATION.md](SPECIFICATION.md).

## Key File Locations for AI Development

**Core Implementation (CLI-ready modules):**

- **[../src/core/](../src/core/)** - Runtime-agnostic modules for CLI and browser
  - `config.js` - Shared constants, API settings, language support
  - `api-client.js` - OpenRouter API communication
  - `translation-engine.js` - Translation logic and quality assessment
  - `content-analyzer.js` - Content structure analysis
  - `model-manager.js` - Model selection and performance tracking

**Browser-specific Implementation:**

- **[../src/browser/](../src/browser/)** - Browser-only functionality
  - `content-extractor.js` - DOM parsing and article detection
  - `site-rules.js` - Site-specific extraction rules
  - `ui-trigger.js` - Button and modal interfaces

**Development Tools:**

- **[../src/cli.js](../src/cli.js)** - CLI entry point for testing
- **[../scripts/test-cli.js](../scripts/test-cli.js)** - CLI test suite
- **[../scripts/build-userscript.js](../scripts/build-userscript.js)** - Build system

**Documentation & Status:**

- **[../SPECIFICATION.md](../SPECIFICATION.md)** - Technical specification
- **[plans/STATUS.md](plans/STATUS.md)** - Current implementation state
- **[commands/COMMANDS.md](commands/COMMANDS.md)** - Available npm/CLI commands

## Development Approach

- Development uses browser developer tools
- Testing with Tampermonkey/userscript managers
- Implementation follows 6-phase approach detailed in SPECIFICATION.md

## Security Requirements

- Never hardcode API keys - use secure browser storage
- Sanitize all HTML output to prevent XSS
- Implement client-side rate limiting
- Use Content Security Policy headers
