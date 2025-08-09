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

            // Test API connection
            const apiConnected = await BileApiClient.testApiConnection();
            if (!apiConnected) {
                throw new Error('API connection failed. Please check your API key.');
            }

            // Extract content (Phase 1: basic extraction)
            const content = this._extractBasicContent();
            
            // Get target language preference
            const preferences = await BileStorage.getPreferences();
            const targetLang = preferences.targetLanguage || 'en';

            // Process content
            const processedContent = await BileApiClient.callClaude(content, targetLang);
            
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
     * Extract basic content from current page (Phase 1 implementation)
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