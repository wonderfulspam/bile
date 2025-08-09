# Phase 2 Implementation Plan: Content Extraction

## Overview

Phase 2 focuses on intelligent content extraction from web pages. Building on the Phase 1 infrastructure, this phase implements robust algorithms to identify, extract, and structure article content for translation processing.

## Technical Objectives

### Core Goals
- **Smart Article Detection**: Automatically identify article content vs navigation/ads
- **Content Preservation**: Maintain semantic HTML structure during extraction
- **Multi-site Support**: Work across different news sites and blog platforms
- **Metadata Extraction**: Capture titles, authors, publication dates, and other context

### Quality Requirements
- Extract clean, readable content without boilerplate
- Preserve important formatting (headings, lists, emphasis)
- Handle dynamic content and lazy-loaded articles
- Maintain content hierarchy and structure

## Architecture Approach

### Extraction Strategy
1. **Primary Method**: Use readability algorithms (similar to Firefox Reader Mode)
2. **Fallback Method**: Site-specific selectors for major news sites
3. **Content Validation**: Ensure extracted content meets quality thresholds

### Module Extensions
Building on Phase 1 modules:
- Extend `utils.js` with content extraction functions
- Enhance `ui-trigger.js` with content preview capabilities
- Update `tab-generator.js` to handle structured content

## Implementation Tasks

### Task 1: Core Content Extraction Engine
**Files**: `src/modules/content-extractor.js`

```javascript
// Main extraction function
async function extractArticleContent(document) -> ContentResult

// Readability-based extraction
function readabilityExtract(document) -> ExtractedContent

// Site-specific extraction fallback
function siteSpecificExtract(document, domain) -> ExtractedContent

// Content quality validation
function validateContent(content) -> boolean
```

**Key Features**:
- Mozilla Readability algorithm implementation
- Content scoring and filtering
- Text density analysis
- Boilerplate removal

### Task 2: Content Structure Analysis
**Files**: `src/modules/content-analyzer.js`

```javascript
// Analyze content structure and hierarchy  
function analyzeContentStructure(content) -> ContentStructure

// Extract semantic elements (headings, paragraphs, lists)
function extractSemanticElements(content) -> SemanticContent

// Detect language and content type
function detectLanguageAndType(content) -> ContentMetadata
```

**Key Features**:
- Heading hierarchy detection
- Paragraph and list identification
- Language detection using statistical methods
- Content type classification (news, blog, academic)

### Task 3: Site-Specific Extraction Rules
**Files**: `src/config/site-rules.js`

```javascript
// Site-specific extraction configuration
const SITE_RULES = {
    'taz.de': { ... },
    'spiegel.de': { ... },
    'lemonde.fr': { ... },
    // Add more sites as needed
}

// Apply site-specific extraction
function applySiteRules(domain, document) -> ExtractedContent
```

**Supported Sites** (Initial):
- **German**: taz.de, spiegel.de, zeit.de, sueddeutsche.de
- **French**: lemonde.fr, lefigaro.fr, liberation.fr
- **Spanish**: elpais.com, elmundo.es, abc.es
- **English**: bbc.com, theguardian.com, nytimes.com

### Task 4: Content Preview and Validation
**Files**: Extension of `src/modules/ui-trigger.js`

```javascript
// Show content preview before processing
function showContentPreview(content) -> void

// Allow user to adjust content selection
function enableContentSelection() -> void

// Validate extracted content with user
function confirmContentExtraction(content) -> Promise<boolean>
```

**Key Features**:
- Preview modal with extracted content
- Manual content selection interface
- Quality indicators (word count, readability score)
- User confirmation before processing

### Task 5: Enhanced HTML Generation
**Files**: Extension of `src/modules/tab-generator.js`

```javascript
// Generate HTML with preserved structure
function generateStructuredHtml(content) -> string

// Apply content-aware styling
function applyContentStyling(content) -> string

// Create table of contents for long articles
function generateTableOfContents(content) -> string
```

**Key Features**:
- Preserve heading hierarchy
- Maintain list and emphasis formatting
- Generate navigation for long articles
- Apply responsive typography

## Data Structures

### ContentResult
```javascript
{
    success: boolean,
    content: ExtractedContent | null,
    error?: string,
    confidence: number (0-1),
    method: 'readability' | 'site-specific' | 'manual'
}
```

### ExtractedContent
```javascript
{
    title: string,
    author?: string,
    publishDate?: Date,
    language: string,
    content: ContentElement[],
    metadata: {
        wordCount: number,
        readingTime: number,
        domain: string,
        url: string
    }
}
```

### ContentElement
```javascript
{
    type: 'heading' | 'paragraph' | 'list' | 'quote' | 'image',
    level?: number,  // for headings
    text: string,
    html: string,    // preserved formatting
    id?: string      // for navigation
}
```

## Testing Strategy

### Test Cases
1. **Article Detection**: Test on various news sites and blog platforms
2. **Content Quality**: Verify extraction produces clean, readable content
3. **Structure Preservation**: Ensure headings, lists, and formatting are maintained
4. **Language Detection**: Test accuracy across different languages
5. **Fallback Mechanisms**: Verify site-specific rules work when readability fails

### Test Sites
- **High-quality sites**: BBC, Guardian, New York Times
- **Complex layouts**: CNN, Fox News, Daily Mail
- **Blog platforms**: Medium, WordPress, Substack
- **Non-English**: Der Spiegel, Le Monde, El País

### Performance Targets
- Content extraction: < 500ms for typical articles
- Accuracy: > 90% clean content extraction
- Coverage: Works on > 80% of target news sites

## Integration with Phase 1

### Modified Functions
- `handleTriggerClick()`: Add content extraction step
- `isArticlePage()`: Enhance detection accuracy  
- `generateBasicHtml()`: Accept structured content input

### New UI Elements
- Content preview modal
- Extraction progress indicator
- Quality/confidence display
- Manual selection tools

## Quality Assurance

### Content Validation Checks
- Minimum word count (> 100 words for articles)
- Text-to-HTML ratio (avoid navigation-heavy content)
- Language confidence score
- Duplicate content detection

### Error Handling
- Graceful fallback when extraction fails
- User notification for low-quality extractions
- Manual selection as last resort
- Logging for debugging problematic sites

## Success Criteria

- ✅ Automatic extraction works on 80%+ of target news sites
- ✅ Extracted content is clean and readable (manual verification)  
- ✅ Structure preservation maintains article hierarchy
- ✅ Language detection accuracy > 95%
- ✅ User preview allows content validation before processing
- ✅ Performance impact < 500ms on average article pages
- ✅ Graceful handling of extraction failures

## Security Considerations

### Content Sanitization
- XSS protection for extracted HTML
- URL validation for images and links
- Safe handling of user-generated content
- Content Security Policy compliance

### Privacy Protection
- No content sent to external servers during extraction
- Local-only processing until Phase 3 integration
- Respect robots.txt and site policies
- User consent for content processing

## Next Phase Preparation

Phase 2 prepares for:
- **Phase 3**: Extracted content will be sent to Claude API for translation
- **Phase 4**: Structured content will enable better HTML generation
- **Phase 5**: Content metadata will inform user settings and preferences

The extraction system provides clean, structured input that subsequent phases can reliably process.