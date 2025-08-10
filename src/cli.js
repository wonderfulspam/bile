#!/usr/bin/env node

/**
 * Bile CLI - Command-line interface for testing translation functionality
 * Uses only core modules (no browser dependencies)
 */

const fs = require('fs');
const path = require('path');

// Import core modules
const BileCoreUtils = require('./core/utils.js');
const BileCoreApiClient = require('./core/api-client.js');
const BileTranslationEngine = require('./core/translation-engine.js');
const BileContentAnalyzer = require('./core/content-analyzer.js');
const BileModelManager = require('./core/model-manager.js');

// Simple storage implementation for CLI
class CliStorage {
    constructor() {
        this.configFile = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.bile-config.json');
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
            }
        } catch (error) {
            console.warn('Could not load config file:', error.message);
        }
        return {};
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.warn('Could not save config file:', error.message);
        }
    }

    async getApiKey() {
        return this.config.apiKey || process.env.BILE_API_KEY || null;
    }

    async setApiKey(key) {
        this.config.apiKey = key;
        this.saveConfig();
    }

    async getTargetLanguage() {
        return this.config.targetLanguage || 'en';
    }

    async setTargetLanguage(lang) {
        this.config.targetLanguage = lang;
        this.saveConfig();
    }
}

class BileCli {
    constructor() {
        this.storage = new CliStorage();
    }

    /**
     * Main CLI entry point
     */
    async run(args = process.argv.slice(2)) {
        const command = args[0];

        switch (command) {
            case 'test':
                await this.runTests();
                break;
            case 'translate':
                await this.translateCommand(args.slice(1));
                break;
            case 'analyze':
                await this.analyzeCommand(args.slice(1));
                break;
            case 'config':
                await this.configCommand(args.slice(1));
                break;
            case 'models':
                await this.modelsCommand();
                break;
            case 'help':
            case '--help':
            case '-h':
            default:
                this.showHelp();
                break;
        }
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log(`
Bile CLI - Bilingual Web Page Converter

Usage:
  bile test                    # Test core functionality
  bile translate <file>        # Translate content from file
  bile analyze <file>          # Analyze content structure
  bile config <key> [value]    # Get/set configuration
  bile models                  # List available models
  bile help                    # Show this help

Configuration:
  bile config apiKey <key>     # Set OpenRouter API key
  bile config language <lang>  # Set target language (en, de, es, fr, etc.)

Environment Variables:
  BILE_API_KEY                 # OpenRouter API key

Examples:
  bile config apiKey sk-or-...
  bile config language de
  bile translate article.txt
  bile analyze content.json
        `);
    }

    /**
     * Run tests
     */
    async runTests() {
        const BileCliTester = require('../scripts/test-cli.js');
        const tester = new BileCliTester();
        await tester.runTests();
        await tester.testWithSampleContent();
    }

