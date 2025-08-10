#!/usr/bin/env node

/**
 * Alternative Free AI APIs for Testing
 * Explore options while waiting for OpenRouter quota reset
 */

// Load environment variables from .env file
try {
    require('dotenv').config();
} catch (error) {
    // dotenv not available, continue with system env vars
}

class AlternativeApiExplorer {
    constructor() {
        this.alternatives = [
            {
                name: 'Hugging Face Inference API',
                url: 'https://huggingface.co/docs/api-inference/index',
                models: ['microsoft/DialoGPT-medium', 'facebook/blenderbot-400M-distill'],
                freeLimit: '1000 requests/month',
                apiKeyVar: 'HF_API_KEY',
                pros: ['Very generous free tier', 'Many models', 'Good for translation'],
                cons: ['Slower inference', 'Rate limited'],
                testEndpoint: 'https://api-inference.huggingface.co/models/'
            },
            {
                name: 'Ollama (Local)',
                url: 'https://ollama.ai/',
                models: ['llama2', 'mistral', 'codellama'],
                freeLimit: 'Unlimited (runs locally)',
                apiKeyVar: null,
                pros: ['Completely free', 'No rate limits', 'Privacy'],
                cons: ['Requires local installation', 'Uses local GPU/CPU'],
                testEndpoint: 'http://localhost:11434/api/generate'
            },
            {
                name: 'Together AI',
                url: 'https://together.ai/',
                models: ['togethercomputer/llama-2-7b-chat', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
                freeLimit: '$25 free credits',
                apiKeyVar: 'TOGETHER_API_KEY',
                pros: ['Good free credits', 'Fast inference', 'Multiple models'],
                cons: ['Credits expire', 'Requires signup'],
                testEndpoint: 'https://api.together.xyz/inference'
            },
            {
                name: 'Cohere',
                url: 'https://cohere.ai/',
                models: ['command', 'command-light'],
                freeLimit: '100 API calls/month',
                apiKeyVar: 'COHERE_API_KEY',
                pros: ['Good for text generation', 'Simple API'],
                cons: ['Very limited free tier', 'Not optimized for translation'],
                testEndpoint: 'https://api.cohere.ai/v1/generate'
            },
            {
                name: 'Groq',
                url: 'https://groq.com/',
                models: ['llama2-70b-4096', 'mixtral-8x7b-32768'],
                freeLimit: '14,000 tokens/minute',
                apiKeyVar: 'GROQ_API_KEY',
                pros: ['Very fast inference', 'Good free tier', 'Multiple models'],
                cons: ['Newer service', 'Rate limited'],
                testEndpoint: 'https://api.groq.com/openai/v1/chat/completions'
            },
            {
                name: 'Fireworks AI',
                url: 'https://fireworks.ai/',
                models: ['accounts/fireworks/models/llama-v2-7b-chat'],
                freeLimit: '$1 free credits',
                apiKeyVar: 'FIREWORKS_API_KEY',
                pros: ['Fast inference', 'OpenAI-compatible API'],
                cons: ['Limited free credits', 'Expires quickly'],
                testEndpoint: 'https://api.fireworks.ai/inference/v1/chat/completions'
            }
        ];
    }

    async exploreAlternatives() {
        console.log('🔍 Exploring Alternative Free AI APIs');
        console.log('=====================================\n');

        console.log('💡 While waiting for OpenRouter quota reset, here are alternatives:\n');

        for (const api of this.alternatives) {
            this.displayApiInfo(api);
            
            if (api.apiKeyVar && process.env[api.apiKeyVar]) {
                console.log(`   ✅ API key found: ${api.apiKeyVar}`);
                await this.testApi(api);
            } else if (!api.apiKeyVar) {
                console.log(`   ℹ️  Local service - check if running`);
                await this.testApi(api);
            } else {
                console.log(`   ⚠️  No API key found: ${api.apiKeyVar}`);
                console.log(`      Get one at: ${api.url}`);
            }
            console.log();
        }

        this.showRecommendations();
    }

    displayApiInfo(api) {
        console.log(`🔧 ${api.name}`);
        console.log(`   URL: ${api.url}`);
        console.log(`   Free limit: ${api.freeLimit}`);
        console.log(`   Models: ${api.models.slice(0, 2).join(', ')}${api.models.length > 2 ? '...' : ''}`);
        console.log(`   Pros: ${api.pros.join(', ')}`);
        console.log(`   Cons: ${api.cons.join(', ')}`);
    }

    async testApi(api) {
        try {
            if (api.name === 'Ollama (Local)') {
                await this.testOllama();
            } else if (api.name === 'Hugging Face Inference API') {
                await this.testHuggingFace(api);
            } else if (api.name === 'Groq') {
                await this.testGroq(api);
            }
            // Add more API tests as needed
        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
        }
    }

    async testOllama() {
        try {
            const response = await fetch('http://localhost:11434/api/tags', {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`   ✅ Ollama running with ${data.models?.length || 0} models`);
                if (data.models?.length > 0) {
                    console.log(`      Available: ${data.models.map(m => m.name).slice(0, 3).join(', ')}`);
                }
            } else {
                throw new Error('Ollama not responding');
            }
        } catch (error) {
            console.log(`   ❌ Ollama not running (install: curl -fsSL https://ollama.ai/install.sh | sh)`);
        }
    }

    async testHuggingFace(api) {
        const apiKey = process.env.HF_API_KEY;
        if (!apiKey) return;

        try {
            const response = await fetch(`${api.testEndpoint}microsoft/DialoGPT-medium`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: "Hello, how are you?",
                    parameters: { max_length: 50 }
                })
            });

