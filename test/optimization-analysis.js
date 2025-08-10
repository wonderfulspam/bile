#!/usr/bin/env node

/**
 * API Performance Optimization Analysis
 */

// Load environment variables from .env file
try {
    require('dotenv').config();
} catch (error) {
    // dotenv not available, continue with system env vars
}

const BileCoreApiClient = require('../src/core/api-client.js');
const fs = require('fs');

class OptimizationAnalyzer {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.results = [];
    }

    async analyzeCurrentBottlenecks() {
        console.log('🔍 Performance Optimization Analysis');
        console.log('===================================\n');

        if (!this.apiKey) {
            console.log('⚠️  No API key - analysis limited to token estimation\n');
        }

        // 1. Analyze current system prompt size
        await this.analyzePromptSize();
        
        // 2. Test model performance comparison
        if (this.apiKey) {
            await this.compareModelSpeeds();
        }
        
        // 3. Analyze optimization strategies
        await this.testOptimizationStrategies();
        
        // 4. Show recommendations
        this.showRecommendations();
    }

    async analyzePromptSize() {
        console.log('📏 Current Token Usage Analysis');
        console.log('------------------------------');
        
        const client = new BileCoreApiClient('fake-key');
        const testContent = {
            title: 'Test',
            content: [{ type: 'paragraph', text: 'Short test sentence.' }]
        };
        
        // Build current prompt
        const currentPrompt = client._buildTranslationPrompt(testContent, 'en');
        const systemPromptLength = currentPrompt[0].content.length;
        const userPromptLength = currentPrompt[1].content.length;
        
        console.log(`System prompt: ${systemPromptLength} characters`);
        console.log(`User prompt: ${userPromptLength} characters`);
        console.log(`Total prompt: ${systemPromptLength + userPromptLength} characters`);
        console.log(`Estimated tokens: ~${Math.ceil((systemPromptLength + userPromptLength) / 4)} tokens`);
        
        console.log('\nCurrent system prompt:');
        console.log('```');
        console.log(currentPrompt[0].content);
        console.log('```\n');
    }

    async compareModelSpeeds() {
        console.log('🏃 Model Speed Comparison');
        console.log('------------------------');
        
        const models = [
            'moonshotai/kimi-k2:free',
            'deepseek/deepseek-r1-0528:free',
            'tngtech/deepseek-r1t2-chimera:free',
            'qwen/qwen3-235b-a22b:free',
            'microsoft/mai-ds-r1:free'
        ];
        
        const testContent = {
            title: 'Test',
            content: [{ type: 'paragraph', text: 'Deutsches Startup erhält Finanzierung.' }]
        };
        
        for (const model of models) {
            console.log(`\nTesting ${model}...`);
            const client = new BileCoreApiClient(this.apiKey, { timeout: 30000, debug: false });
            
            const startTime = Date.now();
            try {
                const result = await client.translate(testContent, 'en', { models: [model] });
                const duration = Date.now() - startTime;
                
                console.log(`  ✅ ${duration}ms - Success`);
                if (result.metadata?.usage) {
                    console.log(`     Tokens: ${result.metadata.usage.total_tokens}`);
                }
                
                this.results.push({
                    model,
                    duration,
                    success: true,
                    tokens: result.metadata?.usage?.total_tokens
                });
                
            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`  ❌ ${duration}ms - ${error.message.substring(0, 50)}...`);
                
                this.results.push({
                    model,
                    duration,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    async testOptimizationStrategies() {
        console.log('\n🚀 Optimization Strategy Analysis');
        console.log('---------------------------------');
        
        const strategies = [
            {
                name: 'Current (Full Bilingual)',
                tokens_estimate: 337,
                complexity: 'High',
                quality: 'Excellent'
            },
            {
                name: 'Minimal Prompt',
                tokens_estimate: 150,
                complexity: 'Medium', 
                quality: 'Good'
            },
            {
                name: 'Translation Only (No Slang)',
                tokens_estimate: 80,
                complexity: 'Low',
                quality: 'Basic'
            },
            {
                name: 'Two-Pass (Translate + Slang)',
                tokens_estimate: 200,
                complexity: 'Medium',
                quality: 'Good'
            }
        ];
        
        console.log('Strategy Comparison:');
        strategies.forEach(strategy => {
            console.log(`\n${strategy.name}:`);
            console.log(`  Estimated tokens: ${strategy.tokens_estimate}`);
            console.log(`  Complexity: ${strategy.complexity}`);
            console.log(`  Quality: ${strategy.quality}`);
            console.log(`  Estimated speed improvement: ${Math.round((337 - strategy.tokens_estimate) / 337 * 100)}%`);
        });
    }

    showRecommendations() {
        console.log('\n🎯 Optimization Recommendations');
        console.log('===============================');
        
        console.log('\n1. **Immediate Token Reduction (50% faster)**');
        console.log('   - Shorter system prompt (remove verbose explanations)');
        console.log('   - Minimal JSON template');
        console.log('   - Compress field names');
        
        console.log('\n2. **Model Selection Optimization**');
        if (this.results.length > 0) {
            const fastestSuccess = this.results
                .filter(r => r.success)
                .sort((a, b) => a.duration - b.duration)[0];
            
            if (fastestSuccess) {
                console.log(`   - Fastest model: ${fastestSuccess.model} (${fastestSuccess.duration}ms)`);
            }
        } else {
            console.log('   - Run with API key to test model speeds');
        }
        
        console.log('\n3. **Two-Pass Strategy (Conditional)**');
        console.log('   - Pass 1: Fast translation only');
        console.log('   - Pass 2: Slang analysis only if needed');
        console.log('   - Could be 60-80% faster for articles with few slang terms');
        
        console.log('\n4. **Chunking Optimization**');
        console.log('   - Increase chunk size to reduce API calls');
        console.log('   - Process chunks in parallel where possible');
        console.log('   - Smart splitting at sentence boundaries');
        
        console.log('\n5. **Content-Aware Processing**');
        console.log('   - Skip slang detection for formal content');
        console.log('   - Use simpler prompts for basic translations');
        console.log('   - Cache common translations');
    }

    async createOptimizedPrompts() {
        console.log('\n📝 Creating Optimized Prompt Templates');
        console.log('====================================');
        
        const templates = {
            minimal: {
                system: `Translate to English. Preserve slang in <slang></slang> tags. Output JSON:
{"s":"source_lang","t":"target_lang","title":"title","content":[{"o":"original","tr":"translated","slang":[{"term":"word","tr":"translation","ex_src":"explanation","ex_tgt":"explanation"}]}]}`,
                
                description: 'Ultra-minimal prompt for speed'
            },
            
            balanced: {
                system: `Professional translator. Translate to English preserving cultural terms in <slang> tags.
Return JSON with bilingual explanations for slang terms.`,
                
                description: 'Balanced speed and quality'
            },
            
            twopass: {
                system_translate: `Translate this to English, keeping original slang/cultural terms as-is:`,
                system_slang: `Find slang/cultural terms in this text and provide bilingual explanations:`,
                
                description: 'Two-pass approach: translate then explain'
            }
        };
        
        Object.entries(templates).forEach(([name, template]) => {
            console.log(`\n${name.toUpperCase()} TEMPLATE:`);
            console.log(`Description: ${template.description}`);
            if (template.system) {
                console.log(`Tokens: ~${Math.ceil(template.system.length / 4)}`);
                console.log(`Prompt: "${template.system}"`);
            } else {
                const totalLength = template.system_translate.length + template.system_slang.length;
                console.log(`Total tokens: ~${Math.ceil(totalLength / 4)}`);
                console.log(`Pass 1: "${template.system_translate}"`);
                console.log(`Pass 2: "${template.system_slang}"`);
            }
        });
    }
}

// Main execution
async function main() {
    const analyzer = new OptimizationAnalyzer();
    await analyzer.analyzeCurrentBottlenecks();
    await analyzer.createOptimizedPrompts();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = OptimizationAnalyzer;