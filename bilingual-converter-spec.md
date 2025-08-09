# Bilingual Web Page Converter - Product Specification

## Executive Summary

A browser-based tool (userscript/bookmarklet/extension) that transforms any web article into a bilingual, interactive version with clickable slang explanations. The tool preserves cultural context by keeping slang terms in their original language with translations in parentheses, removes JavaScript bloat and popups, and creates a clean, readable bilingual interface.

## Product Overview

### Core Functionality
- Extracts article content from any webpage
- Automatically detects the source language
- Identifies and preserves slang, idioms, and culturally significant terms
- Creates a bilingual version with a language toggle (defaults to browser's language)
- Adds clickable tooltips for extended explanations
- Strips unnecessary JavaScript, ads, and popups
- Opens result in a new tab with a clean, minimal design

### Key Features
1. **Slang Preservation**: Slang terms remain in their original form with translations.
2. **Interactive Explanations**: Click any highlighted term for cultural/linguistic context.
3. **Clean Interface**: No tracking, popups, or unnecessary scripts.
4. **Instant Toggle**: Switch between the original language and the translated version.
5. **Universal Compatibility**: Works on any article webpage.
6. **Configurable Output**: Output language defaults to the browser's language and is user-configurable.

## Technical Requirements

### Input
- Current webpage DOM/HTML
- **Language Detection**: Automatically detect the primary language of the article.
- Works best with news articles, blog posts, opinion pieces.

### Output
- Self-contained HTML file
- Opens in a new browser tab
- No external dependencies (all CSS/JS inline)
- Mobile-responsive design
- **Configurable Language**: Output language defaults to the user's browser language and can be changed in the settings.

### API Integration
- Anthropic Claude API (or compatible LLM API)
- API key management (secure storage)
- Rate limiting consideration
- Error handling for API failures

## Implementation Phases

### Phase 1: Core Infrastructure
**Goal**: Basic userscript/bookmarklet setup with API integration.

**Tasks**:
1. Create userscript boilerplate (Tampermonkey/Greasemonkey compatible).
2. Implement secure API key storage mechanism.
3. Set up basic API call structure to Claude.
4. Create a simple UI trigger (button/keyboard shortcut).
5. Implement new tab creation with basic HTML.

**Deliverables**:
- `userscript.js` - Main userscript file
- `config.js` - Configuration and API settings
- Basic testing on 2-3 news sites in different languages.

### Phase 2: Content Extraction
**Goal**: Intelligent article extraction from various website structures.

**Tasks**:
1. Implement content detection algorithms.
   - Main article identification
   - Title, subtitle, author extraction
   - Remove navigation, ads, comments
2. Handle different website structures (news sites, blogs, etc.).
3. Preserve important semantic HTML.
4. Extract and clean text for API processing.

**Deliverables**:
- `extractor.js` - Content extraction module
- Site-specific extraction rules (if necessary).
- Test suite for major news websites in various languages.

### Phase 3: Language Processing
**Goal**: Send content to API and receive a structured bilingual response.

**Tasks**:
1. Implement language detection on the extracted text.
2. Create an API prompt template for:
   - Identifying the source language.
   - Identifying slang/idioms/cultural terms.
   - Translating to the target language while preserving original terms.
   - Generating explanations in both languages.
3. Implement response parsing.
4. Handle long articles (chunking if needed).
5. Error handling and retry logic.

**API Response Structure**:
```json
{
  "source_language": "detected_language_code",
  "target_language": "user_selected_language_code",
  "title_original": "Original title",
  "title_translated": "Translated title",
  "content": [
    {
      "type": "paragraph",
      "original": "Text with <slang>terms</slang>",
      "translated": "Translation with <slang>terms</slang>",
      "slang_terms": [
        {
          "term": "Beispiel",
          "translation": "Example",
          "explanation_original": "Simple explanation in the original language",
          "explanation_translated": "English explanation"
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
**Goal**: Create the final bilingual HTML with all interactive features.

**Tasks**:
1. Generate a clean HTML structure.
2. Implement language toggle functionality.
3. Create a clickable tooltip system.
4. Apply consistent, minimal styling.
5. Ensure mobile responsiveness.
6. Add keyboard navigation (optional).

**Deliverables**:
- `html-generator.js` - HTML generation module
- CSS styles (inline)
- JavaScript for interactivity (inline)

### Phase 5: Polish & Extended Features
**Goal**: Improve UX and add advanced features.

**Tasks**:
1. Add a loading indicator during processing.
2. Implement caching to avoid re-processing.
3. Add a settings panel:
   - API key configuration
   - Style preferences
   - Default and target language selection
4. Browser extension version (optional).
5. Bookmarklet version for easier distribution.
6. Error recovery and user feedback.

**Deliverables**:
- Settings UI
- Browser extension manifest (optional)
- Bookmarklet generator
- User documentation

### Phase 6: Testing & Optimization
**Goal**: Ensure reliability across different websites and languages.

**Tasks**:
1. Test on 20+ websites in various languages.
2. Performance optimization.
3. Handle edge cases:
   - Paywalled content
   - Dynamic content loading
   - Very long articles
   - Mixed language content
4. User testing and feedback incorporation.

**Deliverables**:
- Test report
- Performance metrics
- Bug fixes
- Final documentation

## API Prompt Engineering

### Key Instructions for Claude API:
1. First, identify the primary language of the text.
2. Identify ALL slang, idioms, colloquialisms, and culturally specific terms.
3. Preserve original terms in the translated text.
4. Provide concise explanations suitable for tooltips.
5. Maintain the article's tone and style.
6. Handle formal/informal register appropriately.

### Example Prompt Structure:
```
You are converting a web article into a bilingual version.

Instructions:
1. Identify the source language of the article.
2. Translate the article to {target_language}.
3. Identify all slang terms, idioms, and culturally specific expressions.
4. In the translated version, keep the original slang terms with the translation in parentheses.
5. Provide brief explanations for each term.
6. Maintain the original tone and style.

Output as structured JSON with the schema provided.

Article:
[EXTRACTED_CONTENT]
```

## Security Considerations

1. **API Key Storage**:
   - Never hardcode API keys.
   - Use browser secure storage APIs.
   - Consider OAuth flow for production.

2. **Content Security**:
   - Sanitize extracted HTML.
   - Prevent XSS in generated content.
   - Use Content Security Policy headers.

3. **Rate Limiting**:
   - Implement client-side rate limiting.
   - Cache processed articles.
   - Show usage statistics to the user.

## Success Metrics

1. **Functionality**:
   - Successfully processes 95% of news articles from major languages.
   - API response time < 5 seconds for an average article.
   - All slang terms are clickable with explanations.

2. **User Experience**:
   - Clean, readable output every time.
   - No JavaScript errors.
   - Mobile-friendly display.
   - Instant language switching.

3. **Performance**:
   - Page generation < 10 seconds total.
   - Output HTML < 500KB.
   - Smooth animations and interactions.

## Development Tools Needed

- Modern browser with developer tools
- Tampermonkey or similar userscript manager
- Anthropic API key
- Test set of article URLs in various languages
- Version control (Git)

## Future Enhancements

1. PDF export functionality
2. Collaborative translations
3. Integration with language learning tools
4. Offline mode with cached translations
5. Community-contributed explanations database

## Getting Started (Phase 1)

Begin by creating a simple userscript that:
1. Adds a button to news sites.
2. When clicked, extracts the article title.
3. Sends it to the Claude API.
4. Opens a new tab with the response.

This minimal viable product will establish the core workflow and API integration pattern for subsequent phases.
