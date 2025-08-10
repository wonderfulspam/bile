#!/usr/bin/env node

/**
 * API Debug Tool - Test API calls with detailed timing and error analysis
 */

// Load environment variables from .env file
try {
    require('dotenv').config();
} catch (error) {
    // dotenv not available, continue with system env vars
}

const BileCoreApiClient = require('../src/core/api-client.js');
const fs = require('fs');

class ApiDebugger {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async runDebugTests() {
        console.log('🔬 API Debug Test Suite');
        console.log('========================\n');

        if (!this.apiKey) {
            console.log('⚠️  No API key provided. Testing without actual API calls...\n');
            await this.testTimeout();
            return;
        }

        // Test with different timeouts and content sizes
        await this.testApiCalls();
    }

    async testTimeout() {
        console.log('🕒 Testing timeout behavior...');
        
        const client = new BileCoreApiClient('fake-key', { 
            timeout: 1000, // 1 second timeout
            debug: true 
        });

        const startTime = Date.now();
        try {
            await client.translate({
                title: 'Test',
                content: [{ type: 'paragraph', text: 'Test content' }]
            }, 'de');
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`   ❌ Expected timeout after ~1000ms, got: ${duration}ms`);
            console.log(`   Error: ${error.message}`);
        }
        console.log();
    }

    async testApiCalls() {
        const testCases = [
            { file: 'test/fixtures/article-short.txt', timeout: 10000, name: 'Short Article' },
            { file: 'test/fixtures/article-medium.txt', timeout: 30000, name: 'Medium Article' },
            { file: 'test/fixtures/article-long.txt', timeout: 60000, name: 'Long Article' }
        ];

        for (const testCase of testCases) {
            await this.testSingleTranslation(testCase);
        }
    }

    async testSingleTranslation({ file, timeout, name }) {
        console.log(`🌍 Testing ${name} (timeout: ${timeout/1000}s)...`);
        
        try {
            // Read and prepare content
            const content = this.parseContentFile(file);
            const textLength = content.content.map(c => c.text).join(' ').length;
            console.log(`   Content length: ${textLength} characters`);

            // Create client with debug enabled
            const client = new BileCoreApiClient(this.apiKey, { 
                timeout: timeout,
                debug: true 
            });

            // Test connection first
            console.log('   Testing connection...');
            const startConnect = Date.now();
            const canConnect = await client.testConnection();
            const connectDuration = Date.now() - startConnect;
            console.log(`   Connection test: ${canConnect ? '✅' : '❌'} (${connectDuration}ms)`);

            if (!canConnect) {
                console.log('   Skipping translation test due to connection failure\n');
                return;
            }

            // Test translation
            console.log('   Starting translation...');
            const startTime = Date.now();
            
            const result = await client.translate(content, 'en');
            
            const duration = Date.now() - startTime;
            console.log(`   ✅ Translation completed in ${duration}ms`);
            console.log(`   Translated paragraphs: ${result.content?.length || 0}`);
            console.log(`   Source language: ${result.source_language || 'unknown'}`);
            
        } catch (error) {
            console.log(`   ❌ Translation failed: ${error.message}`);
            if (error.message.includes('timed out')) {
                console.log(`   🚨 TIMEOUT DETECTED - Consider increasing timeout for ${name}`);
            }
        }
        console.log();
    }

    parseContentFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const title = lines[0] || 'Untitled';
        const paragraphs = lines.slice(1).map(line => ({
            type: 'paragraph',
            text: line.trim()
        })).filter(p => p.text);

        return {
            title,
            content: paragraphs
        };
    }
}

// Main execution
async function main() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const tester = new ApiDebugger(apiKey);
    await tester.runDebugTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ApiDebugger;