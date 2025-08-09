// ==UserScript==
// @name         Bile - Bilingual Web Page Converter
// @namespace    https://github.com/user/bile
// @version      0.1.0
// @description  Convert web articles to bilingual interactive learning tools
// @author       Bile Team
// @match        https://*.bbc.com/*
// @match        https://*.theguardian.com/*
// @match        https://*.taz.de/*
// @match        https://*.spiegel.de/*
// @match        https://*.zeit.de/*
// @match        https://*.elpais.com/*
// @match        https://*.elmundo.es/*
// @match        https://*.lemonde.fr/*
// @match        https://*.lefigaro.fr/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_log
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Import modules (simplified inline approach for Phase 1)
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
            return {
                source_language: 'de',
                target_language: targetLang,
                title_original: 'Sample Article',
                title_translated: 'Sample Article (Translated)',
                content: [{
                    type: 'paragraph',
                    original: content,
                    translated: `[TRANSLATED] ${content}`,
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
                this.showProcessingIndicator();
                
                // Check if API key exists
                if (!await BileStorage.hasApiKey()) {
                    const apiKey = prompt('Please enter your Anthropic Claude API key:');
                    if (!apiKey) {
                        this.hideProcessingIndicator();
                        return;
                    }
                    await BileStorage.storeApiKey(apiKey);
                }

                // Get article content (placeholder for Phase 2)
                const title = document.title;
                const content = this.extractBasicContent();
                
                // Process content (placeholder call)
                const processedContent = await BileApiClient.callClaude(content);
                
                // Generate and open result
                BileTabGenerator.openInNewTab(processedContent);
                
                this.hideProcessingIndicator();
            } catch (error) {
                BileApiClient.handleApiError(error);
                this.hideProcessingIndicator();
                alert(`Bile Error: ${error.message}`);
            }
        },

        extractBasicContent() {
            // Basic content extraction for Phase 1 testing
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
            const htmlContent = this.generateBasicHtml(content);
            const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
            GM_openInTab(dataUrl, false);
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