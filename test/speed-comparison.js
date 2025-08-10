#!/usr/bin/env node

/**
 * Speed Comparison Test - Current vs Optimized API Client
 */

// Load environment variables from .env file
try {
    require('dotenv').config();
} catch (error) {
    // dotenv not available, continue with system env vars
}

const BileCoreApiClient = require('../src/core/api-client.js');
const OptimizedApiClient = require('../src/core/api-client-optimized.js');
const fs = require('fs');

class SpeedComparison {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.results = [];
    }

    async runComparisons() {
        console.log('🏁 Speed Comparison: Current vs Optimized');
        console.log('=========================================\n');

        if (!this.apiKey) {
            console.log('⚠️  No API key found - cannot run real comparisons');
            return;
        }

        const testCases = [
            {
                name: 'Short Article',
                file: 'test/fixtures/article-short.txt',
                expectedImprovement: '55%'
            },
            {
                name: 'Medium Article (First Paragraph)',
                file: 'test/fixtures/article-medium.txt',
                expectedImprovement: '60%',
                limitParagraphs: 1
            }
        ];

        for (const testCase of testCases) {
            await this.comparePerformance(testCase);
        }

        this.showSummary();
    }

    async comparePerformance({ name, file, expectedImprovement, limitParagraphs }) {
        console.log(`🧪 Testing: ${name}`);
        console.log(`Expected improvement: ${expectedImprovement}`);
        console.log(''.padEnd(50, '-'));

        // Load test content
        const content = this.parseContentFile(file, limitParagraphs);
        const textLength = content.content.map(c => c.text).join(' ').length;
        console.log(`Content length: ${textLength} characters\n`);

        // Test strategies
        const strategies = [
            { name: 'Current (Full)', client: BileCoreApiClient, options: {} },
            { name: 'Optimized (Minimal)', client: OptimizedApiClient, options: { strategy: 'minimal' } },
            { name: 'Optimized (Balanced)', client: OptimizedApiClient, options: { strategy: 'balanced' } },
            { name: 'Optimized (Two-Pass)', client: OptimizedApiClient, options: { strategy: 'twopass' } }
        ];

        const results = [];

        for (const strategy of strategies) {
            console.log(`Testing ${strategy.name}...`);
            
            const client = new strategy.client(this.apiKey, { 
                timeout: 60000, 
                debug: false,
                ...strategy.options
            });

            const startTime = Date.now();
            try {
                const result = await client.translate(content, 'en');
                const duration = Date.now() - startTime;
                
                console.log(`  ✅ ${(duration/1000).toFixed(1)}s - Success`);
                console.log(`     Paragraphs: ${result.content?.length || 0}`);
                console.log(`     Tokens: ${result.metadata?.usage?.total_tokens || 'N/A'}`);
                
                // Quality assessment
                const hasSlangTerms = result.content?.some(c => c.slang_terms?.length > 0);
                const hasBilingualExplanations = result.content?.some(c => 
                    c.slang_terms?.some(s => s.explanation_original && s.explanation_translated)
                );
                
                console.log(`     Slang detection: ${hasSlangTerms ? '✅' : '❌'}`);
                console.log(`     Bilingual explanations: ${hasBilingualExplanations ? '✅' : '❌'}`);
                
                results.push({
                    strategy: strategy.name,
                    duration,
                    success: true,
                    tokens: result.metadata?.usage?.total_tokens,
                    quality: {
                        slangDetection: hasSlangTerms,
                        bilingualExplanations: hasBilingualExplanations,
                        paragraphs: result.content?.length || 0
                    }
                });
                
            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`  ❌ ${(duration/1000).toFixed(1)}s - ${error.message.substring(0, 50)}...`);
                
                results.push({
                    strategy: strategy.name,
                    duration,
                    success: false,
                    error: error.message
                });
            }
            console.log();
        }

        // Calculate improvements
        const baseline = results.find(r => r.strategy === 'Current (Full)' && r.success);
        if (baseline) {
            console.log('Performance Comparison:');
            results.forEach(result => {
                if (result.success && result !== baseline) {
                    const improvement = ((baseline.duration - result.duration) / baseline.duration * 100).toFixed(1);
                    const tokenSaving = baseline.tokens && result.tokens ? 
                        ((baseline.tokens - result.tokens) / baseline.tokens * 100).toFixed(1) : 'N/A';
                    
                    console.log(`  ${result.strategy}: ${improvement}% faster, ${tokenSaving}% fewer tokens`);
                }
            });
        }

        this.results.push({
            testCase: name,
            results,
            baseline
        });

        console.log('\n');
    }

    parseContentFile(filePath, limitParagraphs = null) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const title = lines[0] || 'Untitled';
        let paragraphs = lines.slice(1).map(line => ({
            type: 'paragraph',
            text: line.trim()
        })).filter(p => p.text);

        if (limitParagraphs) {
            paragraphs = paragraphs.slice(0, limitParagraphs);
        }

        return { title, content: paragraphs };
    }

    showSummary() {
        console.log('📊 Performance Summary');
        console.log('=====================\n');

        let totalSpeedImprovement = 0;
        let totalTokenSavings = 0;
        let testCount = 0;

        this.results.forEach(({ testCase, results, baseline }) => {
            console.log(`${testCase}:`);
            
            if (baseline) {
                const bestOptimized = results
                    .filter(r => r.success && r.strategy !== 'Current (Full)')
                    .sort((a, b) => a.duration - b.duration)[0];
                
                if (bestOptimized) {
                    const speedImprovement = ((baseline.duration - bestOptimized.duration) / baseline.duration * 100);
                    const tokenSavings = baseline.tokens && bestOptimized.tokens ? 
                        ((baseline.tokens - bestOptimized.tokens) / baseline.tokens * 100) : 0;
                    
                    console.log(`  Best optimization: ${bestOptimized.strategy}`);
                    console.log(`  Speed improvement: ${speedImprovement.toFixed(1)}%`);
                    console.log(`  Token savings: ${tokenSavings.toFixed(1)}%`);
                    
                    totalSpeedImprovement += speedImprovement;
                    totalTokenSavings += tokenSavings;
                    testCount++;
                }
            }
            console.log();
        });

        if (testCount > 0) {
            console.log(`🎯 Overall Results:`);
            console.log(`Average speed improvement: ${(totalSpeedImprovement / testCount).toFixed(1)}%`);
            console.log(`Average token savings: ${(totalTokenSavings / testCount).toFixed(1)}%`);
            console.log();
            
            console.log(`💡 Recommendations:`);
            console.log(`- Use 'minimal' strategy for speed-critical applications`);
            console.log(`- Use 'balanced' strategy for production quality`);
            console.log(`- Use 'twopass' strategy for content with few slang terms`);
            console.log(`- Switch default model to qwen/qwen3-235b-a22b:free`);
        }
    }
}

// Main execution
async function main() {
    const comparison = new SpeedComparison();
    await comparison.runComparisons();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SpeedComparison;