/**
 * Bile Storage Module
 * Handles secure API key storage using Greasemonkey/Tampermonkey APIs
 */

const BileStorage = {
    /**
     * Store API key securely
     * @param {string} key - The API key to store
     * @throws {Error} If key is invalid
     */
    async storeApiKey(key) {
        if (!key || typeof key !== 'string' || key.trim().length === 0) {
            throw new Error('Invalid API key: must be a non-empty string');
        }

        // Basic API key format validation (OpenRouter keys)
        const trimmedKey = key.trim();
        if (trimmedKey.length < 10) {
            throw new Error('Invalid API key format: Key appears too short');
        }

        // Optional: More specific validation for known providers
        // Most API keys are alphanumeric with dashes/underscores

        try {
            GM_setValue('bile_api_key', trimmedKey);
            GM_setValue('bile_api_key_timestamp', Date.now());
        } catch (error) {
            throw new Error(`Failed to store API key: ${error.message}`);
        }
    },

    /**
     * Retrieve stored API key
     * @returns {Promise<string|null>} The stored API key or null if not found
     */
    async getApiKey() {
        try {
            return GM_getValue('bile_api_key', null);
        } catch (error) {
            console.error('Failed to retrieve API key:', error);
            return null;
        }
    },

    /**
     * Check if API key exists and is valid
     * @returns {Promise<boolean>} True if a valid API key exists
     */
    async hasApiKey() {
        try {
            const key = await this.getApiKey();
            return key !== null && key.length > 10;
        } catch (error) {
            console.error('Error checking API key:', error);
            return false;
        }
    },

    /**
     * Clear stored API key and related data
     */
    async clearApiKey() {
        try {
            GM_deleteValue('bile_api_key');
            GM_deleteValue('bile_api_key_timestamp');
        } catch (error) {
            console.error('Failed to clear API key:', error);
            throw new Error(`Failed to clear API key: ${error.message}`);
        }
    },

    /**
     * Get timestamp when API key was stored
     * @returns {Promise<number|null>} Timestamp or null if not found
     */
    async getApiKeyTimestamp() {
        try {
            return GM_getValue('bile_api_key_timestamp', null);
        } catch (error) {
            console.error('Failed to retrieve API key timestamp:', error);
            return null;
        }
    },

    /**
     * Store user preferences
     * @param {Object} preferences - User preference object
     */
    async storePreferences(preferences) {
        try {
            GM_setValue('bile_preferences', JSON.stringify(preferences));
        } catch (error) {
            throw new Error(`Failed to store preferences: ${error.message}`);
        }
    },

    /**
     * Retrieve user preferences
     * @returns {Promise<Object>} User preferences with defaults
     */
    async getPreferences() {
        const defaultPreferences = {
            targetLanguage: 'en',
            showKeyboardShortcuts: true,
            buttonPosition: 'top-right',
            theme: 'light'
        };

        try {
            const stored = GM_getValue('bile_preferences', null);
            if (stored) {
                return { ...defaultPreferences, ...JSON.parse(stored) };
            }
            return defaultPreferences;
        } catch (error) {
            console.error('Failed to retrieve preferences:', error);
            return defaultPreferences;
        }
    },

    /**
     * Generic get method for other modules
     * @param {string} key - Storage key
     * @returns {Promise<string|null>} Stored value or null
     */
    async get(key) {
        try {
            return GM_getValue(key, null);
        } catch (error) {
            console.error(`Failed to get value for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Generic set method for other modules
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     */
    async set(key, value) {
        try {
            GM_setValue(key, value);
        } catch (error) {
            console.error(`Failed to set value for key ${key}:`, error);
            throw new Error(`Failed to store data: ${error.message}`);
        }
    },

    /**
     * Clear all stored data
     */
    async clearAllData() {
        try {
            await this.clearApiKey();
            GM_deleteValue('bile_preferences');
            GM_deleteValue('bile_cached_translations');
            GM_deleteValue('bile_model_performance');
        } catch (error) {
            throw new Error(`Failed to clear all data: ${error.message}`);
        }
    }
};

// Export for use in other modules (Phase 1 uses inline approach)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileStorage;
}