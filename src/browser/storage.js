/**
 * Browser Storage Wrapper
 * Provides secure API key storage using Tampermonkey/browser APIs
 */

const BileStorage = {
    // Storage keys
    KEYS: {
        OPENROUTER_API_KEY: 'bile_openrouter_api_key',
        GROQ_API_KEY: 'bile_groq_api_key',
        PROVIDER: 'bile_api_provider',
        MODEL_PREFERENCE: 'bile_model_preference',
        LANGUAGE_PREFERENCE: 'bile_language_preference',
        SETTINGS: 'bile_settings'
    },

    /**
     * Get API provider preference
     * @returns {Promise<string>} Provider ('groq' or 'openrouter')
     */
    async getProvider() {
        try {
            const stored = typeof GM_getValue !== 'undefined'
                ? GM_getValue(this.KEYS.PROVIDER, null)
                : localStorage.getItem(this.KEYS.PROVIDER);
            
            return stored || 'groq'; // Default to Groq
        } catch (error) {
            return 'groq';
        }
    },

    /**
     * Set API provider preference
     * @param {string} provider - Provider ('groq' or 'openrouter')
     */
    async setProvider(provider) {
        try {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(this.KEYS.PROVIDER, provider);
            } else {
                localStorage.setItem(this.KEYS.PROVIDER, provider);
            }
        } catch (error) {
            console.error('Failed to store provider preference:', error);
        }
    },

    /**
     * Get API key for specific provider
     * @param {string} provider - Provider name ('groq' or 'openrouter')
     * @returns {Promise<string|null>} API key or null if not found
     */
    async getApiKey(provider = null) {
        if (!provider) {
            provider = await this.getProvider();
        }

        try {
            const keyName = provider === 'groq' ? this.KEYS.GROQ_API_KEY : this.KEYS.OPENROUTER_API_KEY;
            
            // Try GM storage first
            if (typeof GM_getValue !== 'undefined') {
                return GM_getValue(keyName, null);
            }

            // Fallback to localStorage (less secure)
            return localStorage.getItem(keyName);
        } catch (error) {
            console.warn('Storage access failed:', error);
            return null;
        }
    },

    /**
     * Store API key for specific provider
     * @param {string} provider - Provider name ('groq' or 'openrouter')
     * @param {string} apiKey - The API key to store
     * @returns {Promise<boolean>} Success status
     */
    async setApiKey(provider, apiKey) {
        try {
            const keyName = provider === 'groq' ? this.KEYS.GROQ_API_KEY : this.KEYS.OPENROUTER_API_KEY;
            
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(keyName, apiKey);
            } else {
                localStorage.setItem(keyName, apiKey);
            }
            return true;
        } catch (error) {
            console.error('Failed to store API key:', error);
            return false;
        }
    },

    /**
     * Check if API key exists for current or specified provider
     * @param {string} provider - Provider to check (default: current provider)
     * @returns {Promise<boolean>} True if API key exists
     */
    async hasApiKey(provider = null) {
        const apiKey = await this.getApiKey(provider);
        return apiKey && apiKey.length > 10;
    },

    /**
     * Get all API keys
     * @returns {Promise<Object>} Object with provider keys
     */
    async getAllApiKeys() {
        return {
            openrouter: await this.getApiKey('openrouter'),
            groq: await this.getApiKey('groq')
        };
    },

    /**
     * Get model preference
     * @returns {Promise<string>} Preferred model
     */
    async getModelPreference() {
        try {
            if (typeof GM_getValue !== 'undefined') {
                return GM_getValue(this.KEYS.MODEL_PREFERENCE, 'moonshotai/kimi-k2:free');
            }
            return localStorage.getItem(this.KEYS.MODEL_PREFERENCE) || 'moonshotai/kimi-k2:free';
        } catch (error) {
            return 'moonshotai/kimi-k2:free';
        }
    },

    /**
     * Set model preference
     * @param {string} model - Model to prefer
     */
    async setModelPreference(model) {
        try {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(this.KEYS.MODEL_PREFERENCE, model);
            } else {
                localStorage.setItem(this.KEYS.MODEL_PREFERENCE, model);
            }
        } catch (error) {
            console.error('Failed to store model preference:', error);
        }
    },

    /**
     * Get language preference
     * @returns {Promise<string>} Preferred target language
     */
    async getLanguagePreference() {
        try {
            const stored = typeof GM_getValue !== 'undefined' 
                ? GM_getValue(this.KEYS.LANGUAGE_PREFERENCE, null)
                : localStorage.getItem(this.KEYS.LANGUAGE_PREFERENCE);
            
            if (stored) return stored;

            // Auto-detect from browser language
            const browserLang = navigator.language || navigator.userLanguage || 'en';
            return browserLang.split('-')[0]; // e.g., 'en-US' -> 'en'
        } catch (error) {
            return 'en';
        }
    },

    /**
     * Set language preference
     * @param {string} language - Language code
     */
    async setLanguagePreference(language) {
        try {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(this.KEYS.LANGUAGE_PREFERENCE, language);
            } else {
                localStorage.setItem(this.KEYS.LANGUAGE_PREFERENCE, language);
            }
        } catch (error) {
            console.error('Failed to store language preference:', error);
        }
    },

    /**
     * Get all settings
     * @returns {Promise<Object>} Settings object
     */
    async getSettings() {
        try {
            const settings = typeof GM_getValue !== 'undefined'
                ? GM_getValue(this.KEYS.SETTINGS, '{}')
                : localStorage.getItem(this.KEYS.SETTINGS) || '{}';
            
            return JSON.parse(settings);
        } catch (error) {
            return {};
        }
    },

    /**
     * Update settings
     * @param {Object} newSettings - Settings to update
     */
    async updateSettings(newSettings) {
        try {
            const current = await this.getSettings();
            const updated = { ...current, ...newSettings };
            const serialized = JSON.stringify(updated);
            
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(this.KEYS.SETTINGS, serialized);
            } else {
                localStorage.setItem(this.KEYS.SETTINGS, serialized);
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    },

    /**
     * Clear all stored data
     */
    async clearAll() {
        try {
            if (typeof GM_deleteValue !== 'undefined') {
                Object.values(this.KEYS).forEach(key => {
                    try {
                        GM_deleteValue(key);
                    } catch (e) {
                        console.warn('Failed to delete GM value:', key);
                    }
                });
            } else {
                Object.values(this.KEYS).forEach(key => {
                    try {
                        localStorage.removeItem(key);
                    } catch (e) {
                        console.warn('Failed to remove localStorage item:', key);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }
};

// Make available globally for userscript
if (typeof window !== 'undefined') {
    window.BileStorage = BileStorage;
}