# Bile - Bilingual Intelligent Learning Experience

Bilingual web page converter that transforms articles into interactive language learning tools.

While the name **M**ultilingual **I**ntelligent **L**earning **F**riend would more accurately capture the project, the name _Bile_ is chosen to signal that this is AI slop all the way down.

## What It Does

- **Converts articles** into clean bilingual format with language toggle
- **Preserves slang & idioms** with explanations and cultural context
- **Works as userscript** on news sites (BBC, TAZ, Spiegel, etc.)
- **CLI tool** for development and testing

Click 🌐 button on supported sites → get bilingual article in new tab.

## Quick Start

**Browser userscript:**
```bash
npm run build    # Generate dist/bile.user.js for Tampermonkey
```

**Development:**
```bash
npm test                      # Test core functionality
npm run test:performance     # Test API performance
npm run dev                  # Build and open for installation
```

## Documentation

- **[SPECIFICATION.md](SPECIFICATION.md)** - Complete technical specification
- **[ai/plans/STATUS.md](ai/plans/STATUS.md)** - Current project status
- **[test/README.md](test/README.md)** - Testing and development workflow

## API Keys

Add to `.env` file:
```bash
GROQ_API_KEY=your-key-here        # Preferred (fast, reliable)
OPENROUTER_API_KEY=your-key-here  # Fallback
```

## CLI Usage

**Development workflows** (use npm):
```bash
npm run build         # Build userscript
npm test              # Run tests
npm run dev           # Build + open for installation
npm run clean         # Clean build files
```

**Content operations** (use CLI directly):
```bash
node src/cli.js translate <file>  # Translate content
node src/cli.js analyze <file>    # Analyze structure
node src/cli.js models            # List available models
node src/cli.js help              # Show all commands
```
