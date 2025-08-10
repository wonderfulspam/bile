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
            this.updateProcessingStatus('Checking API configuration...', 'Validating OpenRouter API key');
            if (!await BileStorage.hasApiKey()) {
                this.updateProcessingStatus('API key required');
                const success = await this._promptForApiKey();
                if (!success) {
                    this.hideProcessingIndicator();
                    return;
                }
                this.updateProcessingStatus('API key configured successfully');
            }

            // Extract content using Phase 2 modules
            this.updateProcessingStatus('Extracting article content...', 'Analyzing page structure');
            const contentResult = await this._extractContent();

            if (!contentResult.success) {
                throw new Error(contentResult.error || 'Content extraction failed');
            }
            this.updateProcessingStatus('Content extraction completed', `Found ${contentResult.content.metadata?.wordCount || 'unknown'} words`);

            // Show content preview and get user confirmation
            this.updateProcessingStatus('Showing content preview...');
            this._hideProcessingModal(); // Temporarily hide to show preview
            const userConfirmed = await this.showContentPreview(contentResult.content);
            if (!userConfirmed) {
                this.hideProcessingIndicator();
                return;
            }

            // Re-show processing modal for translation
            this._createProcessingModal();
            this.updateProcessingStatus('User confirmed content, starting translation...', 'Connecting to AI models');

            // Test API connection
            this.updateProcessingStatus('Testing API connection...');
            const apiConnected = await BileApiClient.testApiConnection();
            if (!apiConnected) {
                throw new Error('API connection failed. Please check your API key.');
            }
            this.updateProcessingStatus('API connection successful');

            // Get target language preference
            const preferences = await BileStorage.getPreferences();
            const targetLang = preferences.targetLanguage || 'en';

            // Detect source language for better translation context
            const sourceLanguage = BileApiClient._detectLanguage(
                typeof contentResult.content === 'string'
                    ? contentResult.content
                    : JSON.stringify(contentResult.content)
            );

            this.updateProcessingStatus(`Source: ${sourceLanguage.toUpperCase()} → Target: ${targetLang.toUpperCase()}`);

            // Warn if source and target are the same
            if (sourceLanguage === targetLang) {
                this.updateProcessingStatus(`⚠️ Warning: Source and target languages are both ${targetLang.toUpperCase()}`, 'Translation may not be meaningful');

                // Ask user if they want to proceed or change target language
                const shouldProceed = confirm(
                    `The detected source language (${sourceLanguage.toUpperCase()}) is the same as your target language (${targetLang.toUpperCase()}).\n\n` +
                    'This means the translation may not be useful.\n\n' +
                    'Click OK to proceed anyway, or Cancel to stop and check your target language settings.'
                );

                if (!shouldProceed) {
                    this.updateProcessingStatus('Translation cancelled by user due to language mismatch');
                    this.hideProcessingIndicator();
                    return;
                }
            }

            // Process content
            this.updateProcessingStatus('Starting translation...', 'This may take a moment');
            const processedContent = await BileApiClient.translateContent(contentResult.content, targetLang);

            // Debug: Log the processed content
            console.log('Translation result:', processedContent);

            // Validate translation actually occurred
            if (!this._validateTranslationResult(processedContent, targetLang)) {
                this.updateProcessingStatus('Translation validation failed - content may not have been translated properly');
                console.warn('Translation validation failed:', processedContent);
            }

            // Generate and open result
            this.updateProcessingStatus('Translation completed! Generating bilingual page...', 'Opening in new tab');
            BileTabGenerator.openInNewTab(processedContent);

            this.updateProcessingStatus('Success! Bilingual page opened in new tab', 'Process completed');

            // Brief delay to show success message
            setTimeout(() => {
                this.hideProcessingIndicator();
                this._showSuccessIndicator();
            }, 1500);

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
        const apiKey = prompt(`Bile needs your OpenRouter API key to function.

Get your FREE API key from: https://openrouter.ai/keys
- Create an account (free)
- Generate an API key
- No credit card required for free models!

Enter your OpenRouter API key:`);

        if (!apiKey) {
            return false;
        }

        try {
            await BileStorage.storeApiKey(apiKey);
            this._showSuccessMessage('OpenRouter API key saved successfully!');
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

        // Look for common article containers - use shared selectors
        const BileConstants = window.BileConstants;
        const articleSelectors = BileConstants ? 
            BileConstants.UI_SELECTORS.ARTICLE_CONTAINERS : 
            [
                'article', '[role="article"]', '.article-content', '.article-body',
                '.post-content', '.entry-content', '.content-body',
                '.text-content', '.article-text', '.story-body', '.main-content',
                '.content', 'main', '#content', '.page-content'
            ];

        let articleElement = null;
        for (const selector of articleSelectors) {
            articleElement = document.querySelector(selector);
            if (articleElement) break;
        }

        if (articleElement) {
            // Extract text from paragraphs within the article - improved filtering
            const paragraphs = articleElement.querySelectorAll('p, div.paragraph, .text-block, h2, h3, h4');
            mainContent = Array.from(paragraphs)
                .map(p => p.textContent.trim())
                .filter(text => {
                    // Filter out navigation, ads, and short fragments
                    if (text.length < 30) return false;
                    if (text.match(/^(Home|Startseite|Navigation|Menu|Share|Follow|Subscribe|Login|Register)$/i)) return false;
                    if (text.match(/^(Gesellschaft|Politik|Kultur|Sport|Debatte|Kommentar|Meinung)$/i)) return false;
                    if (text.includes('Cookie') || text.includes('Datenschutz') || text.includes('Privacy')) return false;
                    return true;
                })
                .slice(0, 15) // Increased from 10 to 15 paragraphs
                .join('\n\n');
        }

        // Fallback: get all paragraphs from page with better filtering
        if (!mainContent || mainContent.length < 200) {
            const allParagraphs = document.querySelectorAll('p, div[class*="text"], div[class*="content"], div[class*="article"]');
            mainContent = Array.from(allParagraphs)
                .map(p => p.textContent.trim())
                .filter(text => {
                    // More aggressive filtering for fallback
                    if (text.length < 50) return false;
                    if (text.match(/^(Home|Startseite|Navigation|Menu|Share|Follow|Subscribe|Login|Register|Gesellschaft|Politik|Kultur|Sport|Debatte|Kommentar|Meinung)$/i)) return false;
                    if (text.includes('Cookie') || text.includes('©') || text.includes('Impressum')) return false;
                    if (text.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) return false; // Skip dates
                    return true;
                })
                .slice(0, 8) // Limit for fallback but allow more content
                .join('\n\n');
        }

        return `Title: ${title}\n\nContent:\n${mainContent}`.substring(0, 3000); // Increased limit for better content quality
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
        modal.style.cssText = BileUtils.getModalOverlayStyles({
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: '2147483648'
        }) + `
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

                const elementText = element.text || '';
                div.textContent = elementText.substring(0, 200) + (elementText.length > 200 ? '...' : '');
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
            const textStr = typeof text === 'string' ? text : String(text || '');
            div.textContent = textStr.substring(0, 500) + (textStr.length > 500 ? '...' : '');
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

        // Create and show processing modal
        this._createProcessingModal();
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

        // Hide processing modal
        this._hideProcessingModal();
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
    },

    /**
     * Create processing status modal
     * @private
     */
    _createProcessingModal() {
        // Remove existing processing modal
        const existingModal = document.getElementById('bile-processing-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'bile-processing-modal';
        modal.style.cssText = BileUtils.getModalOverlayStyles({
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: '2147483649'
        }) + `
            backdrop-filter: blur(4px);
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 24px;
            text-align: center;
        `;

        modalContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px auto;"></div>
                <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                    Processing Article
                </h2>
                <p style="margin: 0; color: #6b7280; font-size: 14px;" id="bile-processing-subtitle">
                    Initializing translation...
                </p>
            </div>

            <div id="bile-processing-status" style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: left; min-height: 120px; max-height: 200px; overflow-y: auto;">
                <div style="color: #6b7280; font-size: 13px; margin-bottom: 8px;">Status Updates:</div>
                <div id="bile-status-log" style="color: #374151; font-size: 13px; line-height: 1.4;">
                    <div>• Starting translation process...</div>
                </div>
            </div>
        `;

        // Add spinning animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Make modal focusable for accessibility
        modal.tabIndex = -1;
        modal.focus();
    },

    /**
     * Update processing status in modal
     * @param {string} status - Status message to display
     * @param {string} subtitle - Optional subtitle
     */
    updateProcessingStatus(status, subtitle = null) {
        const statusLog = document.getElementById('bile-status-log');
        const subtitleElement = document.getElementById('bile-processing-subtitle');

        if (statusLog) {
            const statusEntry = document.createElement('div');
            statusEntry.textContent = `• ${status}`;
            statusEntry.style.marginBottom = '4px';
            statusLog.appendChild(statusEntry);

            // Auto-scroll to bottom
            const statusContainer = document.getElementById('bile-processing-status');
            if (statusContainer) {
                statusContainer.scrollTop = statusContainer.scrollHeight;
            }
        }

        if (subtitle && subtitleElement) {
            subtitleElement.textContent = subtitle;
        }
    },

    /**
     * Hide processing modal
     * @private
     */
    _hideProcessingModal() {
        const modal = document.getElementById('bile-processing-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Validate that translation actually occurred
     * @private
     * @param {Object} result - Translation result
     * @param {string} targetLang - Expected target language
     * @returns {boolean} True if translation appears valid
     */
    _validateTranslationResult(result, targetLang) {
        try {
            // Check basic structure
            if (!result || !result.content || !Array.isArray(result.content)) {
                return false;
            }

            // Check target language matches
            if (result.target_language !== targetLang) {
                console.warn('Target language mismatch:', result.target_language, 'vs expected', targetLang);
            }

            // Check if any translation actually occurred
            let hasTranslation = false;
            let hasValidContent = false;

            for (const section of result.content) {
                if (section.original && section.translated) {
                    hasValidContent = true;

                    // Check if translated content is different from original
                    if (section.translated !== section.original &&
                        section.translated.length > 10 &&
                        !section.translated.includes('[Translation')) {
                        hasTranslation = true;
                        break;
                    }
                }
            }

            if (!hasValidContent) {
                console.warn('No valid content sections found');
                return false;
            }

            if (!hasTranslation) {
                console.warn('No actual translation detected - content appears identical');
                return false;
            }

            return true;

        } catch (error) {
            console.error('Translation validation error:', error);
            return false;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileUI;
}