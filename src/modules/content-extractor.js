/**
 * content-extractor.js - Core content extraction engine for Bile
 * Implements readability-based algorithms and fallback methods for article extraction
 */

const BileContentExtractor = {
    /**
     * Main extraction function - tries multiple methods in order
     */
    async extractArticleContent(document) {
        try {
            // Try readability extraction first
            let result = this.readabilityExtract(document);
            
            if (result && this.validateContent(result)) {
                return {
                    success: true,
                    content: result,
                    confidence: result.confidence || 0.8,
                    method: 'readability'
                };
            }

            // Fallback to site-specific extraction
            const domain = window.location.hostname;
            result = this.siteSpecificExtract(document, domain);
            
            if (result && this.validateContent(result)) {
                return {
                    success: true,
                    content: result,
                    confidence: result.confidence || 0.6,
                    method: 'site-specific'
                };
            }

            // Last resort: basic extraction
            result = this.basicExtract(document);
            
            return {
                success: result !== null,
                content: result,
                confidence: 0.3,
                method: 'basic',
                error: result ? null : 'No suitable content found'
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
    },

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
                author: this.extractAuthor(document),
                publishDate: this.extractPublishDate(document),
                language: this.detectLanguage(cleanedContent),
                content: structuredContent,
                metadata: this.extractMetadata(document, cleanedContent),
                confidence: this.calculateConfidence(structuredContent)
            };

        } catch (error) {
            console.warn('Readability extraction failed:', error);
            return null;
        }
    },

    /**
     * Find potential content containers
     */
    findContentCandidates(document) {
        const candidates = [];
        
        // Look for common article containers
        const selectors = [
            'article',
            '[role="article"]',
            '.article',
            '.content',
            '.post',
            '.entry',
            '#content',
            '#article',
            '.story',
            'main'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const score = this.scoreElement(element);
                if (score > 0) {
                    candidates.push({ element, score, selector });
                }
            });
        });

        // If no obvious containers, look at divs with significant text content
        if (candidates.length === 0) {
            const divs = document.querySelectorAll('div');
            divs.forEach(div => {
                const score = this.scoreElement(div);
                if (score > 20) {  // Higher threshold for generic divs
                    candidates.push({ element: div, score, selector: 'div' });
                }
            });
        }

        return candidates.sort((a, b) => b.score - a.score);
    },

    /**
     * Score an element based on content quality indicators
     */
    scoreElement(element) {
        let score = 0;
        
        // Text content length
        const textContent = element.textContent || '';
        const textLength = textContent.length;
        
        if (textLength < 100) return -50;  // Too short
        
        score += Math.min(textLength / 100, 50);  // Cap at 50 points for length

        // Paragraph count
        const paragraphs = element.querySelectorAll('p');
        score += paragraphs.length * 5;

        // Heading count (moderate boost)
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        score += headings.length * 3;

        // Link density penalty (too many links = navigation)
        const links = element.querySelectorAll('a');
        const linkText = Array.from(links).reduce((total, link) => total + (link.textContent || '').length, 0);
        const linkDensity = linkText / textLength;
        if (linkDensity > 0.3) score -= 30;

        // Class/ID bonuses
        const className = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        
        if (className.includes('content') || className.includes('article') || className.includes('story')) score += 20;
        if (className.includes('sidebar') || className.includes('nav') || className.includes('menu')) score -= 20;
        if (id.includes('content') || id.includes('article') || id.includes('story')) score += 15;

        return score;
    },

    /**
     * Select the best candidate from scored elements
     */
    selectBestCandidate(candidates) {
        if (candidates.length === 0) return null;
        
        // Return the highest-scored candidate
        return candidates[0].element;
    },

    /**
     * Clean unwanted elements from content
     */
    cleanContent(element) {
        // Clone to avoid modifying original DOM
        const cleaned = element.cloneNode(true);
        
        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'noscript',
            '.advertisement', '.ad', '.ads',
            '.social', '.share', '.sharing',
            '.comments', '.comment',
            '.sidebar', '.related',
            'nav', '.navigation', '.nav',
            'header', 'footer',
            '.tags', '.categories'
        ];

        unwantedSelectors.forEach(selector => {
            const elements = cleaned.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });

        // Remove empty paragraphs
        const paragraphs = cleaned.querySelectorAll('p');
        paragraphs.forEach(p => {
            if (!p.textContent.trim()) {
                p.remove();
            }
        });

        return cleaned;
    },

    /**
     * Structure content into semantic elements
     */
    structureContent(element) {
        const content = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    const tagName = node.tagName.toLowerCase();
                    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'blockquote'].includes(tagName)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const element = this.createContentElement(node);
            if (element) {
                content.push(element);
            }
        }

        return content;
    },

    /**
     * Create a structured content element
     */
    createContentElement(node) {
        const tagName = node.tagName.toLowerCase();
        const text = node.textContent.trim();
        
        if (!text) return null;

        const element = {
            text: text,
            html: node.outerHTML
        };

        if (tagName.startsWith('h')) {
            element.type = 'heading';
            element.level = parseInt(tagName.charAt(1));
            element.id = `heading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        } else if (tagName === 'p') {
            element.type = 'paragraph';
        } else if (tagName === 'ul' || tagName === 'ol') {
            element.type = 'list';
            element.ordered = tagName === 'ol';
        } else if (tagName === 'blockquote') {
            element.type = 'quote';
        }

        return element;
    },

    /**
     * Extract article title
     */
    extractTitle(document) {
        // Try various title selectors in order of preference
        const selectors = [
            'h1',
            '.headline',
            '.title',
            '.article-title',
            '.post-title',
            '[property="og:title"]',
            'title'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const title = element.getAttribute('content') || element.textContent;
                if (title && title.trim().length > 0) {
                    return title.trim();
                }
            }
        }

        return document.title || 'Untitled Article';
    },

    /**
     * Extract author information
     */
    extractAuthor(document) {
        const selectors = [
            '[rel="author"]',
            '.author',
            '.byline',
            '.writer',
            '[property="article:author"]',
            '[name="author"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const author = element.getAttribute('content') || element.textContent;
                if (author && author.trim().length > 0) {
                    return author.trim();
                }
            }
        }

        return null;
    },

    /**
     * Extract publish date
     */
    extractPublishDate(document) {
        const selectors = [
            'time[datetime]',
            '[property="article:published_time"]',
            '.date',
            '.published',
            '.timestamp'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const dateString = element.getAttribute('datetime') || 
                                element.getAttribute('content') || 
                                element.textContent;
                if (dateString) {
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }
        }

        return null;
    },

    /**
     * Basic language detection
     */
    detectLanguage(element) {
        const text = element.textContent || '';
        
        // Simple heuristics for common languages
        const patterns = {
            'en': /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
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
     * Extract metadata
     */
    extractMetadata(document, content) {
        const textContent = content.textContent || '';
        const wordCount = textContent.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

        return {
            wordCount,
            readingTime,
            domain: window.location.hostname,
            url: window.location.href
        };
    },

    /**
     * Calculate confidence score for extracted content
     */
    calculateConfidence(content) {
        if (!content || content.length === 0) return 0;

        let score = 0.5; // Base score

        // Content length bonus
        const totalText = content.reduce((total, item) => total + (item.text || '').length, 0);
        if (totalText > 500) score += 0.2;
        if (totalText > 1500) score += 0.1;

        // Structure bonus
        const hasHeadings = content.some(item => item.type === 'heading');
        const hasParagraphs = content.some(item => item.type === 'paragraph');
        
        if (hasHeadings) score += 0.1;
        if (hasParagraphs) score += 0.1;

        // Diversity bonus
        const types = new Set(content.map(item => item.type));
        if (types.size > 1) score += 0.1;

        return Math.min(score, 1.0);
    },

    /**
     * Site-specific extraction (fallback method)
     */
    siteSpecificExtract(document, domain) {
        // This will use the site-rules configuration when available
        // For now, return null to indicate not implemented
        return null;
    },

    /**
     * Basic extraction (last resort)
     */
    basicExtract(document) {
        try {
            const title = this.extractTitle(document);
            const paragraphs = Array.from(document.querySelectorAll('p'))
                .filter(p => p.textContent.trim().length > 50)
                .slice(0, 10);

            if (paragraphs.length === 0) return null;

            const content = paragraphs.map((p, index) => ({
                type: 'paragraph',
                text: p.textContent.trim(),
                html: p.outerHTML,
                id: `paragraph-${index}`
            }));

            return {
                title,
                author: null,
                publishDate: null,
                language: this.detectLanguage(document.body),
                content,
                metadata: {
                    wordCount: content.reduce((total, p) => total + p.text.split(/\s+/).length, 0),
                    readingTime: Math.ceil(content.reduce((total, p) => total + p.text.split(/\s+/).length, 0) / 200),
                    domain: window.location.hostname,
                    url: window.location.href
                },
                confidence: 0.3
            };
        } catch (error) {
            console.warn('Basic extraction failed:', error);
            return null;
        }
    },

    /**
     * Validate extracted content quality
     */
    validateContent(content) {
        if (!content) return false;
        if (!content.content || content.content.length === 0) return false;
        if (!content.title || content.title.length < 3) return false;

        // Check minimum word count
        const wordCount = content.metadata?.wordCount || 0;
        if (wordCount < 100) return false;

        return true;
    }
};

// Export for module system or global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileContentExtractor;
} else if (typeof window !== 'undefined') {
    window.BileContentExtractor = BileContentExtractor;
}