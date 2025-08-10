#!/usr/bin/env node

/**
 * Performance Test Suite - Focused API timing analysis with Groq default
 */

// Environment variables loaded via Node.js --env-file flag or system env

const BileCoreApiClient = require('../src/core/api-client.js');
const BileTranslationEngine = require('../src/core/translation-engine.js');
const BileCoreUtils = require('../src/core/utils.js');

class PerformanceTestSuite {
    constructor() {
        this.results = [];
        this.client = BileCoreApiClient.create({ debug: false });
    }

    async runAllTests() {
        console.log('🎯 Bile Performance Test Suite');
        console.log('===============================\n');

        // Test 1: API Client initialization and configuration
        await this.testApiClientSetup();

        // Test 2: Timeout behavior with different settings
        await this.testTimeoutBehaviors();

        // Test 3: Content size impact on performance
        await this.testContentSizes();

        // Test 4: Real API calls with timing (Groq preferred)
        const config = await this.client.getConfig();
        if (config.hasApiKey) {
            await this.testRealApiCalls();
        } else {
            console.log('⚠️  No API key - skipping real API tests');
            console.log('   Set GROQ_API_KEY (preferred) or OPENROUTER_API_KEY to test performance\n');
        }

        // Test 5: Model failover logic
        await this.testModelFailover();

        // Summary
        this.printSummary();
    }

    async testApiClientSetup() {
        console.log('🔧 Testing API Client Setup...');

        const tests = [
            { name: 'Default timeout', options: {} },
            { name: 'Short timeout', options: { timeout: 5000 } },
            { name: 'Long timeout', options: { timeout: 60000 } },
            { name: 'Debug enabled', options: { debug: true } }
        ];

        for (const test of tests) {
            const startTime = Date.now();
            try {
                // Use proper client factory method
                const client = BileCoreApiClient.create(test.options);
                const setupTime = Date.now() - startTime;
                console.log(`   ✅ ${test.name}: ${setupTime}ms`);

                this.results.push({
                    test: 'setup',
                    name: test.name,
                    time: setupTime,
                    success: true
                });
            } catch (error) {
                console.log(`   ❌ ${test.name}: ${error.message}`);
                this.results.push({
                    test: 'setup',
                    name: test.name,
                    error: error.message,
                    success: false
                });
            }
        }
        console.log();
    }

    async testTimeoutBehaviors() {
        console.log('⏱️  Testing Timeout Behaviors...');

        const timeoutTests = [1000, 5000, 10000, 30000];

        for (const timeout of timeoutTests) {
            console.log(`   Testing ${timeout}ms timeout...`);
            // Use proper client creation like the main CLI test
            const client = BileCoreApiClient.create({ timeout, debug: false });

            const startTime = Date.now();
            try {
                // Use same format as CLI test
                await client.translate('Short test content', 'de');
            } catch (error) {
                const actualTime = Date.now() - startTime;
                const isTimeout = error.message.includes('timed out');
                const isExpectedTime = Math.abs(actualTime - timeout) < 1000; // Within 1s tolerance

                console.log(`     ${isTimeout ? '⏰' : '❌'} Failed in ${actualTime}ms (expected ~${timeout}ms)`);
                console.log(`     Error: ${error.message}`);

                this.results.push({
                    test: 'timeout',
                    expectedTimeout: timeout,
                    actualTime: actualTime,
                    isTimeout: isTimeout,
                    isExpectedTime: isExpectedTime,
                    error: error.message
                });
            }
        }
        console.log();
    }

    async testContentSizes() {
        console.log('📏 Testing Content Size Impact...');

        const fixtures = [
            { file: 'test/fixtures/article-short.txt', name: 'Short' },
            { file: 'test/fixtures/article-medium.txt', name: 'Medium' },
            { file: 'test/fixtures/article-long.txt', name: 'Long' }
        ];

        for (const fixture of fixtures) {
            const content = this.parseContentFile(fixture.file);
            const textLength = content.content.map(c => c.text).join(' ').length;

            console.log(`   ${fixture.name}: ${textLength} chars`);

            // Test with proper client (will skip if no API key)
            const startTime = Date.now();
            try {
                const client = BileCoreApiClient.create({ debug: false });
                const textContent = content.content.map(c => c.text).join(' ');
                await client.translate(textContent, 'en');
            } catch (error) {
                const processingTime = Date.now() - startTime;
                console.log(`     Processing time: ${processingTime}ms`);
                console.log(`     Error type: ${error.message.includes('timed out') ? 'Timeout' : 'Other'}`);

                this.results.push({
                    test: 'content-size',
                    name: fixture.name,
                    textLength: textLength,
                    processingTime: processingTime,
                    error: error.message
                });
            }
        }
        console.log();
    }

