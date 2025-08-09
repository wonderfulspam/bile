# Phase 1 Implementation Plan

## Overview

Phase 1 establishes the core infrastructure for the Bile bilingual web page converter. This includes userscript setup, secure API key management, basic API integration with Claude, UI trigger mechanism, and new tab generation.

## Technical Decisions

### Browser Support
- **Primary targets**: Firefox and Chrome (desktop and mobile)
- **Userscript manager compatibility**: Tampermonkey/Greasemonkey/Violentmonkey
- **Fallback**: Bookmarklet version for browsers without userscript support

### Architecture Approach
- **Modular design**: Separate concerns into focused modules
- **Progressive enhancement**: Core functionality works, enhanced features degrade gracefully
- **Security-first**: API keys stored securely, content sanitized

## Code Structure

```
src/
├── bile.user.js              # Main userscript entry point
├── modules/
│   ├── storage.js            # Secure API key storage
│   ├── api-client.js         # Claude API communication
│   ├── ui-trigger.js         # Button/keyboard shortcut handling  
│   ├── tab-generator.js      # New tab creation and basic HTML
│   └── utils.js              # Shared utilities and constants
└── config/
    └── userscript-header.js  # Tampermonkey metadata block
```

## Key Function Signatures

### Main Entry Point (`bile.user.js`)
```javascript
// Main initialization function
async function initializeBile() -> void

// Check if current page is suitable for processing
function isArticlePage() -> boolean

// Add UI trigger to current page
function addTriggerButton() -> void
```

### Storage Module (`modules/storage.js`)
```javascript
// Store API key securely
async function storeApiKey(key: string) -> Promise<void>

// Retrieve API key
async function getApiKey() -> Promise<string | null>

// Check if API key exists
async function hasApiKey() -> Promise<boolean>

// Clear stored API key
async function clearApiKey() -> Promise<void>
```

### API Client Module (`modules/api-client.js`)
```javascript
// Test API connectivity
async function testApiConnection() -> Promise<boolean>

// Basic API call structure (placeholder for Phase 3)
async function callClaude(content: string, targetLang: string) -> Promise<object>

// Handle API errors and retries
function handleApiError(error: Error) -> void
```

### UI Trigger Module (`modules/ui-trigger.js`)
```javascript
// Create and inject trigger button
function createTriggerButton() -> HTMLElement

// Handle button click event
async function handleTriggerClick(event: Event) -> Promise<void>

// Register keyboard shortcut (Ctrl+Shift+B)
function registerKeyboardShortcut() -> void

// Show processing indicator
function showProcessingIndicator() -> void
```

### Tab Generator Module (`modules/tab-generator.js`)
```javascript
// Generate basic HTML structure
function generateBasicHtml(content: object) -> string

// Open content in new tab
function openInNewTab(htmlContent: string) -> void

// Create placeholder content for testing
function createPlaceholderContent() -> object
```

### Utils Module (`modules/utils.js`)
```javascript
// Constants
const API_ENDPOINTS = { ... }
const SUPPORTED_LANGUAGES = [ ... ]
const UI_SELECTORS = { ... }

// Helper functions
function debugLog(message: string) -> void
function isValidUrl(url: string) -> boolean
function sanitizeHtml(html: string) -> string
```

## Implementation Tasks

### Task 1: Userscript Boilerplate
- Create `bile.user.js` with proper Tampermonkey headers
- Set up module loading pattern
- Implement site detection for news articles/blogs
- Add basic error handling and logging

### Task 2: Secure API Key Storage  
- Implement `storage.js` using GM_setValue/GM_getValue or browser storage APIs
- Create first-run setup flow for API key entry
- Add validation for API key format
- Implement secure key retrieval pattern

### Task 3: Basic API Integration
- Create `api-client.js` with Anthropic Claude API structure
- Implement basic POST request handling
- Add timeout and retry logic
- Create placeholder response for testing

### Task 4: UI Trigger System
- Design and implement trigger button UI
- Position button appropriately on different sites
- Add keyboard shortcut support (Ctrl+Shift+B)
- Implement visual feedback during processing

### Task 5: New Tab Generation
- Create `tab-generator.js` for HTML generation
- Design basic HTML template structure
- Implement new tab opening mechanism
- Create placeholder content for Phase 1 testing

## Testing Strategy

### Test Sites
- **German**: taz.de, spiegel.de, zeit.de
- **Spanish**: elpais.com, elmundo.es
- **French**: lemonde.fr, lefigaro.fr
- **English**: bbc.com, theguardian.com

### Test Scenarios
1. **Button injection**: Verify trigger appears on article pages
2. **API key storage**: Test first-run setup and key persistence  
3. **New tab creation**: Ensure tab opens with placeholder content
4. **Cross-browser**: Test in Chrome and Firefox with different userscript managers
5. **Mobile responsive**: Verify button and functionality work on mobile browsers

## Implementation Status: ✅ COMPLETED

### Phase 1 Deliverables ✅
* ✅ Complete userscript infrastructure (`src/bile.user.js`)
* ✅ Secure API key storage system (`src/modules/storage.js`)
* ✅ Basic API integration with mock responses (`src/modules/api-client.js`)
* ✅ UI trigger system with button and keyboard shortcuts (`src/modules/ui-trigger.js`)
* ✅ Bilingual HTML generation and new tab creation (`src/modules/tab-generator.js`)
* ✅ Comprehensive utilities and helper functions (`src/modules/utils.js`)
* ✅ Tampermonkey configuration and supported sites (`src/config/`)
* ✅ Test runner for validation (`src/test-runner.html`)
* ✅ Complete documentation (`src/README.md`)

### Success Criteria Met ✅

- ✅ Userscript loads without errors on target sites
- ✅ Trigger button appears and is clickable
- ✅ API key can be stored and retrieved securely
- ✅ New tab opens with basic HTML structure
- ✅ Functionality works in both Chrome and Firefox
- ✅ No console errors or security warnings
- ✅ Mobile-friendly trigger positioning

## Security Considerations

### API Key Protection
- Never log API keys to console
- Use secure browser storage APIs (GM_setValue or browser.storage.local)
- Validate key format before storage
- Clear key on uninstall/disable

### Content Security
- Sanitize any user input
- Use textContent instead of innerHTML where possible
- Validate URLs before opening new tabs
- Implement basic XSS protection patterns

## Next Phase Preparation

Phase 1 establishes the foundation for:
- **Phase 2**: Content extraction will use the trigger system
- **Phase 3**: Language processing will use the API client
- **Phase 4**: HTML generation will extend the tab generator
- **Phase 5**: Settings will extend the storage system

The modular architecture ensures each phase can build upon previous work without major refactoring.