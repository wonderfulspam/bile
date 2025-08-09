// ==UserScript==
// @name         Bile - Bilingual Web Page Converter
// @namespace    https://github.com/user/bile
// @version      0.2.1
// @description  Convert web articles to bilingual interactive learning tools - Phase 2: Advanced Content Extraction
// @author       Bile Team
// @match        https://*.bbc.com/*
// @match        https://*.theguardian.com/*
// @match        https://*.taz.de/*
// @match        https://*.spiegel.de/*
// @match        https://*.zeit.de/*
// @match        https://*.sueddeutsche.de/*
// @match        https://*.elpais.com/*
// @match        https://*.elmundo.es/*
// @match        https://*.abc.es/*
// @match        https://*.lemonde.fr/*
// @match        https://*.lefigaro.fr/*
// @match        https://*.liberation.fr/*
// @match        https://*.nytimes.com/*
// @match        https://*.medium.com/*
// @match        https://*.substack.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_log
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Phase 2: Advanced Content Extraction
    // Content extractor integration
    async function loadPhase2Modules() {
        try {
            // Load content extractor
            if (typeof BileContentExtractor === 'undefined') {
                await import('./modules/content-extractor.js');
            }
            // Load site rules
            if (typeof BileSiteRules === 'undefined') {
                await import('./config/site-rules.js');
            }
            return true;
        } catch (error) {
            console.warn('Phase 2 modules not available, falling back to Phase 1 extraction');
            return false;
        }
    }

    // Basic content extractor for Phase 2 (inline version)
    const BileContentExtractor = {
        async extractArticleContent(document) {
            try {
                // Simple readability-based extraction
                const result = this.readabilityExtract(document);
                if (result && this.validateContent(result)) {
                    return {
                        success: true,
                        content: result,
                        confidence: result.confidence || 0.7,
                        method: 'readability'
                    };
                }

                // Fallback to basic extraction
                const basicResult = this.basicExtract(document);
                return {
                    success: !!basicResult,
                    content: basicResult,
                    confidence: 0.4,
                    method: 'basic'
                };
            } catch (error) {
                return {
                    success: false,
                    content: null,
                    error: error.message,
                    method: 'failed'
                };
            }
        },

        readabilityExtract(document) {
            // Find main content
            const candidates = this.findContentCandidates(document);
            const bestCandidate = this.selectBestCandidate(candidates);

            if (!bestCandidate) return null;

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
        },

        findContentCandidates(document) {
            const candidates = [];
            const selectors = [
                'article', '[role="article"]', '.article', '.content', '.post', '.entry',
                '#content', '#article', '.story', 'main'
            ];

            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(element => {
                    const score = this.scoreElement(element);
                    if (score > 0) {
                        candidates.push({ element, score, selector });
                    }
                });
            });

            return candidates.sort((a, b) => b.score - a.score);
        },

        scoreElement(element) {
            const textLength = (element.textContent || '').length;
            if (textLength < 100) return -50;

            let score = Math.min(textLength / 100, 50);
            score += element.querySelectorAll('p').length * 5;
            score += element.querySelectorAll('h1, h2, h3, h4, h5, h6').length * 3;

            const className = element.className.toLowerCase();
            if (className.includes('content') || className.includes('article')) score += 20;
            if (className.includes('sidebar') || className.includes('nav')) score -= 20;

            return score;
        },

        selectBestCandidate(candidates) {
            return candidates.length > 0 ? candidates[0].element : null;
        },

        cleanContent(element) {
            const cleaned = element.cloneNode(true);
            const unwanted = ['script', 'style', 'nav', '.advertisement', '.ad', '.social', '.comments'];
            unwanted.forEach(selector => {
                cleaned.querySelectorAll(selector).forEach(el => el.remove());
            });
            return cleaned;
        },

        structureContent(element) {
            const content = [];
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_ELEMENT,
                node => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'blockquote']
                    .includes(node.tagName.toLowerCase()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
            );

            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (!text) continue;

                const element = {
                    text: text,
                    html: node.outerHTML,
                    type: node.tagName.toLowerCase().startsWith('h') ? 'heading' :
                          ['ul', 'ol'].includes(node.tagName.toLowerCase()) ? 'list' :
                          node.tagName.toLowerCase() === 'blockquote' ? 'quote' : 'paragraph'
                };

                if (element.type === 'heading') {
                    element.level = parseInt(node.tagName.charAt(1));
                    element.id = `heading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }

                content.push(element);
            }

            return content;
        },

        extractTitle(document) {
            const selectors = ['h1', '.headline', '.title', '.article-title', 'title'];
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            return document.title || 'Untitled Article';
        },

        extractAuthor(document) {
            const selectors = ['.author', '.byline', '[rel="author"]', '[property="article:author"]'];
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            return null;
        },

        extractPublishDate(document) {
            const selectors = ['time[datetime]', '[property="article:published_time"]', '.date'];
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const dateString = element.getAttribute('datetime') || element.textContent;
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) return date;
                }
            }
            return null;
        },

        detectLanguage(element) {
            const text = element.textContent || '';
            const patterns = {
                'en': /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
                'de': /\b(der|die|das|und|oder|aber|in|auf|an|zu|für|von|mit|bei)\b/gi,
                'fr': /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par)\b/gi,
                'es': /\b(el|la|los|las|y|o|pero|en|sobre|a|para|de|con|por)\b/gi
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

        extractMetadata(document, content) {
            const textContent = content.textContent || '';
            const wordCount = textContent.split(/\s+/).length;
            return {
                wordCount,
                readingTime: Math.ceil(wordCount / 200),
                domain: window.location.hostname,
                url: window.location.href
            };
        },

        calculateConfidence(content) {
            if (!content || content.length === 0) return 0;
            let score = 0.5;
            const totalText = content.reduce((total, item) => total + (item.text || '').length, 0);
            if (totalText > 500) score += 0.2;
            if (content.some(item => item.type === 'heading')) score += 0.2;
            return Math.min(score, 1.0);
        },

        basicExtract(document) {
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
                }
            };
        },

        validateContent(content) {
            return content && content.content && content.content.length > 0 &&
                   content.title && content.title.length > 3 &&
                   (content.metadata?.wordCount || 0) > 100;
        }
    };

    const BileStorage = {
        async storeApiKey(key) {
            if (!key || typeof key !== 'string' || key.trim().length === 0) {
                throw new Error('Invalid API key');
            }
            GM_setValue('bile_api_key', key.trim());
        },

        async getApiKey() {
            return GM_getValue('bile_api_key', null);
        },

        async hasApiKey() {
            const key = await this.getApiKey();
            return key !== null && key.length > 0;
        },

        async clearApiKey() {
            GM_deleteValue('bile_api_key');
        }
    };

    const BileApiClient = {
        async testApiConnection() {
            // Placeholder for Phase 1 - will implement actual API call in Phase 3
            const key = await BileStorage.getApiKey();
            return key !== null && key.length > 10; // Basic validation
        },

        async callClaude(content, targetLang = 'en') {
            // Placeholder for Phase 1 - return mock response
            // Extract readable text from structured content
            let textContent = '';
            let title = 'Sample Article';
            if (typeof content === 'string') {
                textContent = content;
            } else if (content && content.title) {
                // Handle structured content from content extractor
                title = content.title;
                if (content.content && Array.isArray(content.content)) {
                    // Extract text from content array
                    textContent = content.content
                        .filter(item => item.text && item.type !== 'list') // Skip lists and empty items
                        .map(item => item.text)
                        .join('\n\n');
                }
            } else if (content && content.text) {
                textContent = content.text;
            } else if (content && typeof content === 'object') {
                // Fallback: convert object to readable text
                textContent = JSON.stringify(content, null, 2);
            } else {
                textContent = 'No content available';
            }
            // Limit content length for demo
            if (textContent.length > 500) {
                textContent = textContent.substring(0, 500) + '...';
            }
            return {
                source_language: content.language || 'de',
                target_language: targetLang,
                title_original: title,
                title_translated: `${title} (Translated)`,
                content: [{
                    type: 'paragraph',
                    original: textContent,
                    translated: `[TRANSLATED] ${textContent}`,
                    slang_terms: []
                }]
            };
        },

        handleApiError(error) {
            GM_log(`Bile API Error: ${error.message}`);
            console.error('Bile API Error:', error);
        }
    };

    const BileUI = {
        createTriggerButton() {
            const button = document.createElement('button');
            button.id = 'bile-trigger-button';
            button.innerHTML = '🌐 Bile';
            button.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                transition: background-color 0.3s;
            `;

            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#45a049';
            });

            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#4CAF50';
            });

            button.addEventListener('click', this.handleTriggerClick.bind(this));

            return button;
        },

        async handleTriggerClick(event) {
            try {
                event.preventDefault();
                event.stopPropagation();

                this.showProcessingIndicator();

                // Check if API key exists
                if (!await BileStorage.hasApiKey()) {
                    const apiKey = prompt(`Bile needs your Anthropic Claude API key to function.

Get your API key from: https://console.anthropic.com/

Enter your API key (starts with 'sk-ant-'):`);
                    if (!apiKey) {
                        this.hideProcessingIndicator();
                        return;
                    }
                    await BileStorage.storeApiKey(apiKey);
                }

                // Extract content using Phase 2 modules
                const contentResult = await BileContentExtractor.extractArticleContent(document);

                if (!contentResult.success) {
                    throw new Error(contentResult.error || 'Content extraction failed');
                }

                // Show content preview and get user confirmation
                const userConfirmed = await this.showContentPreview(contentResult.content);
                if (!userConfirmed) {
                    this.hideProcessingIndicator();
                    return;
                }

                // Test API connection
                const apiConnected = await BileApiClient.testApiConnection();
                if (!apiConnected) {
                    throw new Error('API connection failed. Please check your API key.');
                }

                // Process content (mock for Phase 2 demo)
                const processedContent = await BileApiClient.callClaude(contentResult.content);

                // Generate and open result
                BileTabGenerator.openInNewTab(processedContent);

                this.hideProcessingIndicator();
                this._showSuccessIndicator();
            } catch (error) {
                BileApiClient.handleApiError(error);
                this.hideProcessingIndicator();
                this._showErrorMessage(`Bile Error: ${error.message}`);
            }
        },

        /**
         * Show content preview modal and get user confirmation
         * @param {ExtractedContent} content - The extracted content to preview
         * @returns {Promise<boolean>} True if user confirms, false if cancelled
         */
        async showContentPreview(content) {
            return new Promise((resolve) => {
                const modal = this._createPreviewModal(content, resolve);
                document.body.appendChild(modal);
                setTimeout(() => modal.focus(), 100);
            });
        },

        /**
         * Create content preview modal
         * @private
         */
        _createPreviewModal(content, resolve) {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.6); z-index: 2147483648;
                display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(4px);
            `;

            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white; border-radius: 12px; max-width: 800px;
                max-height: 80vh; width: 90%; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                display: flex; flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            const wordCount = content.metadata?.wordCount || 0;
            const readingTime = content.metadata?.readingTime || 0;
            const confidence = Math.round((content.confidence || 0) * 100);

            modalContent.innerHTML = `
                <div style="padding: 20px 24px 16px; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                        Content Preview
                    </h2>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        Review the extracted content before processing
                    </p>
                </div>

                <div style="padding: 16px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; font-size: 14px;">
                        <div>
                            <div style="color: #6b7280; margin-bottom: 4px;">Words</div>
                            <div style="color: #1f2937; font-weight: 500;">${wordCount}</div>
                        </div>
                        <div>
                            <div style="color: #6b7280; margin-bottom: 4px;">Reading time</div>
                            <div style="color: #1f2937; font-weight: 500;">${readingTime} min</div>
                        </div>
                        <div>
                            <div style="color: #6b7280; margin-bottom: 4px;">Confidence</div>
                            <div style="color: #1f2937; font-weight: 500;">${confidence}%</div>
                        </div>
                        <div>
                            <div style="color: #6b7280; margin-bottom: 4px;">Language</div>
                            <div style="color: #1f2937; font-weight: 500;">${content.language || 'Unknown'}</div>
                        </div>
                    </div>
                </div>

                <div style="flex: 1; overflow-y: auto; padding: 20px 24px; min-height: 200px; max-height: 400px;">
                    <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                        ${content.title}
                    </h3>
                    ${content.author || content.publishDate ? `
                        <div style="margin-bottom: 20px; color: #6b7280; font-size: 14px;">
                            ${content.author ? `By ${content.author}` : ''}
                            ${content.author && content.publishDate ? ' • ' : ''}
                            ${content.publishDate ? new Date(content.publishDate).toLocaleDateString() : ''}
                        </div>
                    ` : ''}
                    <div style="color: #374151; line-height: 1.6; font-size: 15px;">
                        ${this._generateContentPreview(content)}
                    </div>
                </div>

                <div style="padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="bile-cancel-btn" style="padding: 10px 20px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
                        Cancel
                    </button>
                    <button id="bile-process-btn" style="padding: 10px 20px; border: none; background: #4CAF50; color: white; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
                        Process Article
                    </button>
                </div>
            `;

            // Event handlers
            const cleanup = () => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            };

            modalContent.querySelector('#bile-cancel-btn').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            modalContent.querySelector('#bile-process-btn').addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            // ESC key handler
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            });

            modal.appendChild(modalContent);
            modal.tabIndex = -1;
            return modal;
        },

        /**
         * Generate content preview HTML
         * @private
         */
        _generateContentPreview(content) {
            if (!content.content || !Array.isArray(content.content)) {
                const text = typeof content === 'string' ? content : content.content || 'No content available';
                return `<div>${text.substring(0, 500) + (text.length > 500 ? '...' : '')}</div>`;
            }

            let html = '';
            const elementsToShow = content.content.slice(0, 5);

            elementsToShow.forEach(element => {
                const text = element.text.substring(0, 200) + (element.text.length > 200 ? '...' : '');
                if (element.type === 'heading') {
                    html += `<div style="font-weight: 600; font-size: ${element.level <= 2 ? '16px' : '15px'}; color: #1f2937; margin-bottom: 8px;">${text}</div>`;
                } else {
                    html += `<div style="color: #374151; margin-bottom: 12px;">${text}</div>`;
                }
            });

            if (content.content.length > 5) {
                html += `<div style="color: #6b7280; font-style: italic; margin-top: 12px;">... and ${content.content.length - 5} more sections</div>`;
            }

            return html;
        },

        /**
         * Show success indicator briefly
         * @private
         */
        _showSuccessIndicator() {
            const button = document.getElementById('bile-trigger-button');
            if (button) {
                const originalHtml = button.innerHTML;
                button.innerHTML = '✅ Success!';
                setTimeout(() => {
                    button.innerHTML = originalHtml;
                }, 2000);
            }
        },

        /**
         * Show error message
         * @private
         */
        _showErrorMessage(message) {
            alert(message);
            const button = document.getElementById('bile-trigger-button');
            if (button) {
                const originalHtml = button.innerHTML;
                button.innerHTML = '❌ Error';
                button.style.background = '#f44336';
                setTimeout(() => {
                    button.innerHTML = originalHtml;
                    button.style.background = '#4CAF50';
                }, 3000);
            }
        },

        extractBasicContent() {
            // Fallback method - kept for compatibility
            const title = document.title;
            const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent);
            const paragraphs = Array.from(document.querySelectorAll('p')).slice(0, 3).map(p => p.textContent);

            return `Title: ${title}\n\nHeadings: ${headings.join(', ')}\n\nContent preview: ${paragraphs.join('\n\n')}`;
        },

        showProcessingIndicator() {
            const button = document.getElementById('bile-trigger-button');
            if (button) {
                button.innerHTML = '⏳ Processing...';
                button.style.backgroundColor = '#ff9800';
            }
        },

        hideProcessingIndicator() {
            const button = document.getElementById('bile-trigger-button');
            if (button) {
                button.innerHTML = '🌐 Bile';
                button.style.backgroundColor = '#4CAF50';
            }
        },

        registerKeyboardShortcut() {
            document.addEventListener('keydown', (event) => {
                if (event.ctrlKey && event.shiftKey && event.key === 'B') {
                    event.preventDefault();
                    this.handleTriggerClick();
                }
            });
        }
    };

    const BileTabGenerator = {
        generateBasicHtml(content) {
            return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bile - ${content.title_original}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            background: #f9f9f9;
        }
        .bile-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .bile-content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .language-toggle {
            margin: 20px 0;
            text-align: center;
        }
        .toggle-button {
            padding: 8px 16px;
            margin: 0 5px;
            border: 2px solid #4CAF50;
            background: white;
            color: #4CAF50;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .toggle-button.active {
            background: #4CAF50;
            color: white;
        }
        .content-section {
            margin: 20px 0;
        }
        .phase-notice {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
    </style>
</head>
<body>
    <div class="bile-header">
        <h1>🌐 Bile - Bilingual Web Page Converter</h1>
        <p>Phase 1 Implementation - Basic Infrastructure Test</p>
    </div>

    <div class="language-toggle">
        <button class="toggle-button active" onclick="showOriginal()">Original (${content.source_language})</button>
        <button class="toggle-button" onclick="showTranslation()">Translation (${content.target_language})</button>
    </div>

    <div class="bile-content">
        <div class="phase-notice">
            <strong>Phase 1 Test:</strong> This is a placeholder demonstrating the core infrastructure.
            Content extraction and translation will be implemented in Phases 2 and 3.
        </div>

        <div id="original-content" class="content-section">
            <h2>${content.title_original}</h2>
            <div>
                ${content.content.map(section => `<p>${section.original}</p>`).join('')}
            </div>
        </div>

        <div id="translated-content" class="content-section" style="display: none;">
            <h2>${content.title_translated}</h2>
            <div>
                ${content.content.map(section => `<p>${section.translated}</p>`).join('')}
            </div>
        </div>
    </div>

    <script>
        function showOriginal() {
            document.getElementById('original-content').style.display = 'block';
            document.getElementById('translated-content').style.display = 'none';
            updateToggleButtons(0);
        }

        function showTranslation() {
            document.getElementById('original-content').style.display = 'none';
            document.getElementById('translated-content').style.display = 'block';
            updateToggleButtons(1);
        }

        function updateToggleButtons(activeIndex) {
            const buttons = document.querySelectorAll('.toggle-button');
            buttons.forEach((button, index) => {
                button.classList.toggle('active', index === activeIndex);
            });
        }
    </script>
</body>
</html>`;
        },

        openInNewTab(content) {
            try {
                const htmlContent = this.generateBasicHtml(content);
                // Open blank window and write content directly
                const newWindow = window.open('about:blank', '_blank');
                if (!newWindow) {
                    throw new Error('Popup blocked. Please allow popups for this site.');
                }
                // Write the HTML content to the new window
                newWindow.document.open();
                newWindow.document.write(htmlContent);
                newWindow.document.close();
                // Set focus to the new window
                newWindow.focus();
            } catch (error) {
                console.error('Failed to open result tab:', error);
                alert('Content processed successfully! Check browser console for extracted content.');
                console.log('Processed content:', content);
            }
        },

        createPlaceholderContent() {
            return {
                source_language: 'de',
                target_language: 'en',
                title_original: 'Test Article',
                title_translated: 'Test Article (Translated)',
                content: [{
                    type: 'paragraph',
                    original: 'This is a placeholder article for Phase 1 testing.',
                    translated: 'This is a placeholder article for Phase 1 testing. (TRANSLATED)',
                    slang_terms: []
                }]
            };
        }
    };

    const BileUtils = {
        debugLog(message) {
            GM_log(`[Bile] ${message}`);
            console.log(`[Bile] ${message}`);
        },

        isValidUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        sanitizeHtml(html) {
            // Basic sanitization for Phase 1
            return html
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    };

    // Main initialization
    async function initializeBile() {
        try {
            BileUtils.debugLog('Initializing Bile userscript');

            if (isArticlePage()) {
                addTriggerButton();
                BileUI.registerKeyboardShortcut();
                BileUtils.debugLog('Bile initialized successfully');
            } else {
                BileUtils.debugLog('Page not detected as article page');
            }
        } catch (error) {
            BileUtils.debugLog(`Initialization error: ${error.message}`);
            console.error('Bile initialization error:', error);
        }
    }

    function isArticlePage() {
        // Basic article detection for Phase 1
        const url = window.location.href;
        const hasArticleIndicators = document.querySelector('article, .article, #article, [role="article"]') ||
                                   document.querySelectorAll('p').length > 3 ||
                                   document.querySelector('h1');

        // Check if we're on a known news site
        const knownSites = ['bbc.com', 'theguardian.com', 'taz.de', 'spiegel.de', 'zeit.de',
                           'elpais.com', 'elmundo.es', 'lemonde.fr', 'lefigaro.fr'];
        const isKnownSite = knownSites.some(site => url.includes(site));

        return isKnownSite && hasArticleIndicators;
    }

    function addTriggerButton() {
        const button = BileUI.createTriggerButton();
        document.body.appendChild(button);
        BileUtils.debugLog('Trigger button added to page');
    }

    // Start the application
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBile);
    } else {
        initializeBile();
    }

})();