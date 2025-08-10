/**
 * content-analyzer.js - Content structure analysis for Bile
 * Analyzes extracted content for semantic structure and metadata
 */

const BileContentAnalyzer = {
    /**
     * Analyze content structure and hierarchy
     */
    analyzeContentStructure(content) {
        if (!content || !content.content) {
            return {
                structure: 'none',
                hierarchy: [],
                sections: 0,
                complexity: 'low'
            };
        }

        const elements = content.content;
        const hierarchy = this.buildHierarchy(elements);
        const sections = this.countSections(elements);
        const complexity = this.assessComplexity(elements);

        return {
            structure: this.determineStructureType(elements),
            hierarchy,
            sections,
            complexity,
            outline: this.generateOutline(elements),
            readabilityScore: this.calculateReadabilityScore(content)
        };
    },

    /**
     * Extract semantic elements with enhanced metadata
     */
    extractSemanticElements(content) {
        if (!content || !content.content) {
            return [];
        }

        return content.content.map((element, index) => {
            const enhanced = {
                ...element,
                index,
                wordCount: this.countWords(element.text),
                sentences: this.countSentences(element.text),
                readingTime: this.estimateReadingTime(element.text)
            };

            // Add type-specific metadata
            switch (element.type) {
                case 'heading':
                    enhanced.isMainHeading = this.isMainHeading(element, content.content);
                    enhanced.hasSubheadings = this.hasSubheadings(element, content.content, index);
                    break;
                case 'paragraph':
                    enhanced.isIntroduction = this.isIntroductionParagraph(index, content.content);
                    enhanced.complexity = this.assessParagraphComplexity(element.text);
                    break;
                case 'list':
                    enhanced.itemCount = this.countListItems(element.html);
                    enhanced.nested = this.hasNestedLists(element.html);
                    break;
                case 'quote':
                    enhanced.isBlockQuote = true;
                    enhanced.attribution = this.extractQuoteAttribution(element.html);
                    break;
            }

            return enhanced;
        });
    },

    /**
     * Detect language and content type with confidence scores
     */
    detectLanguageAndType(content) {
        const fullText = this.extractFullText(content);

        return {
            language: this.detectLanguageAdvanced(fullText),
            contentType: this.classifyContentType(content),
            domain: this.analyzeDomain(content.metadata?.domain),
            writingStyle: this.analyzeWritingStyle(fullText),
            topics: this.extractTopics(fullText)
        };
    },

    /**
     * Build hierarchical structure from elements
     */
    buildHierarchy(elements) {
        const hierarchy = [];
        let currentSection = null;
        let currentSubsection = null;

        elements.forEach((element, index) => {
            if (element.type === 'heading') {
                const section = {
                    level: element.level,
                    title: element.text,
                    id: element.id,
                    index,
                    children: []
                };

                if (element.level <= 2) {
                    // Main section
                    currentSection = section;
                    currentSubsection = null;
                    hierarchy.push(section);
                } else if (element.level <= 4 && currentSection) {
                    // Subsection
                    currentSubsection = section;
                    currentSection.children.push(section);
                } else if (currentSubsection) {
                    // Sub-subsection
                    currentSubsection.children.push(section);
                }
            }
        });

        return hierarchy;
    },

    /**
     * Count distinct sections in content
     */
    countSections(elements) {
        return elements.filter(element =>
            element.type === 'heading' && element.level <= 3
        ).length;
    },

    /**
     * Assess content complexity
     */
    assessComplexity(elements) {
        let score = 0;

        // Heading diversity
        const headingLevels = new Set(
            elements.filter(e => e.type === 'heading').map(e => e.level)
        );
        score += headingLevels.size * 2;

        // Content variety
        const types = new Set(elements.map(e => e.type));
        score += types.size * 3;

        // Length factor
        const totalWords = elements.reduce((total, element) =>
            total + this.countWords(element.text), 0
        );
        score += Math.min(totalWords / 100, 10);

        if (score < 5) return 'low';
        if (score < 15) return 'medium';
        return 'high';
    },

    /**
     * Determine overall structure type
     */
    determineStructureType(elements) {
        const hasHeadings = elements.some(e => e.type === 'heading');
        const hasLists = elements.some(e => e.type === 'list');
        const hasQuotes = elements.some(e => e.type === 'quote');

        const headingCount = elements.filter(e => e.type === 'heading').length;
        const paragraphCount = elements.filter(e => e.type === 'paragraph').length;

        if (!hasHeadings && paragraphCount > 3) return 'narrative';
        if (hasHeadings && headingCount >= 3) return 'structured';
        if (hasLists && !hasHeadings) return 'list-based';
        if (hasQuotes) return 'interview';
        return 'simple';
    },

    /**
     * Generate content outline
     */
    generateOutline(elements) {
        return elements
            .filter(e => e.type === 'heading')
            .map(heading => ({
                level: heading.level,
                title: heading.text,
                id: heading.id,
                anchor: `#${heading.id}`
            }));
    },

    /**
     * Calculate readability score (Flesch Reading Ease approximation)
     */
    calculateReadabilityScore(content) {
        const fullText = this.extractFullText(content);
        const sentences = this.countSentences(fullText);
        const words = this.countWords(fullText);
        const syllables = this.countSyllables(fullText);

        if (sentences === 0 || words === 0) return 0;

        const avgSentenceLength = words / sentences;
        const avgSyllablesPerWord = syllables / words;

        // Simplified Flesch Reading Ease formula
        const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

        return Math.max(0, Math.min(100, Math.round(score)));
    },

    /**
     * Advanced language detection with confidence
     */
    detectLanguageAdvanced(text) {
        const patterns = {
            'en': {
                common: /\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|have|has|had|will|would|could|should)\b/gi,
                unique: /\b(through|although|because|however|therefore|nevertheless)\b/gi
            },
            'de': {
                common: /\b(der|die|das|und|oder|aber|in|auf|an|zu|für|von|mit|bei|ist|sind|war|waren|haben|hat|hatte|wird|würde)\b/gi,
                unique: /\b(jedoch|obwohl|deshalb|trotzdem|außerdem|während|nachdem)\b/gi
            },
            'fr': {
                common: /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par|est|sont|était|étaient|avoir|a|avait|sera|serait)\b/gi,
                unique: /\b(cependant|bien que|parce que|néanmoins|donc|pendant|après)\b/gi
            },
            'es': {
                common: /\b(el|la|los|las|y|o|pero|en|sobre|a|para|de|con|por|es|son|era|eran|tener|tiene|tenía|será|sería)\b/gi,
                unique: /\b(sin embargo|aunque|porque|por lo tanto|además|mientras|después)\b/gi
            }
        };

        let maxScore = 0;
        let detectedLang = 'en';
        let confidence = 0;

        Object.entries(patterns).forEach(([lang, langPatterns]) => {
            const commonMatches = (text.match(langPatterns.common) || []).length;
            const uniqueMatches = (text.match(langPatterns.unique) || []).length;

            const score = commonMatches + (uniqueMatches * 2); // Weight unique patterns more

            if (score > maxScore) {
                maxScore = score;
                detectedLang = lang;
                confidence = Math.min(score / (this.countWords(text) * 0.1), 1);
            }
        });

        return {
            language: detectedLang,
            confidence: Math.round(confidence * 100),
            alternatives: this.getLanguageAlternatives(text, patterns, detectedLang)
        };
    },

    /**
     * Classify content type based on structure and patterns
     */
    classifyContentType(content) {
        const elements = content.content || [];
        const fullText = this.extractFullText(content);

        // News article indicators
        if (content.author && content.publishDate) {
            if (fullText.match(/\b(breaking|reported|according to|sources|investigation)\b/gi)) {
                return 'news';
            }
        }

        // Blog post indicators
        if (fullText.match(/\b(I think|my opinion|personally|in my experience)\b/gi)) {
            return 'blog';
        }

        // Academic indicators
        if (fullText.match(/\b(research|study|analysis|methodology|conclusion|references)\b/gi)) {
            return 'academic';
        }

        // Tutorial indicators
        if (fullText.match(/\b(step|tutorial|how to|guide|instructions)\b/gi)) {
            return 'tutorial';
        }

        // Opinion/editorial indicators
        if (fullText.match(/\b(opinion|editorial|commentary|argue|believe)\b/gi)) {
            return 'opinion';
        }

        return 'article'; // Default
    },

    /**
     * Analyze domain characteristics
     */
    analyzeDomain(domain) {
        if (!domain) return { type: 'unknown', reliability: 'unknown' };

        const domainPatterns = {
            news: ['bbc', 'cnn', 'reuters', 'guardian', 'nytimes', 'spiegel', 'lemonde', 'elpais'],
            blog: ['medium', 'wordpress', 'blogger', 'substack'],
            academic: ['edu', 'arxiv', 'jstor', 'pubmed'],
            government: ['gov', 'eu', 'org']
        };

        for (const [type, patterns] of Object.entries(domainPatterns)) {
            if (patterns.some(pattern => domain.includes(pattern))) {
                return {
                    type,
                    reliability: type === 'academic' ? 'high' : type === 'news' ? 'medium' : 'low'
                };
            }
        }

        return { type: 'unknown', reliability: 'unknown' };
    },

    /**
     * Analyze writing style
     */
    analyzeWritingStyle(text) {
        const sentences = this.countSentences(text);
        const words = this.countWords(text);
        const avgSentenceLength = words / sentences;

        let style = 'neutral';

        if (avgSentenceLength > 25) style = 'complex';
        else if (avgSentenceLength < 12) style = 'simple';

        // Detect formal vs informal
        const formalWords = (text.match(/\b(however|therefore|furthermore|consequently|nevertheless|moreover)\b/gi) || []).length;
        const informalWords = (text.match(/\b(yeah|gonna|wanna|pretty|really|super|awesome)\b/gi) || []).length;

        const formality = formalWords > informalWords ? 'formal' : 'informal';

        return { style, formality, avgSentenceLength: Math.round(avgSentenceLength) };
    },

    /**
     * Extract main topics using keyword frequency
     */
    extractTopics(text) {
        // Simple keyword extraction
        const textStr = typeof text === 'string' ? text : String(text || '');
        const words = textStr.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);

        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });

        // Get top 5 most frequent words as topics
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word, count]) => ({ topic: word, frequency: count }));
    },

    /**
     * Helper methods
     */
    extractFullText(content) {
        if (!content || !content.content) return '';
        return content.content.map(element => element.text).join(' ');
    },

    countWords(text) {
        return (text.match(/\b\w+\b/g) || []).length;
    },

    countSentences(text) {
        return (text.match(/[.!?]+/g) || []).length || 1;
    },

    countSyllables(text) {
        // Simplified syllable counting
        const textStr = typeof text === 'string' ? text : String(text || '');
        return textStr.toLowerCase()
            .replace(/[^a-z]/g, '')
            .replace(/[aeiouy]+/g, 'a')
            .length || 1;
    },

    estimateReadingTime(text) {
        const words = this.countWords(text);
        return Math.ceil(words / 200); // 200 words per minute
    },

    isMainHeading(element, allElements) {
        return element.level === 1 ||
               (element.level === 2 && !allElements.some(e => e.type === 'heading' && e.level === 1));
    },

    hasSubheadings(element, allElements, currentIndex) {
        return allElements.slice(currentIndex + 1).some(e =>
            e.type === 'heading' && e.level > element.level
        );
    },

    isIntroductionParagraph(index, allElements) {
        const headingIndex = allElements.findIndex(e => e.type === 'heading');
        return index < 3 && (headingIndex === -1 || index <= headingIndex + 1);
    },

    assessParagraphComplexity(text) {
        const words = this.countWords(text);
        const sentences = this.countSentences(text);
        const avgWordsPerSentence = words / sentences;

        if (avgWordsPerSentence > 20) return 'high';
        if (avgWordsPerSentence > 12) return 'medium';
        return 'low';
    },

    countListItems(html) {
        return (html.match(/<li>/gi) || []).length;
    },

    hasNestedLists(html) {
        return /<(ul|ol)[^>]*>.*<(ul|ol)[^>]*>/gi.test(html);
    },

    extractQuoteAttribution(html) {
        const attribution = html.match(/<cite[^>]*>([^<]+)<\/cite>/i);
        return attribution ? attribution[1] : null;
    },

    getLanguageAlternatives(text, patterns, excludeLang) {
        const alternatives = [];

        Object.entries(patterns).forEach(([lang, langPatterns]) => {
            if (lang === excludeLang) return;

            const score = (text.match(langPatterns.common) || []).length;
            if (score > 0) {
                alternatives.push({
                    language: lang,
                    score,
                    confidence: Math.round(score / (this.countWords(text) * 0.1) * 100)
                });
            }
        });

        return alternatives
            .sort((a, b) => b.score - a.score)
            .slice(0, 2);
    }
};

// Export for module system or global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileContentAnalyzer;
} else if (typeof window !== 'undefined') {
    window.BileContentAnalyzer = BileContentAnalyzer;
}