/**
 * Bile Utilities Module
 * Shared constants, helper functions, and utilities
 */

const BileUtils = {
    // API Configuration
    API_ENDPOINTS: {
        ANTHROPIC: 'https://api.anthropic.com/v1/messages',
        ANTHROPIC_VERSION: '2023-06-01'
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

    // UI Selectors for common article elements
    UI_SELECTORS: {
        ARTICLE_CONTAINERS: [
            'article',
            '[role="article"]',
            '.article-content',
            '.article-body',
            '.post-content',
            '.entry-content',
            '.content',
            'main',
            '.story-body',
            '.article-text'
        ],

        TITLE_SELECTORS: [
            'h1',
            '.article-title',
            '.entry-title',
            '.post-title',
            '.headline',
            'title'
        ],

        IGNORE_SELECTORS: [
            'nav',
            'header:not(article header)',
            'footer:not(article footer)',
            '.sidebar',
            '.advertisement',
            '.ad',
            '.social-share',
            '.comments',
            '.related-articles',
            '.newsletter-signup'
        ]
    },

    // Configuration constants
    CONFIG: {
        MAX_CONTENT_LENGTH: 50000, // Characters
        MAX_PARAGRAPHS: 20,
        MIN_PARAGRAPH_LENGTH: 20,
        API_TIMEOUT: 30000, // 30 seconds
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000, // 1 second
        BUTTON_POSITION_DEFAULT: 'top-right',
        TARGET_LANGUAGE_DEFAULT: 'en'
    },

    /**
     * Enhanced logging with different levels
     * @param {string} message - Log message
     * @param {string} level - Log level (debug, info, warn, error)
     * @param {Object} data - Additional data to log
     */
    debugLog(message, level = 'info', data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[Bile ${level.toUpperCase()}] ${timestamp}`;

        // Use Greasemonkey logging if available
        if (typeof GM_log !== 'undefined') {
            GM_log(`${prefix}: ${message}`);
        }

        // Also use console with appropriate method
        const consoleMethod = console[level] || console.log;
        consoleMethod(`${prefix}: ${message}`, data || '');

        // Store critical errors for debugging
        if (level === 'error') {
            this._storeErrorLog(message, data);
        }
    },

    /**
     * Store error logs for debugging
     * @private
     */
    _storeErrorLog(message, data) {
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                message,
                data: data ? JSON.stringify(data) : null,
                url: window.location.href,
                userAgent: navigator.userAgent
            };

            const existingLogs = JSON.parse(localStorage.getItem('bile_debug_logs') || '[]');
            existingLogs.push(errorLog);

            // Keep only last 20 errors
            const recentLogs = existingLogs.slice(-20);
            localStorage.setItem('bile_debug_logs', JSON.stringify(recentLogs));
        } catch (error) {
            console.error('Failed to store error log:', error);
        }
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
     * Get browser language preference
     * @returns {string} Language code
     */
    getBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage || 'en';
        const langCode = lang.split('-')[0].toLowerCase();

        // Return language if supported, otherwise default to English
        return this.SUPPORTED_LANGUAGES[langCode] ? langCode : 'en';
    },

    /**
     * Detect if device is mobile
     * @returns {boolean} True if mobile device
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Get viewport dimensions
     * @returns {Object} Width and height
     */
    getViewportSize() {
        return {
            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        };
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
     * Wait for element to appear in DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Element>} Promise that resolves with element
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
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
    },

    /**
     * Check if page is likely an article
     * @returns {boolean} True if page appears to be an article
     */
    isArticlePage() {
        // Check URL patterns
        const url = window.location.href.toLowerCase();
        const articleUrlPatterns = [
            /\/article\//,
            /\/story\//,
            /\/news\//,
            /\/blog\//,
            /\/post\//,
            /\/\d{4}\/\d{2}\//, // Date patterns like /2023/12/
            /\/[a-z-]+-\d+\.html/, // Article with ID
        ];

        const hasArticleUrl = articleUrlPatterns.some(pattern => pattern.test(url));

        // Check for article-like elements
        const hasArticleElement = document.querySelector('article, [role="article"]');
        const hasMultipleParagraphs = document.querySelectorAll('p').length >= 3;
        const hasHeading = document.querySelector('h1, h2');

        // Check for known news sites
        const knownNewsSites = [
            'bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com', 'reuters.com',
            'spiegel.de', 'zeit.de', 'taz.de', 'faz.net',
            'lemonde.fr', 'lefigaro.fr', 'liberation.fr',
            'elpais.com', 'elmundo.es', 'lavanguardia.com'
        ];

        const isKnownNewsSite = knownNewsSites.some(site => url.includes(site));

        // Combine checks
        return (hasArticleUrl || hasArticleElement || isKnownNewsSite) &&
               hasMultipleParagraphs && hasHeading;
    },

    /**
     * Extract basic page metadata
     * @returns {Object} Page metadata
     */
    extractPageMetadata() {
        const title = document.title || '';
        const description = document.querySelector('meta[name="description"]')?.content || '';
        const author = document.querySelector('meta[name="author"]')?.content || '';
        const publishDate = document.querySelector('meta[property="article:published_time"]')?.content || '';
        const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;

        return {
            title,
            description,
            author,
            publishDate,
            canonical,
            url: window.location.href,
            domain: window.location.hostname,
            language: this.detectPageLanguage()
        };
    },

    /**
     * Detect page language from HTML and content
     * @returns {string} Detected language code
     */
    detectPageLanguage() {
        // Check HTML lang attribute
        const htmlLang = document.documentElement.lang;
        if (htmlLang) {
            const langCode = htmlLang.split('-')[0].toLowerCase();
            if (this.SUPPORTED_LANGUAGES[langCode]) {
                return langCode;
            }
        }

        // Check meta tag
        const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.content;
        if (metaLang) {
            const langCode = metaLang.split('-')[0].toLowerCase();
            if (this.SUPPORTED_LANGUAGES[langCode]) {
                return langCode;
            }
        }

        // Basic content-based detection (simplified for Phase 1)
        const pageText = document.body.textContent.toLowerCase().substring(0, 1000);

        const languagePatterns = {
            'de': ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'mit', 'von', 'zu'],
            'es': ['el', 'la', 'los', 'las', 'y', 'es', 'un', 'una', 'de', 'en'],
            'fr': ['le', 'la', 'les', 'et', 'est', 'un', 'une', 'de', 'du', 'pour'],
            'it': ['il', 'la', 'lo', 'gli', 'e', 'è', 'un', 'una', 'di', 'da'],
            'pt': ['o', 'a', 'os', 'as', 'e', 'é', 'um', 'uma', 'de', 'em'],
            'ru': ['и', 'в', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'это']
        };

        let bestMatch = { lang: 'en', score: 0 };

        for (const [lang, words] of Object.entries(languagePatterns)) {
            let score = 0;
            for (const word of words) {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                const matches = pageText.match(regex);
                if (matches) {
                    score += matches.length;
                }
            }

            if (score > bestMatch.score) {
                bestMatch = { lang, score };
            }
        }

        return bestMatch.score > 5 ? bestMatch.lang : 'en';
    },

    /**
     * Get debug information for troubleshooting
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            userAgent: navigator.userAgent,
            url: window.location.href,
            domain: window.location.hostname,
            language: navigator.language,
            viewport: this.getViewportSize(),
            isMobile: this.isMobileDevice(),
            hasGM: typeof GM_setValue !== 'undefined',
            timestamp: new Date().toISOString(),
            bile_version: '0.1.0-phase1'
        };
    },

    /**
     * Clear all debug logs
     */
    clearDebugLogs() {
        localStorage.removeItem('bile_debug_logs');
        this.debugLog('Debug logs cleared', 'info');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileUtils;
}