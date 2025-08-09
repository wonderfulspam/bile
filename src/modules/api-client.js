/**
 * Bile API Client Module
 * Handles communication with OpenRouter API for free AI models
 */

const BileApiClient = {
    // OpenRouter API Configuration (Updated 2024/2025 models)
    API_BASE_URL: 'https://openrouter.ai/api/v1/chat/completions',
    FREE_MODELS: [
        'moonshotai/kimi-k2:free',
        'deepseek/deepseek-r1-0528:free',
        'tngtech/deepseek-r1t2-chimera:free',
        'qwen/qwen3-235b-a22b:free',
        'microsoft/mai-ds-r1:free'
    ],
    MAX_TOKENS: 4000,
    TIMEOUT_MS: 45000,
    currentModelIndex: 0,

    /**
     * Test API connectivity with stored OpenRouter key
     * @returns {Promise<boolean>} True if API is accessible
     */
    async testApiConnection() {
        try {
            const apiKey = await BileStorage.getApiKey();
            if (!apiKey || apiKey.length < 10) {
                return false;
            }

            // Test with a minimal request to first available model
            const testResponse = await this._makeApiRequest(apiKey, {
                model: this.FREE_MODELS[0],
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            });

            return testResponse && !testResponse.error;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    },

    /**
     * Translate content using OpenRouter free models with failover
     * @param {string} content - The article content to process
     * @param {string} targetLang - Target language code (default: 'en')
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Processed content response
     */
    async translateContent(content, targetLang = 'en', options = {}) {
        const maxRetries = 5;
        let lastError = null;
        let currentModel = null;

        // Initialize model manager if available
        if (typeof BileModelManager !== 'undefined') {
            await BileModelManager.initialize();
        }

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const apiKey = await BileStorage.getApiKey();
                if (!apiKey) {
                    throw new Error('No API key found. Please configure your OpenRouter API key.');
                }

                // Use model manager for intelligent model selection
                if (attempt === 0) {
                    currentModel = options.model || this._selectOptimalModelWithManager(content, targetLang);
                } else {
                    // Get failover model
                    currentModel = this._getFailoverModel(content, targetLang, attempt);
                    if (!currentModel) {
                        throw new Error('No more models available for failover');
                    }
                }

                const prompt = this._buildTranslationPrompt(content, targetLang, { 
                    ...options,
                    model: currentModel,
                    attempt: attempt + 1
                });
                
                console.log(`Attempting translation with model: ${currentModel} (attempt ${attempt + 1}/${maxRetries})`);
                
                const startTime = Date.now();
                const response = await this._makeApiRequest(apiKey, {
                    model: currentModel,
                    messages: prompt.messages,
                    temperature: this._getModelTemperature(currentModel),
                    max_tokens: this._calculateMaxTokensForModel(content, currentModel),
                    stream: false
                });

                const responseTime = Date.now() - startTime;
                const parsedResponse = this._parseTranslationResponse(response, content, targetLang);
                
                // Validate translation quality
                if (this._validateTranslation(parsedResponse)) {
                    // Track successful translation
                    this._trackModelSuccess(currentModel, responseTime, parsedResponse);
                    
                    // Reset failover state on success
                    if (typeof BileModelManager !== 'undefined') {
                        BileModelManager.resetFailover();
                    }
                    
                    return parsedResponse;
                }
                
                throw new Error('Translation validation failed - quality below threshold');
                
            } catch (error) {
                lastError = error;
                const responseTime = Date.now() - (Date.now() - 1000); // Approximate
                
                console.warn(`Translation attempt ${attempt + 1} failed with model ${currentModel}:`, error.message);
                
                // Track model failure
                this._trackModelFailure(currentModel, error, responseTime);
                
                // Progressive backoff before retry
                if (attempt < maxRetries - 1) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
                    console.log(`Waiting ${delay}ms before retry...`);
                    await this._delay(delay);
                }
            }
        }

        // If all attempts failed, handle error appropriately
        this.handleApiError(lastError);
        throw lastError;
    },

    /**
     * Select optimal model using model manager (new approach)
     * @private
     */
    _selectOptimalModelWithManager(content, targetLang) {
        if (typeof BileModelManager !== 'undefined') {
            const sourceLanguage = this._detectLanguage(content);
            const contentType = this._determineContentType(content);
            
            return BileModelManager.selectOptimalModel({
                sourceLanguage,
                targetLanguage: targetLang,
                contentType,
                contentLength: content.length
            });
        }
        
        // Fallback to original logic if manager not available
        return this._selectOptimalModel(content, targetLang);
    },

    /**
     * Select optimal model based on content and language pair (fallback)
     * @private
     */
    _selectOptimalModel(content, targetLang) {
        const contentLength = content.length;
        
        // For Asian languages, prefer Qwen 3 or Kimi
        if (['zh', 'ja', 'ko'].includes(targetLang) || 
            ['zh', 'ja', 'ko'].includes(this._detectLanguage(content))) {
            return contentLength > 50000 ? 
                'qwen/qwen3-235b-a22b:free' : 
                'moonshotai/kimi-k2:free';
        }
        
        // For technical/analytical content, prefer DeepSeek R1
        const contentStr = typeof content === 'string' ? content : this._extractTextForAnalysis(content);
        const lowerContent = contentStr.toLowerCase();
        
        if (lowerContent.includes('analysis') || 
            lowerContent.includes('technical') ||
            lowerContent.includes('research')) {
            return 'deepseek/deepseek-r1-0528:free';
        }
        
        // For European languages, prefer Chimera or MAI-DS
        if (['de', 'fr', 'it', 'es', 'pt'].includes(targetLang)) {
            return 'tngtech/deepseek-r1t2-chimera:free';
        }
        
        // Default to MAI-DS for English and professional content
        return 'microsoft/mai-ds-r1:free';
    },

    /**
     * Get failover model for retry attempts
     * @private
     */
    _getFailoverModel(content, targetLang, attempt) {
        if (typeof BileModelManager !== 'undefined') {
            const sourceLanguage = this._detectLanguage(content);
            const contentType = this._determineContentType(content);
            
            return BileModelManager.getFailoverModel({
                sourceLanguage,
                targetLanguage: targetLang,
                contentType,
                contentLength: content.length
            });
        }
        
        // Fallback: cycle through available models
        const nextIndex = (this.currentModelIndex + attempt) % this.FREE_MODELS.length;
        return this.FREE_MODELS[nextIndex];
    },

    /**
     * Determine content type for model selection
     * @private
     */
    _determineContentType(content) {
        // Simple heuristic-based content type detection
        const contentStr = typeof content === 'string' ? content : this._extractTextForAnalysis(content);
        const lowerContent = contentStr.toLowerCase();
        
        if (lowerContent.includes('tutorial') || lowerContent.includes('documentation') || 
            lowerContent.includes('api') || lowerContent.includes('function')) {
            return 'technical';
        }
        
        if (lowerContent.includes('news') || lowerContent.includes('reported') || 
            lowerContent.includes('according to') || lowerContent.includes('statement')) {
            return 'news';
        }
        
        if (content.length > 3000) {
            return 'long-form';
        }
        
        return 'blog'; // Default
    },

    /**
     * Get model-specific temperature
     * @private
     */
    _getModelTemperature(modelId) {
        if (typeof BileModelConfig !== 'undefined') {
            return BileModelConfig.getRecommendedTemperature(modelId, 'translation');
        }
        return 0.3; // Default temperature
    },

    /**
     * Calculate max tokens for specific model
     * @private
     */
    _calculateMaxTokensForModel(content, modelId) {
        const baseTokens = this._calculateMaxTokens(content);
        
        if (typeof BileModelConfig !== 'undefined') {
            const config = BileModelConfig.getModelConfig(modelId);
            if (config) {
                return Math.min(baseTokens, config.maxTokens);
            }
        }
        
        return baseTokens;
    },

    /**
     * Track successful model performance
     * @private
     */
    _trackModelSuccess(modelId, responseTime, result) {
        if (typeof BileModelManager !== 'undefined') {
            const quality = this._assessTranslationQuality(result);
            BileModelManager.trackAttempt(modelId, {
                success: true,
                responseTime: responseTime,
                quality: quality
            });
        }
    },

    /**
     * Track model failure
     * @private
     */
    _trackModelFailure(modelId, error, responseTime) {
        if (typeof BileModelManager !== 'undefined' && modelId) {
            BileModelManager.trackAttempt(modelId, {
                success: false,
                responseTime: responseTime,
                error: error.message
            });
        }
    },

    /**
     * Assess translation quality score
     * @private
     */
    _assessTranslationQuality(result) {
        try {
            let score = 0.5; // Base score
            
            if (result && result.content && Array.isArray(result.content)) {
                score += 0.2; // Has structure
                
                const hasValidTranslations = result.content.some(item => 
                    item.translated && item.translated.length > 0 && 
                    item.translated !== item.original
                );
                
                if (hasValidTranslations) {
                    score += 0.3; // Has actual translations
                }
            }
            
            return Math.min(1.0, score);
        } catch {
            return 0.5;
        }
    },

    /**
     * Switch to next available model for failover
     * @private
     */
    _switchToNextModel() {
        this.currentModelIndex = (this.currentModelIndex + 1) % this.FREE_MODELS.length;
    },

    /**
     * Calculate appropriate max tokens based on content length
     * @private
     */
    _calculateMaxTokens(content) {
        const baseTokens = Math.min(content.length * 1.5, this.MAX_TOKENS);
        return Math.max(1000, Math.min(baseTokens, 4000));
    },

    /**
     * Add delay for backoff strategy
     * @private
     */
    async _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Extract text content for analysis from structured or unstructured content
     * @private
     */
    _extractTextForAnalysis(content) {
        if (typeof content === 'string') {
            return content;
        }
        
        if (content && typeof content === 'object') {
            // Handle structured content from Phase 2
            if (content.content && Array.isArray(content.content)) {
                return content.content
                    .map(item => item.text || item.original || '')
                    .join(' ');
            }
            
            // Handle content with title and text
            if (content.title && content.text) {
                return `${content.title} ${content.text}`;
            }
            
            // Handle content with just text
            if (content.text) {
                return content.text;
            }
            
            // Fallback: stringify the object
            return JSON.stringify(content).substring(0, 1000);
        }
        
        // Ultimate fallback
        return '';
    },

    /**
     * Enhanced language detection for Phase 3
     * @private
     */
    _detectLanguage(content) {
        const contentStr = typeof content === 'string' ? content : this._extractTextForAnalysis(content);
        const lowerContent = contentStr.toLowerCase();
        const languagePatterns = {
            'de': ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'von', 'zu', 'mit'],
            'es': ['el', 'la', 'y', 'es', 'un', 'una', 'que', 'de', 'en', 'por'],
            'fr': ['le', 'la', 'et', 'est', 'un', 'une', 'que', 'de', 'du', 'pour'],
            'it': ['il', 'la', 'e', 'è', 'un', 'una', 'che', 'di', 'in', 'per'],
            'pt': ['o', 'a', 'e', 'é', 'um', 'uma', 'que', 'de', 'em', 'por'],
            'zh': ['的', '是', '在', '有', '和', '了', '这', '那', '个', '中'],
            'ja': ['の', 'に', 'は', 'を', 'が', 'で', 'と', 'た', 'て', 'る'],
            'ko': ['이', '가', '을', '를', '의', '에', '은', '는', '와', '과']
        };

        let maxScore = 0;
        let detectedLang = 'en';
        
        for (const [lang, words] of Object.entries(languagePatterns)) {
            const score = words.filter(word => 
                lowerContent.includes(` ${word} `) || 
                lowerContent.includes(`${word} `) ||
                lowerContent.includes(` ${word}`) ||
                lowerContent.includes(word)
            ).length;
            
            if (score > maxScore) {
                maxScore = score;
                detectedLang = lang;
            }
        }
        
        return detectedLang;
    },

    /**
     * Extract page title
     * @private
     */
    _extractTitle() {
        return document.title || 'Untitled Article';
    },

    /**
     * Build translation prompt for OpenRouter models
     * @private
     */
    _buildTranslationPrompt(content, targetLang, options = {}) {
        const sourceLanguage = this._detectLanguage(content);
        const title = this._extractTitle();
        
        const systemPrompt = `You are a professional translator creating bilingual content for language learners. Convert articles into structured bilingual learning materials.

CRITICAL: Your response must be valid JSON. Do not include any text before or after the JSON structure.

Requirements:
1. Identify source language automatically
2. Translate to ${targetLang} while preserving meaning
3. Mark slang, idioms, colloquialisms with <slang> tags  
4. Provide concise explanations for cultural terms
5. Maintain content structure and tone

Output exactly this JSON structure:
{
  "source_language": "detected_code",
  "target_language": "${targetLang}",
  "title_original": "original title",
  "title_translated": "translated title",
  "content": [
    {
      "type": "paragraph",
      "original": "text with <slang>marked terms</slang>",
      "translated": "translation with <slang>terms preserved</slang>",
      "slang_terms": [
        {
          "term": "word",
          "translation": "translation", 
          "explanation_original": "brief explanation in source language",
          "explanation_translated": "brief explanation in target language"
        }
      ]
    }
  ]
}`;

        const contentStr = typeof content === 'string' ? content : this._extractTextForAnalysis(content);
        const userPrompt = `Title: ${title}

Content to translate:
${contentStr.substring(0, 3000)}${contentStr.length > 3000 ? '...' : ''}`;

        return {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        };
    },

    /**
     * Make OpenRouter API request
     * @private
     */
    async _makeApiRequest(apiKey, requestBody) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

        try {
            const response = await fetch(this.API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Bile - Bilingual Web Converter'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText}. ${errorText}`);
            }

            return await response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    },

    /**
     * Parse OpenRouter translation response
     * @private
     */
    _parseTranslationResponse(response, originalContent, targetLang) {
        try {
            if (!response || !response.choices || !response.choices[0]) {
                throw new Error('Invalid API response structure');
            }

            const messageContent = response.choices[0].message.content.trim();
            
            // Try to parse as JSON
            let parsedContent;
            try {
                parsedContent = JSON.parse(messageContent);
            } catch (jsonError) {
                // If JSON parsing fails, try to extract JSON from the response
                const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsedContent = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No valid JSON found in response');
                }
            }

            // Validate required fields
            if (!parsedContent.source_language || !parsedContent.target_language || !parsedContent.content) {
                throw new Error('Response missing required fields');
            }

            // Add metadata
            parsedContent.processing_info = {
                timestamp: new Date().toISOString(),
                model: response.model || 'unknown',
                usage: response.usage || {},
                phase: 3
            };

            return parsedContent;
        } catch (error) {
            console.error('Failed to parse translation response:', error);
            
            // Return fallback response
            return this._createFallbackResponse(originalContent, targetLang, error.message);
        }
    },

    /**
     * Create fallback response when parsing fails
     * @private
     */
    _createFallbackResponse(content, targetLang, errorMessage) {
        return {
            source_language: this._detectLanguage(content),
            target_language: targetLang,
            title_original: this._extractTitle(),
            title_translated: `${this._extractTitle()} [Translation Failed]`,
            content: [{
                type: 'error',
                original: this._extractTextForAnalysis(content).substring(0, 500) + '...',
                translated: `[Translation Error: ${errorMessage}]`,
                slang_terms: []
            }],
            processing_info: {
                timestamp: new Date().toISOString(),
                phase: 3,
                error: true,
                error_message: errorMessage
            }
        };
    },

    /**
     * Validate translation response quality
     * @private
     */
    _validateTranslation(response) {
        try {
            // Basic structure validation
            if (!response || !response.content || !Array.isArray(response.content)) {
                return false;
            }

            // Check if translation actually occurred (not just echoed)
            for (const section of response.content) {
                if (section.type === 'error') {
                    return false;
                }
                
                if (!section.original || !section.translated) {
                    return false;
                }

                // Very basic check that translation is different from original
                if (section.original === section.translated && section.original.length > 10) {
                    return false;
                }
            }

            return true;
        } catch {
            return false;
        }
    },

    /**
     * Handle OpenRouter API errors with appropriate user feedback
     * @param {Error} error - The error to handle
     */
    handleApiError(error) {
        const errorMessage = `Bile OpenRouter Error: ${error.message}`;
        
        // Log for debugging
        console.error(errorMessage, error);
        
        // OpenRouter-specific error messages
        let userMessage = 'An error occurred during translation.';
        
        if (error.message.includes('API key') || error.message.includes('401')) {
            userMessage = 'Please check your OpenRouter API key configuration.';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            userMessage = 'API rate limit reached. Trying alternative model...';
        } else if (error.message.includes('timeout') || error.name === 'AbortError') {
            userMessage = 'Translation timed out. Please try with a shorter article.';
        } else if (error.message.includes('400')) {
            userMessage = 'Invalid request format. Please try again.';
        } else if (error.message.includes('402')) {
            userMessage = 'Credit limit reached for free models.';
        } else if (error.message.includes('503') || error.message.includes('502')) {
            userMessage = 'OpenRouter service temporarily unavailable. Trying backup model...';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            userMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('JSON') || error.message.includes('parse')) {
            userMessage = 'Translation response format error. Retrying...';
        }

        // Store error for potential debugging
        this._logError(error);
        
        return userMessage;
    },

    /**
     * Get available models
     * @returns {Array} List of available free models
     */
    getAvailableModels() {
        return [...this.FREE_MODELS];
    },

    /**
     * Get current model being used
     * @returns {string} Current model ID
     */
    getCurrentModel() {
        return this.FREE_MODELS[this.currentModelIndex];
    },

    /**
     * Log error details for debugging
     * @private
     */
    _logError(error) {
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                url: window.location.href
            };
            
            // Store in temporary local storage (will be cleared on page reload)
            const existingLogs = JSON.parse(localStorage.getItem('bile_error_logs') || '[]');
            existingLogs.push(errorLog);
            
            // Keep only last 10 errors
            const recentLogs = existingLogs.slice(-10);
            localStorage.setItem('bile_error_logs', JSON.stringify(recentLogs));
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
    },

    /**
     * Get recent error logs for debugging
     * @returns {Array} Recent error logs
     */
    getErrorLogs() {
        try {
            return JSON.parse(localStorage.getItem('bile_error_logs') || '[]');
        } catch {
            return [];
        }
    },

    /**
     * Clear error logs
     */
    clearErrorLogs() {
        localStorage.removeItem('bile_error_logs');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileApiClient;
}