# Testing and Development Feedback Loop

## Quick Feedback Cycle ⚡

**Complete cycle: build + test + analyze = ~390ms**

```bash
# Full development cycle
npm run build && npm test && node src/cli.js analyze test/fixtures/article-medium.txt

# Individual components
npm run build    # 150ms - Build userscript
npm test         # 240ms - Run all tests  
node src/cli.js analyze FILE  # 42ms - Content analysis
```

## Test Fixtures 📁

Located in `test/fixtures/`:

- `article-short.txt` - 14 words, minimal content for quick tests
- `article-medium.txt` - 135 words, typical news article 
- `article-long.txt` - ~400 words, comprehensive article for chunking tests

## API Performance Testing 🔬

### Setting up API Key

1. Add your OpenRouter API key to `.env` file (already created and gitignored):
   ```bash
   # Edit .env file
   OPENROUTER_API_KEY=sk-or-your-api-key-here
   ```

2. Test API functionality:
   ```bash
   node test/debug-api.js           # Basic API testing
   node test/performance-test.js    # Comprehensive performance analysis
   node test/real-world-test.js     # Real-world translation testing
   ```

## Performance Issues Identified 🚨

1. **API Timeout**: 30 second timeout may be too aggressive
2. **Error Handling**: API errors fail fast (~1ms) but mask real timeout issues
3. **Missing Dependencies**: BileConstants not available in CLI environment

## Recommended Workflow 🔄

For iterating on performance issues:

1. **Modify core logic** in `src/core/`
2. **Test immediately** with `node src/cli.js analyze FILE`
3. **Debug API calls** with `node test/debug-api.js` 
4. **Verify with build** using `npm run build && npm test`

Total iteration time: **< 1 second** (excluding API calls)