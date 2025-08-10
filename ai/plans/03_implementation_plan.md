# Phase 3: Translation Integration with OpenRouter

**Status**: 🏁 **READY TO START**

## Overview

Phase 3 integrates real translation capabilities using OpenRouter's free model offerings, replacing the mock Claude API integration. This phase implements actual AI-powered translation of the structured content from Phase 2.

## Objectives

- Replace Claude API integration with OpenRouter free models
- Implement multi-model translation with failover capabilities
- Add model selection and configuration UI
- Enhance translation quality with context-aware prompting
- Implement rate limiting and error handling
- Support multiple target languages with model-specific optimizations

## Selected Free Models

**Primary Models** (3-5 top performers for translation):

1. **Meta Llama 3.1 8B Instruct (Free)** - `meta-llama/llama-3.1-8b-instruct:free`
   - Strong multilingual capabilities
   - Good instruction following for translation tasks
   - 128k context length

2. **Mistral 7B Instruct (Free)** - `mistralai/mistral-7b-instruct:free`
   - Excellent European language support
   - Optimized for instruction tasks
   - 32k context length

3. **Google Gemma 2 9B (Free)** - `google/gemma-2-9b-it:free`
   - Strong reasoning capabilities
   - Good multilingual performance
   - 8k context length

4. **Qwen 2.5 7B Instruct (Free)** - `qwen/qwen-2.5-7b-instruct:free`
   - Strong Asian language capabilities
   - Good translation accuracy
   - 32k context length

5. **Phi-3.5 Mini 128K (Free)** - `microsoft/phi-3.5-mini-128k-instruct:free`
   - Compact but capable
   - Large context window
   - Good for structured content

## Technical Architecture

### API Integration Layer

**File**: `src/modules/api-client.js` (replace existing BileApiClient)

```javascript
// OpenRouter API integration
class OpenRouterClient {
    constructor() {
        this.baseUrl = 'https://openrouter.ai/api/v1';
        this.models = [
            'meta-llama/llama-3.1-8b-instruct:free',
            'mistralai/mistral-7b-instruct:free',
            'google/gemma-2-9b-it:free',
            'qwen/qwen-2.5-7b-instruct:free',
            'microsoft/phi-3.5-mini-128k-instruct:free'
        ];
        this.currentModelIndex = 0;
    }

    async translateContent(content, targetLanguage, options = {})
    async testConnection(apiKey)
    async getAvailableModels()
    handleFailover()
    buildTranslationPrompt(content, targetLanguage)
    parseTranslationResponse(response)
    validateTranslation(original, translated)
}
```

### Model Management

**File**: `src/modules/model-manager.js`

```javascript
// Model selection and configuration
class ModelManager {
    getOptimalModel(sourceLanguage, targetLanguage, contentLength)
    updateModelPreferences(userPreferences)
    trackModelPerformance(model, success, responseTime)
    getModelCapabilities(modelId)
    calculateModelScore(model, criteria)
}
```

### Translation Engine

**File**: `src/modules/translation-engine.js`

```javascript
// Core translation logic
class TranslationEngine {
    async translateStructuredContent(extractedContent, targetLanguage)
    async translateTextSection(text, context, targetLanguage)
    async detectSlangTerms(text, language)
    async generateAlternativeTranslations(text, targetLanguage)
    preserveFormatting(originalHtml, translatedText)
    validateTranslationQuality(original, translated, language)
}
```

## Implementation Tasks

### Core Integration (Week 1)

1. **Replace API Client**
   - Remove Claude API references
   - Implement OpenRouter API client
   - Add API key management for OpenRouter
   - Implement request/response handling

2. **Model Selection System**
   - Create model configuration system
   - Implement automatic model failover
   - Add model performance tracking
   - Create model selection UI

### Translation Features (Week 2)

3. **Enhanced Translation Logic**
   - Context-aware translation prompts
   - Preserve content structure during translation
   - Handle different content types (headings, paragraphs, lists, quotes)
   - Implement translation validation

4. **Multi-Language Support**
   - Optimize prompts per language pair
   - Add language-specific model preferences
   - Implement language detection confidence scores
   - Support for 6+ language pairs (EN↔DE, EN↔FR, EN↔ES, etc.)

### User Experience (Week 3)

5. **Advanced UI Features**
   - Model selection dropdown in settings
   - Translation quality indicators
   - Progress tracking for long articles
   - Error recovery with model switching

6. **Performance & Reliability**
   - Implement request rate limiting
   - Add retry logic with exponential backoff
   - Cache translations for repeat requests
   - Monitor and log translation metrics

## Translation Prompt Engineering

### System Prompt Template

