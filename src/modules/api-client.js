/**
 * Bile API Client Module
 * Handles communication with Anthropic Claude API
 */

const BileApiClient = {
    // API Configuration
    API_BASE_URL: 'https://api.anthropic.com/v1/messages',
    API_VERSION: '2023-06-01',
    MAX_TOKENS: 4000,
    TIMEOUT_MS: 30000,

    /**
     * Test API connectivity with stored key
     * @returns {Promise<boolean>} True if API is accessible
     */
    async testApiConnection() {
        try {
            const apiKey = await BileStorage.getApiKey();
            if (!apiKey) {
                return false;
            }

            // For Phase 1: Basic key format validation
            // Phase 3 will implement actual API test call
            return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    },

    /**
     * Make API call to Claude for content translation and analysis
     * @param {string} content - The article content to process
     * @param {string} targetLang - Target language code (default: 'en')
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Processed content response
     */
    async callClaude(content, targetLang = 'en', options = {}) {
        try {
            const apiKey = await BileStorage.getApiKey();
            if (!apiKey) {
                throw new Error('No API key found. Please configure your Anthropic API key.');
            }

            // Phase 1: Return mock response for testing
            // Phase 3 will implement actual API call
            return this._createMockResponse(content, targetLang);

            // Future Phase 3 implementation:
            /*
            const prompt = this._buildPrompt(content, targetLang, options);
            const response = await this._makeApiRequest(apiKey, prompt);
            return this._parseResponse(response);
            */
            
            // Prevent unused parameter warning for Phase 1
            if (options.debug) {
                console.log('Debug mode enabled for API call');
            }
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    },

    /**
     * Create mock response for Phase 1 testing
     * @private
     */
    _createMockResponse(content, targetLang) {
        return {
            source_language: this._detectLanguage(content),
            target_language: targetLang,
            title_original: this._extractTitle(),
            title_translated: `${this._extractTitle()} (Translated)`,
            content: [{
                type: 'paragraph',
                original: content.substring(0, 200) + '...',
                translated: `[${targetLang.toUpperCase()}] ${content.substring(0, 200)}...`,
                slang_terms: [
                    {
                        term: 'example',
                        translation: 'Beispiel',
                        explanation_original: 'A sample term for demonstration',
                        explanation_translated: 'Ein Beispielterm zur Demonstration'
                    }
                ]
            }],
            processing_info: {
                timestamp: new Date().toISOString(),
                phase: 1,
                mock_data: true
            }
        };
    },

    /**
     * Basic language detection (placeholder for Phase 1)
     * @private
     */
    _detectLanguage(content) {
        const germanWords = ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine'];
        const spanishWords = ['el', 'la', 'y', 'es', 'un', 'una', 'que'];
        const frenchWords = ['le', 'la', 'et', 'est', 'un', 'une', 'que'];
        
        const lowerContent = content.toLowerCase();
        
        const germanCount = germanWords.filter(word => lowerContent.includes(` ${word} `)).length;
        const spanishCount = spanishWords.filter(word => lowerContent.includes(` ${word} `)).length;
        const frenchCount = frenchWords.filter(word => lowerContent.includes(` ${word} `)).length;
        
        if (germanCount > spanishCount && germanCount > frenchCount) return 'de';
        if (spanishCount > frenchCount) return 'es';
        if (frenchCount > 0) return 'fr';
        return 'en'; // Default to English
    },

    /**
     * Extract page title
     * @private
     */
    _extractTitle() {
        return document.title || 'Untitled Article';
    },

    /**
     * Build API prompt for Claude (Phase 3 implementation)
     * @private
     */
    _buildPrompt(content, targetLang, options = {}) {
        const systemPrompt = `You are a language learning assistant that converts web articles into bilingual learning tools.

Instructions:
1. Identify the source language of the article
2. Translate to ${targetLang} while preserving cultural context
3. Identify slang, idioms, and culturally specific terms
4. Provide brief explanations suitable for language learners
5. Return structured JSON response

Output format:
{
  "source_language": "detected_code",
  "target_language": "${targetLang}",
  "title_original": "original title",
  "title_translated": "translated title", 
  "content": [
    {
      "type": "paragraph",
      "original": "original text with <slang>marked terms</slang>",
      "translated": "translated text with <slang>preserved terms</slang>",
      "slang_terms": [
        {
          "term": "word",
          "translation": "translation",
          "explanation_original": "explanation in source language",
          "explanation_translated": "explanation in target language"
        }
      ]
    }
  ]
}`;

        return {
            model: options.model || 'claude-3-sonnet-20240229',
            max_tokens: options.maxTokens || this.MAX_TOKENS,
            messages: [{
                role: 'user',
                content: `${systemPrompt}\n\nArticle content:\n${content}`
            }]
        };
    },

    /**
     * Make actual API request (Phase 3 implementation)
     * @private
     */
    async _makeApiRequest(apiKey, prompt) {
        const response = await fetch(this.API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': this.API_VERSION
            },
            body: JSON.stringify(prompt),
            signal: AbortSignal.timeout(this.TIMEOUT_MS)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Parse API response (Phase 3 implementation)
     * @private
     */
    _parseResponse(response) {
        try {
            const content = response.content[0].text;
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to parse API response: ${error.message}`);
        }
    },

    /**
     * Handle API errors with appropriate user feedback
     * @param {Error} error - The error to handle
     */
    handleApiError(error) {
        const errorMessage = `Bile API Error: ${error.message}`;
        
        // Log for debugging
        console.error(errorMessage, error);
        
        // User-friendly error messages
        let userMessage = 'An error occurred processing the article.';
        
        if (error.message.includes('API key')) {
            userMessage = 'Please check your API key configuration.';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            userMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
            userMessage = 'API usage limit reached. Please try again later.';
        }

        // Store error for potential debugging
        this._logError(error);
        
        return userMessage;
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