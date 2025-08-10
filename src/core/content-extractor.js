/**
 * Core Content Extractor - Runtime Agnostic
 * Works with any DOM implementation (browser DOM, JSDOM, etc.)
 */

class CoreContentExtractor {
    /**
     * Main extraction function - tries multiple methods in order
     * @param {Document} document - DOM document (browser or JSDOM)
     * @param {Object} options - Extraction options
     */
    async extractArticleContent(document, options = {}) {
        try {
            const domain = options.domain || this.getDomain(document);
            let result;

            // Try site-specific extraction FIRST for better accuracy
            result = await this.siteSpecificExtract(document, domain);
            if (result && this.validateContent(result)) {
                return {
                    success: true,
                    content: result,
                    confidence: result.confidence || 0.8,
                    method: 'site-specific'
                };
            }

            // Fallback to readability-based extraction
            result = this.readabilityExtract(document);
            if (result && this.validateContent(result)) {
                return {
                    success: true,
                    content: result,
                    confidence: result.confidence || 0.6,
                    method: 'readability'
                };
            }

            // Final fallback to basic extraction
            result = this.basicExtract(document);
            return {
                success: result !== null,
                content: result,
                confidence: result ? 0.3 : 0,
                method: result ? 'basic' : 'failed'
            };

        } catch (error) {
            console.error('Content extraction failed:', error);
            return {
                success: false,
                content: null,
                confidence: 0,
                method: 'none',
                error: error.message
            };
        }
    }

