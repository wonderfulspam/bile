# Bilingual Web Page Converter - Product Specification

## Executive Summary

A browser-based tool (userscript/bookmarklet/extension) that transforms any German web article into a bilingual, interactive version with clickable slang explanations. The tool preserves cultural context by keeping German slang terms with translations in parentheses, removes JavaScript bloat and popups, and creates a clean, readable bilingual interface.

## Product Overview

### Core Functionality
- Extracts article content from any German webpage
- Identifies and preserves German slang, idioms, and culturally significant terms
- Creates bilingual version with language toggle
- Adds clickable tooltips for extended explanations
- Strips unnecessary JavaScript, ads, and popups
- Opens result in new tab with clean, minimal design

### Key Features
1. **Slang Preservation**: German slang terms remain in original form with translations
2. **Interactive Explanations**: Click any highlighted term for cultural/linguistic context
3. **Clean Interface**: No tracking, popups, or unnecessary scripts
4. **Instant Toggle**: Switch between German and English versions
5. **Universal Compatibility**: Works on any German article webpage

## Technical Requirements

### Input
- Current webpage DOM/HTML
- Article must be primarily in German
- Works best with news articles, blog posts, opinion pieces

### Output
- Self-contained HTML file
- Opens in new browser tab
- No external dependencies (all CSS/JS inline)
- Mobile-responsive design

### API Integration
- Anthropic Claude API (or compatible LLM API)
- API key management (secure storage)
- Rate limiting consideration
- Error handling for API failures

## Implementation Phases

### Phase 1: Core Infrastructure
**Goal**: Basic userscript/bookmarklet setup with API integration

**Tasks**:
1. Create userscript boilerplate (Tampermonkey/Greasemonkey compatible)
2. Implement secure API key storage mechanism
3. Set up basic API call structure to Claude
4. Create simple UI trigger (button/keyboard shortcut)
5. Implement new tab creation with basic HTML

**Deliverables**:
- `userscript.js` - Main userscript file
- `config.js` - Configuration and API settings
- Basic testing on 2-3 German news sites

### Phase 2: Content Extraction
**Goal**: Intelligent article extraction from various website structures

**Tasks**:
1. Implement content detection algorithms
   - Main article identification
   - Title, subtitle, author extraction
   - Remove navigation, ads, comments
2. Handle different website structures
   - News sites (Spiegel, FAZ, TAZ, Zeit)
   - Blogs
   - Academic articles
3. Preserve important semantic HTML
4. Extract and clean text for API processing

**Deliverables**:
- `extractor.js` - Content extraction module
- Site-specific extraction rules
- Test suite for major German websites

### Phase 3: Language Processing
**Goal**: Send content to API and receive structured bilingual response

**Tasks**:
1. Create API prompt template for:
   - Identifying slang/idioms/cultural terms
   - Translating while preserving original terms
   - Generating explanations in both languages
2. Implement response parsing
3. Handle long articles (chunking if needed)
4. Error handling and retry logic

**API Response Structure**:
```json
{
  "title_de": "Original title",
  "title_en": "Translated title",
  "content": [
    {
      "type": "paragraph",
      "german": "Text with <slang>terms</slang>",
      "english": "Translation with <slang>terms</slang>",
      "slang_terms": [
        {
          "term": "Fazfaxenmänner",
          "translation": "FAZ clown men",
          "explanation_de": "Simple German explanation",
          "explanation_en": "English explanation"
        }
      ]
    }
  ]
}
```

**Deliverables**:
- `api-handler.js` - API communication module
- Prompt templates
- Response parser

### Phase 4: HTML Generation
**Goal**: Create the final bilingual HTML with all interactive features

**Tasks**:
1. Generate clean HTML structure
2. Implement language toggle functionality
3. Create clickable tooltip system
4. Apply consistent, minimal styling
5. Ensure mobile responsiveness
6. Add keyboard navigation (optional)

**Deliverables**:
- `html-generator.js` - HTML generation module
- CSS styles (inline)
- JavaScript for interactivity (inline)

### Phase 5: Polish & Extended Features
**Goal**: Improve UX and add advanced features

**Tasks**:
1. Add loading indicator during processing
2. Implement caching to avoid re-processing
3. Add settings panel:
   - API key configuration
   - Style preferences
   - Default language
4. Browser extension version (optional)
5. Bookmarklet version for easier distribution
6. Error recovery and user feedback

**Deliverables**:
- Settings UI
- Browser extension manifest (optional)
- Bookmarklet generator
- User documentation

### Phase 6: Testing & Optimization
**Goal**: Ensure reliability across different websites

**Tasks**:
1. Test on 20+ German websites
2. Performance optimization
3. Handle edge cases:
   - Paywalled content
   - Dynamic content loading
   - Very long articles
   - Mixed language content
4. User testing and feedback incorporation

**Deliverables**:
- Test report
- Performance metrics
- Bug fixes
- Final documentation

## API Prompt Engineering

### Key Instructions for Claude API:
1. Identify ALL slang, idioms, colloquialisms, and culturally specific terms
2. Preserve original German terms in translated text
3. Provide concise explanations suitable for tooltips
4. Maintain article tone and style
5. Handle formal/informal register appropriately

### Example Prompt Structure:
```
You are converting a German article into a bilingual version. 

Instructions:
1. Translate the article to English
2. Identify all slang terms, idioms, and culturally specific expressions
3. In the English version, keep German slang terms with English translation in parentheses
4. Provide brief explanations for each term
5. Maintain the original tone and style

Output as structured JSON with the schema provided.

Article:
[EXTRACTED_CONTENT]
```

## Security Considerations

1. **API Key Storage**: 
   - Never hardcode API keys
   - Use browser secure storage APIs
   - Consider OAuth flow for production

2. **Content Security**:
   - Sanitize extracted HTML
   - Prevent XSS in generated content
   - Use Content Security Policy headers

3. **Rate Limiting**:
   - Implement client-side rate limiting
   - Cache processed articles
   - Show usage statistics to user

## Success Metrics

1. **Functionality**:
   - Successfully processes 95% of German news articles
   - API response time < 5 seconds for average article
   - All slang terms clickable with explanations

2. **User Experience**:
   - Clean, readable output every time
   - No JavaScript errors
   - Mobile-friendly display
   - Instant language switching

3. **Performance**:
   - Page generation < 10 seconds total
   - Output HTML < 500KB
   - Smooth animations and interactions

## Development Tools Needed

- Modern browser with developer tools
- Tampermonkey or similar userscript manager
- Anthropic API key
- Test set of German article URLs
- Version control (Git)

## Future Enhancements

1. Support for additional languages
2. PDF export functionality
3. Collaborative translations
4. Integration with language learning tools
5. Offline mode with cached translations
6. Community-contributed explanations database

## Getting Started (Phase 1)

Begin by creating a simple userscript that:
1. Adds a button to German news sites
2. When clicked, extracts the article title
3. Sends it to Claude API
4. Opens a new tab with the response

This minimal viable product will establish the core workflow and API integration pattern for subsequent phases.