/**
 * Core API Client - Runtime Agnostic
 * Lean OpenRouter API client focused purely on API communication
 */

// Load core configuration and utilities
const BileCoreConfig = (typeof require !== 'undefined') ? require('./config.js') : null;
const BileCoreUtils = (typeof require !== 'undefined') ? require('./utils.js') : null;

class BileCoreApiClient {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        
        // Use core config or browser globals
        const apiConfig = this._getApiConfig();
        this.apiUrl = options.apiUrl || apiConfig.BASE_URL;
        this.timeout = options.timeout || apiConfig.TIMEOUT;
        this.debug = options.debug || false;
        
        // Track current model for retry logic
        this.currentModelIndex = 0;
    }

    _getApiConfig() {
        if (BileCoreConfig) {
            return BileCoreConfig.API;
        } else if (typeof BileConstants !== 'undefined') {
            return BileConstants.API;
        } else if (BileCoreUtils) {
            return BileCoreUtils.API_CONFIG;
        }
        // Fallback
        return {
            BASE_URL: 'https://openrouter.ai/api/v1/chat/completions',
            TIMEOUT: 30000
        };
    }

    static get FREE_MODELS() {
        if (BileCoreConfig) {
            return BileCoreConfig.FREE_MODELS;
        } else if (typeof BileConstants !== 'undefined') {
            return BileConstants.FREE_MODELS;
        } else if (BileCoreUtils) {
            return BileCoreUtils.FREE_MODELS;
        }
        // Fallback
        return ['meta-llama/llama-3.1-8b-instruct:free'];
    }

    /**
     * Get API key from storage if available, fallback to constructor
     */
    async _getApiKey() {
        if (typeof BileStorage !== 'undefined') {
            const storedKey = await BileStorage.getApiKey();
            return storedKey || this.apiKey;
        }
        return this.apiKey;
    }

    /**
     * Test API connectivity
     * @returns {Promise<boolean>} True if API is accessible
     */
    async testConnection() {
        try {
            const apiKey = await this._getApiKey();
            if (!apiKey || apiKey.length < 10) {
                return false;
            }

            const response = await this._makeRequest({
                model: this.constructor.FREE_MODELS[0],
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            });

            return response && !response.error;
        } catch (error) {
            if (this.debug) {
                console.error('API connection test failed:', error);
            }
            return false;
        }
    }

    /**
     * Translate content using OpenRouter API
     * @param {string|Object} content - Content to translate
     * @param {string} targetLang - Target language code
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Translation response
     */
    /**
     * Make API request with model failover
     * @param {Object} payload - API request payload
     * @param {Array} models - Models to try in order
     * @param {Object} options - Options including retry config
     * @returns {Promise<Object>} API response
     */
    async makeRequestWithFailover(payload, models = null, options = {}) {
        const modelsToTry = models || BileConstants.FREE_MODELS;
        const maxRetries = options.maxRetries || 3;
        let lastError = null;

        for (let modelIndex = 0; modelIndex < modelsToTry.length && modelIndex < maxRetries; modelIndex++) {
            try {
                const modelPayload = { ...payload, model: modelsToTry[modelIndex] };
                
                if (this.debug) {
                    console.log(`Attempting request with model: ${modelsToTry[modelIndex]} (attempt ${modelIndex + 1})`);
                }

                const response = await this._makeRequest(modelPayload);
                
                // Track successful model for future use
                this.currentModelIndex = modelIndex;
                return response;
                
            } catch (error) {
                lastError = error;
                if (this.debug) {
                    console.warn(`Model ${modelsToTry[modelIndex]} failed:`, error.message);
                }
                
                // Don't retry on auth errors
                if (error.message.includes('401') || error.message.includes('API key')) {
                    throw error;
                }
                
                continue;
            }
        }
        
        // All models failed
        throw new Error(`All ${modelsToTry.length} models failed. Last error: ${lastError?.message}`);
    }

    async translate(content, targetLang = 'en', options = {}) {
        const prompt = this._buildTranslationPrompt(content, targetLang, options);
        const startTime = Date.now();
        
        try {
            const response = await this.makeRequestWithFailover({
                messages: prompt,
                max_tokens: options.maxTokens || BileConstants.API.MAX_TOKENS,
                temperature: options.temperature || 0.3,
                stream: false
            }, options.models, options);

            if (this.debug) {
                const duration = Date.now() - startTime;
                console.log(`Translation completed in ${duration}ms`);
            }

            return this._parseResponse(response, content, targetLang);
        } catch (error) {
            const duration = Date.now() - startTime;
            if (this.debug) {
                console.error(`API Error after ${duration}ms:`, error.message);
            }
            throw error;
        }
    }

    /**
     * Make API request with timeout
     * @private
     */
    async _makeRequest(payload) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const apiKey = await this._getApiKey();
            if (!apiKey) {
                throw new Error('No API key available');
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://bile.ai',
                    'X-Title': 'Bile - Bilingual Web Converter'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error ${response.status}: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`API request timed out after ${this.timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Build translation prompt
     * @private
     */
    _buildTranslationPrompt(content, targetLang, options = {}) {
        const systemPrompt = `You are a professional translator specializing in creating bilingual learning materials. 

Your task:
1. Identify the source language of the content
2. Translate to ${targetLang} while preserving slang, idioms, and cultural terms in their original form
3. Provide brief explanations for cultural/slang terms that language learners might not understand
4. Maintain the original tone and style

Output the result as valid JSON with this structure:
${BileConstants.RESPONSE_TEMPLATES.BASIC_TRANSLATION_RESPONSE.replace('TARGET_LANG_PLACEHOLDER', targetLang)}`;

        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please translate this content:\n\n${contentStr}` }
        ];
    }

    /**
     * Parse API response
     * @private
     */
    _parseResponse(response, originalContent, targetLang) {
        if (!response.choices || !response.choices[0]) {
            throw new Error('Invalid API response: no choices');
        }

        const content = response.choices[0].message?.content;
        if (!content) {
            throw new Error('Invalid API response: no content');
        }

        try {
            const parsed = JSON.parse(content);
            
            // Validate required fields
            if (!parsed.content || !Array.isArray(parsed.content)) {
                throw new Error('Invalid response structure: missing content array');
            }

            return {
                ...parsed,
                metadata: {
                    model: this.model,
                    usage: response.usage,
                    originalLength: JSON.stringify(originalContent).length,
                    translatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            if (this.debug) {
                console.error('Response parsing error:', error);
                console.log('Raw response:', content);
            }
            
            // Fallback: return the content as-is with minimal structure
            return {
                source_language: 'unknown',
                target_language: targetLang,
                title_original: 'Unknown Title',
                title_translated: 'Unknown Title',
                content: [
                    {
                        type: 'paragraph',
                        original: typeof originalContent === 'string' ? originalContent : JSON.stringify(originalContent),
                        translated: content,
                        slang_terms: []
                    }
                ],
                metadata: {
                    model: this.model,
                    usage: response.usage,
                    parseError: error.message
                }
            };
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileCoreApiClient;
} else if (typeof window !== 'undefined') {
    window.BileCoreApiClient = BileCoreApiClient;
}