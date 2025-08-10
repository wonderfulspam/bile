# Phase 3a: Runtime-Agnostic Core Refactoring

## Problem Statement

The current development feedback loop is extremely slow:

1. Build userscript → Install in Tampermonkey → Navigate to site → Trigger → Wait for timeout
2. No visibility into API calls that are failing
3. Can't debug or iterate quickly on the actual issue (OpenRouter API timeouts)

## Key Insight

We don't need to simulate browser behavior - we just need to isolate the core translation logic from the browser-specific wrapper. The API calls to OpenRouter are pure functions that take content and return translations.

## Goals

1. **Runtime-agnostic core** - Core logic works in Node.js and browser
2. **Full-featured CLI** - Complete Bile implementation that can process URLs and generate HTML
3. **Direct API testing** - Test OpenRouter calls directly for debugging
4. **Fast iteration** - Debug API issues in seconds, not minutes
5. **Minimal refactoring** - Small changes to existing code
6. **Preserve userscript** - Keep existing browser UI as a thin wrapper

## Proposed Architecture

### 1. Directory Structure

```
src/
├── core/                    # Runtime-agnostic core logic
│   ├── translator.js        # Main translation logic
│   ├── api-client.js        # OpenRouter API calls
│   ├── content-processor.js # Content chunking/processing
│   └── models.js            # Model configuration
├── browser/                 # Browser-specific code
│   ├── userscript.js        # Tampermonkey entry point
│   ├── ui.js                # UI components (button, modal)
│   ├── storage.js           # GM_getValue/setValue wrapper
│   └── extractor.js         # DOM extraction logic
└── cli/                     # CLI wrapper
    ├── index.js             # CLI entry point
    └── test-api.js          # Direct API testing tool
```

### 2. Core Module Design

Make core modules pure JavaScript with no browser dependencies:

```javascript
// src/core/translator.js
class Translator {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = options.model || 'moonshotai/kimi-k2:free';
        this.timeout = options.timeout || 30000;
    }

    async translate(content, targetLang = 'en') {
        const prompt = this.buildPrompt(content, targetLang);
        const response = await this.callApi(prompt);
        return this.parseResponse(response);
    }

    async callApi(prompt) {
        // Pure fetch call, works in Node.js 18+ and browsers
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: prompt,
                max_tokens: 4000
            }),
            signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return response.json();
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Translator;
}
```

### 3. CLI Tool - Full Bile Implementation

A complete CLI implementation that can fetch articles and produce bilingual HTML:

```javascript
// src/cli/bile-cli.js
const Translator = require('../core/translator');
const ContentExtractor = require('../core/content-extractor');
const HtmlGenerator = require('../core/html-generator');
const fs = require('fs');
const { JSDOM } = require('jsdom');

class BileCLI {
    constructor(apiKey, options = {}) {
        this.translator = new Translator(apiKey, options);
        this.extractor = new ContentExtractor();
        this.generator = new HtmlGenerator();
    }

    async processUrl(url, targetLang = 'en') {
        console.log(`Fetching: ${url}`);

        // Fetch the webpage
        const response = await fetch(url);
        const html = await response.text();

        // Extract content using JSDOM
        const dom = new JSDOM(html, { url });
        const content = this.extractor.extract(dom.window.document, url);

        console.log(`Extracted: ${content.title}`);
        console.log(`Sections: ${content.sections.length}`);
        console.log(`Total text: ${content.totalChars} chars`);

        // Translate
        console.log(`Translating to ${targetLang}...`);
        const translated = await this.translator.translate(content, targetLang);

        // Generate HTML
        const bilingualHtml = this.generator.generate(translated);

        return bilingualHtml;
    }

    async processFile(filePath, targetLang = 'en') {
        const content = fs.readFileSync(filePath, 'utf8');

        // Try to parse as JSON (pre-extracted content)
        try {
            const extracted = JSON.parse(content);
            const translated = await this.translator.translate(extracted, targetLang);
            return this.generator.generate(translated);
        } catch {
            // Treat as raw text
            const translated = await this.translator.translate({
                title: 'Text Document',
                sections: [{ type: 'paragraph', text: content }]
            }, targetLang);
            return this.generator.generate(translated);
        }
    }

    async test(content, targetLang = 'en') {
        // Quick test mode for debugging
        console.log(`Testing with ${content.length} chars...`);
        const start = Date.now();

        try {
            const result = await this.translator.translate({
                title: 'Test',
                sections: [{ text: content }]
            }, targetLang);

            console.log(`✓ Success in ${Date.now() - start}ms`);
            return result;
        } catch (error) {
            console.error(`✗ Failed after ${Date.now() - start}ms: ${error.message}`);
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    const command = args[0];
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.error('Error: Set OPENROUTER_API_KEY environment variable');
        process.exit(1);
    }

    const options = {
        model: args.find(a => a.startsWith('--model='))?.split('=')[1],
        timeout: parseInt(args.find(a => a.startsWith('--timeout='))?.split('=')[1] || '30000'),
        debug: args.includes('--debug')
    };

    const cli = new BileCLI(apiKey, options);

    async function run() {
        try {
            let result;

            if (command.startsWith('http')) {
                // Process URL
                const targetLang = args.find(a => a.startsWith('--lang='))?.split('=')[1] || 'en';
                result = await cli.processUrl(command, targetLang);

                // Save output
                const output = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'output.html';
                fs.writeFileSync(output, result);
                console.log(`Saved to: ${output}`);

            } else if (command === 'test') {
                // Test mode
                const content = args.find(a => a.startsWith('--content='))?.split('=')[1] || 'Hallo Welt';
                result = await cli.test(content);
                console.log(JSON.stringify(result, null, 2));

            } else if (fs.existsSync(command)) {
                // Process file
                const targetLang = args.find(a => a.startsWith('--lang='))?.split('=')[1] || 'en';
                result = await cli.processFile(command, targetLang);

                const output = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'output.html';
                fs.writeFileSync(output, result);
                console.log(`Saved to: ${output}`);

            } else {
                console.log(`