    /**
     * Translate content from file
     */
    async translateCommand(args) {
        if (args.length === 0) {
            console.error('❌ Please provide a file path');
            return;
        }

        const filePath = args[0];
        const targetLang = args[1] || await this.storage.getTargetLanguage();
        const apiKey = await this.storage.getApiKey();

        if (!apiKey) {
            console.error('❌ No API key configured. Run: bile config apiKey <your-key>');
            return;
        }

        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${filePath}`);
            return;
        }

        try {
            console.log(`🌍 Translating ${filePath} to ${targetLang}...`);

            // Read and parse content
            const content = this.parseContentFile(filePath);
            
            // Create translation engine
            const engine = new BileTranslationEngine(apiKey);
            
            // Translate content
            const result = await engine.translateContent(content, targetLang);
            
            // Output result
            const outputFile = filePath.replace(/\.(txt|json)$/, `.${targetLang}.json`);
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
            
            console.log(`✅ Translation complete! Output saved to: ${outputFile}`);
            
            // Show summary
            console.log(`\nSummary:`);
            console.log(`- Source language: ${result.source_language || 'auto-detected'}`);
            console.log(`- Target language: ${result.target_language}`);
            console.log(`- Paragraphs: ${result.content?.length || 0}`);
            
        } catch (error) {
            console.error('❌ Translation failed:', error.message);
        }
    }

    /**
     * Analyze content structure
     */
    async analyzeCommand(args) {
        if (args.length === 0) {
            console.error('❌ Please provide a file path');
            return;
        }

        const filePath = args[0];

        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${filePath}`);
            return;
        }

        try {
            console.log(`📊 Analyzing ${filePath}...`);

            // Read and parse content
            const content = this.parseContentFile(filePath);
            
            // Analyze content
            const analysis = BileContentAnalyzer.analyzeContentStructure(content);
            
            // Display results
            console.log(`\nContent Analysis:`);
            console.log(`- Structure: ${analysis.structure || 'unknown'}`);
            console.log(`- Complexity: ${analysis.complexity || 'unknown'}`);
            console.log(`- Sections: ${analysis.sections || 0}`);
            console.log(`- Readability Score: ${analysis.readabilityScore || 'N/A'}`);
            
            if (analysis.outline) {
                console.log(`\nOutline:`);
                analysis.outline.forEach((item, i) => {
                    console.log(`  ${i + 1}. ${item.title || item.text?.substring(0, 50) + '...' || 'Untitled'}`);
                });
            }

            // Language detection
            const fullText = content.content?.map(c => c.text).join(' ') || content.title || '';
            const detectedLang = BileCoreUtils.detectLanguage(fullText);
            const wordCount = BileCoreUtils.getWordCount(fullText);
            const readingTime = BileCoreUtils.estimateReadingTime(fullText);
            
            console.log(`\nText Analysis:`);
            console.log(`- Detected language: ${detectedLang}`);
            console.log(`- Word count: ${wordCount}`);
            console.log(`- Reading time: ${readingTime} minutes`);
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
        }
    }

    /**
     * Handle configuration commands
     */
    async configCommand(args) {
        if (args.length === 0) {
            // Show all configuration
            const apiKey = await this.storage.getApiKey();
            const language = await this.storage.getTargetLanguage();
            
            console.log('Configuration:');
            console.log(`- API Key: ${apiKey ? '***configured***' : 'not set'}`);
            console.log(`- Target Language: ${language}`);
            return;
        }

        const key = args[0];
        const value = args[1];

        if (!value) {
            // Get configuration value
            switch (key) {
                case 'apiKey':
                    const apiKey = await this.storage.getApiKey();
                    console.log(apiKey ? '***configured***' : 'not set');
                    break;
                case 'language':
                    const lang = await this.storage.getTargetLanguage();
                    console.log(lang);
                    break;
                default:
                    console.error(`❌ Unknown config key: ${key}`);
            }
            return;
        }

        // Set configuration value
        switch (key) {
            case 'apiKey':
                await this.storage.setApiKey(value);
                console.log('✅ API key configured');
                break;
            case 'language':
                if (BileCoreUtils.SUPPORTED_LANGUAGES[value]) {
                    await this.storage.setTargetLanguage(value);
                    console.log(`✅ Target language set to: ${value}`);
                } else {
                    console.error(`❌ Unsupported language: ${value}`);
                    console.log('Supported languages:', Object.keys(BileCoreUtils.SUPPORTED_LANGUAGES).join(', '));
                }
                break;
            default:
                console.error(`❌ Unknown config key: ${key}`);
        }
    }

    /**
     * Show available models
     */
    async modelsCommand() {
        console.log('🤖 Available Models:');
        
        try {
            const bestModel = BileModelManager.getBestAvailableModel();
            console.log(`- Best model: ${bestModel?.name || 'none'}`);
            
            const fallbackModel = BileModelManager.getFallbackModel();
            console.log(`- Fallback model: ${fallbackModel?.name || 'none'}`);
            
            console.log('\nAll supported models:');
            // If model manager has a method to list all models
            if (BileModelManager.getAllModels) {
                const models = BileModelManager.getAllModels();
                models.forEach(model => {
                    console.log(`  - ${model.name}: ${model.description || 'No description'}`);
                });
            }
        } catch (error) {
            console.error('❌ Failed to list models:', error.message);
        }
    }

    /**
     * Parse content file (supports txt and json)
     */
    parseContentFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const content = fs.readFileSync(filePath, 'utf8');

        if (ext === '.json') {
            return JSON.parse(content);
        } else {
            // Plain text - create basic structure
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
}

// CLI entry point
async function main() {
    try {
        const cli = new BileCli();
        await cli.run();
    } catch (error) {
        console.error('❌ CLI error:', error.message);
        process.exit(1);
    }
}

// Run CLI if called directly
if (require.main === module) {
    main();
}

module.exports = BileCli;