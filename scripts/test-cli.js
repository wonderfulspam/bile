#!/usr/bin/env node

/**
 * CLI Test Script for Bile Core Modules
 * Tests core functionality without browser dependencies
 */

const path = require('path');

// Import core modules (runtime-agnostic)
const BileCoreUtils = require('../src/core/utils.js');
const BileCoreApiClient = require('../src/core/api-client.js');
const BileTranslationEngine = require('../src/core/translation-engine.js');
const BileContentAnalyzer = require('../src/core/content-analyzer.js');
const BileModelManager = require('../src/core/model-manager.js');

// Mock storage for CLI testing
class MockStorage {
    constructor() {
        this.storage = new Map();
    }

    async getApiKey() {
        return this.storage.get('bile_openrouter_api_key') || process.env.BILE_API_KEY || null;
    }

    async setApiKey(key) {
        this.storage.set('bile_openrouter_api_key', key);
    }

    async getTargetLanguage() {
        return this.storage.get('bile_target_language') || 'en';
    }

    async setTargetLanguage(lang) {
        this.storage.set('bile_target_language', lang);
    }
}

class BileCliTester {
    constructor() {
        this.storage = new MockStorage();
        this.testsPassed = 0;
        this.testsTotal = 0;
    }

    /**
     * Run all CLI tests
     */
    async runTests() {
        console.log('🧪 Bile CLI Test Suite');
        console.log('========================\n');

        await this.testCoreUtils();
        await this.testApiClient();
        await this.testContentAnalyzer();
        await this.testModelManager();
        
        // Only test translation engine if API key is available
        const apiKey = await this.storage.getApiKey();
        if (apiKey) {
            await this.testTranslationEngine();
        } else {
            console.log('⚠️  Skipping Translation Engine tests (no API key)');
            console.log('   Set BILE_API_KEY environment variable to test API calls\n');
        }

        this.printSummary();
    }

    /**
     * Test core utilities
     */
    async testCoreUtils() {
        console.log('📦 Testing Core Utils...');
        this.testsTotal += 4;

        // Test language detection
        const germanText = 'Das ist ein deutscher Text mit und, der, die, das.';
        const detectedLang = BileCoreUtils.detectLanguage(germanText);
        this.assert(detectedLang === 'de', 'Language detection works', `Expected 'de', got '${detectedLang}'`);

        // Test word counting
        const wordCount = BileCoreUtils.getWordCount('Hello world test');
        this.assert(wordCount === 3, 'Word counting works', `Expected 3, got ${wordCount}`);

        // Test URL validation
        const isValid = BileCoreUtils.isValidUrl('https://example.com');
        this.assert(isValid === true, 'URL validation works', `Expected true, got ${isValid}`);

        // Test HTML sanitization
        const sanitized = BileCoreUtils.sanitizeHtml('<script>alert("test")</script>');
        this.assert(!sanitized.includes('<script>'), 'HTML sanitization works', `Result: ${sanitized}`);

        console.log('');
    }

    /**
     * Test API client (without making actual API calls)
     */
    async testApiClient() {
        console.log('🌐 Testing API Client...');
        this.testsTotal += 2;

        // Test client creation
        try {
            const client = new BileCoreApiClient('test-key');
            this.assert(client !== null, 'API client creation works');
        } catch (error) {
            this.assert(false, 'API client creation works', error.message);
        }

        // Test URL validation in client
        try {
            const client = new BileCoreApiClient('test-key');
            const isValidUrl = client.constructor.isValidUrl || BileCoreUtils.isValidUrl;
            const result = isValidUrl('https://api.openrouter.ai/api/v1/chat/completions');
            this.assert(result === true, 'API URL validation works');
        } catch (error) {
            this.assert(false, 'API URL validation works', error.message);
        }

        console.log('');
    }

    /**
     * Test content analyzer
     */
    async testContentAnalyzer() {
        console.log('📊 Testing Content Analyzer...');
        this.testsTotal += 2;

        // Mock content structure
        const mockContent = {
            title: 'Test Article',
            content: [
                { type: 'paragraph', text: 'This is a test paragraph with some content.' },
                { type: 'paragraph', text: 'Another paragraph for testing.' }
            ]
        };

        try {
            const analysis = BileContentAnalyzer.analyzeContentStructure(mockContent);
            this.assert(typeof analysis === 'object', 'Content analysis returns object');
            this.assert(analysis.hasOwnProperty('structure'), 'Analysis contains structure property');
        } catch (error) {
            this.assert(false, 'Content analysis works', error.message);
        }

        console.log('');
    }