Bile CLI - Bilingual Web Page Converter

Usage:
  bile <url> [options]           Process a webpage URL
  bile <file> [options]          Process a local file
  bile test [options]            Test translation

Options:
  --lang=<code>      Target language (default: en)
  --model=<name>     OpenRouter model to use
  --timeout=<ms>     API timeout in milliseconds (default: 30000)
  --output=<file>    Output HTML file (default: output.html)
  --debug            Enable debug logging

Examples:
  bile https://taz.de/article --lang=en --output=article.html
  bile article.txt --lang=es
  bile test --content="Hello world" --model=deepseek/deepseek-r1-0528:free

Environment:
  OPENROUTER_API_KEY    Your OpenRouter API key (required)
                `);
            }
        } catch (error) {
            console.error('Error:', error.message);
            if (options.debug) {
                console.error(error);
            }
            process.exit(1);
        }
    }

    run();
}
```

### 4. Browser Wrapper

Thin wrapper that uses the core modules:

```javascript
// src/browser/userscript.js
(async function() {
    'use strict';

    // Import core translator (bundled by build script)
    const translator = new Translator(await getApiKey(), {
        model: await getSelectedModel()
    });

    // UI trigger
    createBileButton({
        onClick: async () => {
            const content = extractContent(); // Browser-specific
            const result = await translator.translate(content);
            openResultTab(result); // Browser-specific
        }
    });
})();
```

### 5. Usage Examples

```bash
# Full pipeline: fetch URL and generate bilingual HTML
bile https://taz.de/article --lang=en --output=article.html

# Process a saved HTML file
bile saved-article.html --lang=es

# Process extracted content (JSON)
bile extracted-content.json --lang=fr --output=bilingual.html

# Test mode for debugging API issues
bile test --content="Dies ist ein Test" --model=deepseek/deepseek-r1-0528:free

# Debug mode with detailed logging
bile https://example.com/article --debug --timeout=60000

# Use as npm script
npm run bile -- https://guardian.com/article --lang=de
```

### 6. Package.json Scripts

```json
{
  "scripts": {
    "bile": "node src/cli/bile-cli.js",
    "test": "node src/cli/bile-cli.js test",
    "test:timeout": "node src/cli/bile-cli.js test --content=\"$(cat samples/large.txt)\" --debug",
    "build:userscript": "node scripts/build-userscript.js",
    "build:cli": "echo 'CLI needs no build step'"
  },
  "bin": {
    "bile": "./src/cli/bile-cli.js"
  }
}
```

## Implementation Steps

1. **Extract core logic from browser dependencies**
   - Move pure translation logic to `src/core/`
   - Remove GM_* and DOM dependencies from core
   - Keep API calls as pure functions

2. **Create CLI testing tool**
   - Simple Node.js script for API testing
   - Direct OpenRouter API calls
   - Command-line options for different scenarios

3. **Refactor existing modules**
   - Split browser-specific code into `src/browser/`
   - Keep userscript UI unchanged
   - Update build script to handle new structure

4. **Create test samples**
   - Save problematic content as text files
   - Different sizes to test timeout thresholds
   - Real article content that's failing

5. **Update build process**
   - Bundle core modules for browser
   - Keep CLI tools separate
   - Add npm scripts for testing

## Benefits of This Approach

1. **Two deployment targets** - CLI tool and browser userscript from same codebase
2. **Full CLI functionality** - Can process any URL without browser
3. **Direct API debugging** - Test the actual problem (API calls)
4. **Fast iteration** - Run tests in 1-2 seconds
5. **No mocking needed** - Use real fetch, real API, real HTML parsing
6. **Cleaner architecture** - Clear separation of concerns
7. **Better for development** - No need to open browser for most testing

## Success Criteria

- [ ] CLI can fetch any article URL and produce bilingual HTML
- [ ] Can test OpenRouter API calls directly from CLI
- [ ] Can identify why translations are timing out
- [ ] Core logic works in both Node.js and browser
- [ ] Existing userscript continues to work
- [ ] Debug cycle reduced from 5+ minutes to <10 seconds
- [ ] CLI produces same output as userscript would

## Next Steps

After implementing this refactoring:

1. Test API with various content sizes to find timeout threshold
2. Optimize prompt structure and chunking
3. Try different models to see which are most reliable
4. Fix the timeout issue based on findings
5. Verify fix works in actual userscript
