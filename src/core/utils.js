/**
 * Bile Core Utilities Module
 * Environment-agnostic helper functions for CLI and browser use
 */

// Load core configuration
const BileCoreConfig = (typeof require !== 'undefined') ? require('./config.js') : null;

const BileCoreUtils = {
    // Getters for configuration values
    get SUPPORTED_LANGUAGES() {
        return BileCoreConfig ? BileCoreConfig.SUPPORTED_LANGUAGES : {
            'en': { name: 'English', flag: '🇺🇸', rtl: false },
            'de': { name: 'Deutsch', flag: '🇩🇪', rtl: false },
            'es': { name: 'Español', flag: '🇪🇸', rtl: false },
            'fr': { name: 'Français', flag: '🇫🇷', rtl: false }
        };
    },

    get API_CONFIG() {
        return BileCoreConfig ? BileCoreConfig.API : {
            BASE_URL: 'https://openrouter.ai/api/v1/chat/completions',
            TIMEOUT: 30000
        };
    },

    get FREE_MODELS() {
        return BileCoreConfig ? BileCoreConfig.FREE_MODELS : [
            'meta-llama/llama-3.1-8b-instruct:free'
        ];
    },

    get PROCESSING_CONFIG() {
        return BileCoreConfig ? BileCoreConfig.PROCESSING : {
            MAX_CONTENT_LENGTH: 50000,
            RETRY_ATTEMPTS: 3,
            TARGET_LANGUAGE_DEFAULT: 'en'
        };
    },

    /**
     * Enhanced logging with different levels (environment-agnostic)
     * @param {string} message - Log message
     * @param {string} level - Log level (debug, info, warn, error)
     * @param {Object} data - Additional data to log
     */
    debugLog(message, level = 'info', data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[Bile ${level.toUpperCase()}] ${timestamp}`;

        // Use console with appropriate method
        const consoleMethod = console[level] || console.log;
        consoleMethod(`${prefix}: ${message}`, data || '');
    },

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid URL
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    },

    /**
     * Sanitize HTML content to prevent XSS
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHtml(html) {
        if (!html || typeof html !== 'string') return '';

        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },

    /**
     * Detect language from text content using common word patterns
     * @param {string} text - Text to analyze
     * @returns {string} Detected language code
     */
    detectLanguage(text) {
        if (!text || typeof text !== 'string') return 'en';

        const patterns = {
            'en': /\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|a|an)\b/gi,
            'de': /\b(der|die|das|und|oder|aber|in|auf|an|zu|für|von|mit|bei|ist|sind)\b/gi,
            'fr': /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par|est|sont)\b/gi,
            'es': /\b(el|la|los|las|y|o|pero|en|sobre|a|para|de|con|por|es|son)\b/gi
        };

        let maxMatches = 0;
        let detectedLang = 'en';

        Object.entries(patterns).forEach(([lang, pattern]) => {
            const matches = (text.match(pattern) || []).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedLang = lang;
            }
        });

        return detectedLang;
    },

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, delay) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, delay);
            }
        };
    },

    /**
     * Get text content length in words
     * @param {string} text - Text to count
     * @returns {number} Word count
     */
    getWordCount(text) {
        if (!text || typeof text !== 'string') return 0;

        return text
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0)
            .length;
    },

    /**
     * Estimate reading time in minutes
     * @param {string} text - Text to analyze
     * @param {number} wordsPerMinute - Reading speed (default: 200)
     * @returns {number} Estimated reading time in minutes
     */
    estimateReadingTime(text, wordsPerMinute = 200) {
        const wordCount = this.getWordCount(text);
        return Math.ceil(wordCount / wordsPerMinute);
    },

    /**
     * Format file size for display
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Generate unique ID
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    generateId(prefix = 'bile') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileCoreUtils;
}