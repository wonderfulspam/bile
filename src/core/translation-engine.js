/**
 * Core Translation Engine - Runtime Agnostic
 * Advanced translation orchestration with chunking, quality validation, and context awareness
 */

// BileConstants is available globally from constants.js in userscript build  
// For Node.js usage, manually require constants.js before using this module

class BileTranslationEngine {
    constructor(apiKey, options = {}) {
        // Load API client module depending on environment
        const ApiClient = options.ApiClient || 
            (typeof require !== 'undefined' ? require('./api-client.js') : window.BileCoreApiClient);
        
        this.apiClient = new ApiClient(apiKey, options);
        this.chunkSize = options.chunkSize || 1200;
        this.maxRetries = options.maxRetries || 3;
        this.debug = options.debug || false;
        
        // Translation quality thresholds
        this.qualityThresholds = {
            minimum: 0.6,
            good: 0.8,
            excellent: 0.9
        };
    }

    /**
     * Translate structured content
     * @param {Object} content - Extracted content structure
     * @param {string} targetLang - Target language code
     * @param {Object} options - Translation options
     * @returns {Promise<Object>} Translated content
     */
    async translateContent(content, targetLang = 'en', options = {}) {
        try {
            const startTime = Date.now();
            
            if (this.debug) {
                console.log('Starting translation:', {
                    title: content.title || 'Untitled',
                    sections: content.content?.length || content.sections?.length || 0,
                    targetLang
                });
            }

            // Normalize content structure
            const normalizedContent = this._normalizeContent(content);
            
            // Check if chunking is needed
            const textLength = this._estimateTextLength(normalizedContent);
            const needsChunking = textLength > this.chunkSize;

            let result;
            if (needsChunking) {
                if (this.debug) {
                    console.log(`Content too large (${textLength} chars), using chunked translation`);
                }
                result = await this._translateInChunks(normalizedContent, targetLang, options);
            } else {
                if (this.debug) {
                    console.log(`Translating complete content (${textLength} chars)`);
                }
                result = await this.apiClient.translate(normalizedContent, targetLang, options);
            }

            const duration = Date.now() - startTime;
            
            if (this.debug) {
                console.log(`Translation completed in ${duration}ms`);
            }

            return result;

        } catch (error) {
            if (this.debug) {
                // Use local error handler if BileConstants not available
                if (typeof BileConstants !== 'undefined') {
                    BileConstants.ERROR_HANDLERS.LOG_AND_THROW('Translation', error);
                } else if (console && console.error) {
                    console.error('Translation failed:', error);
                }
            }
            throw error;
        }
    }

    /**
     * Test API connectivity
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        return await this.apiClient.testConnection();
    }

    /**
     * Translate text directly (simple interface)
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language
     * @returns {Promise<Object>} Translation result
     */
    async translateText(text, targetLang = 'en') {
        const content = {
            title: 'Text Translation',
            content: [{ type: 'paragraph', text: text }]
        };
        
        return await this.translateContent(content, targetLang);
    }

    /**
     * Normalize content structure for consistent processing
     * @private
     */
    _normalizeContent(content) {
        // Handle different input formats
        if (typeof content === 'string') {
            return {
                title: 'Text Content',
                content: [{ type: 'paragraph', text: content }]
            };
        }

        // Ensure consistent structure
        const normalized = {
            title: content.title || 'Untitled',
            content: []
        };

        // Handle different content field names (content, sections, etc.)
        const contentArray = content.content || content.sections || [];
        
        if (Array.isArray(contentArray)) {
            normalized.content = contentArray.map(section => {
                if (typeof section === 'string') {
                    return { type: 'paragraph', text: section };
                }
                return {
                    type: section.type || 'paragraph',
                    text: section.text || section.content || '',
                    ...section
                };
            });
        }

        return normalized;
    }

    /**
     * Estimate total text length for chunking decisions
     * @private
     */
    _estimateTextLength(content) {
        let total = (content.title || '').length;
        
        if (content.content && Array.isArray(content.content)) {
            total += content.content.reduce((sum, section) => {
                return sum + (section.text || section.content || '').length;
            }, 0);
        }
        
        return total;
    }

