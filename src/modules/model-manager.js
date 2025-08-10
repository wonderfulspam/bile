/**
 * Bile Model Manager
 * Handles model selection, performance tracking, and failover logic
 */

const BileModelManager = {
    // Performance tracking storage key
    PERFORMANCE_KEY: 'bile_model_performance',

    // Current performance data cache
    performanceCache: null,

    // Failover state
    failoverState: {
        currentAttempt: 0,
        excludedModels: [],
        lastFailure: null
    },

    /**
     * Initialize the model manager
     */
    async initialize() {
        try {
            await this.loadPerformanceData();
        } catch (error) {
            console.warn('Failed to load model performance data:', error);
            this.performanceCache = this._createEmptyPerformanceData();
        }
    },

    /**
     * Select optimal model based on criteria and performance history
     * @param {Object} criteria - Selection criteria
     * @returns {string} Selected model ID
     */
    selectOptimalModel(criteria = {}) {
        const {
            sourceLanguage = 'en',
            targetLanguage = 'en',
            contentType = 'blog',
            contentLength = 1000,
            excludeModels = []
        } = criteria;

        // Combine excluded models with failed models
        const allExcluded = [...excludeModels, ...this.failoverState.excludedModels];

        // Get base recommendation from config
        const configRecommendation = BileModelConfig.getOptimalModel({
            sourceLanguage,
            targetLanguage,
            contentType,
            contentLength,
            excludeModels: allExcluded
        });

        // Apply performance-based adjustments
        return this._adjustForPerformance(configRecommendation, {
            sourceLanguage,
            targetLanguage,
            contentType,
            excludeModels: allExcluded
        });
    },

    /**
     * Track translation attempt result
     * @param {string} modelId - Model that was used
     * @param {Object} result - Attempt result
     * @param {boolean} result.success - Whether attempt succeeded
     * @param {number} result.responseTime - Response time in ms
     * @param {number} result.quality - Quality score (0-1)
     * @param {string} result.error - Error message if failed
     */
    trackAttempt(modelId, result) {
        try {
            const performance = this.performanceCache || this._createEmptyPerformanceData();

            // Initialize model data if needed
            if (!performance.models[modelId]) {
                performance.models[modelId] = this._createModelPerformanceData();
            }

            const modelData = performance.models[modelId];

            // Update counters
            modelData.totalAttempts++;
            if (result.success) {
                modelData.successCount++;
                this._resetFailoverState();
            } else {
                modelData.failureCount++;
                this._handleFailure(modelId, result.error);
            }

            // Update timing
            if (result.responseTime) {
                modelData.totalResponseTime += result.responseTime;
                modelData.averageResponseTime = modelData.totalResponseTime / modelData.successCount;
            }

            // Update quality
            if (result.quality && result.success) {
                modelData.qualitySum += result.quality;
                modelData.averageQuality = modelData.qualitySum / modelData.successCount;
            }

            // Update last used timestamp
            modelData.lastUsed = Date.now();

            // Calculate composite score
            this._updateModelScore(modelId);

            // Save performance data (async, don't block)
            this._savePerformanceData().catch(error => {
                console.warn('Failed to save performance data:', error);
            });

        } catch (error) {
            console.error('Failed to track model attempt:', error);
        }
    },

    /**
     * Get next model for failover
     * @param {Object} criteria - Selection criteria
     * @returns {string|null} Next model to try or null if exhausted
     */
    getFailoverModel(criteria = {}) {
        this.failoverState.currentAttempt++;

        // Get all available models
        const availableModels = BileModelConfig.getAllModels();
        const excludeModels = [...(criteria.excludeModels || []), ...this.failoverState.excludedModels];

        // Find unused models
        const unusedModels = availableModels.filter(modelId => !excludeModels.includes(modelId));

        if (unusedModels.length === 0) {
            return null; // No more models to try
        }

        // Sort by performance score (best first)
        const sortedModels = this._sortModelsByPerformance(unusedModels, criteria);

        return sortedModels[0] || null;
    },

    /**
     * Reset failover state after successful translation
     */
    resetFailover() {
        this.failoverState = {
            currentAttempt: 0,
            excludedModels: [],
            lastFailure: null
        };
    },

    /**
     * Get model performance statistics
     * @param {string} modelId - Model identifier
     * @returns {Object} Performance stats
     */
    getModelStats(modelId) {
        const performance = this.performanceCache || this._createEmptyPerformanceData();
        const modelData = performance.models[modelId];

        if (!modelData) {
            return {
                attempts: 0,
                successRate: 0,
                averageResponseTime: 0,
                averageQuality: 0,
                score: 0,
                lastUsed: null
            };
        }

        return {
            attempts: modelData.totalAttempts,
            successRate: modelData.totalAttempts > 0 ? modelData.successCount / modelData.totalAttempts : 0,
            averageResponseTime: modelData.averageResponseTime,
            averageQuality: modelData.averageQuality,
            score: modelData.compositeScore,
            lastUsed: modelData.lastUsed
        };
    },

    /**
     * Get all model statistics for debugging/UI
     * @returns {Object} All model statistics
     */
    getAllModelStats() {
        const stats = {};
        const availableModels = BileModelConfig.getAllModels();

        for (const modelId of availableModels) {
            stats[modelId] = {
                ...this.getModelStats(modelId),
                config: BileModelConfig.getModelDisplayInfo(modelId)
            };
        }

        return stats;
    },

    /**
     * Clear performance data (for testing/reset)
     */
    async clearPerformanceData() {
        this.performanceCache = this._createEmptyPerformanceData();
        await this._savePerformanceData();
    },

    // Private methods

    /**
     * Load performance data from storage
     * @private
     */
    async loadPerformanceData() {
        try {
            if (typeof BileStorage !== 'undefined') {
                const data = await BileStorage.get(this.PERFORMANCE_KEY);
                this.performanceCache = data ? JSON.parse(data) : this._createEmptyPerformanceData();
            } else {
                // Fallback to localStorage
                const data = localStorage.getItem(this.PERFORMANCE_KEY);
                this.performanceCache = data ? JSON.parse(data) : this._createEmptyPerformanceData();
            }
        } catch (error) {
            console.warn('Failed to parse performance data:', error);
            this.performanceCache = this._createEmptyPerformanceData();
        }
    },

    /**
     * Save performance data to storage
     * @private
     */
    async _savePerformanceData() {
        try {
            const data = JSON.stringify(this.performanceCache);

            if (typeof BileStorage !== 'undefined') {
                await BileStorage.set(this.PERFORMANCE_KEY, data);
            } else {
                localStorage.setItem(this.PERFORMANCE_KEY, data);
            }
        } catch (error) {
            console.warn('Failed to save performance data:', error);
        }
    },

    /**
     * Create empty performance data structure
     * @private
     */
    _createEmptyPerformanceData() {
        return {
            version: '1.0',
            created: Date.now(),
            models: {}
        };
    },

    /**
     * Create empty model performance data
     * @private
     */
    _createModelPerformanceData() {
        return {
            totalAttempts: 0,
            successCount: 0,
            failureCount: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            qualitySum: 0,
            averageQuality: 0,
            compositeScore: 0.5, // Neutral starting score
            lastUsed: null,
            firstUsed: Date.now()
        };
    },

    /**
     * Adjust model selection based on performance history
     * @private
     */
    _adjustForPerformance(recommendedModel, criteria) {
        const performance = this.performanceCache || this._createEmptyPerformanceData();

        // If recommended model has poor performance, try alternatives
        const modelStats = this.getModelStats(recommendedModel);

        if (modelStats.attempts >= 3 && modelStats.successRate < 0.5) {
            // Find better performing alternative
            const alternatives = BileModelConfig.getModelsForLanguage(criteria.targetLanguage)
                .filter(modelId => modelId !== recommendedModel)
                .filter(modelId => !criteria.excludeModels.includes(modelId));

            for (const altModel of alternatives) {
                const altStats = this.getModelStats(altModel);
                if (altStats.successRate > modelStats.successRate || altStats.attempts === 0) {
                    return altModel;
                }
            }
        }

        return recommendedModel;
    },

    /**
     * Handle model failure
     * @private
     */
    _handleFailure(modelId, error) {
        // Add to excluded models for current session
        if (!this.failoverState.excludedModels.includes(modelId)) {
            this.failoverState.excludedModels.push(modelId);
        }

        this.failoverState.lastFailure = {
            model: modelId,
            error: error,
            timestamp: Date.now()
        };
    },

    /**
     * Reset failover state after success
     * @private
     */
    _resetFailoverState() {
        // Only reset if we had some failures
        if (this.failoverState.currentAttempt > 0) {
            this.failoverState = {
                currentAttempt: 0,
                excludedModels: [],
                lastFailure: null
            };
        }
    },

    /**
     * Update composite score for model
     * @private
     */
    _updateModelScore(modelId) {
        const modelData = this.performanceCache.models[modelId];
        if (!modelData) return;

        const weights = BileModelConfig.PERFORMANCE_WEIGHTS;
        let score = 0;

        // Success rate component
        const successRate = modelData.totalAttempts > 0 ? modelData.successCount / modelData.totalAttempts : 0.5;
        score += successRate * weights.success_rate;

        // Response time component (normalized, lower is better)
        const avgTime = modelData.averageResponseTime || 30000; // 30s default
        const timeScore = Math.max(0, 1 - (avgTime - 5000) / 45000); // 5-50s range
        score += timeScore * weights.response_time;

        // Quality component
        score += (modelData.averageQuality || 0.5) * weights.translation_quality;

        // Recency component (favor recently used models)
        const hoursSinceUsed = modelData.lastUsed ? (Date.now() - modelData.lastUsed) / (1000 * 60 * 60) : 168;
        const recencyScore = Math.max(0, 1 - hoursSinceUsed / 168); // 1 week decay
        score += recencyScore * weights.user_satisfaction;

        modelData.compositeScore = Math.max(0, Math.min(1, score));
    },

    /**
     * Sort models by performance score
     * @private
     */
    _sortModelsByPerformance(modelIds, criteria) {
        return [...modelIds].sort((a, b) => {
            const statsA = this.getModelStats(a);
            const statsB = this.getModelStats(b);

            // Prioritize models that support the language pair
            const supportsA = BileModelConfig.supportsLanguagePair(a, criteria.sourceLanguage, criteria.targetLanguage);
            const supportsB = BileModelConfig.supportsLanguagePair(b, criteria.sourceLanguage, criteria.targetLanguage);

            if (supportsA && !supportsB) return -1;
            if (!supportsA && supportsB) return 1;

            // Then sort by performance score
            return statsB.score - statsA.score;
        });
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    // Browser environment - initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => BileModelManager.initialize());
    } else {
        BileModelManager.initialize();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BileModelManager;
}