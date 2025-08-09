# AI instructions

This file provides guidance to coding agents like `claude` or `gemini` when working with code in this repository.

**Note:** CLAUDE.md, GEMINI.md, and AGENTS.md are symlinks to this file. Always edit ai/instructions.md directly.

## Project Information

Bile is a bilingual web page converter for language learning. For complete project details, architecture, and implementation roadmap, see [SPECIFICATION.md](SPECIFICATION.md).

## Key File Locations

- **[../SPECIFICATION.md](../SPECIFICATION.md)** - Complete technical specification and implementation details
- **[../README.md](../README.md)** - Project overview and documentation index
- **[plans/STATUS.md](plans/STATUS.md)** - Current state of implementation.
- **[commands/COMMANDS.md](commands/COMMANDS.md)** - Overview of commands you should leverage
- **[docs/INDEX.md](docs/INDEX.md)** - Overview of documents relevant for development

## Development Approach

- Development uses browser developer tools
- Testing with Tampermonkey/userscript managers
- Implementation follows 6-phase approach detailed in SPECIFICATION.md

## Security Requirements

- Never hardcode API keys - use secure browser storage
- Sanitize all HTML output to prevent XSS
- Implement client-side rate limiting
- Use Content Security Policy headers
