# Bile Phase 1 Implementation

This directory contains the Phase 1 implementation of Bile - Bilingual Web Page Converter.

## Files Overview

### Main Userscript
- **`bile.user.js`** - Main userscript file with all functionality inline for Phase 1

### Modular Components (for development and future phases)
- **`modules/storage.js`** - Secure API key storage and user preferences
- **`modules/api-client.js`** - Claude API communication (Phase 1: mock responses)
- **`modules/ui-trigger.js`** - User interface and trigger button management
- **`modules/tab-generator.js`** - Bilingual HTML generation and new tab creation
- **`modules/utils.js`** - Shared utilities and helper functions

### Configuration
- **`config/userscript-header.js`** - Tampermonkey metadata and supported sites

### Testing
- **`test-runner.html`** - Phase 1 testing interface for validating functionality

## Installation

### Method 1: Direct Installation (Recommended for Phase 1)
1. Install Tampermonkey or Greasemonkey browser extension
2. Copy the contents of `bile.user.js`
3. Create new userscript in Tampermonkey
4. Paste the code and save
5. Navigate to a supported news site to test

### Method 2: URL Installation (when hosted)
```
https://raw.githubusercontent.com/user/bile/main/src/bile.user.js
```

## Supported Sites

### English
- BBC News (bbc.com)
- The Guardian (theguardian.com)

### German
- taz (taz.de)
- Der Spiegel (spiegel.de)
- Die Zeit (zeit.de)

### Spanish
- El País (elpais.com)
- El Mundo (elmundo.es)

### French
- Le Monde (lemonde.fr)
- Le Figaro (lefigaro.fr)

## Phase 1 Features

✅ **Core Infrastructure**
- Userscript boilerplate with proper Tampermonkey headers
- Secure API key storage using GM APIs
- Basic UI trigger button with positioning
- Keyboard shortcut support (Ctrl+Shift+B)
- New tab generation with bilingual HTML
- Mock API responses for testing

✅ **User Interface**
- Floating trigger button on supported sites
- Processing indicators and error handling
- First-run API key setup flow
- Mobile-responsive design

✅ **Content Processing (Mock)**
- Basic content extraction from articles
- Mock translation responses
- Placeholder slang term highlighting
- Language detection simulation

✅ **Output Generation**
- Clean, modern bilingual HTML layout
- Language toggle functionality
- Interactive slang term tooltips (placeholder)
- Responsive design for mobile/desktop

## Testing Phase 1

### Automated Testing
1. Open `test-runner.html` in a browser
2. Run all test suites to validate functionality
3. Each test verifies a different component

### Manual Testing
1. Install userscript in Tampermonkey
2. Visit a supported news site (e.g., bbc.com/news)
3. Look for the "🌐 Bile" button (top-right by default)
4. Click button to test the full pipeline
5. Verify new tab opens with bilingual layout

### Test Scenarios
- **Button Injection**: Verify trigger appears on article pages
- **API Key Storage**: Test first-run setup and key persistence
- **Content Extraction**: Check article detection and content parsing
- **HTML Generation**: Validate bilingual output formatting
- **Cross-browser**: Test in Chrome and Firefox
- **Mobile**: Verify responsive layout and touch interactions

## API Key Setup

Phase 1 requires an Anthropic Claude API key for the full pipeline (though Phase 1 uses mock responses).

1. Get API key from https://console.anthropic.com/
2. Click the Bile button on any supported site
3. Enter your API key when prompted (format: `sk-ant-...`)
4. Key is stored securely using browser APIs

## Troubleshooting

### Button Not Appearing
- Check if site is in supported list
- Verify page has article content (h1, paragraphs)
- Check browser console for errors

### API Key Issues
- Ensure key starts with `sk-ant-`
- Key must be at least 20 characters
- Use browser dev tools to check storage: `GM_getValue('bile_api_key')`

### Permission Errors
- Verify Tampermonkey is enabled for the site
- Check userscript matches current domain
- Ensure required GM grants are present

## Phase 1 Limitations

⚠️ **Current Limitations**
- Content extraction is basic (Phase 2 will improve)
- API responses are mocked (Phase 3 will use real Claude API)
- Limited to predetermined news sites
- No actual language processing yet
- Slang detection is placeholder functionality

## Next Steps (Phase 2+)

- **Phase 2**: Intelligent content extraction from any article structure
- **Phase 3**: Real Claude API integration with language processing
- **Phase 4**: Enhanced HTML with full interactivity
- **Phase 5**: Settings panel, caching, and browser extension
- **Phase 6**: Performance optimization and extensive testing

## Development

### Code Structure
The Phase 1 implementation uses an "all-in-one" approach with inline modules for simplicity. The separate module files are provided for:
- Development and debugging
- Future phase modularization
- Code organization and maintenance

### Debugging
Enable debug logging:
```javascript
BileUtils.debugLog('Debug message', 'debug');
```

View stored data:
```javascript
// In browser console on userscript page
GM_getValue('bile_api_key');
```

## Security

- API keys stored using secure GM APIs
- HTML content sanitized to prevent XSS
- No external dependencies or network requests (Phase 1)
- CSP-friendly implementation