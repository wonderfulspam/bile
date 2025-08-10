/**
 * site-rules.js - Site-specific extraction rules for Bile
 * Provides fallback extraction methods for major news sites and blogs
 */

const BILE_SITE_RULES = {
    // German news sites
    'taz.de': {
        selectors: {
            title: 'h1, .typo-r-head-meinung-detail, .typo-r-topline-detail',
            author: '.author-name, .column-author-profile .name, [data-val="author"]',
            date: '.date, time[datetime], .datum',
            // Ultra-specific: target only the article content div, exclude comments
            content: '.main-article-corpus > .columns.is-multiline p.typo-bodytext, .main-article-corpus > .columns.is-multiline h2.typo-head-small',
            remove: [
                '.webelement_adzone', '.advertisement', '.anzeige',
                '.webelement_citation', '.citation',
                '.shariff', '.shariff-wrapper', '.teilen',
                '.social-media', '.social-media-title',
                '.author-container', '.author-bio',
                '.tzi-bottom-container', // TAZ subscription box
                '.comments-list', '.comments-container', '.kommune', // Comments sections
                'ul.comments-list' // Specifically exclude comments list
            ]
        },
        confidence: 0.98
    },

    'spiegel.de': {
        selectors: {
            title: '.headline, h1',
            author: '.article-byline .author',
            date: '.article-byline time',
            content: '.article-section, .content-element',
            remove: ['.advertisement', '.teaser-list', '.social-bar']
        },
        confidence: 0.85
    },

    'zeit.de': {
        selectors: {
            title: '.article-header__title, h1',
            author: '.metadata__author',
            date: '.metadata__date',
            content: '.article-body, .paragraph',
            remove: ['.ad-container', '.teaser-row', '.social-media']
        },
        confidence: 0.8
    },

    'sueddeutsche.de': {
        selectors: {
            title: '.article-title, h1',
            author: '.author',
            date: '.timeformat',
            content: '.article-body, .content',
            remove: ['.advertisement', '.socialbar', '.teaser']
        },
        confidence: 0.75
    },

    // French news sites
    'lemonde.fr': {
        selectors: {
            title: '.article__title, h1',
            author: '.article__author',
            date: '.article__date',
            content: '.article__content, .article__paragraph',
            remove: ['.inread', '.services', '.aside']
        },
        confidence: 0.8
    },

    'lefigaro.fr': {
        selectors: {
            title: '.fig-headline, h1',
            author: '.fig-author',
            date: '.fig-date',
            content: '.fig-content, .fig-content-body',
            remove: ['.fig-premium', '.fig-related', '.fig-ad']
        },
        confidence: 0.75
    },

    'liberation.fr': {
        selectors: {
            title: '.article-title, h1',
            author: '.article-author',
            date: '.article-date',
            content: '.article-body, .article-paragraph',
            remove: ['.pub', '.related', '.share']
        },
        confidence: 0.7
    },

    // Spanish news sites
    'elpais.com': {
        selectors: {
            title: '.articulo-titulo, h1',
            author: '.autor-nombre',
            date: '.articulo-fecha',
            content: '.articulo-cuerpo, .articulo-parrafo',
            remove: ['.publicidad', '.relacionado', '.social']
        },
        confidence: 0.8
    },

    'elmundo.es': {
        selectors: {
            title: '.ue-c-article__headline, h1',
            author: '.ue-c-article__byline-name',
            date: '.ue-c-article__byline-date',
            content: '.ue-c-article__body, .ue-c-article__paragraph',
            remove: ['.ue-c-ad', '.ue-c-related', '.ue-c-share']
        },
        confidence: 0.75
    },

    'abc.es': {
        selectors: {
            title: '.titular, h1',
            author: '.autor',
            date: '.fecha',
            content: '.cuerpo, .parrafo',
            remove: ['.publicidad', '.relacionadas', '.compartir']
        },
        confidence: 0.7
    },

    // English news sites
    'bbc.com': {
        selectors: {
            title: '.gel-trafalgar-bold, h1',
            author: '.byline__name',
            date: '.date',
            content: '.story-body, .gel-body-copy',
            remove: ['.bbccom__ad', '.story-more', '.social-embed']
        },
        confidence: 0.9
    },

    'theguardian.com': {
        selectors: {
            title: '.content__headline, h1',
            author: '.byline',
            date: '.content__dateline',
            content: '.content__article-body, .element-rich-text',
            remove: ['.ad-slot', '.submeta', '.element-rich-link']
        },
        confidence: 0.85
    },

    'nytimes.com': {
        selectors: {
            title: '.css-fwqvlz, h1',
            author: '.css-1baulvz',
            date: '.css-1hfnkoc',
            content: '.StoryBodyCompanionColumn, .css-53u6y8',
            remove: ['.css-ad', '.related-coverage', '.css-share']
        },
        confidence: 0.8
    },

    // Blog platforms
    'medium.com': {
        selectors: {
            title: 'h1',
            author: '[data-testid="authorName"]',
            date: '[data-testid="storyPublishDate"]',
            content: 'article section, .section-content',
            remove: ['.sidebar', '.related-stories', '.social-share']
        },
        confidence: 0.75
    },

    'substack.com': {
        selectors: {
            title: '.post-title, h1',
            author: '.byline-names',
            date: '.post-date',
            content: '.available-content, .post-content',
            remove: ['.subscribe-widget', '.related-posts', '.share-buttons']
        },
        confidence: 0.8
    },

    // Generic WordPress
    'wordpress.com': {
        selectors: {
            title: '.entry-title, h1',
            author: '.author',
            date: '.entry-date',
            content: '.entry-content, .post-content',
            remove: ['.sidebar', '.related', '.share']
        },
        confidence: 0.6
    }
};

