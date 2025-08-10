# Testing and Development Feedback Loop

## Quick Feedback Cycle ⚡

**Complete cycle: build + test + analyze = ~390ms**

```bash
# Full development cycle
npm run build && npm test && node src/cli.js analyze test/fixtures/article-medium.txt

# Individual components
npm run build              # 150ms - Build userscript
npm test                   # 240ms - Run core functionality tests
node src/cli.js analyze FILE  # 42ms - Content analysis
```

## Test Files 📁

### Core Tests
- `test/cli.js` - Main CLI test suite (run via `npm test`)
- `test/performance-test.js` - API performance analysis
- `test/html-generation.js` - Browser HTML generation

### Test Fixtures
Located in `test/fixtures/`:
- `article-short.txt` - 14 words, minimal content for quick tests
- `article-medium.txt` - 135 words, typical news article
- `article-long.txt` - ~400 words, comprehensive article for chunking tests

## API Testing 🔬

### Setting up API Keys

1. **Groq (Preferred)**: Add to `.env` file:
   ```bash
   GROQ_API_KEY=your-groq-key-here
   ```

2. **OpenRouter (Fallback)**: Add to `.env` file:
   ```bash
   OPENROUTER_API_KEY=your-openrouter-key-here
   ```

3. Test API functionality:
   ```bash
   npm run test:performance        # Performance analysis with your configured provider
   npm test                        # Core functionality tests (loads .env automatically)
   
   # Or run directly with Node.js --env-file flag:
   node --env-file=.env test/performance-test.js
   node --env-file=.env test/cli.js
   ```

## Recommended Workflow 🔄

For development and testing:

1. **Modify core logic** in `src/core/`
2. **Test immediately** with `npm test`
3. **Test performance** with `npm run test:performance` (if API key available)
4. **Test browser features** with `node test/html-generation.js`
5. **Build userscript** with `npm run build`

Total iteration time: **< 1 second** (excluding API calls)