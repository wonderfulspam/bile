#!/usr/bin/env node

/**
 * Build Script for Bile Userscript
 * Combines all modular JS files into a single userscript for Tampermonkey
 */

const fs = require('fs');
const path = require('path');
const BileCoreConfig = require('../src/core/config.js');
const BileBrowserConfig = require('../src/browser/config.js');

const BUILD_CONFIG = {
    // Source directory
    srcDir: path.join(__dirname, '..', 'src'),

    // Output file
    outputFile: path.join(__dirname, '..', 'dist', 'bile.user.js'),

    // Modules to include (in dependency order)
    modules: [
        'browser/userscript-header.js',
        // Configuration (core first, then browser)
        'core/config.js',
        'browser/config.js',
        // Core modules (runtime-agnostic)
        'core/utils.js',
        'core/site-rules.js',  // Must come before content-extractor
        'core/content-extractor.js', // Uses site-rules
        // Provider clients (must come before api-client)
        'core/providers/openrouter.js',
        'core/providers/groq.js',
        'core/api-client.js',
        'core/translation-engine.js',
        'core/content-analyzer.js',
        'core/model-manager.js',
        'core/model-config.js',
        // Browser modules for userscript functionality
        'browser/utils.js',
        'browser/storage.js',
        'browser/tab-generator.js',
        'browser/ui-trigger.js'
    ],

    // Files to skip during concatenation
    skipFiles: ['test-runner.html', 'README.md']
};

class UserscriptBuilder {
    constructor(config) {
        this.config = config;
        this.version = this.getVersionFromPackage();
    }

    /**
     * Main build process
     */
    async build() {
        console.log('🔨 Building Bile userscript...');

        try {
            // Ensure output directory exists
            this.ensureOutputDir();

            // Read and process all modules
            const combinedContent = await this.combineModules();

            // Generate final userscript
            const finalScript = this.generateFinalScript(combinedContent);

            // Write to output file
            fs.writeFileSync(this.config.outputFile, finalScript, 'utf8');

            const stats = fs.statSync(this.config.outputFile);
            console.log(`✅ Userscript built successfully!`);
            console.log(`📄 Output: ${this.config.outputFile}`);
            console.log(`📊 Size: ${(stats.size / 1024).toFixed(1)} KB`);
            console.log(`🔢 Version: ${this.version}`);

        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }

    /**
     * Combine all modules into single content string
     */
    async combineModules() {
        const parts = [];

        // Add build header
        parts.push(this.generateBuildHeader());

        for (const modulePath of this.config.modules) {
            const fullPath = path.join(this.config.srcDir, modulePath);

            if (!fs.existsSync(fullPath)) {
                console.warn(`⚠️  Module not found: ${modulePath}`);
                continue;
            }

            console.log(`📦 Including: ${modulePath}`);

            let content = fs.readFileSync(fullPath, 'utf8');

            // Process the content based on file type
            content = this.processModuleContent(content, modulePath);

            // Add module separator
            parts.push(`\n// === ${modulePath.toUpperCase()} ===\n`);
            parts.push(content);
        }

        return parts.join('\n');
    }

    /**
     * Process individual module content
     */
    processModuleContent(content, modulePath) {
        // Remove ES6 imports/exports since userscripts don't support them
        content = content.replace(/^import .*$/gm, '');
        content = content.replace(/^export .*$/gm, '');

        // Remove require statements for internal modules since they'll be in same scope
        content = content.replace(/const (\w+) = \(typeof require !== 'undefined'\) \? require\([^)]+\) : null;/g, '// $1 will be available from other modules');
        content = content.replace(/const (\w+) = require\([^)]+\);/g, '// $1 will be available from other modules');