    /**
     * Translate content in chunks for large articles
     * @private
     */
    async _translateInChunks(content, targetLang, options = {}) {
        const chunks = this._splitIntoChunks(content);
        const translatedChunks = [];
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            if (this.debug) {
                console.log(`Translating chunk ${i + 1}/${chunks.length} (${this._estimateTextLength(chunk)} chars)`);
            }

            try {
                const translated = await this.apiClient.translate(chunk, targetLang, options);
                translatedChunks.push(translated);
                
                // Brief delay between chunks to be respectful to the API
                if (i < chunks.length - 1) {
                    await this._delay(500);
                }
            } catch (error) {
                if (this.debug) {
                    console.error(`Chunk ${i + 1} failed:`, error.message);
                }
                throw error;
            }
        }

        return this._mergeTranslatedChunks(translatedChunks);
    }

    /**
     * Split content into manageable chunks
     * @private
     */
    _splitIntoChunks(content) {
        const chunks = [];
        let currentChunk = {
            title: content.title,
            content: []
        };
        let currentLength = content.title.length;

        for (const section of content.content) {
            const sectionLength = (section.text || section.content || '').length;
            
            if (currentLength + sectionLength > this.chunkSize && currentChunk.content.length > 0) {
                // Start new chunk
                chunks.push(currentChunk);
                currentChunk = {
                    title: `${content.title} (part ${chunks.length + 1})`,
                    content: [section]
                };
                currentLength = currentChunk.title.length + sectionLength;
            } else {
                // Add to current chunk
                currentChunk.content.push(section);
                currentLength += sectionLength;
            }
        }

        if (currentChunk.content.length > 0) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    /**
     * Merge translated chunks back together
     * @private
     */
    _mergeTranslatedChunks(chunks) {
        if (chunks.length === 0) {
            throw new Error('No chunks to merge');
        }

        if (chunks.length === 1) {
            return chunks[0];
        }

        const merged = {
            source_language: chunks[0].source_language,
            target_language: chunks[0].target_language,
            title_original: chunks[0].title_original,
            title_translated: chunks[0].title_translated,
            content: [],
            metadata: {
                ...chunks[0].metadata,
                chunks: chunks.length,
                mergedAt: new Date().toISOString()
            }
        };

        // Combine all content sections
        for (const chunk of chunks) {
            if (chunk.content && Array.isArray(chunk.content)) {
                merged.content.push(...chunk.content);
            }
        }

        return merged;
    }

    /**
     * Translate a single text section with context
     * @param {string} text - Text to translate
     * @param {Object} context - Translation context
     * @param {string} targetLanguage - Target language
     * @returns {Promise<Object>} Translation result
     */
    async translateTextSection(text, context = {}, targetLanguage = 'en') {
        try {
            // Prepare mini-content structure
            const miniContent = {
                title: context.title || 'Text Section',
                content: [{ type: 'paragraph', text: text }],
                metadata: {
                    wordCount: text.split(/\s+/).length,
                    domain: context.domain || 'unknown'
                }
            };

            return await this.translateContent(miniContent, targetLanguage, {
                contentType: 'text-section',
                ...context
            });

        } catch (error) {
            console.error('Text section translation error:', error);
            throw error;
        }
    }

    /**
     * Assess translation quality based on various factors
     * @param {Object} translationResult - The translation result to assess
     * @returns {number} Quality score between 0 and 1
     * @private
     */
    _assessTranslationQuality(translationResult) {
        try {
            let score = 0.5; // Base score
            
            if (translationResult && translationResult.content) {
                // Check if we have actual translated content
                if (Array.isArray(translationResult.content) && translationResult.content.length > 0) {
                    score += 0.2;
                    
                    // Check for quality indicators
                    const hasTranslations = translationResult.content.some(item => 
                        item.translated && item.translated !== item.original);
                    if (hasTranslations) score += 0.2;
                    
                    // Check for slang explanations
                    const hasSlangTerms = translationResult.content.some(item => 
                        item.slang_terms && item.slang_terms.length > 0);
                    if (hasSlangTerms) score += 0.1;
                }
            }
            
            return Math.min(score, 1.0);
        } catch {
            return 0.5; // Fallback score
        }
    }

    /**
     * Track translation performance for model optimization
     * @param {string} model - Model used for translation
     * @param {Object} metrics - Performance metrics
     * @private
     */
    _trackTranslationPerformance(model, metrics) {
        if (this.debug) {
            console.log(`Translation performance for ${model}:`, metrics);
        }
        
        // In a full implementation, this would store metrics for model selection optimization
        // For now, we just log them
    }

    /**
     * Delay utility
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileTranslationEngine;
} else if (typeof window !== 'undefined') {
    window.BileTranslationEngine = BileTranslationEngine;
}