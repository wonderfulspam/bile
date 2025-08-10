/**
 * Groq API Client - Provider-specific implementation  
 */

class GroqClient {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.timeout = options.timeout || 30000;
        this.debug = options.debug || false;
        
        // Groq's best models for translation (ordered by capability)
        this.models = [
            'openai/gpt-oss-20b',    // Recommended for high quality
            'mixtral-8x7b-32768',    // Best quality, good speed
            'llama2-70b-4096',       // Excellent quality, very fast
            'llama3-70b-8192',       // Latest Llama, good balance
            'gemma-7b-it'            // Fallback, fastest
        ];
        
        this.preferredModel = options.model || this.models[0];
        this.strategy = options.strategy || 'minimal';
    }

    async translate(content, targetLang = 'en', options = {}) {
        const strategy = options.strategy || this.strategy;
        
        if (this.debug) {
            console.log(`Using Groq ${strategy} strategy with ${this.preferredModel}`);
        }

        try {
            switch (strategy) {
                case 'minimal':
                    return await this._translateMinimal(content, targetLang);
                case 'balanced':
                    return await this._translateBalanced(content, targetLang);
                case 'twopass':
                    return await this._translateTwoPass(content, targetLang);
                default:
                    return await this._translateMinimal(content, targetLang);
            }
        } catch (error) {
            if (this.debug) {
                console.error(`Groq translation failed:`, error);
            }
            throw error;
        }
    }

    async _translateMinimal(content, targetLang) {
        const prompt = [{
            role: 'system',
            content: `Translate to ${targetLang}. Mark slang with <slang></slang>. Return JSON:
{"source_language":"","target_language":"${targetLang}","title_original":"","title_translated":"","content":[{"type":"paragraph","original":"","translated":"","slang_terms":[{"term":"","translation":"","explanation_original":"","explanation_translated":""}]}]}`
        }, {
            role: 'user',
            content: JSON.stringify(content)
        }];

        const response = await this._makeRequest({
            model: this.preferredModel,
            messages: prompt,
            max_tokens: 1500,
            temperature: 0.1
        });

        return this._parseResponse(response, 'minimal');
    }

    async _translateBalanced(content, targetLang) {
        const prompt = [{
            role: 'system',
            content: `Professional translator. Translate to ${targetLang} preserving cultural terms in <slang> tags.
Provide bilingual explanations for slang/cultural terms.
Return structured JSON with source_language, target_language, title_original, title_translated, and content array.`
        }, {
            role: 'user',
            content: JSON.stringify(content)
        }];

        const response = await this._makeRequest({
            model: this.preferredModel,
            messages: prompt,
            max_tokens: 2000,
            temperature: 0.2
        });

        return this._parseResponse(response, 'balanced');
    }

    async _translateTwoPass(content, targetLang) {
        if (this.debug) {
            console.log('Groq two-pass: Step 1 - Translation');
        }

        // Pass 1: Fast translation
        const translatePrompt = [{
            role: 'system',
            content: `Translate to ${targetLang}. Keep cultural/slang terms unchanged. Return translated text only.`
        }, {
            role: 'user',
            content: JSON.stringify(content)
        }];

        const translation = await this._makeRequest({
            model: this.preferredModel,
            messages: translatePrompt,
            max_tokens: 1000,
            temperature: 0.1
        });

        const translatedText = translation.choices[0].message.content;

        // Check if slang analysis needed
        if (this._hasSlangTerms(translatedText, content)) {
            if (this.debug) {
                console.log('Groq two-pass: Step 2 - Slang analysis');
            }

            const slangPrompt = [{
                role: 'system',
                content: `Find slang/cultural terms. Provide bilingual explanations as JSON.
Format: {"slang_terms":[{"term":"","translation":"","explanation_original":"","explanation_translated":""}]}`
            }, {
                role: 'user',
                content: `Original: ${JSON.stringify(content)}\nTranslated: ${translatedText}`
            }];

            const slangAnalysis = await this._makeRequest({
                model: this.preferredModel,
                messages: slangPrompt,
                max_tokens: 800,
                temperature: 0.2
            });

            return this._combineTwoPassResults(content, translatedText, slangAnalysis, targetLang);
        }

        return this._createSimpleResult(content, translatedText, targetLang);
    }

    async _makeRequest(payload) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            let startTime;
            if (this.debug) {
                startTime = Date.now();
                console.log(`Making Groq request with model: ${payload.model}`);
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (this.debug && startTime) {
                const duration = Date.now() - startTime;
                console.log(`Groq request completed in ${duration}ms`);
                console.log(`Usage: ${result.usage?.total_tokens || 'N/A'} tokens`);
            }

            return result;

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Groq request timed out after ${this.timeout}ms`);
            }
            throw error;
        }
    }

    _parseResponse(response, strategy) {
        const content = response.choices[0].message.content;
        
        // Clean JSON from markdown if present
        let cleanContent = content;
        if (content.includes('```json')) {
            cleanContent = content.replace(/```json\n?/g, '').replace(/\n?```/g, '');
        }

        try {
            const parsed = JSON.parse(cleanContent);
            return {
                ...parsed,
                metadata: {
                    provider: 'groq',
                    model: this.preferredModel,
                    strategy: strategy,
                    usage: response.usage,
                    translatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            if (this.debug) {
                console.error('Raw response:', content);
            }
            throw new Error(`Failed to parse Groq response: ${error.message}`);
        }
    }

    _hasSlangTerms(translatedText, originalContent) {
        const originalText = JSON.stringify(originalContent).toLowerCase();
        const translated = translatedText.toLowerCase();
        
        // Heuristic: Look for potential cultural/slang indicators
        const indicators = [
            'startup', 'fintech', 'tech', 'ai', 'ki',
            'münchen', 'berlin', 'deutschland', 'german',
            'euro', 'million', 'billion'
        ];
        
        return indicators.some(term => 
            originalText.includes(term) || translated.includes(term)
        );
    }

    _createSimpleResult(originalContent, translatedText, targetLang) {
        return {
            source_language: 'de',
            target_language: targetLang,
            title_original: originalContent.title || '',
            title_translated: originalContent.title || '',
            content: [{
                type: 'paragraph',
                original: originalContent.content?.[0]?.text || '',
                translated: translatedText,
                slang_terms: []
            }],
            metadata: {
                provider: 'groq',
                model: this.preferredModel,
                strategy: 'twopass-simple',
                translatedAt: new Date().toISOString()
            }
        };
    }

    async testConnection() {
        try {
            await this._makeRequest({
                model: this.preferredModel,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            });
            return true;
        } catch (error) {
            if (this.debug) {
                console.error('Groq connection test failed:', error);
            }
            return false;
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GroqClient;
}