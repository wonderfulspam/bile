# Testing Ideas for Command-Line Functionality

## Node.js Testing Environment

### 1. Mock Browser Environment
- Use `jsdom` to simulate browser DOM and global objects
- Mock `localStorage`, `fetch`, and userscript GM functions
- Create test harness that loads all modules in Node.js context

### 2. API Client Testing
```javascript
// Example test structure
const BileApiClient = require('./src/modules/api-client.js');

// Mock global objects needed for browser environment
global.window = { location: { href: 'https://test.com' } };
global.document = { title: 'Test Article' };
global.localStorage = { getItem: () => null, setItem: () => {} };

// Test actual OpenRouter API calls with real content
```

### 3. Model Management Testing
- Test model selection algorithms with various language/content combinations
- Validate performance tracking and failover logic
- Simulate different API response scenarios (success, failure, timeout)

### 4. Content Processing Pipeline
- Test full extraction → translation → HTML generation pipeline
- Use sample article HTML files as test inputs
- Validate output HTML structure and bilingual content

## CLI Test Runner Ideas

### 1. Interactive Test Mode
```bash
node test-cli.js --interactive
# Prompts for:
# - API key input
# - Sample content file
# - Target language
# - Expected output validation
```

### 2. Batch Testing Mode
```bash
node test-cli.js --batch tests/samples/
# Processes all HTML files in directory
# Outputs translation results and performance metrics
# Generates test report with success/failure rates per model
```

### 3. Model Benchmark Mode
```bash
node test-cli.js --benchmark --models=llama,mistral --content=sample.txt
# Tests specific models against same content
# Measures response times and translation quality
# Outputs comparative performance data
```

### 4. API Integration Testing
```bash
node test-cli.js --api-test --key=YOUR_KEY
# Tests actual OpenRouter API connectivity
# Validates all free models are accessible
# Checks rate limiting and error handling
```

## Test Data Requirements

### Sample Content Files
- `tests/samples/english-news.html` - BBC/Guardian articles
- `tests/samples/german-news.html` - Spiegel/Zeit articles
- `tests/samples/spanish-blog.html` - El País articles
- `tests/samples/technical-docs.html` - Technical documentation
- `tests/samples/long-article.html` - 3000+ word article for context testing

### Expected Output Validation
- JSON schema validation for API responses
- HTML structure validation for generated output
- Language detection accuracy tests
- Translation completeness verification

## Testing Framework Integration

### Jest/Mocha Integration
```javascript
describe('BileApiClient', () => {
  beforeEach(() => {
    // Setup mock environment
  });

  test('should select optimal model for German content', async () => {
    // Test model selection logic
  });

  test('should handle API failures gracefully', async () => {
    // Test error handling and failover
  });
});
```

### Performance Testing
- Memory usage monitoring during large article processing
- Response time benchmarking across different models
- Concurrent request handling (multiple articles)
- Rate limiting compliance testing

## Continuous Integration Ideas

### GitHub Actions Workflow
```yaml
name: Bile API Testing
on: [push, pull_request]
jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install jsdom node-fetch
      - name: Run API tests
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: node test-cli.js --batch --no-interactive
```

### Mock API Server
- Create local mock OpenRouter server for testing without API costs
- Simulate various response scenarios (success, rate limits, errors)
- Test failover logic without exhausting real API quotas

## Benefits of CLI Testing

1. **Faster Development Cycle** - No need to reload browser for testing
2. **Automated Quality Assurance** - Run tests in CI/CD pipeline
3. **Performance Profiling** - Easier to measure memory/CPU usage
4. **Batch Processing** - Test multiple scenarios simultaneously
5. **Integration Testing** - Test full pipeline without browser dependencies
6. **API Cost Management** - Controlled testing environment to avoid unnecessary API calls

## Implementation Priority

1. **High Priority**: Basic API client testing with mock environment
2. **Medium Priority**: Model management and selection algorithm testing
3. **Low Priority**: Full integration testing with real HTML samples
4. **Future**: CI/CD integration and automated regression testing