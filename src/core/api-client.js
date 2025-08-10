/**
 * Core API Client - Runtime Agnostic
 * Main entry point that delegates to provider-specific clients
 */

// Load provider clients
const OpenRouterClient = (typeof require !== 'undefined') ? require('./providers/openrouter.js') : null;
const GroqClient = (typeof require !== 'undefined') ? require('./providers/groq.js') : null;

class BileCoreApiClient {
    constructor(options = {}) {
        // Handle legacy API key parameter
        if (typeof options === 'string') {
            const apiKey = options;
            options = arguments[1] || {};
            if (apiKey && apiKey.startsWith('sk-or-')) {
                options.openrouterKey = apiKey;
                options.provider = 'openrouter';
            }
        }

        this.options = options;
        this.debug = options.debug || false;
        this._initialized = false;
    }

    /**
     * Initialize the client (async)
     * @private
     */
    async _initialize() {
        if (this._initialized) return;

        this.config = await this._loadConfig(this.options);
        this.client = this._createProviderClient();
        this._initialized = true;
        
        if (this.debug) {
            console.log(`Initialized API client with provider: ${this.config.provider}`);
        }
    }

    async _loadConfig(options) {
        // Check if running in browser environment
        const isBrowser = typeof window !== 'undefined' && typeof BileStorage !== 'undefined';
        
        let provider, targetLanguage, openrouterKey, groqKey;
        
        if (isBrowser) {
            // Load from browser storage
            provider = await BileStorage.getProvider();
            targetLanguage = await BileStorage.getLanguagePreference();
            const apiKeys = await BileStorage.getAllApiKeys();
            openrouterKey = apiKeys.openrouter;
            groqKey = apiKeys.groq;
        } else {
            // Load from environment variables (CLI/Node.js)
            provider = process.env.BILE_API_PROVIDER || 'groq';
            targetLanguage = process.env.BILE_TARGET_LANGUAGE || 'en';
            openrouterKey = process.env.OPENROUTER_API_KEY;
            groqKey = process.env.GROQ_API_KEY;
        }
        
        return {
            provider: options.provider || provider,
            targetLanguage: options.targetLanguage || targetLanguage,
            strategy: options.strategy || 'minimal',
            timeout: options.timeout || 30000,
            
            // API keys from options or storage/environment
            openrouterKey: options.openrouterKey || openrouterKey,
            groqKey: options.groqKey || groqKey
        };
    }

    _createProviderClient() {
        switch (this.config.provider.toLowerCase()) {
            case 'groq':
                if (!this.config.groqKey) {
                    throw new Error('GROQ_API_KEY not found in environment or options');
                }
                if (!GroqClient) {
                    throw new Error('Groq client not available');
                }
                return new GroqClient(this.config.groqKey, {
                    strategy: this.config.strategy,
                    timeout: this.config.timeout,
                    debug: this.debug
                });

            case 'openrouter':
                if (!this.config.openrouterKey) {
                    throw new Error('OPENROUTER_API_KEY not found in environment or options');
                }
                if (!OpenRouterClient) {
                    throw new Error('OpenRouter client not available');
                }
                return new OpenRouterClient(this.config.openrouterKey, {
                    strategy: this.config.strategy,
                    timeout: this.config.timeout,
                    debug: this.debug
                });

            default:
                throw new Error(`Unsupported provider: ${this.config.provider}. Use 'openrouter' or 'groq'`);
        }
    }

    /**
     * Translate content using the configured provider
     */
    async translate(content, targetLang = null, options = {}) {
        await this._initialize();
        
        const lang = targetLang || this.config.targetLanguage;
        
        if (this.debug) {
            console.log(`Translating with ${this.config.provider} to ${lang}`);
        }

        try {
            const startTime = Date.now();
            const result = await this.client.translate(content, lang, options);
            const duration = Date.now() - startTime;
            
            // Add metadata
            result.metadata = {
                ...result.metadata,
                provider: this.config.provider,
                duration: duration
            };
            
            if (this.debug) {
                console.log(`Translation completed in ${duration}ms using ${this.config.provider}`);
            }
            
            return result;
        } catch (error) {
            if (this.debug) {
                console.error(`Translation failed with ${this.config.provider}:`, error.message);
            }
            throw error;
        }
    }

    /**
     * Test connection with the configured provider
     */
    async testConnection() {
        await this._initialize();
        
        if (this.debug) {
            console.log(`Testing connection with ${this.config.provider}...`);
        }
        
        try {
            const result = await this.client.testConnection();
            
            if (this.debug) {
                console.log(`Connection test ${result ? 'passed' : 'failed'} for ${this.config.provider}`);
            }
            
            return result;
        } catch (error) {
            if (this.debug) {
                console.error(`Connection test failed for ${this.config.provider}:`, error.message);
            }
            return false;
        }
    }

    /**
     * Get current configuration info
     */
    async getConfig() {
        await this._initialize();
        
        return {
            provider: this.config.provider,
            targetLanguage: this.config.targetLanguage,
            strategy: this.config.strategy,
            timeout: this.config.timeout,
            hasApiKey: this._hasValidApiKey()
        };
    }

    /**
     * Switch provider dynamically
     */
    async switchProvider(newProvider, options = {}) {
        await this._initialize();
        
        if (this.debug) {
            console.log(`Switching from ${this.config.provider} to ${newProvider}`);
        }

        this.config.provider = newProvider;
        Object.assign(this.config, options);
        this.client = this._createProviderClient();
        
        if (this.debug) {
            console.log(`Successfully switched to ${newProvider}`);
        }
        
        // Save provider preference to storage if in browser
        if (typeof window !== 'undefined' && typeof BileStorage !== 'undefined') {
            await BileStorage.setProvider(newProvider);
        }
    }

    _hasValidApiKey() {
        switch (this.config.provider) {
            case 'groq':
                return !!this.config.groqKey;
            case 'openrouter':
                return !!this.config.openrouterKey;
            default:
                return false;
        }
    }

    /**
     * Static method to create client
     */
    static create(options = {}) {
        return new BileCoreApiClient(options);
    }

    /**
     * Static method to compare providers (for benchmarking)
     */
    static async compareProviders(content, targetLang = 'en', options = {}) {
        const providers = ['groq', 'openrouter'];
        const results = {};
        
        for (const provider of providers) {
            try {
                const client = new BileCoreApiClient({ 
                    ...options, 
                    provider,
                    debug: options.debug || false
                });
                
                const startTime = Date.now();
                const result = await client.translate(content, targetLang);
                const duration = Date.now() - startTime;
                
                results[provider] = {
                    success: true,
                    duration,
                    tokens: result.metadata?.usage?.total_tokens,
                    strategy: result.metadata?.strategy,
                    model: result.metadata?.model
                };
                
            } catch (error) {
                results[provider] = {
                    success: false,
                    error: error.message.substring(0, 100)
                };
            }
        }
        
        return results;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileCoreApiClient;
} else if (typeof window !== 'undefined') {
    window.BileCoreApiClient = BileCoreApiClient;
}