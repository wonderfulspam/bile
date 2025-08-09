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
            const htmlContent = this.generateBasicHtml(content);
            const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
            
            // Use GM_openInTab if available (Greasemonkey/Tampermonkey)
            if (typeof GM_openInTab !== 'undefined') {
                GM_openInTab(dataUrl, { active: true, insert: true });
            } else {
                // Fallback to window.open
                const newWindow = window.open(dataUrl, '_blank');
                if (!newWindow) {
                    throw new Error('Popup blocked. Please allow popups for this site.');
                }
            }
        } catch (error) {
            console.error('Failed to open new tab:', error);
            throw new Error(`Failed to open result: ${error.message}`);
        }
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