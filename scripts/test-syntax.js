#!/usr/bin/env node

/**
 * Comprehensive Syntax and API Test Suite for Bile Userscript
 * Tests for common issues before deployment
 */

const fs = require('fs');
const path = require('path');

class BileTestSuite {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.passed = 0;
        this.failed = 0;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Running Bile Test Suite...\n');

        await this.testJavaScriptSyntax();
        await this.testMissingFunctions();
        await this.testTypeErrors();
        await this.testStorageAPIs();
        await this.testModelReferences();
        await this.testUserscriptHeaders();
        await this.testBuildOutput();

        this.printResults();
    }

    /**
     * Test JavaScript syntax
     */
    async testJavaScriptSyntax() {
        console.log('📝 Testing JavaScript Syntax...');
        
        const files = [
            'dist/bile.user.js',
            'src/modules/api-client.js',
            'src/modules/storage.js',
            'src/modules/model-manager.js',
            'src/modules/translation-engine.js'
        ];

        for (const file of files) {
            const fullPath = path.join(__dirname, '..', file);
            
            if (!fs.existsSync(fullPath)) {
                this.addWarning(`File not found: ${file}`);
                continue;
            }

            try {
                // Use Node.js to check syntax
                const { spawn } = require('child_process');
                const result = await this.runCommand('node', ['-c', fullPath]);
                
                if (result.success) {
                    this.addPass(`✅ ${file} - Valid syntax`);
                } else {
                    this.addError(`❌ ${file} - Syntax error: ${result.error}`);
                }
            } catch (error) {
                this.addError(`❌ ${file} - Test failed: ${error.message}`);
            }
        }
    }

    /**
     * Test for missing functions and properties
     */
    async testMissingFunctions() {
        console.log('\n🔍 Testing Missing Functions...');

        const distPath = path.join(__dirname, '..', 'dist', 'bile.user.js');
        
        if (!fs.existsSync(distPath)) {
            this.addError('❌ dist/bile.user.js not found - run npm run build first');
            return;
        }

        const content = fs.readFileSync(distPath, 'utf8');

        // Test for critical function definitions
        const requiredFunctions = [
            'BileStorage',
            'BileModelManager',
            'BileApiClient',
            'BileModelConfig',
            'translateContent',
            '_extractTextForAnalysis',
            '_determineContentType',
            '_detectLanguage',
            'get',
            'set',
            'getApiKey',
            'storeApiKey'
        ];

        for (const funcName of requiredFunctions) {
            if (content.includes(funcName)) {
                this.addPass(`✅ ${funcName} - Found`);
            } else {
                this.addError(`❌ ${funcName} - Missing or not properly exported`);
            }
        }

        // Test for critical method calls that might fail
        const potentialErrors = [
            { pattern: /\.toLowerCase\(\)/, context: 'toLowerCase calls', check: this.checkLowerCaseCalls.bind(this) },
            { pattern: /\.substring\(\d+/, context: 'substring calls', check: this.checkSubstringCalls.bind(this) },
            { pattern: /BileStorage\.get\(/, context: 'BileStorage.get calls', check: this.checkStorageGetCalls.bind(this) },
            { pattern: /GM_getValue\(/, context: 'GM_getValue calls', check: this.checkGMCalls.bind(this) }
        ];

        for (const test of potentialErrors) {
            const matches = content.match(new RegExp(test.pattern.source, 'g'));
            if (matches) {
                const result = test.check(content, matches);
                if (result.safe) {
                    this.addPass(`✅ ${test.context} - ${matches.length} calls, all safe`);
                } else {
                    this.addWarning(`⚠️ ${test.context} - Potential issues: ${result.issues.join(', ')}`);
                }
            }
        }
    }

    /**
     * Test for common type errors
     */
    async testTypeErrors() {
        console.log('\n🔬 Testing Type Safety...');

        const srcFiles = [
            'src/modules/api-client.js',
            'src/modules/storage.js',
            'src/modules/content-analyzer.js'
        ];

        for (const file of srcFiles) {
            const fullPath = path.join(__dirname, '..', file);
            if (!fs.existsSync(fullPath)) continue;

            const content = fs.readFileSync(fullPath, 'utf8');

            // Check for unguarded string method calls
            const stringMethods = ['toLowerCase', 'substring', 'split', 'replace', 'match'];
            for (const method of stringMethods) {
                const pattern = new RegExp(`([a-zA-Z_][a-zA-Z0-9_.]*)\\.${method}\\(`, 'g');
                const matches = [...content.matchAll(pattern)];
                
                for (const match of matches) {
                    const variable = match[1];
                    const line = match[0];
                    
                    // Look for type checking before the call
                    const hasTypeCheck = content.includes(`typeof ${variable} === 'string'`) ||
                                       content.includes(`${variable} || ''`) ||
                                       content.includes(`String(${variable}`) ||
                                       line.includes('textContent') ||
                                       line.includes('innerHTML');
                    
                    if (hasTypeCheck) {
                        this.addPass(`✅ ${file}:${method} - Type safe: ${variable}`);
                    } else {
                        this.addWarning(`⚠️ ${file}:${method} - Potentially unsafe: ${variable}.${method}()`);
                    }
                }
            }
        }
    }

    /**
     * Test storage APIs
     */
    async testStorageAPIs() {
        console.log('\n💾 Testing Storage APIs...');

        const storagePath = path.join(__dirname, '..', 'src', 'modules', 'storage.js');
        
        if (!fs.existsSync(storagePath)) {
            this.addError('❌ Storage module not found');
            return;
        }

        const content = fs.readFileSync(storagePath, 'utf8');

        const requiredMethods = [
            'storeApiKey',
            'getApiKey',
            'hasApiKey',
            'clearApiKey',
            'get',
            'set',
            'storePreferences',
            'getPreferences',
            'clearAllData'
        ];

        for (const method of requiredMethods) {
            if (content.includes(`async ${method}(`) || content.includes(`${method}(`)) {
                this.addPass(`✅ BileStorage.${method} - Method exists`);
            } else {
                this.addError(`❌ BileStorage.${method} - Method missing`);
            }
        }

        // Check for proper GM_ API usage
        const gmMethods = ['GM_getValue', 'GM_setValue', 'GM_deleteValue'];
        for (const method of gmMethods) {
            if (content.includes(method)) {
                this.addPass(`✅ ${method} - Used correctly`);
            } else {
                this.addWarning(`⚠️ ${method} - Not found (might be optional)`);
            }
        }
    }

    /**
     * Test model references
     */
    async testModelReferences() {
        console.log('\n🤖 Testing AI Model References...');

        const files = ['src/modules/api-client.js', 'src/config/model-config.js'];
        const expectedModels = [
            'moonshotai/kimi-k2:free',
            'deepseek/deepseek-r1-0528:free',
            'tngtech/deepseek-r1t2-chimera:free',
            'qwen/qwen3-235b-a22b:free',
            'microsoft/mai-ds-r1:free'
        ];

        for (const file of files) {
            const fullPath = path.join(__dirname, '..', file);
            if (!fs.existsSync(fullPath)) continue;

            const content = fs.readFileSync(fullPath, 'utf8');

            for (const model of expectedModels) {
                if (content.includes(model)) {
                    this.addPass(`✅ ${model} - Referenced in ${file}`);
                } else {
                    this.addWarning(`⚠️ ${model} - Not found in ${file}`);
                }
            }
        }

        // Check for old model references that should be removed
        const oldModels = [
            'claude-3-sonnet',
            'claude-3-haiku',
            'meta-llama/llama-3.1-8b-instruct:free',
            'mistralai/mistral-7b-instruct:free',
            'sk-ant-'
        ];

        const distPath = path.join(__dirname, '..', 'dist', 'bile.user.js');
        if (fs.existsSync(distPath)) {
            const distContent = fs.readFileSync(distPath, 'utf8');
            
            for (const oldModel of oldModels) {
                if (distContent.includes(oldModel)) {
                    this.addError(`❌ Old model reference found: ${oldModel}`);
                } else {
                    this.addPass(`✅ Old model reference removed: ${oldModel}`);
                }
            }
        }
    }

    /**
     * Test userscript headers
     */
    async testUserscriptHeaders() {
        console.log('\n📋 Testing Userscript Headers...');

        const distPath = path.join(__dirname, '..', 'dist', 'bile.user.js');
        if (!fs.existsSync(distPath)) {
            this.addError('❌ Built userscript not found');
            return;
        }

        const content = fs.readFileSync(distPath, 'utf8');

        const requiredHeaders = [
            '@name',
            '@version',
            '@description',
            '@author',
            '@grant GM_setValue',
            '@grant GM_getValue',
            '@grant GM_deleteValue',
            '@grant GM_openInTab',
            '@run-at document-end'
        ];

        for (const header of requiredHeaders) {
            if (content.includes(header)) {
                this.addPass(`✅ Header: ${header}`);
            } else {
                this.addError(`❌ Missing header: ${header}`);
            }
        }

        // Check version consistency
        const versionMatch = content.match(/@version\s+([\d.]+)/);
        if (versionMatch) {
            const version = versionMatch[1];
            this.addPass(`✅ Version: ${version}`);
        } else {
            this.addError('❌ Version not found or invalid format');
        }
    }

    /**
     * Test build output quality
     */
    async testBuildOutput() {
        console.log('\n🏗️ Testing Build Output...');

        const distPath = path.join(__dirname, '..', 'dist', 'bile.user.js');
        if (!fs.existsSync(distPath)) {
            this.addError('❌ Build output not found');
            return;
        }

        const content = fs.readFileSync(distPath, 'utf8');
        const stats = fs.statSync(distPath);

        // Size checks
        const sizeKB = stats.size / 1024;
        if (sizeKB > 500) {
            this.addWarning(`⚠️ Large file size: ${sizeKB.toFixed(1)} KB`);
        } else if (sizeKB < 50) {
            this.addWarning(`⚠️ Suspiciously small file: ${sizeKB.toFixed(1)} KB`);
        } else {
            this.addPass(`✅ Reasonable file size: ${sizeKB.toFixed(1)} KB`);
        }

        // Content checks
        const checks = [
            { test: content.includes('// === '), name: 'Module separators' },
            { test: content.includes('BileApiClient'), name: 'API client included' },
            { test: content.includes('BileModelManager'), name: 'Model manager included' },
            { test: content.includes('BileStorage'), name: 'Storage module included' },
            { test: !content.includes('import '), name: 'No ES6 imports' },
            { test: !content.includes('export '), name: 'No ES6 exports' },
            { test: !content.includes('} else if (typeof window'), name: 'No orphaned else blocks' }
        ];

        for (const check of checks) {
            if (check.test) {
                this.addPass(`✅ Build quality: ${check.name}`);
            } else {
                this.addError(`❌ Build issue: ${check.name}`);
            }
        }
    }

    // Helper methods for specific checks

    checkLowerCaseCalls(content, matches) {
        const issues = [];
        const safePatterns = [
            'typeof.*===.*string.*toLowerCase',
            'String\\(.*\\)\\.toLowerCase',
            '\\.textContent\\.toLowerCase',
            'contentStr.*toLowerCase'
        ];

        for (const match of matches) {
            const isSafe = safePatterns.some(pattern => 
                new RegExp(pattern).test(content.substr(content.indexOf(match) - 100, 200))
            );
            
            if (!isSafe) {
                issues.push(match);
            }
        }

        return { safe: issues.length === 0, issues };
    }

    checkSubstringCalls(content, matches) {
        const issues = [];
        const safePatterns = [
            'typeof.*===.*string',
            'String\\(',
            '\\.textContent\\.',
            'contentStr\\.'
        ];

        for (const match of matches) {
            const isSafe = safePatterns.some(pattern => 
                new RegExp(pattern).test(content.substr(content.indexOf(match) - 100, 200))
            );
            
            if (!isSafe) {
                issues.push(match);
            }
        }

        return { safe: issues.length === 0, issues };
    }

    checkStorageGetCalls(content, matches) {
        const hasGetMethod = content.includes('async get(') && content.includes('GM_getValue');
        return { safe: hasGetMethod, issues: hasGetMethod ? [] : ['BileStorage.get method not implemented'] };
    }

    checkGMCalls(content, matches) {
        const hasGrants = content.includes('@grant GM_getValue');
        return { safe: hasGrants, issues: hasGrants ? [] : ['Missing @grant permissions'] };
    }

    // Utility methods

    async runCommand(command, args) {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const proc = spawn(command, args, { stdio: 'pipe' });
            
            let stdout = '';
            let stderr = '';
            
            proc.stdout?.on('data', (data) => stdout += data);
            proc.stderr?.on('data', (data) => stderr += data);
            
            proc.on('close', (code) => {
                resolve({
                    success: code === 0,
                    stdout,
                    error: stderr
                });
            });
        });
    }

    addPass(message) {
        console.log(`  ${message}`);
        this.passed++;
    }

    addError(message) {
        console.log(`  ${message}`);
        this.errors.push(message);
        this.failed++;
    }

    addWarning(message) {
        console.log(`  ${message}`);
        this.warnings.push(message);
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`⚠️ Warnings: ${this.warnings.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n🚨 CRITICAL ERRORS:');
            this.errors.forEach(error => console.log(`  ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            this.warnings.slice(0, 10).forEach(warning => console.log(`  ${warning}`));
            if (this.warnings.length > 10) {
                console.log(`  ... and ${this.warnings.length - 10} more warnings`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Userscript is ready for deployment.');
        } else {
            console.log('🔥 TESTS FAILED! Please fix the errors before deployment.');
            process.exit(1);
        }
    }
}

// CLI interface
if (require.main === module) {
    const tester = new BileTestSuite();
    tester.runAllTests().catch(console.error);
}

module.exports = BileTestSuite;