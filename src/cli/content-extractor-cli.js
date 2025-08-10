/**
 * CLI Content Extractor - JSDOM wrapper for Node.js
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const CoreContentExtractor = require('../core/content-extractor.js');

class CliContentExtractor extends CoreContentExtractor {
    /**
     * Extract content from HTML file or string
     * @param {string} htmlInput - File path or HTML string
     * @param {Object} options - Extraction options
     */
    async extractFromHtml(htmlInput, options = {}) {
        let html;
        let url = options.url;

        // Determine if input is file path or HTML string
        if (this.isFilePath(htmlInput)) {
            html = fs.readFileSync(htmlInput, 'utf8');
            // Try to extract URL from HTML if not provided
            if (!url) {
                url = this.extractUrlFromHtml(html);
            }
        } else {
            html = htmlInput;
        }

        // Create JSDOM instance
        const dom = new JSDOM(html, {
            url: url || 'http://localhost/',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        const document = dom.window.document;

        // Add NodeFilter polyfill for JSDOM
        if (!dom.window.NodeFilter) {
            dom.window.NodeFilter = {
                SHOW_ALL: 0xFFFFFFFF,
                SHOW_ELEMENT: 0x00000001,
                FILTER_ACCEPT: 1,
                FILTER_REJECT: 2,
                FILTER_SKIP: 3
            };
        }

        // Add domain to options for site-specific extraction
        if (url && !options.domain) {
            try {
                options.domain = new URL(url).hostname;
            } catch (error) {
                console.warn('Could not parse URL for domain:', error);
            }
        }

        // Use core extraction logic
        return await this.extractArticleContent(document, options);
    }

    /**
     * Check if input looks like a file path
     */
    isFilePath(input) {
        return input.includes('/') || input.includes('\\') || input.endsWith('.html');
    }

    /**
     * Try to extract URL from HTML meta tags or canonical link
     */
    extractUrlFromHtml(html) {
        try {
            // Quick regex to find canonical URL
            const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
            if (canonicalMatch) {
                return canonicalMatch[1];
            }

            // Try og:url
            const ogUrlMatch = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
            if (ogUrlMatch) {
                return ogUrlMatch[1];
            }
        } catch (error) {
            console.warn('Could not extract URL from HTML:', error);
        }
        return null;
    }

    /**
     * Static method for easy usage
     */
    static async extractFromFile(filePath, options = {}) {
        const extractor = new CliContentExtractor();
        return await extractor.extractFromHtml(filePath, options);
    }

    /**
     * Static method for HTML string
     */
    static async extractFromString(html, options = {}) {
        const extractor = new CliContentExtractor();
        return await extractor.extractFromHtml(html, options);
    }
}

module.exports = CliContentExtractor;