    /**
     * Get domain from document (works with browser and JSDOM)
     */
    getDomain(document) {
        try {
            if (typeof window !== 'undefined' && window.location) {
                return window.location.hostname;
            }
            // For JSDOM, try to get from document URL
            if (document.URL) {
                return new URL(document.URL).hostname;
            }
            // Fallback - extract from any canonical link
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical && canonical.href) {
                return new URL(canonical.href).hostname;
            }
        } catch (error) {
            console.warn('Could not determine domain:', error);
        }
        return 'unknown';
    }

    /**
     * Site-specific extraction using predefined rules
     */
    async siteSpecificExtract(document, domain) {
        try {
            // Load site rules (browser vs Node.js)
            const siteRules = await this.loadSiteRules();
            if (siteRules) {
                return siteRules.applySiteRules(domain, document);
            }
            return null;
        } catch (error) {
            console.warn('Site-specific extraction failed:', error);
            return null;
        }
    }

    /**
     * Load site rules based on environment
     */
    async loadSiteRules() {
        if (typeof window !== 'undefined' && typeof window.BileSiteRules !== 'undefined') {
            // Browser environment
            return window.BileSiteRules;
        } else if (typeof require !== 'undefined') {
            // Node.js environment
            try {
                const { BileSiteRules } = require('./site-rules.js');
                return BileSiteRules;
            } catch (error) {
                console.warn('Could not load site rules in Node.js:', error);
                return null;
            }
        }
        return null;
    }

    /**
     * Readability-based extraction (similar to Firefox Reader Mode)
     */
    readabilityExtract(document) {
        try {
            // Find the main content area
            const candidates = this.findContentCandidates(document);
            const bestCandidate = this.selectBestCandidate(candidates);

            if (!bestCandidate) return null;

            // Clean and structure the content
            const cleanedContent = this.cleanContent(bestCandidate);
            const structuredContent = this.structureContent(cleanedContent);

            return {
                title: this.extractTitle(document),
                content: structuredContent,
                confidence: this.calculateConfidence(bestCandidate, structuredContent)
            };
        } catch (error) {
            console.warn('Readability extraction failed:', error);
            return null;
        }
    }

    /**
     * Find potential content containers
     */
    findContentCandidates(document) {
        const candidates = [];

        // Look for common article containers
        const selectors = [
            'article',
            '[role="main"]',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.content',
            'main',
            '#main-content',
            '.main-content'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el && this.isValidCandidate(el)) {
                    candidates.push({
                        element: el,
                        selector: selector,
                        score: this.scoreElement(el)
                    });
                }
            });
        });

        return candidates.sort((a, b) => b.score - a.score);
    }

    /**
     * Check if element is valid candidate
     */
    isValidCandidate(element) {
        const text = element.textContent || '';
        return text.length > 100 && // Minimum length
               !element.classList.contains('nav') &&
               !element.classList.contains('footer') &&
               !element.classList.contains('sidebar');
    }

    /**
     * Score element based on content indicators
     */
    scoreElement(element) {
        let score = 0;
        const text = element.textContent || '';

        // Length scoring
        score += Math.min(text.length / 100, 50);

        // Positive indicators
        if (element.tagName === 'ARTICLE') score += 20;
        if (element.classList.contains('article')) score += 15;
        if (element.classList.contains('post')) score += 10;
        if (element.classList.contains('content')) score += 10;

        // Negative indicators
        if (element.classList.contains('comment')) score -= 20;
        if (element.classList.contains('ad')) score -= 30;
        if (element.classList.contains('sidebar')) score -= 25;

        // Paragraph density
        const paragraphs = element.querySelectorAll('p').length;
        score += paragraphs * 2;

        return score;
    }

    /**
     * Select best candidate from scored list
     */
    selectBestCandidate(candidates) {
        return candidates.length > 0 ? candidates[0].element : null;
    }

    /**
     * Clean content by removing unwanted elements
     */
    cleanContent(element) {
        const clone = element.cloneNode(true);

        // Remove unwanted elements
        const unwanted = clone.querySelectorAll('script, style, nav, footer, .ad, .advertisement, .social-share');
        unwanted.forEach(el => el.remove());

        return clone;
    }

    /**
     * Structure content into paragraphs and sections
     */
    structureContent(element) {
        const content = [];

        // Get NodeFilter from the document's window or use fallback
        const doc = element.ownerDocument;
        const NodeFilter = doc.defaultView?.NodeFilter || {
            SHOW_ELEMENT: 0x00000001,
            FILTER_ACCEPT: 1,
            FILTER_SKIP: 3
        };

        const walker = doc.createTreeWalker(
            element,
            NodeFilter.SHOW_ELEMENT,
            node => {
                const tag = node.tagName.toLowerCase();
                return ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_SKIP;
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text) {
                const tag = node.tagName.toLowerCase();
                content.push({
                    type: tag.startsWith('h') ? 'heading' : 'paragraph',
                    level: tag.startsWith('h') ? parseInt(tag[1]) : undefined,
                    text: text
                });
            }
        }

        return content;
    }

    /**
     * Basic extraction as last resort
     */
    basicExtract(document) {
        try {
            // Try to get all paragraphs
            const paragraphs = Array.from(document.querySelectorAll('p'))
                .map(p => p.textContent.trim())
                .filter(text => text.length > 50);

            if (paragraphs.length === 0) return null;

            return {
                title: this.extractTitle(document),
                content: paragraphs.map(text => ({
                    type: 'paragraph',
                    text: text
                })),
                confidence: 0.3
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Extract title from document
     */
    extractTitle(document) {
        // Try multiple title sources
        const selectors = [
            'h1',
            '.article-title',
            '.post-title',
            '.entry-title',
            'title'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }

        return 'Untitled Article';
    }

    /**
     * Calculate extraction confidence
     */
    calculateConfidence(element, content) {
        let confidence = 0.5;

        if (element.tagName === 'ARTICLE') confidence += 0.2;
        if (content.length > 3) confidence += 0.1;
        if (content.length > 10) confidence += 0.1;

        return Math.min(confidence, 1.0);
    }

    /**
     * Validate extracted content
     */
    validateContent(result) {
        if (!result || !result.content) return false;
        if (!Array.isArray(result.content)) return false;
        if (result.content.length === 0) return false;

        // Check total text length
        const totalText = result.content
            .map(item => item.text || '')
            .join(' ');

        return totalText.length > 100;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoreContentExtractor;
} else if (typeof window !== 'undefined') {
    window.CoreContentExtractor = CoreContentExtractor;
}