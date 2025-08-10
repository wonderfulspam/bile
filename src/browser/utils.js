/**
 * Bile Browser Utilities Module
 * Browser-specific helper functions for userscript environment
 */

const BileBrowserUtils = {
    // UI Selectors for common article elements (browser-specific)
    get UI_SELECTORS() {
        if (typeof window !== 'undefined' && window.BileConstants) {
            return window.BileConstants.UI_SELECTORS;
        } else if (typeof require !== 'undefined') {
            const constants = require('../config/constants.js');
            return constants.UI_SELECTORS;
        }
        // Fallback if constants are not available
        return {
            ARTICLE_CONTAINERS: ['article', '.article-content', '.post-content'],
            TITLE_SELECTORS: ['h1', '.article-title'],
            PARAGRAPH_SELECTORS: ['p']
        };
    },

    /**
     * Store error logs for debugging (browser-specific)
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
     * Enhanced logging with different levels (browser-specific with GM support)
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
     * Get browser language preference
     * @returns {string} Language code
     */
    getBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage || 'en';
        const langCode = lang.split('-')[0].toLowerCase();

        // Use core utils for language support check
        const coreUtils = window.BileCoreUtils;
        if (coreUtils && coreUtils.SUPPORTED_LANGUAGES) {
            return coreUtils.SUPPORTED_LANGUAGES[langCode] ? langCode : 'en';
        }
        // Fallback for common languages
        const supportedLangs = ['en', 'de', 'fr', 'es'];
        return supportedLangs.includes(langCode) ? langCode : 'en';
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
     * Create DOM walker for content elements
     * @param {Element} container - Container element to walk
     * @param {Array} allowedTags - Array of allowed tag names (lowercase)
     * @param {Function} elementProcessor - Function to process each found element
     * @returns {Array} Array of processed elements
     */
    walkContentElements(container, allowedTags, elementProcessor) {
        const content = [];
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    const tagName = node.tagName.toLowerCase();
                    if (allowedTags.includes(tagName)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const element = elementProcessor(node);
            if (element) {
                content.push(element);
            }
        }

        return content;
    },

    /**
     * Create common modal overlay styles
     * @param {Object} options - Style customization options
     * @returns {string} CSS text for modal overlay
     */
    getModalOverlayStyles(options = {}) {
        const {
            background = 'rgba(0, 0, 0, 0.5)',
            zIndex = '2147483647'
        } = options;

        return `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${background};
            z-index: ${zIndex};
            display: flex;
            align-items: center;
            justify-content: center;
        `;
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
            const coreUtils = window.BileCoreUtils;
            if (coreUtils && coreUtils.SUPPORTED_LANGUAGES && coreUtils.SUPPORTED_LANGUAGES[langCode]) {
                return langCode;
            }
        }

        // Check meta tag
        const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.content;
        if (metaLang) {
            const langCode = metaLang.split('-')[0].toLowerCase();
            const coreUtils = window.BileCoreUtils;
            if (coreUtils && coreUtils.SUPPORTED_LANGUAGES && coreUtils.SUPPORTED_LANGUAGES[langCode]) {
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
    module.exports = BileBrowserUtils;
} else if (typeof window !== 'undefined') {
    window.BileBrowserUtils = BileBrowserUtils;
}