const BileSiteRules = {
    /**
     * Apply site-specific extraction rules
     */
    applySiteRules(domain, document) {
        const rules = this.getRulesForDomain(domain);
        console.log('Rules found for domain', domain, ':', rules ? 'yes' : 'no');
        if (!rules) return null;

        try {
            const content = this.extractWithRules(document, rules);
            console.log('Extracted content:', content ? 'success' : 'failed');
            if (content) {
                console.log('Content sections:', content.content?.length || 0);
                console.log('Content validation result:', this.validateExtractedContent(content));
            }

            if (content && this.validateExtractedContent(content)) {
                content.confidence = rules.confidence;
                return content;
            }
        } catch (error) {
            console.warn(`Site-specific extraction failed for ${domain}:`, error);
        }

        return null;
    },

    /**
     * Get extraction rules for a specific domain
     */
    getRulesForDomain(domain) {
        // Check for exact match first
        if (BILE_SITE_RULES[domain]) {
            return BILE_SITE_RULES[domain];
        }

        // Check for subdomain matches
        for (const [siteDomain, rules] of Object.entries(BILE_SITE_RULES)) {
            if (domain.includes(siteDomain)) {
                return rules;
            }
        }

        return null;
    },

    /**
     * Extract content using site-specific rules
     */
    extractWithRules(document, rules) {
        // Remove unwanted elements first
        if (rules.remove) {
            rules.remove.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
        }

        // Extract title
        const title = this.extractWithSelector(document, rules.selectors.title) ||
                     document.title || 'Untitled';

        // Extract author
        const author = this.extractWithSelector(document, rules.selectors.author);

        // Extract date
        const publishDate = this.extractDate(document, rules.selectors.date);

        // Extract main content
        const contentElement = this.extractContentElement(document, rules.selectors.content);
        if (!contentElement) return null;

        // Structure the content
        const structuredContent = this.structureExtractedContent(contentElement);

        // Detect language
        let BileUtils = null;
        if (typeof require !== 'undefined') {
            BileUtils = require('./utils.js');
        } else if (typeof window !== 'undefined' && window.BileCoreUtils) {
            BileUtils = window.BileCoreUtils;
        }
        const language = BileUtils ? BileUtils.detectLanguage(contentElement.textContent || '') : 'auto';

        // Generate metadata
        const metadata = this.generateMetadata(contentElement);

        return {
            title: title.trim(),
            author: author ? author.trim() : null,
            publishDate,
            language,
            content: structuredContent,
            metadata,
            extractionMethod: 'site-specific',
            confidence: rules.confidence || 0.8
        };
    },

    /**
     * Extract text using CSS selector
     */
    extractWithSelector(document, selector) {
        if (!selector) return null;

        const selectors = selector.split(', ');
        for (const sel of selectors) {
            const element = document.querySelector(sel);
            if (element) {
                return element.getAttribute('content') ||
                       element.getAttribute('datetime') ||
                       element.textContent;
            }
        }
        return null;
    },

    /**
     * Extract and parse date
     */
    extractDate(document, selector) {
        const dateString = this.extractWithSelector(document, selector);
        if (!dateString) return null;

        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    },

    /**
     * Extract main content element
     */
    extractContentElement(document, selector) {
        if (!selector) return null;

        const selectors = selector.split(', ');
        for (const sel of selectors) {
            const elements = document.querySelectorAll(sel);
            if (elements.length > 0) {
                // Limit to reasonable number of elements to prevent extracting entire site
                const limitedElements = Array.from(elements).slice(0, 20); // Limit to first 20 elements

                if (limitedElements.length === 1) {
                    return limitedElements[0];
                } else {
                    // Create a container for multiple content elements
                    const container = document.createElement('div');
                    limitedElements.forEach(el => container.appendChild(el.cloneNode(true)));
                    return container;
                }
            }
        }
        return null;
    },

    /**
     * Structure extracted content into semantic elements
     */
    structureExtractedContent(contentElement) {
        const allowedTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'blockquote', 'img'];

        // Get BileUtils reference
        let BileUtils = null;
        if (typeof require !== 'undefined') {
            BileUtils = require('./utils.js');
        } else if (typeof window !== 'undefined' && window.BileCoreUtils) {
            BileUtils = window.BileCoreUtils;
        }

        if (!BileUtils) {
            // Fallback: simple text extraction
            return [{
                type: 'paragraph',
                content: contentElement.textContent.trim(),
                wordCount: contentElement.textContent.split(/\s+/).length
            }];
        }

        return BileUtils.walkContentElements(contentElement, allowedTags, (node) => {
            return this.createContentElement(node);
        });
    },

    /**
     * Create structured content element
     */
    createContentElement(node) {
        const tagName = node.tagName.toLowerCase();
        const text = node.textContent.trim();

        if (!text && tagName !== 'img') return null;

        const element = {
            text: text,
            html: node.outerHTML
        };

        switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                element.type = 'heading';
                element.level = parseInt(tagName.charAt(1));
                element.id = `heading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                break;
            case 'p':
                element.type = 'paragraph';
                break;
            case 'ul':
            case 'ol':
                element.type = 'list';
                element.ordered = tagName === 'ol';
                break;
            case 'blockquote':
                element.type = 'quote';
                break;
            case 'img':
                element.type = 'image';
                element.src = node.src;
                element.alt = node.alt || '';
                element.text = element.alt; // Use alt text as text content
                break;
            default:
                element.type = 'paragraph'; // Default fallback
        }

        return element;
    },

    /**
     * Generate metadata for extracted content
     */
    generateMetadata(contentElement) {
        const text = contentElement.textContent || '';
        const wordCount = (text.match(/\b\w+\b/g) || []).length;
        const readingTime = Math.ceil(wordCount / 200);

        return {
            wordCount,
            readingTime,
            domain: (typeof window !== 'undefined') ? window.location.hostname : 'unknown',
            url: (typeof window !== 'undefined') ? window.location.href : 'unknown',
            extractedAt: new Date()
        };
    },

    /**
     * Validate extracted content quality
     */
    validateExtractedContent(content) {
        if (!content) return false;
        if (!content.title || content.title.length < 3) return false;
        if (!content.content || content.content.length === 0) return false;

        // Reject if too many sections (likely extracted too much)
        if (content.content.length > 50) {
            console.warn('Extracted content has too many sections:', content.content.length);
            return false;
        }

        // Check minimum word count but not too much
        const wordCount = content.metadata?.wordCount || 0;
        if (wordCount < 100 || wordCount > 15000) {
            console.warn('Content word count out of reasonable range:', wordCount);
            return false;
        }

        // Check for reasonable content structure
        const hasText = content.content.some(element =>
            element.type === 'paragraph' && element.text.length > 50
        );

        return hasText;
    },

    /**
     * Get list of supported domains
     */
    getSupportedDomains() {
        return Object.keys(BILE_SITE_RULES);
    },

    /**
     * Check if domain is supported
     */
    isDomainSupported(domain) {
        return this.getRulesForDomain(domain) !== null;
    },

    /**
     * Add custom rules for a domain
     */
    addCustomRules(domain, rules) {
        BILE_SITE_RULES[domain] = {
            ...rules,
            confidence: rules.confidence || 0.5
        };
    },

    /**
     * Get extraction confidence for a domain
     */
    getConfidenceForDomain(domain) {
        const rules = this.getRulesForDomain(domain);
        return rules ? rules.confidence : 0;
    }
};

// Export for module system or global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BileSiteRules, BILE_SITE_RULES };
} else if (typeof window !== 'undefined') {
    window.BileSiteRules = BileSiteRules;
    window.BILE_SITE_RULES = BILE_SITE_RULES;
}