            if (response.ok) {
                console.log(`   ✅ Hugging Face API working`);
            } else {
                const error = await response.text();
                console.log(`   ❌ HF API error: ${response.status} - ${error.substring(0, 50)}...`);
            }
        } catch (error) {
            console.log(`   ❌ HF API test failed: ${error.message}`);
        }
    }

    async testGroq(api) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return;

        try {
            const response = await fetch(api.testEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: 'Hello' }],
                    model: 'llama2-70b-4096',
                    max_tokens: 10
                })
            });

            if (response.ok) {
                console.log(`   ✅ Groq API working - very fast inference!`);
            } else {
                const error = await response.text();
                console.log(`   ❌ Groq API error: ${response.status} - ${error.substring(0, 50)}...`);
            }
        } catch (error) {
            console.log(`   ❌ Groq API test failed: ${error.message}`);
        }
    }

    showRecommendations() {
        console.log('🎯 Recommendations for Continued Testing');
        console.log('=======================================\n');

        console.log('**Best immediate options:**\n');

        console.log('1. **Ollama (Local) - Best for development**');
        console.log('   ```bash');
        console.log('   curl -fsSL https://ollama.ai/install.sh | sh');
        console.log('   ollama pull llama2  # or mistral, codellama');
        console.log('   ```');
        console.log('   ✅ Unlimited usage, no rate limits, privacy');
        console.log('   ❌ Requires local resources, setup time\n');

        console.log('2. **Groq - Best for speed testing**');
        console.log('   - Sign up at https://groq.com/');
        console.log('   - Very fast inference (good for performance testing)');
        console.log('   - 14,000 tokens/minute free tier');
        console.log('   ✅ OpenAI-compatible API, easy integration');
        console.log('   ❌ Rate limited, requires signup\n');

        console.log('3. **Together AI - Best balance**');
        console.log('   - Sign up at https://together.ai/');
        console.log('   - $25 free credits (should last for extensive testing)');
        console.log('   - Multiple models including Mixtral');
        console.log('   ✅ Good credits, multiple models');
        console.log('   ❌ Credits expire, requires signup\n');

        console.log('**Quick setup for any of these:**\n');
        console.log('1. Add API key to .env file:');
        console.log('   GROQ_API_KEY=your_key_here');
        console.log('   TOGETHER_API_KEY=your_key_here');
        console.log('   HF_API_KEY=your_key_here\n');

        console.log('2. Modify our OptimizedApiClient to use alternative endpoints');
        console.log('3. Test the same optimization strategies');
        console.log('4. Compare performance across different providers\n');

        console.log('**For immediate testing without signup:**');
        console.log('- Install Ollama locally (5 minutes setup)');
        console.log('- Use llama2 or mistral models');
        console.log('- Test all our optimization strategies offline');
        console.log('- No rate limits, unlimited testing');
    }

    async createAlternativeApiClient() {
        console.log('\n📝 Creating Alternative API Client Template');
        console.log('==========================================\n');

        const template = `
// Alternative API Client - supports multiple providers
class AlternativeApiClient {
    constructor(provider, apiKey, options = {}) {
        this.provider = provider;
        this.apiKey = apiKey;
        this.endpoints = {
            'groq': 'https://api.groq.com/openai/v1/chat/completions',
            'together': 'https://api.together.xyz/inference',
            'ollama': 'http://localhost:11434/api/generate',
            'huggingface': 'https://api-inference.huggingface.co/models/'
        };
        this.models = {
            'groq': 'llama2-70b-4096',
            'together': 'togethercomputer/llama-2-7b-chat',
            'ollama': 'llama2',
            'huggingface': 'microsoft/DialoGPT-medium'
        };
    }
    
    async translate(content, targetLang = 'en') {
        const prompt = this._buildMinimalPrompt(content, targetLang);
        
        switch(this.provider) {
            case 'groq':
                return await this._makeGroqRequest(prompt);
            case 'ollama':
                return await this._makeOllamaRequest(prompt);
            // Add other providers...
        }
    }
    
    // Implementation methods...
}`;

        console.log('Template created for multi-provider API client.');
        console.log('This would let you test optimizations across different APIs.');
    }
}

// Main execution
async function main() {
    const explorer = new AlternativeApiExplorer();
    await explorer.exploreAlternatives();
    await explorer.createAlternativeApiClient();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AlternativeApiExplorer;