    async testRealApiCalls() {
        console.log('🌐 Testing Real API Calls...');

        // Use configured client with debug enabled
        const client = BileCoreApiClient.create({ timeout: 60000, debug: true });
        const config = await client.getConfig();
        console.log(`   Using provider: ${config.provider}`);

        // Test 1: Connection test
        console.log('   Testing API connection...');
        const startConnect = Date.now();
        try {
            const canConnect = await client.testConnection();
            const connectTime = Date.now() - startConnect;
            console.log(`   Connection: ${canConnect ? '✅' : '❌'} (${connectTime}ms)`);

            if (canConnect) {
                // Test 2: Small translation
                await this.testRealTranslation(client, 'test/fixtures/article-short.txt', 'Small');

                // Test 3: Medium translation
                await this.testRealTranslation(client, 'test/fixtures/article-medium.txt', 'Medium');
            }
        } catch (error) {
            console.log(`   Connection failed: ${error.message}`);
        }
        console.log();
    }

    async testRealTranslation(client, filePath, name) {
        console.log(`   Translating ${name} content...`);
        const content = this.parseContentFile(filePath);
        const startTime = Date.now();

        try {
            const result = await client.translate(content, 'en');
            const translationTime = Date.now() - startTime;

            console.log(`     ✅ Success in ${translationTime}ms`);
            console.log(`     Translated: ${result.content?.length || 0} paragraphs`);

            this.results.push({
                test: 'real-api',
                name: name,
                time: translationTime,
                success: true,
                paragraphs: result.content?.length || 0
            });
        } catch (error) {
            const failTime = Date.now() - startTime;
            console.log(`     ❌ Failed in ${failTime}ms: ${error.message}`);

            this.results.push({
                test: 'real-api',
                name: name,
                time: failTime,
                success: false,
                error: error.message
            });
        }
    }

    async testModelFailover() {
        console.log('🔄 Testing Model Failover Logic...');

        const BileModelManager = require('../src/core/model-manager.js');

        try {
            const bestModel = BileModelManager.getBestAvailableModel();
            const fallbackModel = BileModelManager.getFallbackModel();

            console.log(`   Best model: ${bestModel?.name || 'none'}`);
            console.log(`   Fallback model: ${fallbackModel?.name || 'none'}`);

            // Test model switching logic (if available)
            if (BileModelManager.getAllModels) {
                const allModels = BileModelManager.getAllModels();
                console.log(`   Available models: ${allModels.length}`);
            }

        } catch (error) {
            console.log(`   ❌ Model failover test failed: ${error.message}`);
        }
        console.log();
    }

    parseContentFile(filePath) {
        const content = require('fs').readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const title = lines[0] || 'Untitled';
        const paragraphs = lines.slice(1).map(line => ({
            type: 'paragraph',
            text: line.trim()
        })).filter(p => p.text);
        return { title, content: paragraphs };
    }

    printSummary() {
        console.log('📊 Performance Test Summary');
        console.log('==========================\n');

        // Group results by test type
        const grouped = this.results.reduce((acc, result) => {
            if (!acc[result.test]) acc[result.test] = [];
            acc[result.test].push(result);
            return acc;
        }, {});

        for (const [testType, results] of Object.entries(grouped)) {
            console.log(`${testType.toUpperCase()}:`);
            results.forEach(result => {
                if (result.success !== undefined) {
                    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}: ${result.time || result.actualTime}ms`);
                } else {
                    console.log(`  ⚠️  ${result.name}: ${result.error || 'No details'}`);
                }
            });
            console.log();
        }

        // Identify patterns
        const timeoutResults = grouped.timeout || [];
        const fastFailures = timeoutResults.filter(r => r.actualTime < 1000);
        const realTimeouts = timeoutResults.filter(r => r.isTimeout && r.isExpectedTime);

        console.log('🎯 Key Findings:');
        console.log(`- Fast failures (< 1s): ${fastFailures.length}/${timeoutResults.length}`);
        console.log(`- Real timeouts: ${realTimeouts.length}/${timeoutResults.length}`);

        if (fastFailures.length > realTimeouts.length) {
            console.log('⚠️  Most failures are NOT timeouts - likely connectivity/auth issues');
        }
    }
}

// Main execution
async function main() {
    const suite = new PerformanceTestSuite();
    await suite.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = PerformanceTestSuite;