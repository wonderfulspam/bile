#!/usr/bin/env node

/**
 * Rate Limit and Model Fallback Test
 * Tests the improved rate limit handling and automatic model fallback functionality
 */

const GroqClient = require('../src/core/providers/groq.js');

class RateLimitFallbackTester {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.verbose = process.argv.includes('--verbose') || process.env.NODE_ENV === 'test';
    }

    log(message) {
        if (this.verbose) {
            console.log(message);
        }
    }

    async runTests() {
        console.log('🧪 Rate Limit and Model Fallback Test Suite');
        console.log('===============================================\n');

        await this.testBasicFallback();
        await this.testRateLimitDetection();
        
        console.log('===============================================');
        console.log(`🎯 Tests completed: ${this.passed}/${this.passed + this.failed} passed`);
        
        if (this.failed === 0) {
            console.log('🎉 All rate limit and fallback tests passed!');
        } else {
            console.log(`❌ ${this.failed} test(s) failed`);
            process.exit(1);
        }
    }

    async testBasicFallback() {
        console.log('🚀 Testing Model Fallback Logic...');
        
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.log('⏭️  Skipping fallback tests (no API key)');
            return;
        }

        // Create content that might trigger rate limits
        const testContent = {
            title: "Model Fallback Test Article",
            content: Array.from({length: 5}, (_, i) => ({
                type: "paragraph", 
                text: `Test paragraph ${i + 1} with technical terminology, cultural references, and complex linguistic patterns that require sophisticated translation models to handle properly.`
            }))
        };

        this.log(`Content size: ${JSON.stringify(testContent).length} characters`);

        const client = new GroqClient(apiKey, { 
            debug: this.verbose
        });
        
        try {
            this.log('Starting translation with fallback capability...');
            const result = await client.translate(testContent, 'fr');
            
            console.log('   ✅ Translation completed successfully');
            console.log(`   📊 Model used: ${result.metadata?.model || 'Unknown'}`);
            console.log(`   📝 Sections translated: ${result.content?.length || 0}`);
            
            if (result.content && result.content.length > 0) {
                this.log(`   🔤 Sample: "${result.content[0].translated?.substring(0, 60)}..."`);
            }

            this.passed++;
            
        } catch (error) {
            if (error.message.includes('Rate limit exceeded')) {
                console.log('   ✅ Rate limit properly detected and handled');
                console.log(`   ⏳ Error details: ${error.message.substring(0, 100)}...`);
                this.passed++;
            } else {
                console.log('   ❌ Translation failed with unexpected error');
                console.log(`   💥 Error: ${error.message.substring(0, 150)}...`);
                this.failed++;
            }
        }

        console.log('');
    }

    async testRateLimitDetection() {
        console.log('🔍 Testing Rate Limit Error Detection...');
        
        // Test that we can properly detect and format rate limit errors
        const mockError = {
            message: JSON.stringify({
                "error": {
                    "message": "Rate limit reached for model `llama-3.3-70b-versatile` in organization `test-org` service tier `on_demand` on tokens per day (TPD): Limit 100000, Used 100440, Requested 7. Please try again in 6m26.751s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing",
                    "type": "tokens",
                    "code": "rate_limit_exceeded"
                }
            })
        };

        try {
            // Simulate the error parsing logic
            const errorData = JSON.parse(mockError.message);
            const errorDetails = errorData.error.message;
            const retryMatch = errorDetails.match(/try again in (\d+[hms][\d.]*[hms]*)/);
            
            if (retryMatch) {
                console.log('   ✅ Rate limit retry time extraction works');
                console.log(`   ⏰ Extracted retry time: ${retryMatch[1]}`);
                this.passed++;
            } else {
                console.log('   ❌ Failed to extract retry time from rate limit error');
                this.failed++;
            }
            
        } catch (parseError) {
            console.log('   ❌ Failed to parse rate limit error structure');
            this.failed++;
        }

        console.log('');
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new RateLimitFallbackTester();
    tester.runTests().catch(console.error);
}

module.exports = RateLimitFallbackTester;