        // For core modules and browser wrappers, handle dual-environment exports
        if (modulePath.startsWith('core/') || modulePath.startsWith('browser/')) {
            // Remove Node.js exports but keep browser window assignments
            content = content.replace(/if \(typeof module !== 'undefined' && module\.exports\) \{\s*module\.exports = \w+;\s*\} else if \(typeof window !== 'undefined'\) \{/g, 'if (typeof window !== \'undefined\') {');
            content = content.replace(/if \(typeof module !== 'undefined' && module\.exports\) \{\s*module\.exports = \w+;\s*\}/g, '');
            // Fix any standalone conditions
            content = content.replace(/\/\/ Export for both Node\.js and browser environments if \(typeof window !== 'undefined'\) \{/g, '// Export for browser\nif (typeof window !== \'undefined\') {');
        } else {
            // Legacy handling for old modules
            content = content.replace(/if \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?\}(\s*else if \(typeof window !== 'undefined'\) \{[\s\S]*?\})?/g, '');

            // Clean up any remaining standalone else if blocks
            content = content.replace(/;\s*\n\s*\} else if \(typeof window !== 'undefined'\) \{[\s\S]*?\}/g, ';');
            content = content.replace(/^\s*\} else if \(typeof window !== 'undefined'\) \{[\s\S]*?\}/gm, '');
            content = content.replace(/^\s*else if \(typeof window !== 'undefined'\) \{[\s\S]*?\}/gm, '');
        }

        // Note: bile.user.js has been removed - build system now generates everything from components

        // For userscript header, extract just the header
        if (modulePath === 'browser/userscript-header.js') {
            content = this.extractUserscriptHeader(content);
        }

        // For browser config, generate the combined constants
        if (modulePath === 'browser/config.js') {
            content += `
// Generate combined BileConstants for browser compatibility
if (typeof BileCoreConfig !== 'undefined' && typeof BileBrowserConfig !== 'undefined') {
    window.BileConstants = BileBrowserConfig.createBrowserConstants(BileCoreConfig);
}
`;
        }

        return content;
    }

    /**
     * Extract main logic from bile.user.js (remove header and module loading)
     */
    extractMainLogic(content) {
        // Remove the userscript header (everything before the main function)
        const mainFunctionStart = content.indexOf('(function() {');
        if (mainFunctionStart !== -1) {
            content = content.substring(mainFunctionStart);
        }

        // Remove module loading code since modules are now inline
        content = content.replace(/async function loadPhase2Modules\(\) \{\s*try \{[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\s*\}/g, 'async function loadPhase2Modules() { return true; }');
        content = content.replace(/await import\(.*?\);/g, '// Module loaded inline');

        return content;
    }

    /**
     * Extract userscript header
     */
    extractUserscriptHeader(content) {
        const headerMatch = content.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
        return headerMatch ? headerMatch[0] : '';
    }

    /**
     * Generate the final userscript with proper wrapping
     */
    generateFinalScript(combinedContent) {
        return `${combinedContent}

// === INITIALIZATION ===
// Initialize all components when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBile);
} else {
    initializeBile();
}

function initializeBile() {
    try {
        // Create compatibility layer for new class-based modules
        if (typeof BileCoreApiClient !== 'undefined' && typeof BileStorage !== 'undefined') {
            // Create a global instance for backward compatibility
            window.BileApiClient = {
                async testApiConnection() {
                    try {
                        const apiKey = await BileStorage.getApiKey();
                        const client = new BileCoreApiClient(apiKey);
                        return await client.testConnection();
                    } catch (error) {
                        console.error('API connection test failed:', error);
                        return false;
                    }
                },

                async translateContent(content, targetLang, options = {}) {
                    const apiKey = await BileStorage.getApiKey();
                    const engine = new BileTranslationEngine(apiKey, options);
                    return await engine.translateContent(content, targetLang, options);
                },

                handleApiError(error) {
                    console.error('Bile API Error:', error);
                    return error.message || 'Translation failed';
                },

                _detectLanguage(content) {
                    // Fallback language detection
                    if (typeof BileContentAnalyzer !== 'undefined' && BileContentAnalyzer.detectLanguageAdvanced) {
                        return BileContentAnalyzer.detectLanguageAdvanced(content);
                    }
                    return 'en'; // Fallback
                }
            };
        }

        // Create compatibility aliases for legacy code
        if (typeof BileBrowserUtils !== 'undefined') {
            window.BileUtils = BileBrowserUtils;
        }
        if (typeof BileCoreUtils !== 'undefined') {
            if (!window.BileUtils) window.BileUtils = {};
            // Merge core utils methods into BileUtils
            Object.assign(window.BileUtils, BileCoreUtils);
        }

        // Initialize model manager
        if (typeof BileModelManager !== 'undefined') {
            BileModelManager.initialize().catch(console.warn);
        }

        // Initialize UI components
        if (typeof BileUI !== 'undefined') {
            // Create trigger button
            const button = BileUI.createTriggerButton('top-right');
            document.body.appendChild(button);

            // Register keyboard shortcut
            BileUI.registerKeyboardShortcut();
        }

        console.log('🌐 Bile initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Bile:', error);
    }
}`;
    }

    /**
     * Generate build header with metadata
     */
    generateBuildHeader() {
        const timestamp = new Date().toISOString();
        return `/*
 * Bile - Bilingual Web Page Converter
 * Built: ${timestamp}
 * Version: ${this.version}
 *
${BileBrowserConfig.GENERATED_FILE_HEADER.trim()}
 */

`;
    }

    /**
     * Ensure output directory exists
     */
    ensureOutputDir() {
        const outputDir = path.dirname(this.config.outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    }

    /**
     * Get version from package.json or default
     */
    getVersionFromPackage() {
        try {
            const packagePath = path.join(__dirname, '..', 'package.json');
            if (fs.existsSync(packagePath)) {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                return pkg.version;
            }
        } catch (error) {
            console.warn('Could not read version from package.json');
        }

        // Extract from main userscript file
        try {
            const mainFile = path.join(this.config.srcDir, 'bile.user.js');
            const content = fs.readFileSync(mainFile, 'utf8');
            const versionMatch = content.match(/@version\s+([\d.]+)/);
            return versionMatch ? versionMatch[1] : '3.0.0';
        } catch {
            return '3.0.0';
        }
    }
}

// CLI interface
if (require.main === module) {
    const builder = new UserscriptBuilder(BUILD_CONFIG);
    builder.build();
}

module.exports = UserscriptBuilder;