```
You are a professional translator specializing in {source_language} to {target_language} translation.
Your task is to translate web article content while preserving:
- Original meaning and context
- Tone and style appropriate to the content type
- Technical terms and proper nouns
- HTML structure and formatting

Content type: {content_type}
Article domain: {domain}
Target audience: Language learners (provide clear, natural translations)

Additional requirements:
- Identify and mark slang terms, colloquialisms, or culturally specific references
- Provide context for idiomatic expressions
- Maintain consistent terminology throughout the article
```

### Content-Specific Prompts

- **Headlines**: Preserve impact while ensuring clarity
- **Technical Articles**: Maintain precision of technical terms
- **News Articles**: Preserve journalistic tone and factual accuracy
- **Opinion Pieces**: Maintain author's voice and argumentation style

## Updated File Structure

```
src/
├── bile.user.js              # Main userscript (updated)
├── modules/
│   ├── api-client.js         # OpenRouter integration (new)
│   ├── model-manager.js      # Model selection logic (new)
│   ├── translation-engine.js # Core translation (new)
│   ├── content-extractor.js  # Phase 2 (existing)
│   ├── content-analyzer.js   # Phase 2 (existing)
│   ├── ui-trigger.js         # Enhanced with model selection (updated)
│   └── tab-generator.js      # Enhanced translation display (updated)
├── config/
│   ├── site-rules.js         # Phase 2 (existing)
│   ├── model-config.js       # Model settings and preferences (new)
│   └── language-config.js    # Language pair configurations (new)
└── utils/
    ├── rate-limiter.js       # API rate limiting (new)
    ├── cache-manager.js      # Translation caching (new)
    └── error-handler.js      # Enhanced error handling (new)
```

## API Integration Details

### OpenRouter Authentication

```javascript
// API key management
const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': window.location.href,
    'X-Title': 'Bile - Bilingual Web Converter'
};
```

### Request Structure

```javascript
const requestBody = {
    model: selectedModel,
    messages: [
        {
            role: 'system',
            content: buildSystemPrompt(sourceLanguage, targetLanguage, contentType)
        },
        {
            role: 'user',
            content: buildTranslationRequest(content, context)
        }
    ],
    temperature: 0.3,
    max_tokens: calculateMaxTokens(content.length),
    stream: false
};
```

## Quality Assurance

### Translation Validation

1. **Structural Validation**
   - Verify all content sections translated
   - Ensure HTML structure preserved
   - Check for missing or corrupted segments

2. **Quality Metrics**
   - Fluency scoring (basic grammar check)
   - Completeness verification
   - Consistency checking across sections

3. **User Feedback Integration**
   - Translation quality rating system
   - Report problematic translations
   - Model performance tracking

## Error Handling Strategy

### Failover Chain

1. **Primary Model Failure** → Switch to next available model
2. **API Rate Limit** → Implement exponential backoff
3. **Translation Quality Issues** → Retry with different model
4. **Complete Failure** → Fall back to basic translation message

### User Communication

- Clear error messages with suggested actions
- Progress indicators for long translations
- Option to retry with different models
- Graceful degradation to content preview mode

## Performance Targets

- **Translation Speed**: < 30 seconds for typical articles (500-2000 words)
- **Model Failover**: < 5 seconds to switch models
- **Cache Hit Rate**: > 70% for repeated content
- **Success Rate**: > 95% translation completion
- **User Satisfaction**: Readable translations that aid language learning

## Success Criteria

- ✅ OpenRouter integration functional with 3+ models
- ✅ Automatic model failover working reliably
- ✅ Translation quality suitable for language learning
- ✅ Multi-language support (EN↔DE, EN↔FR, EN↔ES minimum)
- ✅ User can select preferred models
- ✅ Error handling provides clear user feedback
- ✅ Performance meets target metrics
- ✅ Translation preserves content structure and formatting

## Phase Dependencies

**Previous Phases:**
- **Phase 2**: Structured content extraction provides translation input
- **Phase 1**: Core infrastructure handles UI and storage

**Future Phases:**
- **Phase 4**: Enhanced HTML generation will use translation output
- **Phase 5**: User settings will configure translation preferences
- **Phase 6**: Export features will include translated content

## Migration from Claude

### Configuration Changes

1. **API Endpoints**: Replace Anthropic URLs with OpenRouter
2. **Authentication**: Switch from Claude API keys to OpenRouter API keys
3. **Model References**: Update all model IDs to OpenRouter format
4. **Pricing**: Remove cost considerations (using free models)

### User Migration

- Update API key prompts to reference OpenRouter
- Provide migration guide for existing users
- Maintain backward compatibility during transition
- Clear communication about service change benefits

Phase 3 establishes Bile as a robust, free translation tool while maintaining the quality and user experience expectations from previous phases.