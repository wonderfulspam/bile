/**
 * Bile Core Configuration
 * Shared constants for both CLI and browser environments
 */

const BileCoreConfig = {
    // Provider Configuration
    PROVIDERS: {
        OPENROUTER: {
            name: 'OpenRouter',
            baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
            keyEnvVar: 'OPENROUTER_API_KEY',
            keyPrefix: 'sk-or-',
            models: [
                'qwen/qwen3-235b-a22b:free',        // 9.6s - fastest
                'microsoft/mai-ds-r1:free',         // 10.9s
                'moonshotai/kimi-k2:free',          // 12.3s
                'tngtech/deepseek-r1t2-chimera:free', // 15.2s
                'deepseek/deepseek-r1-0528:free'    // 32.7s - avoid (very slow)
            ]
        },
        GROQ: {
            name: 'Groq',
            baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
            keyEnvVar: 'GROQ_API_KEY',
            keyPrefix: 'gsk_',
            models: [
                'openai/gpt-oss-20b',    // Recommended for high quality
                'mixtral-8x7b-32768',    // Best quality, good speed
                'llama2-70b-4096',       // Excellent quality, very fast
                'llama3-70b-8192',       // Latest Llama, good balance
                'gemma-7b-it'            // Fallback, fastest
            ]
        }
    },

    // OpenRouter free models (ordered by performance: fastest first) - backward compatibility
    FREE_MODELS: [
        'qwen/qwen3-235b-a22b:free',        // 9.6s - fastest
        'microsoft/mai-ds-r1:free',         // 10.9s
        'moonshotai/kimi-k2:free',          // 12.3s
        'tngtech/deepseek-r1t2-chimera:free', // 15.2s
        'deepseek/deepseek-r1-0528:free'    // 32.7s - avoid (very slow)
    ],

    // API Configuration - backward compatibility
    API: {
        BASE_URL: 'https://openrouter.ai/api/v1/chat/completions',
        MAX_TOKENS: 4000,
        DEFAULT_TEMPERATURE: 0.3,
        TIMEOUT: 30000
    },

    // Performance optimization settings
    OPTIMIZATION: {
        // Use optimized minimal prompts for 50%+ speed improvement
        USE_MINIMAL_PROMPTS: true,
        
        // Preferred model (fastest based on benchmarks)
        PREFERRED_MODEL: 'qwen/qwen3-235b-a22b:free',
        
        // Strategy selection based on content
        STRATEGIES: {
            'minimal': 'Ultra-fast, 56% speed improvement, good quality',
            'balanced': 'Good speed/quality balance, 40% improvement', 
            'twopass': 'Best for content with few slang terms, 41% improvement',
            'full': 'Maximum quality, slowest (baseline)'
        }
    },

    // Supported languages with metadata
    SUPPORTED_LANGUAGES: {
        'en': { name: 'English', flag: '🇺🇸', rtl: false },
        'de': { name: 'Deutsch', flag: '🇩🇪', rtl: false },
        'es': { name: 'Español', flag: '🇪🇸', rtl: false },
        'fr': { name: 'Français', flag: '🇫🇷', rtl: false },
        'it': { name: 'Italiano', flag: '🇮🇹', rtl: false },
        'pt': { name: 'Português', flag: '🇵🇹', rtl: false },
        'ru': { name: 'Русский', flag: '🇷🇺', rtl: false },
        'ja': { name: '日本語', flag: '🇯🇵', rtl: false },
        'ko': { name: '한국어', flag: '🇰🇷', rtl: false },
        'zh': { name: '中文', flag: '🇨🇳', rtl: false },
        'ar': { name: 'العربية', flag: '🇸🇦', rtl: true },
        'hi': { name: 'हिन्दी', flag: '🇮🇳', rtl: false }
    },

    // Configuration constants
    PROCESSING: {
        MAX_CONTENT_LENGTH: 50000, // Characters
        MAX_PARAGRAPHS: 20,
        MIN_PARAGRAPH_LENGTH: 20,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000, // 1 second
        TARGET_LANGUAGE_DEFAULT: 'en'
    },

    // Common JSON response templates
    RESPONSE_TEMPLATES: {
        BASIC_TRANSLATION_RESPONSE: `{
  "source_language": "detected_language_code",
  "target_language": "TARGET_LANG_PLACEHOLDER",
  "title_original": "original title",
  "title_translated": "translated title",
  "content": [
    {
      "type": "paragraph",
      "original": "original text with <slang>preserved terms</slang>",
      "translated": "translated text with <slang>preserved terms</slang> in context",
      "slang_terms": [
        {
          "term": "example",
          "translation": "example translation",
          "explanation_original": "Brief explanation in source language",
          "explanation_translated": "Brief explanation in target language"
        }
      ]
    }
  ]
}`,
        
        TRANSLATION_RESPONSE: `{
  "translations": [
    {
      "original": "source text here",
      "segments": [
        {
          "term": "example",
          "translation": "example translation",
          "explanation": "Brief explanation for learners"
        }
      ]
    }
  ]
}`,

        ENHANCED_TRANSLATION_RESPONSE: `{
  "source_language": "detected_language_code",
  "target_language": "TARGET_LANG_PLACEHOLDER",
  "title_original": "original article title",
  "title_translated": "translated article title",
  "content": [
    {
      "type": "paragraph",
      "original": "original text with cultural terms preserved",
      "translated": "high-quality translation preserving tone and meaning",
      "slang_terms": [
        {
          "term": "cultural_term_or_slang",
          "translation": "English_equivalent",
          "explanation_original": "detailed explanation in source language",
          "explanation_translated": "detailed explanation in target language"
        }
      ]
    }
  ]
}`
    },

    // Error handling patterns
    ERROR_HANDLERS: {
        LOG_AND_THROW: (context, error) => {
            if (console && console.error) {
                console.error(`${context} failed:`, error);
            }
            throw error;
        },

        LOG_WITH_CONTEXT: (context, details) => {
            if (console && console.error) {
                console.error(context, details);
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileCoreConfig;
}