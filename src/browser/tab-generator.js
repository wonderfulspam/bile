/**
 * Bile Tab Generator Module
 * Handles creation of the bilingual HTML output and new tab management
 */

const BileTabGenerator = {
    /**
     * Generate complete HTML for the bilingual article
     * @param {Object} content - Processed content from API
     * @returns {string} Complete HTML document
     */
    generateBasicHtml(content) {
        // Check if this is structured content from Phase 2
        if (this._isStructuredContent(content)) {
            return this.generateStructuredHtml(content);
        }

        // Fallback to Phase 1 format for backward compatibility
        const timestamp = new Date().toLocaleString();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bile - ${this._sanitizeTitle(content.title_original)}</title>
    <style>
        ${this._getInlineCSS()}
    </style>
</head>
<body>
    <div class="bile-container">
        ${this._generateHeader(content, timestamp)}
        ${this._generateLanguageToggle(content)}
        ${this._generateContent(content)}
        ${this._generateFooter()}
    </div>

    <script>
        ${this._getInlineJavaScript()}
    </script>
</body>
</html>`;
    },

    /**
     * Generate HTML with preserved structure for Phase 2 content
     * @param {Object} content - Structured content from Phase 2
     * @returns {string} Complete HTML document
     */
    generateStructuredHtml(content) {
        const timestamp = new Date().toLocaleString();
        const tableOfContents = this._generateTableOfContents(content);

        return `<!DOCTYPE html>
<html lang="${content.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bile - ${this._sanitizeTitle(content.title)}</title>
    <style>
        ${this._getEnhancedCSS()}
    </style>
</head>
<body>
    <div class="bile-container">
        ${this._generateStructuredHeader(content, timestamp)}
        ${this._generateLanguageToggle(content)}
        ${tableOfContents}
        ${this._generateStructuredContent(content)}
        ${this._generateFooter()}
    </div>

    <script>
        ${this._getEnhancedJavaScript()}
    </script>
</body>
</html>`;
    },

    /**
     * Check if content is structured (Phase 2) format
     * @private
     */
    _isStructuredContent(content) {
        return content &&
               content.content &&
               Array.isArray(content.content) &&
               content.content.some(item => item.type && item.text);
    },

    /**
     * Generate structured header with enhanced metadata
     * @private
     */
    _generateStructuredHeader(content, timestamp) {
        const wordCount = content.metadata?.wordCount || 0;
        const readingTime = content.metadata?.readingTime || 0;
        const confidence = Math.round((content.confidence || 0) * 100);

        return `
        <header class="bile-header enhanced">
            <div class="bile-brand">
                <h1>🌐 Bile</h1>
                <p class="subtitle">Bilingual Web Page Converter</p>
            </div>
            <div class="bile-meta">
                <div class="language-info">
                    <span class="lang-badge source">${(content.language || 'unknown').toUpperCase()}</span>
                    <span class="arrow">→</span>
                    <span class="lang-badge target">EN</span>
                </div>
                <div class="content-stats">
                    <div class="stat">
                        <span class="stat-value">${wordCount}</span>
                        <span class="stat-label">words</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${readingTime}</span>
                        <span class="stat-label">min read</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${confidence}%</span>
                        <span class="stat-label">confidence</span>
                    </div>
                </div>
                <div class="processed-time">Processed: ${timestamp}</div>
                <div class="phase-badge">Phase 2 - Advanced Extraction</div>
            </div>
        </header>`;
    },

    /**
     * Generate table of contents for long articles
     * @private
     */
    _generateTableOfContents(content) {
        if (!content.content) return '';

        const headings = content.content.filter(item => item.type === 'heading' && item.level <= 3);

        if (headings.length < 2) return '';

        return `
        <nav class="table-of-contents">
            <h3>📋 Table of Contents</h3>
            <ul class="toc-list">
                ${headings.map(heading => `
                    <li class="toc-item level-${heading.level}">
                        <a href="#${heading.id}" onclick="bile.scrollToHeading('${heading.id}')">${this._sanitizeHtml(heading.text)}</a>
                    </li>
                `).join('')}
            </ul>
        </nav>`;
    },

    /**
     * Generate structured content with semantic elements
     * @private
     */
    _generateStructuredContent(content) {
        return `
        <main class="bile-content structured">
            <div id="original-content" class="content-view active">
                <article class="article-content">
                    <header class="article-header">
                        <h1 class="article-title">${this._sanitizeHtml(content.title)}</h1>
                        ${this._generateArticleMeta(content)}
                    </header>
                    <div class="article-body">
                        ${this._generateStructuredElements(content.content, 'original')}
                    </div>
                </article>
            </div>

            <div id="translated-content" class="content-view">
                <article class="article-content">
                    <header class="article-header">
                        <h1 class="article-title">${this._sanitizeHtml(content.title)} (Translated)</h1>
                        ${this._generateArticleMeta(content, true)}
                    </header>
                    <div class="article-body">
                        ${this._generateStructuredElements(content.content, 'translated')}
                    </div>
                </article>
            </div>
        </main>`;
    },

    /**
     * Generate article metadata section
     * @private
     */
    _generateArticleMeta(content, isTranslated = false) {
        if (!content.author && !content.publishDate) return '';

        return `
        <div class="article-meta">
            ${content.author ? `<span class="author">By ${this._sanitizeHtml(content.author)}</span>` : ''}
            ${content.publishDate ? `<span class="publish-date">${new Date(content.publishDate).toLocaleDateString()}</span>` : ''}
            ${isTranslated ? '<span class="translated-badge">Translated</span>' : ''}
        </div>`;
    },

    /**
     * Generate structured content elements
     * @private
     */
    _generateStructuredElements(elements, version) {
        if (!elements || !Array.isArray(elements)) return '';

        return elements.map((element, index) => {
            switch (element.type) {
                case 'heading':
                    return this._generateHeadingElement(element, version);
                case 'paragraph':
                    return this._generateParagraphElement(element, version, index);
                case 'list':
                    return this._generateListElement(element, version);
                case 'quote':
                    return this._generateQuoteElement(element, version);
                case 'image':
                    return this._generateImageElement(element, version);
                default:
                    return this._generateParagraphElement(element, version, index);
            }
        }).join('');
    },

    /**
     * Generate heading element
     * @private
     */
    _generateHeadingElement(element, version) {
        const level = Math.min(Math.max(element.level || 2, 1), 6);
        const id = version === 'original' ? element.id : `${element.id}-translated`;
        const text = version === 'original' ? element.text : element.translated || element.text;

        return `<h${level} id="${id}" class="content-heading level-${level}">
            ${this._sanitizeHtml(text)}
        </h${level}>`;
    },

    /**
     * Generate paragraph element
     * @private
     */
    _generateParagraphElement(element, version, index) {
        const text = version === 'original' ? element.text : element.translated || element.text;

        return `<div class="content-paragraph" data-element-index="${index}">
            <p>${this._sanitizeHtml(text)}</p>
        </div>`;
    },

    /**
     * Generate list element
     * @private
     */
    _generateListElement(element, version) {
        const text = version === 'original' ? element.text : element.translated || element.text;
        const tag = element.ordered ? 'ol' : 'ul';
        const listClass = element.ordered ? 'ordered-list' : 'unordered-list';

        // Try to parse the text as list items
        const items = text.split('\n').filter(item => item.trim());

        return `<div class="content-list">
            <${tag} class="${listClass}">
                ${items.map(item => `<li>${this._sanitizeHtml(item.replace(/^[-*•]\s*/, ''))}</li>`).join('')}
            </${tag}>
        </div>`;
    },

    /**
     * Generate quote element
     * @private
     */
    _generateQuoteElement(element, version) {
        const text = version === 'original' ? element.text : element.translated || element.text;

        return `<blockquote class="content-quote">
            <p>${this._sanitizeHtml(text)}</p>
        </blockquote>`;
    },

    /**
     * Generate image element
     * @private
     */
    _generateImageElement(element, version) {
        if (!element.src) return '';

        const alt = version === 'original' ? element.alt : element.translatedAlt || element.alt;

        return `<figure class="content-image">
            <img src="${this._sanitizeHtml(element.src)}" alt="${this._sanitizeHtml(alt || '')}" loading="lazy">
            ${alt ? `<figcaption>${this._sanitizeHtml(alt)}</figcaption>` : ''}
        </figure>`;
    },

    /**
     * Apply content-aware styling
     * @param {Object} content - The structured content
     * @returns {string} Additional CSS styles
     */
    applyContentStyling(content) {
        // This could be expanded based on content analysis
        // For now, return basic responsive styles
        return `
        /* Content-specific styles */
        .article-body {
            font-size: ${this._getOptimalFontSize(content)};
            line-height: ${this._getOptimalLineHeight(content)};
        }

        .content-heading {
            margin-top: ${this._getHeadingSpacing(content)};
        }`;
    },

    /**
     * Get enhanced CSS with Phase 2 improvements
     * @private
     */
    _getEnhancedCSS() {
        return this._getInlineCSS() + `

        /* Phase 2 Enhanced Styles */
        .bile-header.enhanced {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            padding: 2.5rem 2rem;
        }

        .content-stats {
            display: flex;
            gap: 1.5rem;
            margin: 1rem 0;
            flex-wrap: wrap;
            justify-content: center;
        }

        .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(255, 255, 255, 0.1);
            padding: 0.75rem 1rem;
            border-radius: 8px;
            min-width: 60px;
        }

        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            line-height: 1;
        }

        .stat-label {
            font-size: 0.75rem;
            opacity: 0.8;
            margin-top: 0.25rem;
        }

        .table-of-contents {
            background: #f8f9fa;
            margin: 0;
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
        }

        .table-of-contents h3 {
            margin: 0 0 1rem 0;
            color: #2d3748;
            font-size: 1.1rem;
        }

        .toc-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .toc-item {
            margin-bottom: 0.5rem;
        }

        .toc-item.level-1 { padding-left: 0; }
        .toc-item.level-2 { padding-left: 1rem; }
        .toc-item.level-3 { padding-left: 2rem; }

        .toc-item a {
            color: #667eea;
            text-decoration: none;
            font-size: 0.95rem;
            transition: color 0.2s;
        }

        .toc-item a:hover {
            color: #764ba2;
            text-decoration: underline;
        }

        .bile-content.structured {
            padding: 2.5rem;
        }

        .article-header {
            margin-bottom: 2rem;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 1.5rem;
        }

        .article-meta {
            display: flex;
            gap: 1rem;
            align-items: center;
            margin-top: 1rem;
            font-size: 0.9rem;
            color: #666;
            flex-wrap: wrap;
        }

        .article-meta .author {
            font-weight: 500;
        }

        .translated-badge {
            background: #e3f2fd;
            color: #1976d2;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .content-heading {
            color: #2d3748;
            margin: 2rem 0 1rem 0;
            font-weight: 600;
            line-height: 1.3;
        }

        .content-heading.level-1 {
            font-size: 2rem;
            margin-top: 2.5rem;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 0.5rem;
        }
        .content-heading.level-2 {
            font-size: 1.5rem;
            margin-top: 2rem;
        }
        .content-heading.level-3 {
            font-size: 1.25rem;
            color: #4a5568;
        }
        .content-heading.level-4,
        .content-heading.level-5,
        .content-heading.level-6 {
            font-size: 1.1rem;
            color: #718096;
        }

        .content-paragraph {
            margin-bottom: 1.5rem;
        }

        .content-paragraph p {
            margin: 0;
            text-align: justify;
            hyphens: auto;
        }

        .content-list {
            margin: 1.5rem 0;
        }

        .ordered-list,
        .unordered-list {
            padding-left: 2rem;
            margin: 0;
        }

        .ordered-list li,
        .unordered-list li {
            margin-bottom: 0.5rem;
            line-height: 1.6;
        }

        .content-quote {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            margin: 2rem 0;
            padding: 1.5rem;
            font-style: italic;
            border-radius: 0 8px 8px 0;
        }

        .content-quote p {
            margin: 0;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #4a5568;
        }

        .content-image {
            margin: 2rem 0;
            text-align: center;
        }

        .content-image img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .content-image figcaption {
            margin-top: 0.75rem;
            font-size: 0.9rem;
            color: #666;
            font-style: italic;
        }

        /* Responsive enhancements */
        @media (max-width: 768px) {
            .bile-header.enhanced {
                padding: 2rem 1rem;
            }

            .content-stats {
                gap: 1rem;
            }

            .stat {
                min-width: 50px;
                padding: 0.5rem 0.75rem;
            }

            .bile-content.structured {
                padding: 1.5rem 1rem;
            }

            .content-heading.level-1 {
                font-size: 1.5rem;
            }

            .content-heading.level-2 {
                font-size: 1.25rem;
            }

            .table-of-contents {
                padding: 1rem;
            }

            .toc-item.level-2 { padding-left: 0.5rem; }
            .toc-item.level-3 { padding-left: 1rem; }
        }`;
    },

    /**
     * Get enhanced JavaScript with Phase 2 functionality
     * @private
     */
    _getEnhancedJavaScript() {
        return this._getInlineJavaScript() + `

        // Phase 2 Enhanced Functionality
        bile.scrollToHeading = function(headingId) {
            const element = document.getElementById(headingId);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Highlight the heading briefly
                element.style.background = 'rgba(102, 126, 234, 0.1)';
                element.style.transition = 'background 0.5s ease';

                setTimeout(() => {
                    element.style.background = '';
                }, 2000);
            }
        };

        bile.copyText = function(text) {
            navigator.clipboard.writeText(text).then(() => {
                bile.showNotification('Text copied to clipboard!');
            });
        };

        bile.showNotification = function(message) {
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                z-index: 10000;
                font-size: 14px;
                font-weight: 500;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            \`;
            notification.textContent = message;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);

            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        };

        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.code === 'KeyC' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                const activeContent = document.querySelector('.content-view.active .article-content');
                if (activeContent) {
                    const text = activeContent.textContent;
                    bile.copyText(text);
                }
            } else if (e.code === 'KeyH' && e.ctrlKey) {
                e.preventDefault();
                const toc = document.querySelector('.table-of-contents');
                if (toc) {
                    toc.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });`;
    },

    // Helper methods for content optimization

    _getOptimalFontSize(content) {
        const wordCount = content.metadata?.wordCount || 0;
        if (wordCount > 2000) return '1.05rem'; // Smaller for long articles
        if (wordCount < 500) return '1.15rem';  // Larger for short articles
        return '1.1rem';
    },

    _getOptimalLineHeight(content) {
        const complexity = content.complexity || 'medium';
        switch (complexity) {
            case 'high': return '1.8';    // More spacing for complex content
            case 'low': return '1.6';     // Less spacing for simple content
            default: return '1.7';        // Default spacing
        }
    },

    _getHeadingSpacing(content) {
        const structure = content.structure || 'simple';
        return structure === 'structured' ? '2.5rem' : '2rem';
    },

    /**
     * Generate header section
     * @private
     */
    _generateHeader(content, timestamp) {
        return `
        <header class="bile-header">
            <div class="bile-brand">
                <h1>🌐 Bile</h1>
                <p class="subtitle">Bilingual Web Page Converter</p>
            </div>
            <div class="bile-meta">
                <div class="language-info">
                    <span class="lang-badge source">${content.source_language.toUpperCase()}</span>
                    <span class="arrow">→</span>
                    <span class="lang-badge target">${content.target_language.toUpperCase()}</span>
                </div>
                <div class="processed-time">Processed: ${timestamp}</div>
                ${content.processing_info?.mock_data ? '<div class="phase-badge">Phase 1 Demo</div>' : ''}
            </div>
        </header>`;
    },

    /**
     * Generate language toggle controls
     * @private
     */
    _generateLanguageToggle(content) {
        return `
        <div class="language-toggle">
            <div class="toggle-container">
                <button class="toggle-btn active" onclick="bile.showOriginal()" data-lang="${content.source_language}">
                    <span class="flag">${this._getLanguageFlag(content.source_language)}</span>
                    <span class="lang-name">${this._getLanguageName(content.source_language)}</span>
                </button>
                <button class="toggle-btn" onclick="bile.showTranslation()" data-lang="${content.target_language}">
                    <span class="flag">${this._getLanguageFlag(content.target_language)}</span>
                    <span class="lang-name">${this._getLanguageName(content.target_language)}</span>
                </button>
            </div>
            <div class="keyboard-hint">
                Press <kbd>Space</kbd> to toggle languages
            </div>
        </div>`;
    },

    /**
     * Generate main content area
     * @private
     */
    _generateContent(content) {
        return `
        <main class="bile-content">
            <div id="original-content" class="content-view active">
                <article class="article-content">
                    <h1 class="article-title">${this._sanitizeHtml(content.title_original)}</h1>
                    <div class="article-body">
                        ${this._generateContentSections(content.content, 'original')}
                    </div>
                </article>
            </div>

            <div id="translated-content" class="content-view">
                <article class="article-content">
                    <h1 class="article-title">${this._sanitizeHtml(content.title_translated)}</h1>
                    <div class="article-body">
                        ${this._generateContentSections(content.content, 'translated')}
                    </div>
                </article>
            </div>

            ${content.content.some(section => section.slang_terms?.length > 0) ?
                this._generateSlangGlossary(content.content) : ''}
        </main>`;
    },

    /**
     * Generate content sections with slang term highlighting
     * @private
     */
    _generateContentSections(contentSections, type) {
        return contentSections.map((section, index) => {
            const text = section[type] || '';
            const highlightedText = this._highlightSlangTerms(text, section.slang_terms || [], `section-${index}`);

            return `<div class="content-section" data-section="${index}">
                <p>${highlightedText}</p>
            </div>`;
        }).join('');
    },

    /**
     * Highlight slang terms in text
     * @private
     */
    _highlightSlangTerms(text, slangTerms, sectionId) {
        if (!slangTerms || slangTerms.length === 0) {
            return this._sanitizeHtml(text);
        }

        let highlightedText = this._sanitizeHtml(text);

        slangTerms.forEach((termData, termIndex) => {
            const term = termData.term;
            const termId = `${sectionId}-term-${termIndex}`;
            const highlightHtml = `<span class="slang-term" data-term-id="${termId}"
                onclick="bile.showTermExplanation('${termId}', '${this._escapeForAttribute(term)}',
                '${this._escapeForAttribute(termData.translation)}',
                '${this._escapeForAttribute(termData.explanation_original)}',
                '${this._escapeForAttribute(termData.explanation_translated)}')">${term}</span>`;

            // Replace first occurrence of the term
            const regex = new RegExp(`\\b${term}\\b`, 'i');
            highlightedText = highlightedText.replace(regex, highlightHtml);
        });

        return highlightedText;
    },

    /**
     * Generate slang terms glossary
     * @private
     */
    _generateSlangGlossary(contentSections) {
        const allTerms = [];
        contentSections.forEach(section => {
            if (section.slang_terms) {
                allTerms.push(...section.slang_terms);
            }
        });

        if (allTerms.length === 0) return '';

        return `
        <aside class="slang-glossary">
            <h3>📚 Language Notes</h3>
            <div class="glossary-terms">
                ${allTerms.map(term => `
                    <div class="glossary-item">
                        <div class="term-pair">
                            <span class="original-term">${this._sanitizeHtml(term.term)}</span>
                            <span class="translated-term">${this._sanitizeHtml(term.translation)}</span>
                        </div>
                        <div class="term-explanation">
                            ${this._sanitizeHtml(term.explanation_original)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </aside>`;
    },

    /**
     * Generate footer
     * @private
     */
    _generateFooter() {
        return `
        <footer class="bile-footer">
            <div class="footer-content">
                <p>Generated by <strong>Bile</strong> - Bilingual Web Page Converter</p>
                <div class="footer-links">
                    <button onclick="bile.exportToPdf()" class="footer-btn">📄 Export PDF</button>
                    <button onclick="bile.copyLink()" class="footer-btn">🔗 Copy Link</button>
                    <button onclick="bile.showKeyboardShortcuts()" class="footer-btn">⌨️ Shortcuts</button>
                </div>
            </div>
        </footer>`;
    },

    /**
     * Get inline CSS styles
     * @private
     */
    _getInlineCSS() {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }

        .bile-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            min-height: 100vh;
        }

        .bile-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }

        .bile-brand h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 1rem;
        }

        .bile-meta {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .language-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .lang-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.875rem;
        }

        .arrow {
            font-size: 1.2rem;
            opacity: 0.8;
        }

        .processed-time, .phase-badge {
            font-size: 0.875rem;
            opacity: 0.8;
        }

        .phase-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
        }

        .language-toggle {
            padding: 1.5rem;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            text-align: center;
        }

        .toggle-container {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .toggle-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            min-width: 120px;
            justify-content: center;
        }

        .toggle-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .toggle-btn.active {
            background: #667eea;
            color: white;
        }

        .flag {
            font-size: 1.2rem;
        }

        .keyboard-hint {
            font-size: 0.875rem;
            color: #666;
        }

        kbd {
            background: #f1f3f4;
            border: 1px solid #dadce0;
            border-radius: 4px;
            padding: 0.1em 0.4em;
            font-family: monospace;
            font-size: 0.8em;
        }

        .bile-content {
            padding: 2rem;
        }

        .content-view {
            display: none;
        }

        .content-view.active {
            display: block;
            animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .article-title {
            font-size: 2rem;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 1.5rem;
            line-height: 1.3;
        }

        .article-body {
            font-size: 1.1rem;
            line-height: 1.8;
        }

        .content-section {
            margin-bottom: 1.5rem;
        }

        .slang-term {
            background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
            padding: 0.1em 0.3em;
            border-radius: 3px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            border-bottom: 2px solid transparent;
        }

        .slang-term:hover {
            border-bottom-color: #667eea;
            transform: scale(1.05);
        }

        .slang-glossary {
            margin-top: 2rem;
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }

        .slang-glossary h3 {
            margin-bottom: 1rem;
            color: #2d3748;
        }

        .glossary-item {
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: white;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .term-pair {
            display: flex;
            gap: 1rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        .original-term {
            color: #667eea;
        }

        .translated-term {
            color: #764ba2;
        }

        .term-explanation {
            font-size: 0.95rem;
            color: #666;
            font-style: italic;
        }

        .bile-footer {
            background: #2d3748;
            color: white;
            padding: 1.5rem;
            text-align: center;
        }

        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .footer-links {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .footer-btn {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.3s ease;
        }

        .footer-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-1px);
        }

        /* Modal styles for term explanations */
        .term-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .term-modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            max-width: 400px;
            margin: 1rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }

        .modal-close {
            float: right;
            cursor: pointer;
            font-size: 1.5rem;
            color: #999;
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .bile-container {
                margin: 0;
            }

            .bile-header {
                padding: 1.5rem 1rem;
            }

            .bile-brand h1 {
                font-size: 2rem;
            }

            .toggle-container {
                flex-direction: column;
                gap: 0.75rem;
            }

            .toggle-btn {
                width: 100%;
                max-width: 200px;
            }

            .bile-content {
                padding: 1.5rem 1rem;
            }

            .article-title {
                font-size: 1.5rem;
            }

            .footer-content {
                flex-direction: column;
                text-align: center;
            }
        }`;
    },

    /**
     * Get inline JavaScript for interactive features
     * @private
     */
    _getInlineJavaScript() {
        return `
        // Bile interactive functionality
        window.bile = {
            currentLang: 'original',

            showOriginal: function() {
                this.switchLanguage('original');
            },

            showTranslation: function() {
                this.switchLanguage('translated');
            },

            switchLanguage: function(lang) {
                const originalContent = document.getElementById('original-content');
                const translatedContent = document.getElementById('translated-content');
                const toggleBtns = document.querySelectorAll('.toggle-btn');

                if (lang === 'original') {
                    originalContent.classList.add('active');
                    translatedContent.classList.remove('active');
                    toggleBtns[0].classList.add('active');
                    toggleBtns[1].classList.remove('active');
                } else {
                    originalContent.classList.remove('active');
                    translatedContent.classList.add('active');
                    toggleBtns[0].classList.remove('active');
                    toggleBtns[1].classList.add('active');
                }

                this.currentLang = lang;
            },

            showTermExplanation: function(termId, term, translation, explanationOrig, explanationTrans) {
                const modalHtml = \`
                    <div class="term-modal active" onclick="bile.closeTermModal(event)">
                        <div class="modal-content" onclick="event.stopPropagation()">
                            <span class="modal-close" onclick="bile.closeTermModal()">&times;</span>
                            <h3 style="margin-bottom: 1rem; color: #667eea;">\${term}</h3>
                            <div style="margin-bottom: 0.75rem;">
                                <strong>Translation:</strong> \${translation}
                            </div>
                            <div style="margin-bottom: 0.75rem;">
                                <strong>Explanation:</strong> \${explanationOrig}
                            </div>
                            <div style="font-style: italic; color: #666;">
                                \${explanationTrans}
                            </div>
                        </div>
                    </div>
                \`;

                // Remove existing modal
                const existingModal = document.querySelector('.term-modal');
                if (existingModal) {
                    existingModal.remove();
                }

                // Add new modal
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            },

            closeTermModal: function(event) {
                if (event && event.target !== event.currentTarget) return;
                const modal = document.querySelector('.term-modal');
                if (modal) {
                    modal.remove();
                }
            },

            exportToPdf: function() {
                alert('PDF export will be available in a future version');
            },

            copyLink: function() {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Link copied to clipboard!');
                });
            },

            showKeyboardShortcuts: function() {
                alert('Keyboard Shortcuts:\\n\\nSpace - Toggle languages\\nEsc - Close modal\\n\\nMore shortcuts coming in future versions!');
            }
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space' && !e.target.matches('input, textarea, button')) {
                e.preventDefault();
                bile.currentLang === 'original' ? bile.showTranslation() : bile.showOriginal();
            } else if (e.code === 'Escape') {
                bile.closeTermModal();
            }
        });

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Bile bilingual article loaded successfully');
        });`;
    },

    /**
     * Open processed content in new tab
     * @param {Object} content - Processed content object
     */
    openInNewTab(content) {
        try {
            // Try document.write approach first (most reliable for userscripts)
            try {
                const newWindow = window.open('', '_blank');
                if (!newWindow) {
                    throw new Error('Popup blocked. Please allow popups for this site.');
                }

                const htmlContent = this.generateBasicHtml(content);

                // For very large content, use minimal version
                const finalHtml = htmlContent.length > 100000 ? this._createMinimalHtml(content) : htmlContent;

                newWindow.document.open();
                newWindow.document.write(finalHtml);
                newWindow.document.close();

                // Set the title after loading
                setTimeout(() => {
                    if (newWindow.document) {
                        newWindow.document.title = `Bile - ${content.title_original || 'Translated Article'}`;
                    }
                }, 100);

                return; // Success with document.write

            } catch (docWriteError) {
                console.warn('Document.write failed, trying GM_openInTab:', docWriteError);
            }

            // Fallback: Try GM_openInTab with data URL (for Tampermonkey/Greasemonkey)
            if (typeof GM_openInTab !== 'undefined') {
                try {
                    const htmlContent = this._createMinimalHtml(content); // Use minimal HTML for data URLs
                    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);

                    GM_openInTab(dataUrl, { active: true, insert: true });
                    return; // Success with GM_openInTab

                } catch (gmError) {
                    console.warn('GM_openInTab failed:', gmError);
                }
            }

            // Final fallback: Create a new window and try document.write with minimal HTML
            try {
                const newWindow = window.open('about:blank', '_blank');
                if (!newWindow) {
                    throw new Error('All popup attempts blocked. Please allow popups for this site.');
                }

                const minimalHtml = this._createMinimalHtml(content);

                // Wait for window to be ready
                setTimeout(() => {
                    try {
                        newWindow.document.open();
                        newWindow.document.write(minimalHtml);
                        newWindow.document.close();
                        newWindow.document.title = `Bile - ${content.title_original || 'Translated Article'}`;
                    } catch (finalError) {
                        console.error('Final fallback also failed:', finalError);
                        newWindow.close();
                        throw finalError;
                    }
                }, 250);

                return; // Success with delayed document.write

            } catch (finalError) {
                console.error('All methods failed:', finalError);
                throw new Error('Unable to open new tab. Please check popup blocker settings.');
            }

        } catch (error) {
            console.error('Failed to open new tab:', error);

            // Show user a helpful error message
            if (typeof BileUI !== 'undefined' && BileUI.updateProcessingStatus) {
                BileUI.updateProcessingStatus('Failed to open new tab - please allow popups', 'You can copy the content from the console');
            }

            // As absolute last resort, log the content to console
            console.log('=== BILE TRANSLATION RESULT ===');
            console.log('Title:', content.title_translated || content.title_original);
            if (content.content && Array.isArray(content.content)) {
                content.content.forEach((item, index) => {
                    console.log(`\n--- Section ${index + 1} ---`);
                    console.log('Original:', item.original || item.text);
                    console.log('Translated:', item.translated || item.text);
                });
            }
            console.log('=== END RESULT ===');

            throw new Error(`Failed to open result: ${error.message}. Check browser console for content.`);
        }
    },

    /**
     * Create minimal HTML for final fallback when other methods fail
     * @private
     * @param {Object} content - Processed content object
     * @returns {string} Minimal HTML
     */
    _createMinimalHtml(content) {
        const title = this._sanitizeHtml(content.title_original || 'Translated Article');
        const translatedTitle = this._sanitizeHtml(content.title_translated || title);

        // Extract just the text content, ignoring complex formatting
        let originalText = '';
        let translatedText = '';

        if (content.content && Array.isArray(content.content)) {
            originalText = content.content
                .map(item => item.original || item.text || '')
                .filter(text => text.length > 0)
                .join('\n\n')
                .substring(0, 2000); // Limit content

            translatedText = content.content
                .map(item => item.translated || item.original || item.text || '')
                .filter(text => text.length > 0)
                .join('\n\n')
                .substring(0, 2000); // Limit content

            // Debug: Check if translation actually differs
            const isActuallyTranslated = content.content.some(item =>
                item.original && item.translated && item.original !== item.translated
            );

            if (!isActuallyTranslated) {
                console.warn('Translation appears identical to original');
                translatedText = '[Translation appears to be identical to original. This may occur if the source language was already the target language, or if translation failed.]';
            }
        }

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bile - ${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.5; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: #4a90e2; color: white; padding: 15px; text-align: center; margin-bottom: 20px; border-radius: 5px; }
        .toggle { text-align: center; margin: 20px 0; }
        .btn { margin: 0 5px; padding: 8px 16px; cursor: pointer; border: 2px solid #4a90e2; background: white; color: #4a90e2; border-radius: 4px; }
        .btn:hover { background: #4a90e2; color: white; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
        .hide { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Bile Translation</h1>
            <p>Bilingual Article Viewer</p>
        </div>
        <div class="toggle">
            <button class="btn" onclick="show('original')">Original</button>
            <button class="btn" onclick="show('translated')">Translation</button>
        </div>
        <div id="original" class="section">
            <h2>${title}</h2>
            <p>${this._sanitizeHtml(originalText).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
        </div>
        <div id="translated" class="section hide">
            <h2>${translatedTitle}</h2>
            <p>${this._sanitizeHtml(translatedText).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
        </div>
    </div>
    <script>
        function show(section) {
            document.getElementById('original').className = section === 'original' ? 'section' : 'section hide';
            document.getElementById('translated').className = section === 'translated' ? 'section' : 'section hide';
        }
    </script>
</body>
</html>`;
    },

    /**
     * Create placeholder content for testing
     * @returns {Object} Mock content object
     */
    createPlaceholderContent() {
        return {
            source_language: 'de',
            target_language: 'en',
            title_original: 'Beispiel Artikel',
            title_translated: 'Example Article',
            content: [{
                type: 'paragraph',
                original: 'Dies ist ein Beispielartikel mit einigen <slang>umgangssprachlichen</slang> Begriffen.',
                translated: 'This is an example article with some <slang>colloquial</slang> terms.',
                slang_terms: [{
                    term: 'umgangssprachlichen',
                    translation: 'colloquial',
                    explanation_original: 'Informelle oder alltägliche Sprache',
                    explanation_translated: 'Informal or everyday language'
                }]
            }],
            processing_info: {
                timestamp: new Date().toISOString(),
                phase: 1,
                mock_data: true
            }
        };
    },

    // Helper methods

    _sanitizeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    },

    _sanitizeTitle(title) {
        return this._sanitizeHtml(title).substring(0, 100);
    },

    _escapeForAttribute(text) {
        if (!text) return '';
        return text
            .replace(/'/g, '&#x27;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '');
    },

    _getLanguageFlag(langCode) {
        const flags = {
            'en': '🇺🇸', 'de': '🇩🇪', 'es': '🇪🇸', 'fr': '🇫🇷',
            'it': '🇮🇹', 'pt': '🇵🇹', 'ru': '🇷🇺', 'ja': '🇯🇵',
            'ko': '🇰🇷', 'zh': '🇨🇳', 'ar': '🇸🇦', 'hi': '🇮🇳'
        };
        return flags[langCode] || '🌐';
    },

    _getLanguageName(langCode) {
        const names = {
            'en': 'English', 'de': 'Deutsch', 'es': 'Español', 'fr': 'Français',
            'it': 'Italiano', 'pt': 'Português', 'ru': 'Русский', 'ja': '日本語',
            'ko': '한국어', 'zh': '中文', 'ar': 'العربية', 'hi': 'हिन्दी'
        };
        return names[langCode] || langCode.toUpperCase();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileTabGenerator;
}