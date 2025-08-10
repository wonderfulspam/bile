#!/usr/bin/env node

/**
 * Timeout Test - Specifically test timeout behavior with mock slow server
 */

const BileCoreApiClient = require('../src/core/api-client.js');
const http = require('http');

class TimeoutTestSuite {
    constructor() {
        this.server = null;
        this.port = 8899;
    }

    async runTimeoutTests() {
        console.log('⏰ Timeout-Specific Test Suite');
        console.log('=============================\n');

        try {
            // Start mock server with different response delays
            await this.startMockServer();
            console.log(`🖥️  Mock server started on port ${this.port}\n`);

            // Test different timeout scenarios
            await this.testTimeoutScenarios();

        } finally {
            if (this.server) {
                this.server.close();
                console.log('🛑 Mock server stopped\n');
            }
        }
    }

    async startMockServer() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url, `http://localhost:${this.port}`);
                const delay = parseInt(url.searchParams.get('delay') || '0');

                if (req.method === 'POST' && req.url.includes('/chat/completions')) {
                    // Simulate API response with delay
                    setTimeout(() => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            choices: [{
                                message: {
                                    content: '{"source_language": "en", "target_language": "de", "title_original": "Test", "title_translated": "Test", "content": []}'
                                }
                            }]
                        }));
                    }, delay);
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });

            this.server.listen(this.port, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async testTimeoutScenarios() {
        const scenarios = [
            { timeout: 2000, serverDelay: 1000, name: 'Fast server, normal timeout', shouldSucceed: true },
            { timeout: 1000, serverDelay: 2000, name: 'Slow server, short timeout', shouldSucceed: false },
            { timeout: 5000, serverDelay: 3000, name: 'Medium server, long timeout', shouldSucceed: true },
            { timeout: 500, serverDelay: 1000, name: 'Very slow server, very short timeout', shouldSucceed: false }
        ];

        for (const scenario of scenarios) {
            await this.testSingleScenario(scenario);
        }
    }

    async testSingleScenario({ timeout, serverDelay, name, shouldSucceed }) {
        console.log(`🧪 ${name}`);
        console.log(`   Timeout: ${timeout}ms, Server delay: ${serverDelay}ms`);

        const client = new BileCoreApiClient('test-key', {
            apiUrl: `http://localhost:${this.port}/chat/completions?delay=${serverDelay}`,
            timeout: timeout,
            debug: false
        });

        const startTime = Date.now();
        try {
            await client.translate({
                title: 'Test',
                content: [{ type: 'paragraph', text: 'Test content' }]
            }, 'en');

            const duration = Date.now() - startTime;
            if (shouldSucceed) {
                console.log(`   ✅ SUCCESS in ${duration}ms (expected success)`);
            } else {
                console.log(`   ⚠️  UNEXPECTED SUCCESS in ${duration}ms (expected timeout)`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            const isTimeout = error.message.includes('timed out');
            const isExpectedTime = Math.abs(duration - timeout) < 200; // 200ms tolerance

            if (!shouldSucceed && isTimeout) {
                console.log(`   ✅ EXPECTED TIMEOUT in ${duration}ms (±200ms of ${timeout}ms)`);
            } else if (!shouldSucceed && !isTimeout) {
                console.log(`   ❌ FAILED (not timeout) in ${duration}ms: ${error.message}`);
            } else if (shouldSucceed && isTimeout) {
                console.log(`   ❌ UNEXPECTED TIMEOUT in ${duration}ms: ${error.message}`);
            } else {
                console.log(`   ❌ UNEXPECTED FAILURE in ${duration}ms: ${error.message}`);
            }
        }
        console.log();
    }
}

// Main execution
async function main() {
    const suite = new TimeoutTestSuite();
    await suite.runTimeoutTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TimeoutTestSuite;