/**
 * Bile Translation Engine
 * Core translation logic with context-aware processing and quality validation
 */

const BileTranslationEngine = {
    // Translation quality thresholds
    QUALITY_THRESHOLDS: {
        minimum: 0.6,
        good: 0.8,
        excellent: 0.9
    },

    // Content processing settings
    CHUNK_SIZE: 1200, // Reduced from 2500 to 1200 characters per chunk to prevent timeouts
    MAX_RETRIES: 3,

    /**
     * Translate structured content from Phase 2 extraction
     * @param {Object} extractedContent - Structured content from content extractor
     * @param {string} targetLanguage - Target language code
     * @param {Object} options - Translation options
     * @returns {Promise<Object>} Translated and structured content
     */
    async translateStructuredContent(extractedContent, targetLanguage = 'en', options = {}) {
        try {
            const startTime = Date.now();

            // Prepare translation context
            const context = this._prepareTranslationContext(extractedContent, targetLanguage, options);

            // Determine if content needs chunking
            const textContent = this._extractTextForAnalysis(extractedContent);
            const needsChunking = textContent.length > this.CHUNK_SIZE;

            let translationResult;

            if (needsChunking) {
                translationResult = await this._translateInChunks(extractedContent, context);
            } else {
                translationResult = await this._translateComplete(extractedContent, context);
            }

            // Post-process and validate
            const finalResult = await this._postProcessTranslation(translationResult, extractedContent);

            // Track performance
            const processingTime = Date.now() - startTime;
            this._trackTranslationPerformance(context.selectedModel, {
                success: true,
                processingTime,
                contentLength: textContent.length,
                quality: this._assessTranslationQuality(finalResult)
            });

            return finalResult;

        } catch (error) {
            console.error('Translation engine error:', error);

            // Track failure
            if (options.model) {
                this._trackTranslationPerformance(options.model, {
                    success: false,
                    error: error.message
                });
            }

            throw error;
        }
    },

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

            return await this.translateStructuredContent(miniContent, targetLanguage, {
                contentType: 'text-section',
                ...context
            });

        } catch (error) {
            console.error('Text section translation error:', error);
            throw error;
        }
    },

    /**
     * Detect and highlight slang terms in text
     * @param {string} text - Text to analyze
     * @param {string} language - Language of the text
     * @returns {Promise<Array>} Array of detected slang terms with positions
     */
    async detectSlangTerms(text, language = 'en') {
        // This could be enhanced with ML models or dictionaries in future phases
        const commonSlangPatterns = this._getSlangPatterns(language);
        const detectedTerms = [];

        for (const pattern of commonSlangPatterns) {
            const matches = text.match(new RegExp(pattern.regex, 'gi'));
            if (matches) {
                matches.forEach(match => {
                    detectedTerms.push({
                        term: match,
                        category: pattern.category,
                        confidence: pattern.confidence,
                        position: text.toLowerCase().indexOf(match.toLowerCase())
                    });
                });
            }
        }

        return detectedTerms.sort((a, b) => a.position - b.position);
    },

    /**
     * Generate alternative translations for ambiguous content
     * @param {string} text - Text to translate
     * @param {string} targetLanguage - Target language
     * @param {Object} options - Options including context
     * @returns {Promise<Array>} Array of alternative translations
     */
    async generateAlternativeTranslations(text, targetLanguage, options = {}) {
        // For Phase 3, focus on single best translation
        // This can be expanded in future phases for ambiguous content
        const mainTranslation = await this.translateTextSection(text, options, targetLanguage);

        return [
            {
                translation: mainTranslation,
                confidence: 0.9,
                method: 'primary',
                reasoning: 'Primary AI model translation'
            }
        ];
    },

    /**
     * Preserve formatting from original HTML in translated text
     * @param {string} originalHtml - Original HTML content
     * @param {string} translatedText - Plain translated text
     * @returns {string} HTML with translation and original formatting
     */
    preserveFormatting(originalHtml, translatedText) {
        // Basic HTML preservation - can be enhanced in future phases
        try {
            // Simple approach: preserve basic tags
            const basicTags = ['<p>', '</p>', '<br>', '<strong>', '</strong>', '<em>', '</em>'];
            let formattedTranslation = translatedText;

            // If original had paragraph breaks, try to preserve them
            if (originalHtml.includes('<p>') && !translatedText.includes('<p>')) {
                const sentences = translatedText.split(/[.!?]+\s+/);
                formattedTranslation = sentences
                    .filter(s => s.trim().length > 0)
                    .map(s => `<p>${s.trim()}${s.includes('.') ? '' : '.'}</p>`)
                    .join('\n');
            }

            return formattedTranslation;

        } catch (error) {
            console.warn('Formatting preservation failed:', error);
            return translatedText;
        }
    },

    /**
     * Validate translation quality
     * @param {Object} original - Original content
     * @param {Object} translated - Translated content
     * @param {string} language - Target language
     * @returns {boolean} True if quality is acceptable
     */
    validateTranslationQuality(original, translated, language) {
        try {
            // Basic quality checks
            const qualityScore = this._assessTranslationQuality(translated);

            if (qualityScore < this.QUALITY_THRESHOLDS.minimum) {
                return false;
            }

            // Structure validation
            if (!translated || !translated.content || !Array.isArray(translated.content)) {
                return false;
            }

            // Content completeness check
            const originalSections = original.content ? original.content.length : 1;
            const translatedSections = translated.content.length;

            if (translatedSections < originalSections * 0.8) {
                return false; // Lost too much content
            }

            // Language consistency check
            if (translated.target_language !== language) {
                return false;
            }

            return true;

        } catch (error) {
            console.warn('Quality validation error:', error);
            return false;
        }
    },

    // Private methods

    /**
     * Prepare translation context including model selection
     * @private
     */
    _prepareTranslationContext(extractedContent, targetLanguage, options) {
        // Detect source language
        const sourceLanguage = extractedContent.language ||
            BileApiClient._detectLanguage(this._extractTextForAnalysis(extractedContent));

        // Determine content type
        const contentType = this._determineContentType(extractedContent);

        // Select optimal model
        const selectedModel = options.model || BileModelManager.selectOptimalModel({
            sourceLanguage,
            targetLanguage,
            contentType,
            contentLength: this._extractTextForAnalysis(extractedContent).length
        });

        return {
            sourceLanguage,
            targetLanguage,
            contentType,
            selectedModel,
            domain: extractedContent.metadata?.domain || 'unknown',
            title: extractedContent.title || 'Untitled',
            ...options
        };
    },

    /**
     * Extract text content for analysis
     * @private
     */
    _extractTextForAnalysis(extractedContent) {
        if (typeof extractedContent === 'string') {
            return extractedContent;
        }

        if (extractedContent.content && Array.isArray(extractedContent.content)) {
            return extractedContent.content
                .map(item => item.text || '')
                .join(' ');
        }

        return JSON.stringify(extractedContent).substring(0, 1000);
    },

    /**
     * Determine content type from extracted content
     * @private
     */
    _determineContentType(extractedContent) {
        const domain = extractedContent.metadata?.domain || '';
        const title = (extractedContent.title || '').toLowerCase();

        // Domain-based detection
        if (domain.includes('github.com') || domain.includes('stackoverflow.com')) {
            return 'technical';
        }

        if (domain.includes('news') || domain.includes('bbc.com') || domain.includes('cnn.com')) {
            return 'news';
        }

        if (domain.includes('blog') || domain.includes('medium.com')) {
            return 'blog';
        }

        // Title-based detection
        if (title.includes('tutorial') || title.includes('guide') || title.includes('how to')) {
            return 'technical';
        }

        if (title.includes('opinion') || title.includes('editorial')) {
            return 'blog';
        }

        // Default fallback
        return 'blog';
    },

    /**
     * Translate content in chunks for long articles
     * @private
     */
    async _translateInChunks(extractedContent, context) {
        const chunks = this._createContentChunks(extractedContent);
        const translatedChunks = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            try {
                // Update status in UI modal if available
                if (typeof BileUI !== 'undefined' && BileUI.updateProcessingStatus) {
                    BileUI.updateProcessingStatus(`Translating chunk ${i + 1} of ${chunks.length}...`, 'Processing large article in sections');
                }
                console.log(`Translating chunk ${i + 1}/${chunks.length}...`);

                const chunkResult = await BileApiClient.translateContent(
                    this._chunkToText(chunk),
                    context.targetLanguage,
                    {
                        model: context.selectedModel,
                        context: {
                            ...context,
                            chunkIndex: i,
                            totalChunks: chunks.length
                        }
                    }
                );

                translatedChunks.push(chunkResult);

                // Small delay between chunks to respect rate limits
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                console.error(`Failed to translate chunk ${i + 1}:`, error);

                // Create fallback chunk
                translatedChunks.push({
                    source_language: context.sourceLanguage,
                    target_language: context.targetLanguage,
                    content: [{
                        type: 'error',
                        original: this._chunkToText(chunk),
                        translated: `[Translation failed for chunk ${i + 1}]`,
                        slang_terms: []
                    }]
                });
            }
        }

        // Merge chunks into single result
        return this._mergeTranslatedChunks(translatedChunks, extractedContent);
    },

    /**
     * Translate complete content in single request
     * @private
     */
    async _translateComplete(extractedContent, context) {
        const textContent = this._extractTextForAnalysis(extractedContent);

        return await BileApiClient.translateContent(textContent, context.targetLanguage, {
            model: context.selectedModel,
            context: context
        });
    },

    /**
     * Post-process translation results
     * @private
     */
    async _postProcessTranslation(translationResult, originalContent) {
        // Ensure required fields
        if (!translationResult.processing_info) {
            translationResult.processing_info = {};
        }

        // Add metadata
        translationResult.processing_info = {
            ...translationResult.processing_info,
            phase: 3,
            engine_version: '1.0',
            timestamp: new Date().toISOString(),
            original_metadata: originalContent.metadata || {}
        };

        // Validate and fix structure
        if (!translationResult.content || !Array.isArray(translationResult.content)) {
            console.warn('Invalid translation structure, creating fallback');
            translationResult.content = [{
                type: 'paragraph',
                original: this._extractTextForAnalysis(originalContent),
                translated: 'Translation structure error occurred.',
                slang_terms: []
            }];
        }

        return translationResult;
    },

    /**
     * Create content chunks for long articles
     * @private
     */
    _createContentChunks(extractedContent) {
        // Simple implementation - can be enhanced for better semantic chunking
        const text = this._extractTextForAnalysis(extractedContent);
        const chunks = [];

        for (let i = 0; i < text.length; i += this.CHUNK_SIZE) {
            chunks.push({
                text: text.substring(i, i + this.CHUNK_SIZE),
                index: chunks.length
            });
        }

        return chunks;
    },

    /**
     * Convert chunk to text for translation
     * @private
     */
    _chunkToText(chunk) {
        return chunk.text || '';
    },

    /**
     * Merge translated chunks into single result
     * @private
     */
    _mergeTranslatedChunks(translatedChunks, originalContent) {
        const firstChunk = translatedChunks[0] || {};

        return {
            source_language: firstChunk.source_language || 'en',
            target_language: firstChunk.target_language || 'en',
            title_original: originalContent.title || 'Long Article',
            title_translated: firstChunk.title_translated || originalContent.title + ' (Translated)',
            content: translatedChunks.flatMap(chunk => chunk.content || []),
            processing_info: {
                phase: 3,
                chunked: true,
                chunk_count: translatedChunks.length,
                timestamp: new Date().toISOString()
            }
        };
    },

    /**
     * Assess translation quality score
     * @private
     */
    _assessTranslationQuality(translationResult) {
        try {
            let score = 0.5; // Base score

            // Structure completeness
            if (translationResult.content && Array.isArray(translationResult.content)) {
                score += 0.2;

                // Content quality
                const hasTranslations = translationResult.content.some(item =>
                    item.translated && item.translated !== item.original
                );
                if (hasTranslations) score += 0.2;

                // Slang term detection
                const hasSlangTerms = translationResult.content.some(item =>
                    item.slang_terms && item.slang_terms.length > 0
                );
                if (hasSlangTerms) score += 0.1;
            }

            return Math.min(1, score);

        } catch {
            return 0.5;
        }
    },

    /**
     * Get slang patterns for language
     * @private
     */
    _getSlangPatterns(language) {
        const patterns = {
            'en': [
                { regex: '\\b(gonna|wanna|gotta)\\b', category: 'contraction', confidence: 0.8 },
                { regex: '\\b(dude|bro|mate)\\b', category: 'informal', confidence: 0.7 },
                { regex: '\\b(awesome|cool|sweet)\\b', category: 'informal', confidence: 0.6 }
            ],
            'de': [
                { regex: '\\b(krass|geil|hammer)\\b', category: 'slang', confidence: 0.8 },
                { regex: '\\b(digger|alter|ey)\\b', category: 'informal', confidence: 0.7 }
            ],
            'es': [
                { regex: '\\b(chévere|genial|guay)\\b', category: 'slang', confidence: 0.8 },
                { regex: '\\b(tío|chaval|pibe)\\b', category: 'informal', confidence: 0.7 }
            ]
        };

        return patterns[language] || [];
    },

    /**
     * Track translation performance
     * @private
     */
    _trackTranslationPerformance(modelId, metrics) {
        if (typeof BileModelManager !== 'undefined') {
            BileModelManager.trackAttempt(modelId, {
                success: metrics.success,
                responseTime: metrics.processingTime,
                quality: metrics.quality,
                error: metrics.error
            });
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileTranslationEngine;
}