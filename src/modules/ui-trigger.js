/**
 * Bile UI Trigger Module
 * Handles user interface elements for triggering the conversion process
 */

const BileUI = {
    // UI Configuration
    BUTTON_ID: 'bile-trigger-button',
    KEYBOARD_SHORTCUT: 'ctrlKey+shiftKey+KeyB',

    // Button positions
    POSITIONS: {
        'top-right': { top: '20px', right: '20px' },
        'top-left': { top: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' }
    },

    /**
     * Create and style the trigger button
     * @param {string} position - Button position ('top-right', 'top-left', etc.)
     * @returns {HTMLElement} The created button element
     */
    createTriggerButton(position = 'top-right') {
        // Remove existing button if present
        const existingButton = document.getElementById(this.BUTTON_ID);
        if (existingButton) {
            existingButton.remove();
        }

        const button = document.createElement('button');
        button.id = this.BUTTON_ID;
        button.innerHTML = '🌐 Bile';
        button.title = 'Convert article to bilingual format (Ctrl+Shift+B)';

        // Apply base styles
        this._applyButtonStyles(button, position);

        // Add event listeners
        this._addButtonEventListeners(button);

        return button;
    },

    /**
     * Apply CSS styles to the button
     * @private
     */
    _applyButtonStyles(button, position) {
        const pos = this.POSITIONS[position] || this.POSITIONS['top-right'];

        button.style.cssText = `
            position: fixed;
            top: ${pos.top || 'auto'};
            right: ${pos.right || 'auto'};
            bottom: ${pos.bottom || 'auto'};
            left: ${pos.left || 'auto'};
            z-index: 2147483647;
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
            user-select: none;
            min-width: 80px;
            text-align: center;
        `;
    },

    /**
     * Add event listeners to button
     * @private
     */
    _addButtonEventListeners(button) {
        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.background = '#45a049';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
        });

        button.addEventListener('mouseleave', () => {
            if (!button.classList.contains('processing')) {
                button.style.background = '#4CAF50';
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }
        });

        // Click handler
        button.addEventListener('click', this.handleTriggerClick.bind(this));

        // Prevent button from interfering with page
        button.addEventListener('mousedown', (e) => e.stopPropagation());
        button.addEventListener('mouseup', (e) => e.stopPropagation());
    },

    /**
     * Handle trigger button click
     * @param {Event} event - The click event
     */
    async handleTriggerClick(event) {
        try {
            event.preventDefault();
            event.stopPropagation();

            this.showProcessingIndicator();

            // Check if API key exists
            if (!await BileStorage.hasApiKey()) {
                const success = await this._promptForApiKey();
                if (!success) {
                    this.hideProcessingIndicator();
                    return;
                }
            }

            // Extract content using Phase 2 modules
            const contentResult = await this._extractContent();

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

            // Get target language preference
            const preferences = await BileStorage.getPreferences();
            const targetLang = preferences.targetLanguage || 'en';

            // Process content
            const processedContent = await BileApiClient.callClaude(contentResult.content, targetLang);

            // Generate and open result
            BileTabGenerator.openInNewTab(processedContent);

            this.hideProcessingIndicator();
            this._showSuccessIndicator();

        } catch (error) {
            const userMessage = BileApiClient.handleApiError(error);
            this.hideProcessingIndicator();
            this._showErrorMessage(userMessage);
        }
    },

    /**
     * Prompt user for API key
     * @private
     * @returns {Promise<boolean>} True if key was successfully stored
     */
    async _promptForApiKey() {
        const apiKey = prompt(`Bile needs your Anthropic Claude API key to function.

Get your API key from: https://console.anthropic.com/

Enter your API key (starts with 'sk-ant-'):`);

        if (!apiKey) {
            return false;
        }

        try {
            await BileStorage.storeApiKey(apiKey);
            this._showSuccessMessage('API key saved successfully!');
            return true;
        } catch (error) {
            this._showErrorMessage(`Invalid API key: ${error.message}`);
            return false;
        }
    },

    /**
     * Extract content using Phase 2 content extraction modules
     * @private
     * @returns {Promise<ContentResult>} Extraction result
     */
    async _extractContent() {
        // Use BileContentExtractor if available, fallback to basic extraction
        if (typeof BileContentExtractor !== 'undefined') {
            return await BileContentExtractor.extractArticleContent(document);
        } else {
            // Fallback to basic extraction for backward compatibility
            const basicContent = this._extractBasicContent();
            return {
                success: !!basicContent,
                content: {
                    title: document.title,
                    content: basicContent,
                    metadata: {
                        wordCount: basicContent.split(/\s+/).length,
                        domain: window.location.hostname,
                        url: window.location.href
                    }
                },
                confidence: 0.3,
                method: 'basic'
            };
        }
    },

    /**
     * Extract basic content from current page (Phase 1 fallback)
     * @private
     * @returns {string} Extracted content
     */
    _extractBasicContent() {
        const title = document.title;

        // Try to find main article content
        let mainContent = '';

        // Look for common article containers
        const articleSelectors = [
            'article',
            '[role="article"]',
            '.article-content',
            '.article-body',
            '.content',
            'main'
        ];

        let articleElement = null;
        for (const selector of articleSelectors) {
            articleElement = document.querySelector(selector);
            if (articleElement) break;
        }

        if (articleElement) {
            // Extract text from paragraphs within the article
            const paragraphs = articleElement.querySelectorAll('p');
            mainContent = Array.from(paragraphs)
                .map(p => p.textContent.trim())
                .filter(text => text.length > 20)
                .slice(0, 10) // Limit to first 10 paragraphs for Phase 1
                .join('\n\n');
        }

        // Fallback: get all paragraphs from page
        if (!mainContent) {
            const allParagraphs = document.querySelectorAll('p');
            mainContent = Array.from(allParagraphs)
                .map(p => p.textContent.trim())
                .filter(text => text.length > 20)
                .slice(0, 5) // Limit for fallback
                .join('\n\n');
        }

        return `Title: ${title}\n\nContent:\n${mainContent}`.substring(0, 2000); // Limit total length
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

            // Focus the modal for accessibility
            setTimeout(() => modal.focus(), 100);
        });
    },

    /**
     * Create content preview modal
     * @private
     * @param {ExtractedContent} content - The content to preview
     * @param {Function} resolve - Promise resolve function
     * @returns {HTMLElement} The modal element
     */
    _createPreviewModal(content, resolve) {
        const modal = document.createElement('div');
        modal.id = 'bile-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 2147483648;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 800px;
            max-height: 80vh;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px 24px 16px;
            border-bottom: 1px solid #e5e7eb;
            flex-shrink: 0;
        `;
        header.innerHTML = `
            <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                Content Preview
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Review the extracted content before processing
            </p>
        `;

        // Content info
        const info = document.createElement('div');
        info.style.cssText = `
            padding: 16px 24px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            flex-shrink: 0;
        `;

        const wordCount = content.metadata?.wordCount || 0;
        const readingTime = content.metadata?.readingTime || 0;
        const confidence = Math.round((content.confidence || 0) * 100);

        info.innerHTML = `
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
        `;

        // Scrollable content area
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px 24px;
            min-height: 200px;
            max-height: 400px;
        `;

        // Title
        if (content.title) {
            const title = document.createElement('h3');
            title.style.cssText = `
                margin: 0 0 16px 0;
                color: #1f2937;
                font-size: 18px;
                font-weight: 600;
                line-height: 1.4;
            `;
            title.textContent = content.title;
            contentArea.appendChild(title);
        }

        // Author and date
        if (content.author || content.publishDate) {
            const byline = document.createElement('div');
            byline.style.cssText = `
                margin-bottom: 20px;
                color: #6b7280;
                font-size: 14px;
            `;

            let bylineText = '';
            if (content.author) bylineText += `By ${content.author}`;
            if (content.publishDate) {
                if (bylineText) bylineText += ' • ';
                bylineText += new Date(content.publishDate).toLocaleDateString();
            }

            byline.textContent = bylineText;
            contentArea.appendChild(byline);
        }

        // Content preview
        const contentPreview = document.createElement('div');
        contentPreview.style.cssText = `
            color: #374151;
            line-height: 1.6;
            font-size: 15px;
        `;

        if (content.content && Array.isArray(content.content)) {
            // Structured content from Phase 2
            content.content.slice(0, 5).forEach(element => {
                const div = document.createElement('div');
                div.style.marginBottom = '12px';

                if (element.type === 'heading') {
                    div.style.cssText = `
                        font-weight: 600;
                        font-size: ${element.level <= 2 ? '16px' : '15px'};
                        color: #1f2937;
                        margin-bottom: 8px;
                    `;
                } else {
                    div.style.color = '#374151';
                }

                div.textContent = element.text.substring(0, 200) + (element.text.length > 200 ? '...' : '');
                contentPreview.appendChild(div);
            });

            if (content.content.length > 5) {
                const more = document.createElement('div');
                more.style.cssText = `
                    color: #6b7280;
                    font-style: italic;
                    margin-top: 12px;
                `;
                more.textContent = `... and ${content.content.length - 5} more sections`;
                contentPreview.appendChild(more);
            }
        } else {
            // Basic content fallback
            const text = typeof content === 'string' ? content : content.content || 'No content available';
            const div = document.createElement('div');
            div.textContent = text.substring(0, 500) + (text.length > 500 ? '...' : '');
            contentPreview.appendChild(div);
        }

        contentArea.appendChild(contentPreview);

        // Buttons
        const buttons = document.createElement('div');
        buttons.style.cssText = `
            padding: 20px 24px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            flex-shrink: 0;
        `;

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            padding: 10px 20px;
            border: 1px solid #d1d5db;
            background: white;
            color: #374151;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        `;
        cancelButton.addEventListener('mouseenter', () => {
            cancelButton.style.background = '#f9fafb';
        });
        cancelButton.addEventListener('mouseleave', () => {
            cancelButton.style.background = 'white';
        });

        const processButton = document.createElement('button');
        processButton.textContent = 'Process Article';
        processButton.style.cssText = `
            padding: 10px 20px;
            border: none;
            background: #4CAF50;
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        `;
        processButton.addEventListener('mouseenter', () => {
            processButton.style.background = '#45a049';
        });
        processButton.addEventListener('mouseleave', () => {
            processButton.style.background = '#4CAF50';
        });

        // Event handlers
        const cleanup = () => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };

        cancelButton.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        processButton.addEventListener('click', () => {
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

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        });

        buttons.appendChild(cancelButton);
        buttons.appendChild(processButton);

        modalContent.appendChild(header);
        modalContent.appendChild(info);
        modalContent.appendChild(contentArea);
        modalContent.appendChild(buttons);

        modal.appendChild(modalContent);
        modal.tabIndex = -1; // Make focusable

        return modal;
    },

    /**
     * Enable manual content selection interface
     * @returns {Promise<string>} User-selected content
     */
    async enableContentSelection() {
        // TODO: Implement manual selection interface for Phase 2+
        // For now, return null to indicate not implemented
        return null;
    },

    /**
     * Show processing indicator
     */
    showProcessingIndicator() {
        const button = document.getElementById(this.BUTTON_ID);
        if (button) {
            button.innerHTML = '⏳ Processing...';
            button.style.background = '#ff9800';
            button.style.cursor = 'wait';
            button.classList.add('processing');
            button.disabled = true;
        }
    },

    /**
     * Hide processing indicator
     */
    hideProcessingIndicator() {
        const button = document.getElementById(this.BUTTON_ID);
        if (button) {
            button.innerHTML = '🌐 Bile';
            button.style.background = '#4CAF50';
            button.style.cursor = 'pointer';
            button.classList.remove('processing');
            button.disabled = false;
        }
    },

    /**
     * Show success indicator briefly
     * @private
     */
    _showSuccessIndicator() {
        const button = document.getElementById(this.BUTTON_ID);
        if (button) {
            const originalHtml = button.innerHTML;
            const originalBg = button.style.background;

            button.innerHTML = '✅ Success!';
            button.style.background = '#4CAF50';

            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.style.background = originalBg;
            }, 2000);
        }
    },

    /**
     * Show error message
     * @private
     * @param {string} message - Error message to show
     */
    _showErrorMessage(message) {
        // Show in alert for Phase 1, can be improved in later phases
        alert(`Bile Error: ${message}`);

        // Also show in button briefly
        const button = document.getElementById(this.BUTTON_ID);
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

    /**
     * Show success message
     * @private
     * @param {string} message - Success message to show
     */
    _showSuccessMessage(message) {
        // Simple alert for Phase 1
        alert(message);
    },

    /**
     * Register keyboard shortcut (Ctrl+Shift+B)
     */
    registerKeyboardShortcut() {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyB') {
                event.preventDefault();
                event.stopPropagation();

                const button = document.getElementById(this.BUTTON_ID);
                if (button && !button.disabled) {
                    this.handleTriggerClick(event);
                }
            }
        }, true);
    },

    /**
     * Update button position based on user preference
     * @param {string} position - New position
     */
    updateButtonPosition(position) {
        const button = document.getElementById(this.BUTTON_ID);
        if (button) {
            const pos = this.POSITIONS[position] || this.POSITIONS['top-right'];

            // Reset all position values
            button.style.top = 'auto';
            button.style.right = 'auto';
            button.style.bottom = 'auto';
            button.style.left = 'auto';

            // Apply new position
            Object.assign(button.style, pos);
        }
    },

    /**
     * Remove trigger button from page
     */
    removeTriggerButton() {
        const button = document.getElementById(this.BUTTON_ID);
        if (button) {
            button.remove();
        }
    },

    /**
     * Check if button is currently processing
     * @returns {boolean} True if processing
     */
    isProcessing() {
        const button = document.getElementById(this.BUTTON_ID);
        return button && button.classList.contains('processing');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileUI;
}