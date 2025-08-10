#!/usr/bin/env node

/**
 * Real-world Performance Test - Test with actual OpenRouter API if key available
 */

// Load environment variables from .env file
try {
    require('dotenv').config();
} catch (error) {
    // dotenv not available, continue with system env vars
}

const BileCoreApiClient = require('../src/core/api-client.js');
const BileTranslationEngine = require('../src/core/translation-engine.js');
const fs = require('fs');

class RealWorldTestSuite {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
    }

    async runRealTests() {
        console.log('🌍 Real-World Performance Test');
        console.log('=============================\n');

        if (!this.apiKey) {
            console.log('⚠️  No API key found in OPENROUTER_API_KEY environment variable');
            console.log('   Skipping real API tests\n');
            return;
        }

        console.log('🔑 API key found, testing real performance...\n');

        // Test different sizes and timeout configurations
        await this.testDifferentTimeouts();
        await this.testContentSizes();
    }

    async testDifferentTimeouts() {
        console.log('⏱️  Testing Different Timeout Settings');
        console.log('=====================================');

        const timeouts = [10000, 30000, 60000]; // 10s, 30s, 60s
        const testContent = {
            title: 'Short Test',
            content: [{ type: 'paragraph', text: 'This is a short test sentence for translation timing.' }]
        };

        for (const timeout of timeouts) {
            console.log(`\n🕐 Testing ${timeout/1000}s timeout...`);
            
            const client = new BileCoreApiClient(this.apiKey, { 
                timeout: timeout, 
                debug: true 
            });
            
            const startTime = Date.now();
            try {
                const result = await client.translate(testContent, 'en');
                const duration = Date.now() - startTime;
                
                console.log(`   ✅ SUCCESS in ${duration}ms`);
                console.log(`   Source: ${result.source_language || 'unknown'}`);
                console.log(`   Paragraphs: ${result.content?.length || 0}`);
                
                if (result.content?.[0]?.translated) {
                    console.log(`   Sample: "${result.content[0].translated.substring(0, 50)}..."`);
                }
                
            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`   ❌ FAILED in ${duration}ms`);
                console.log(`   Error: ${error.message}`);
                
                if (error.message.includes('timed out')) {
                    console.log(`   🚨 TIMEOUT - ${timeout}ms may be too short for this content`);
                }
            }
        }
    }

    async testContentSizes() {
        console.log('\n\n📏 Testing Content Size Performance');
        console.log('====================================');

        const fixtures = [
            { file: 'test/fixtures/article-short.txt', name: 'Short', expectedTime: 5000 },
            { file: 'test/fixtures/article-medium.txt', name: 'Medium', expectedTime: 15000 },
            { file: 'test/fixtures/article-long.txt', name: 'Long', expectedTime: 30000 }
        ];

        for (const fixture of fixtures) {
            console.log(`\n📄 Testing ${fixture.name} content...`);
            
            const content = this.parseContentFile(fixture.file);
            const textLength = content.content.map(c => c.text).join(' ').length;
            console.log(`   Length: ${textLength} characters`);
            
            // Use translation engine for full processing pipeline
            const engine = new BileTranslationEngine(this.apiKey, { 
                timeout: 60000, // Long timeout for comprehensive test
                debug: true 
            });
            
            const startTime = Date.now();
            try {
                const result = await engine.translateContent(content, 'en');
                const duration = Date.now() - startTime;
                
                console.log(`   ✅ SUCCESS in ${duration}ms (expected <${fixture.expectedTime}ms)`);
                console.log(`   Efficiency: ${duration <= fixture.expectedTime ? 'GOOD' : 'SLOW'}`);
                console.log(`   Translated paragraphs: ${result.content?.length || 0}`);
                
                // Check for chunking
                if (textLength > 1200) {
                    console.log(`   Chunking: ${duration > 10000 ? 'Likely used' : 'Fast response'}`);
                }
                
            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`   ❌ FAILED in ${duration}ms`);
                console.log(`   Error: ${error.message}`);
                
                if (error.message.includes('timed out')) {
                    console.log(`   🚨 TIMEOUT - Content too large for current timeout settings`);
                } else {
                    console.log(`   🔍 Non-timeout failure - investigate further`);
                }
            }
        }
    }

    parseContentFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const title = lines[0] || 'Untitled';
        const paragraphs = lines.slice(1).map(line => ({
            type: 'paragraph',
            text: line.trim()
        })).filter(p => p.text);

        return { title, content: paragraphs };
    }
}

// Main execution
async function main() {
    const suite = new RealWorldTestSuite();
    await suite.runRealTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = RealWorldTestSuite;