    /**
     * Test model manager
     */
    async testModelManager() {
        console.log('🤖 Testing Model Manager...');
        this.testsTotal += 2;

        try {
            // Test model configuration access
            const hasGetBestModel = typeof BileModelManager.getBestAvailableModel === 'function';
            this.assert(hasGetBestModel, 'Model manager has getBestAvailableModel method');

            // Test model fallback logic  
            const hasGetFallbackModel = typeof BileModelManager.getFallbackModel === 'function';
            this.assert(hasGetFallbackModel, 'Model manager has getFallbackModel method');
        } catch (error) {
            this.assert(false, 'Model manager basic functionality', error.message);
        }

        console.log('');
    }

    /**
     * Test translation engine with actual API call (if API key available)
     */
    async testTranslationEngine() {
        console.log('🌍 Testing Translation Engine...');
        this.testsTotal += 2;

        const apiKey = await this.storage.getApiKey();
        if (!apiKey) {
            console.log('⚠️  Skipping - no API key provided\n');
            return;
        }

        try {
            const engine = new BileTranslationEngine(apiKey);
            this.assert(engine !== null, 'Translation engine creation works');

            // Test with simple content (actual API call)
            console.log('   Making test API call...');
            const testContent = {
                title: 'Hello World',
                content: [
                    { type: 'paragraph', text: 'This is a simple test.' }
                ]
            };

            const result = await engine.translateContent(testContent, 'de', { maxRetries: 1 });
            this.assert(result !== null, 'Translation API call works', 'Got response from API');
            
            console.log('   ✅ API call successful!');
        } catch (error) {
            console.log(`   ❌ API call failed: ${error.message}`);
            this.assert(false, 'Translation API call works', error.message);
        }

        console.log('');
    }

    /**
     * Assert helper
     */
    assert(condition, description, details = '') {
        if (condition) {
            console.log(`   ✅ ${description}`);
            this.testsPassed++;
        } else {
            console.log(`   ❌ ${description}${details ? ': ' + details : ''}`);
        }
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('========================');
        console.log(`🧪 Tests completed: ${this.testsPassed}/${this.testsTotal} passed`);
        
        if (this.testsPassed === this.testsTotal) {
            console.log('🎉 All tests passed! CLI core is ready.');
        } else {
            console.log('⚠️  Some tests failed. Check output above.');
            process.exit(1);
        }
    }

    /**
     * Test with sample article content
     */
    async testWithSampleContent() {
        console.log('\n🔬 Testing with Sample Content...');
        
        const sampleArticle = {
            title: 'Climate Change Impact on European Agriculture',
            content: [
                { 
                    type: 'paragraph', 
                    text: 'Climate change is having a profound impact on agricultural practices across Europe. Farmers are adapting to new weather patterns and extreme events.' 
                },
                { 
                    type: 'paragraph', 
                    text: 'The Mediterranean region faces particular challenges with increased drought and heat waves affecting traditional crops like olives and grapes.' 
                }
            ]
        };

        // Test language detection on content
        const fullText = sampleArticle.content.map(c => c.text).join(' ');
        const language = BileCoreUtils.detectLanguage(fullText);
        console.log(`   Detected language: ${language}`);

        // Test reading time estimation
        const readingTime = BileCoreUtils.estimateReadingTime(fullText);
        console.log(`   Estimated reading time: ${readingTime} minutes`);

        // Test content analysis
        const analysis = BileContentAnalyzer.analyzeContentStructure(sampleArticle);
        console.log(`   Content structure: ${analysis.structure || 'unknown'}`);
        console.log(`   Complexity: ${analysis.complexity || 'unknown'}`);
    }
}

// CLI interface
async function main() {
    const tester = new BileCliTester();
    
    // Handle command line arguments
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
        console.log(`
Bile CLI Test Suite

Usage:
  npm test                 # Run all tests
  node scripts/test-cli.js # Run all tests directly
  
Environment Variables:
  BILE_API_KEY            # OpenRouter API key for translation tests

Options:
  --help                  # Show this help message
        `);
        process.exit(0);
    }

    try {
        await tester.runTests();
        await tester.testWithSampleContent();
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests if called directly
if (require.main === module) {
    main();
}

module.exports = BileCliTester;