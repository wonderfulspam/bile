/**
 * Bile Model Configuration
 * Manages OpenRouter free model settings and preferences
 */

const BileModelConfig = {
    // Available free models with their capabilities (updated 2024/2025)
    MODELS: {
        'moonshotai/kimi-k2:free': {
            name: 'Kimi K2',
            provider: 'Moonshot AI',
            strengths: ['multilingual', 'reasoning', 'large-context', 'translation-quality'],
            contextLength: 200000,
            languages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
            preferredFor: ['long-articles', 'complex-translations', 'chinese-content'],
            temperature: 0.3,
            maxTokens: 4000
        },
        'deepseek/deepseek-r1-0528:free': {
            name: 'DeepSeek R1',
            provider: 'DeepSeek',
            strengths: ['reasoning', 'logical-thinking', 'structured-output', 'analysis'],
            contextLength: 32000,
            languages: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'ru'],
            preferredFor: ['technical-content', 'analytical-translations', 'structured-content'],
            temperature: 0.2,
            maxTokens: 4000
        },
        'tngtech/deepseek-r1t2-chimera:free': {
            name: 'DeepSeek R1T2 Chimera',
            provider: 'TNG Technology / DeepSeek',
            strengths: ['hybrid-reasoning', 'creative-translation', 'cultural-adaptation'],
            contextLength: 16000,
            languages: ['en', 'de', 'fr', 'es', 'it', 'zh', 'ja', 'pt'],
            preferredFor: ['creative-content', 'cultural-translations', 'blog-posts'],
            temperature: 0.4,
            maxTokens: 3500
        },
        'qwen/qwen3-235b-a22b:free': {
            name: 'Qwen 3 235B',
            provider: 'Alibaba',
            strengths: ['massive-scale', 'multilingual-excellence', 'cultural-nuance', 'advanced-reasoning'],
            contextLength: 1000000,
            languages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi', 'th', 'vi'],
            preferredFor: ['complex-translations', 'cultural-content', 'long-documents', 'asian-languages'],
            temperature: 0.25,
            maxTokens: 6000
        },
        'microsoft/mai-ds-r1:free': {
            name: 'MAI-DS R1',
            provider: 'Microsoft',
            strengths: ['enterprise-grade', 'consistent-output', 'safety', 'reliability'],
            contextLength: 128000,
            languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
            preferredFor: ['professional-content', 'news-articles', 'formal-translations'],
            temperature: 0.2,
            maxTokens: 4000
        }
    },

    // Default model selection strategy
    DEFAULT_STRATEGY: 'auto',

    // Language-specific model preferences (updated for 2024/2025 models)
    LANGUAGE_PREFERENCES: {
        'zh': ['qwen/qwen3-235b-a22b:free', 'moonshotai/kimi-k2:free', 'deepseek/deepseek-r1-0528:free'],
        'ja': ['qwen/qwen3-235b-a22b:free', 'moonshotai/kimi-k2:free', 'microsoft/mai-ds-r1:free'],
        'ko': ['qwen/qwen3-235b-a22b:free', 'moonshotai/kimi-k2:free', 'microsoft/mai-ds-r1:free'],
        'en': ['microsoft/mai-ds-r1:free', 'deepseek/deepseek-r1-0528:free', 'qwen/qwen3-235b-a22b:free'],
        'de': ['tngtech/deepseek-r1t2-chimera:free', 'microsoft/mai-ds-r1:free', 'deepseek/deepseek-r1-0528:free'],
        'fr': ['tngtech/deepseek-r1t2-chimera:free', 'microsoft/mai-ds-r1:free', 'qwen/qwen3-235b-a22b:free'],
        'es': ['microsoft/mai-ds-r1:free', 'qwen/qwen3-235b-a22b:free', 'tngtech/deepseek-r1t2-chimera:free'],
        'it': ['tngtech/deepseek-r1t2-chimera:free', 'microsoft/mai-ds-r1:free', 'qwen/qwen3-235b-a22b:free'],
        'pt': ['tngtech/deepseek-r1t2-chimera:free', 'microsoft/mai-ds-r1:free', 'qwen/qwen3-235b-a22b:free'],
        'ru': ['qwen/qwen3-235b-a22b:free', 'deepseek/deepseek-r1-0528:free', 'moonshotai/kimi-k2:free'],
        'ar': ['qwen/qwen3-235b-a22b:free', 'microsoft/mai-ds-r1:free', 'deepseek/deepseek-r1-0528:free']
    },

    // Content type preferences (updated for 2024/2025 models)
    CONTENT_TYPE_PREFERENCES: {
        'news': ['microsoft/mai-ds-r1:free', 'deepseek/deepseek-r1-0528:free', 'qwen/qwen3-235b-a22b:free'],
        'technical': ['deepseek/deepseek-r1-0528:free', 'qwen/qwen3-235b-a22b:free', 'microsoft/mai-ds-r1:free'],
        'blog': ['tngtech/deepseek-r1t2-chimera:free', 'qwen/qwen3-235b-a22b:free', 'moonshotai/kimi-k2:free'],
        'academic': ['qwen/qwen3-235b-a22b:free', 'deepseek/deepseek-r1-0528:free', 'microsoft/mai-ds-r1:free'],
        'long-form': ['qwen/qwen3-235b-a22b:free', 'moonshotai/kimi-k2:free', 'microsoft/mai-ds-r1:free'],
        'creative': ['tngtech/deepseek-r1t2-chimera:free', 'qwen/qwen3-235b-a22b:free', 'moonshotai/kimi-k2:free'],
        'professional': ['microsoft/mai-ds-r1:free', 'qwen/qwen3-235b-a22b:free', 'deepseek/deepseek-r1-0528:free']
    },

    // Model performance tracking
    PERFORMANCE_WEIGHTS: {
        success_rate: 0.4,
        response_time: 0.2,
        translation_quality: 0.3,
        user_satisfaction: 0.1
    },

    /**
     * Get model configuration by ID
     * @param {string} modelId - The model identifier
     * @returns {Object|null} Model configuration or null if not found
     */
    getModelConfig(modelId) {
        return this.MODELS[modelId] || null;
    },

    /**
     * Get all available models
     * @returns {Array} Array of model IDs
     */
    getAllModels() {
        return Object.keys(this.MODELS);
    },

    /**
     * Get models sorted by preference for a specific language
     * @param {string} language - Language code (e.g., 'en', 'de', 'zh')
     * @returns {Array} Ordered array of model IDs
     */
    getModelsForLanguage(language) {
        const preferences = this.LANGUAGE_PREFERENCES[language];
        if (preferences) {
            return [...preferences];
        }

        // Fallback: return models that support the language
        return this.getAllModels().filter(modelId => {
            const config = this.MODELS[modelId];
            return config.languages.includes(language);
        });
    },

    /**
     * Get preferred models for content type
     * @param {string} contentType - Type of content ('news', 'technical', etc.)
     * @returns {Array} Ordered array of model IDs
     */
    getModelsForContentType(contentType) {
        const preferences = this.CONTENT_TYPE_PREFERENCES[contentType];
        return preferences ? [...preferences] : this.getAllModels();
    },

    /**
     * Get optimal model based on multiple criteria
     * @param {Object} criteria - Selection criteria
     * @param {string} criteria.sourceLanguage - Source language
     * @param {string} criteria.targetLanguage - Target language
     * @param {string} criteria.contentType - Content type
     * @param {number} criteria.contentLength - Content length
     * @param {Array} criteria.excludeModels - Models to exclude
     * @returns {string} Optimal model ID
     */
    getOptimalModel(criteria = {}) {
        const {
            sourceLanguage = 'en',
            targetLanguage = 'en',
            contentType = 'blog',
            contentLength = 1000,
            excludeModels = []
        } = criteria;

        // Get candidate models
        let candidates = [];

        // Prioritize by target language
        if (targetLanguage !== 'en') {
            candidates = this.getModelsForLanguage(targetLanguage);
        } else if (sourceLanguage !== 'en') {
            candidates = this.getModelsForLanguage(sourceLanguage);
        } else {
            candidates = this.getModelsForContentType(contentType);
        }

        // Filter out excluded models
        candidates = candidates.filter(modelId => !excludeModels.includes(modelId));

        // Filter by content length capabilities
        candidates = candidates.filter(modelId => {
            const config = this.MODELS[modelId];
            const estimatedTokens = contentLength * 1.5;
            return config.contextLength >= estimatedTokens;
        });

        // Return first candidate or fallback
        if (candidates.length > 0) {
            return candidates[0];
        }

        // Fallback to first available model not in exclude list
        const fallback = this.getAllModels().find(modelId => !excludeModels.includes(modelId));
        return fallback || this.getAllModels()[0];
    },

    /**
     * Get model display information for UI
     * @param {string} modelId - Model identifier
     * @returns {Object} Display information
     */
    getModelDisplayInfo(modelId) {
        const config = this.getModelConfig(modelId);
        if (!config) {
            return { name: 'Unknown Model', provider: 'Unknown', description: '' };
        }

        return {
            name: config.name,
            provider: config.provider,
            description: `${config.strengths.join(', ')} • ${config.contextLength.toLocaleString()} context`,
            languages: config.languages,
            strengths: config.strengths
        };
    },

    /**
     * Check if model supports language pair
     * @param {string} modelId - Model identifier
     * @param {string} sourceLanguage - Source language code
     * @param {string} targetLanguage - Target language code
     * @returns {boolean} True if supported
     */
    supportsLanguagePair(modelId, sourceLanguage, targetLanguage) {
        const config = this.getModelConfig(modelId);
        if (!config) return false;

        return config.languages.includes(sourceLanguage) &&
               config.languages.includes(targetLanguage);
    },

    /**
     * Get recommended temperature for model
     * @param {string} modelId - Model identifier
     * @param {string} taskType - Type of task ('translation', 'creative', etc.)
     * @returns {number} Recommended temperature
     */
    getRecommendedTemperature(modelId, taskType = 'translation') {
        const config = this.getModelConfig(modelId);
        if (!config) return 0.3;

        // For translation tasks, use model's default or slightly lower
        if (taskType === 'translation') {
            return config.temperature || 0.3;
        }

        // For creative tasks, increase temperature
        if (taskType === 'creative') {
            return Math.min((config.temperature || 0.3) + 0.2, 0.8);
        }

        return config.temperature || 0.3;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileModelConfig;
}