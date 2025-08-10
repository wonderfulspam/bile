#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Automatically discovers and runs all test files in the test directory
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor() {
        this.testDir = __dirname;
        this.totalPassed = 0;
        this.totalFailed = 0;
        this.testSuites = [];
    }

    async runAllTests() {
        console.log('🧪 Bile Test Suite Runner');
        console.log('==========================\n');

        // Discover all test files
        await this.discoverTests();
        
        // Run each test suite
        for (const testSuite of this.testSuites) {
            await this.runTestSuite(testSuite);
        }

        // Summary
        console.log('\n==========================');
        console.log('📊 Test Summary');
        console.log('==========================');
        console.log(`Total test suites: ${this.testSuites.length}`);
        console.log(`Total tests passed: ${this.totalPassed}`);
        console.log(`Total tests failed: ${this.totalFailed}`);
        
        if (this.totalFailed === 0) {
            console.log('🎉 All tests passed!');
            return true;
        } else {
            console.log(`❌ ${this.totalFailed} test(s) failed`);
            return false;
        }
    }

    async discoverTests() {
        const files = fs.readdirSync(this.testDir);
        
        for (const file of files) {
            const filePath = path.join(this.testDir, file);
            const stat = fs.statSync(filePath);
            
            // Skip directories and non-JS files
            if (!stat.isFile() || !file.endsWith('.js') || file === 'test-runner.js') {
                continue;
            }

            try {
                const TestClass = require(filePath);
                
                // Check if it's a test class with runTests method
                if (typeof TestClass === 'function') {
                    const instance = new TestClass();
                    if (typeof instance.runTests === 'function') {
                        this.testSuites.push({
                            name: file.replace('.js', ''),
                            path: filePath,
                            instance: instance
                        });
                    }
                }
            } catch (error) {
                // Skip files that can't be required or don't export test classes
                if (process.env.DEBUG) {
                    console.log(`Skipping ${file}: ${error.message}`);
                }
            }
        }

        console.log(`Discovered ${this.testSuites.length} test suites:`);
        this.testSuites.forEach(suite => {
            console.log(`  - ${suite.name}`);
        });
        console.log('');
    }

    async runTestSuite(testSuite) {
        console.log(`🚀 Running ${testSuite.name} tests...`);
        console.log('─'.repeat(40));
        
        try {
            // Capture the current passed/failed counts
            const initialPassed = testSuite.instance.passed || 0;
            const initialFailed = testSuite.instance.failed || 0;
            
            const success = await testSuite.instance.runTests();
            
            // Calculate the delta
            const finalPassed = testSuite.instance.passed || 0;
            const finalFailed = testSuite.instance.failed || 0;
            const deltaPassed = finalPassed - initialPassed;
            const deltaFailed = finalFailed - initialFailed;
            
            // Update totals
            this.totalPassed += deltaPassed;
            this.totalFailed += deltaFailed;
            
            if (success) {
                console.log(`✅ ${testSuite.name}: All tests passed (${deltaPassed} passed)`);
            } else {
                console.log(`❌ ${testSuite.name}: Some tests failed (${deltaPassed} passed, ${deltaFailed} failed)`);
            }
            
        } catch (error) {
            console.log(`💥 ${testSuite.name}: Test suite crashed - ${error.message}`);
            this.totalFailed++;
        }
        
        console.log('');
    }
}

// Special handling for CLI-specific tests that need environment setup
class CliTestRunner extends TestRunner {
    async runTestSuite(testSuite) {
        // Check if this test needs API keys
        const needsApiKey = ['rate-limit-fallback'].includes(testSuite.name);
        
        if (needsApiKey) {
            // Check if API keys are available
            const hasGroqKey = process.env.GROQ_API_KEY;
            const hasOpenRouterKey = process.env.OPENROUTER_API_KEY;
            
            if (!hasGroqKey && !hasOpenRouterKey) {
                console.log(`⏭️  Skipping ${testSuite.name}: No API keys available`);
                console.log('   Set GROQ_API_KEY or OPENROUTER_API_KEY to run API tests\n');
                return;
            }
        }
        
        await super.runTestSuite(testSuite);
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    const useEnvFile = args.includes('--env') || process.env.NODE_ENV === 'test';
    
    // Load environment file if requested
    if (useEnvFile) {
        try {
            // Try to load .env file (similar to --env-file behavior)
            const envPath = path.join(__dirname, '..', '.env');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                envContent.split('\n').forEach(line => {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        process.env[key.trim()] = value.trim();
                    }
                });
                console.log('📄 Environment loaded from .env file\n');
            }
        } catch (error) {
            console.log('⚠️  Could not load .env file, continuing without it\n');
        }
    }
    
    const runner = new CliTestRunner();
    const success = await runner.runAllTests();
    
    process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = TestRunner;