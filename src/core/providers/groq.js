/**
 * Groq API Client - Provider-specific implementation
 */

class GroqClient {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.timeout = options.timeout || 30000;
        this.debug = options.debug || false;

        // Groq's current available models for translation (August 2025)
        this.models = [
            'llama-3.3-70b-versatile',  // Latest Llama, best quality
            'llama-3.1-8b-instant',     // Fast, efficient, current
            'qwen/qwen3-32b',            // Good alternative option
            'openai/gpt-oss-20b'        // High quality but slower/uses reasoning
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
        // Check if we need multi-pass translation for long articles
        if (content.content && Array.isArray(content.content) && content.content.length > 4) {
            return await this._translateMultiPass(content, targetLang);
        }

        // Adaptively limit content size for single-pass translation
        let processedContent = content;
        if (content.content && Array.isArray(content.content)) {
            // Calculate rough content size
            const totalTextLength = content.content.reduce((sum, section) => sum + (section.text?.length || 0), 0);

            // Adaptive limiting based on content size
            let maxSections = 4;
            let maxTextPerSection = 600;

            if (totalTextLength > 3000) {
                maxSections = 4;
                maxTextPerSection = 550;
            } else if (totalTextLength > 2000) {
                maxSections = 4;
                maxTextPerSection = 600;
            }

            const limitedSections = content.content.slice(0, maxSections).map(section => ({
                type: section.type || 'paragraph',
                text: section.text ? section.text.substring(0, maxTextPerSection) : '',
            }));

            processedContent = {
                ...content,
                content: limitedSections
            };

            if (this.debug) {
                console.log(`Groq: Single-pass limiting content from ${content.content.length} to ${limitedSections.length} sections (${totalTextLength} chars total)`);
            }
        }

        const prompt = [{
            role: 'system',
            content: `Translate to ${targetLang}. Identify ALL slang, cultural terms, made-up words, and satirical language. Return only JSON:
{"sl":"","tl":"${targetLang}","to":"","tt":"","content":[{"type":"paragraph","o":"","t":"","st":[{"tm":"","tr":"","eo":"","et":""}]}]}

Keys: sl=source_language, tl=target_language, to=title_original, tt=title_translated, o=original, t=translated, st=slang_terms, tm=term, tr=translation, eo=explanation_original, et=explanation_translated.
IMPORTANT: eo in SOURCE language, et in ${targetLang}. Find every unusual/creative/slang term.`
        }, {
            role: 'user',
            content: JSON.stringify(processedContent)
        }];

        const response = await this._makeRequest({
            model: this.preferredModel,
            messages: prompt,
            max_tokens: 3000,  // Increased to ensure completion
            temperature: 0.1
        });

        return this._parseResponse(response, 'minimal');
    }

    async _translateBalanced(content, targetLang) {
        // Apply same content limiting as minimal
        let processedContent = content;
        if (content.content && Array.isArray(content.content)) {
            const limitedSections = content.content.slice(0, 3).map(section => ({
                type: section.type || 'paragraph',
                text: section.text ? section.text.substring(0, 500) : ''
            }));
            processedContent = {
                ...content,
                content: limitedSections
            };
        }

        const prompt = [{
            role: 'system',
            content: `Professional translator. Translate to ${targetLang} preserving cultural terms in <slang> tags.
Provide bilingual explanations for slang/cultural terms.
Return structured JSON with source_language, target_language, title_original, title_translated, and content array.`
        }, {
            role: 'user',
            content: JSON.stringify(processedContent)
        }];

        const response = await this._makeRequest({
            model: this.preferredModel,
            messages: prompt,
            max_tokens: 4000,
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

    async _translateMultiPass(content, targetLang) {
        if (this.debug) {
            console.log(`Groq: Using multi-pass translation for ${content.content.length} sections`);
        }

        const batchSize = 4; // Process 4 sections at a time
        const allResults = [];

        // Process in batches
        for (let i = 0; i < content.content.length; i += batchSize) {
            const batch = content.content.slice(i, i + batchSize);

            // Create batch content
            const batchContent = {
                ...content,
                content: batch.map(section => ({
                    type: section.type || 'paragraph',
                    text: section.text ? section.text.substring(0, 600) : '',
                }))
            };

            if (this.debug) {
                console.log(`Groq: Translating batch ${Math.floor(i/batchSize) + 1} (sections ${i+1}-${Math.min(i+batchSize, content.content.length)})`);
            }

            // Translate batch
            const batchResult = await this._translateSingleBatch(batchContent, targetLang);

            // Collect results - store the whole batch result for metadata
            if (batchResult.content && Array.isArray(batchResult.content)) {
                // Store individual content items
                allResults.push(...batchResult.content);

                // Store metadata from first batch
                if (i === 0) {
                    allResults.firstBatchMeta = {
                        source_language: batchResult.source_language,
                        title_translated: batchResult.title_translated
                    };
                }
            }

            // Small delay between batches to be respectful to the API
            if (i + batchSize < content.content.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Combine all results
        const combinedResult = {
            source_language: allResults.firstBatchMeta?.source_language || content.source_language || 'auto',
            target_language: targetLang,
            title_original: content.title || '',
            title_translated: allResults.firstBatchMeta?.title_translated || content.title || '',
            content: allResults.filter(item => item.type), // Remove metadata
            metadata: {
                provider: 'groq',
                model: this.preferredModel,
                strategy: 'multi-pass',
                batches: Math.ceil(content.content.length / batchSize),
                sections: content.content.length
            }
        };

        if (this.debug) {
            console.log(`Groq: Multi-pass complete - translated ${allResults.length} sections in ${Math.ceil(content.content.length / batchSize)} batches`);
        }

        return combinedResult;
    }

    async _translateSingleBatch(content, targetLang) {
        const prompt = [{
            role: 'system',
            content: `Translate to ${targetLang}. Identify slang/cultural terms. Return only JSON:
{"sl":"","tl":"${targetLang}","to":"","tt":"","content":[{"type":"paragraph","o":"","t":"","st":[{"tm":"","tr":"","eo":"","et":""}]}]}

Keys: sl=source_language, tl=target_language, to=title_original, tt=title_translated, o=original, t=translated, st=slang_terms, tm=term, tr=translation, eo=explanation_original, et=explanation_translated.
IMPORTANT: eo in SOURCE language, et in ${targetLang}.`
        }, {
            role: 'user',
            content: JSON.stringify(content)
        }];

        const response = await this._makeRequest({
            model: this.preferredModel,
            messages: prompt,
            max_tokens: 2500,  // Slightly reduced for batches
            temperature: 0.1
        });

        return this._parseResponse(response, 'multi-pass');
    }

    _expandAbbreviatedJson(abbrevResult) {
        if (!abbrevResult) return abbrevResult;

        // Expand main object
        const expanded = {
            source_language: abbrevResult.sl || abbrevResult.source_language,
            target_language: abbrevResult.tl || abbrevResult.target_language,
            title_original: abbrevResult.to || abbrevResult.title_original,
            title_translated: abbrevResult.tt || abbrevResult.title_translated,
            content: []
        };

        // Expand content array
        if (abbrevResult.content && Array.isArray(abbrevResult.content)) {
            expanded.content = abbrevResult.content.map(section => ({
                type: section.type,
                original: section.o || section.original,
                translated: section.t || section.translated,
                slang_terms: section.st ? section.st.map(term => ({
                    term: term.tm || term.term,
                    translation: term.tr || term.translation,
                    explanation_original: term.eo || term.explanation_original,
                    explanation_translated: term.et || term.explanation_translated
                })) : (section.slang_terms || [])
            }));
        }

        return expanded;
    }

    _createFallbackFromReasoning(reasoningText, strategy) {
        // Extract key information from reasoning for a basic translation
        // This is a fallback when the model reasoning chain doesn't produce JSON output

        const titleMatch = reasoningText.match(/title[_\s]*translated[:\s]*['"](.*?)['"]/i) ||
                          reasoningText.match(/translated[:\s]*['"](.*?)['"]/i);
        const sourceLanguageMatch = reasoningText.match(/source[_\s]*language[:\s]*['"](.*?)['"]/i) ||
                                  reasoningText.match(/detected.*?language[:\s]*['"](.*?)['"]/i);

        // Create a basic JSON structure
        const fallbackResponse = {
            "source_language": sourceLanguageMatch ? sourceLanguageMatch[1] : "de",
            "target_language": "en",
            "title_original": "Content extracted from reasoning",
            "title_translated": titleMatch ? titleMatch[1] : "Content extracted from reasoning",
            "content": [{
                "type": "paragraph",
                "original": "Content analysis performed but full translation incomplete due to token limits",
                "translated": "Content analysis performed but full translation incomplete due to token limits",
                "slang_terms": []
            }],
            "metadata": {
                "note": "Response reconstructed from reasoning field due to token limitations"
            }
        };

        return JSON.stringify(fallbackResponse);
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

                // Check if we're close to limits
                if (result.usage?.completion_tokens >= 2800) {
                    console.warn('WARNING: Very close to token limit, may be truncated');
                }

                if (result.choices?.[0]?.finish_reason === 'length') {
                    console.warn('WARNING: Response was truncated due to length limit');
                }
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
        // Check if response has the expected structure
        if (!response || !response.choices || !response.choices[0]) {
            console.error('Invalid Groq response structure:', response);
            throw new Error('Invalid response from Groq API');
        }

        const message = response.choices[0].message;
        let content = message.content;

        // Handle models that return reasoning chains (like gpt-oss-20b)
        // In these cases, the actual content might be empty but reasoning contains the work
        if ((!content || content.trim() === '') && message.reasoning) {
            if (this.debug) {
                console.log('Content field empty, but reasoning field present. Model used reasoning chain.');
                console.log('Reasoning length:', message.reasoning.length);
            }

            // Try to extract JSON from the reasoning field
            const reasoningText = message.reasoning;

            // Look for JSON patterns in reasoning
            const jsonMatches = reasoningText.match(/\{[^{}]*"source_language"[^{}]*\}/g) ||
                              reasoningText.match(/\{[\s\S]*\}/g);

            if (jsonMatches && jsonMatches.length > 0) {
                content = jsonMatches[jsonMatches.length - 1]; // Take the last/most complete JSON
                if (this.debug) {
                    console.log('Extracted JSON from reasoning field');
                }
            } else {
                // If we can't find JSON, create a simple response based on reasoning
                content = this._createFallbackFromReasoning(reasoningText, strategy);
                if (this.debug) {
                    console.log('Created fallback response from reasoning analysis');
                }
            }
        }

        // Final check if content is still empty
        if (!content || content.trim() === '') {
            console.error('Empty response from Groq after reasoning check:', response);
            console.error('Message object details:', message);
            if (response.usage) {
                console.error('Token usage:', response.usage);
            }
            throw new Error('Empty response from Groq API - possible token limit exceeded');
        }

        // Log raw content for debugging when finish_reason is 'length'
        if (this.debug && response.choices[0].finish_reason === 'length') {
            console.log('Response truncated due to length. Raw content:');
            console.log(content);
            console.log('Content length:', content.length);
        }

        // Clean JSON from markdown and explanatory text if present
        let cleanContent = content;

        // Remove markdown formatting - handle various code block styles
        if (content.includes('```json')) {
            cleanContent = content.replace(/```json\n?/g, '').replace(/\n?```/g, '');
        } else if (content.includes('```\n{') || content.includes('```{')) {
            // Handle plain code blocks with JSON
            cleanContent = content.replace(/```\n?/g, '');
        }

        // Handle models that return explanatory text with embedded JSON
        if (content.includes('Here') || content.includes('JSON format:') || content.includes('translation')) {
            // Try to find the first complete JSON object in the response
            const lines = cleanContent.split('\n');
            let jsonStartIndex = -1;
            let jsonEndIndex = -1;
            let braceCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('{') && jsonStartIndex === -1) {
                    jsonStartIndex = i;
                    braceCount = 1;
                } else if (jsonStartIndex !== -1) {
                    // Count braces to find the end of JSON object
                    for (const char of line) {
                        if (char === '{') braceCount++;
                        else if (char === '}') braceCount--;
                    }

                    if (braceCount === 0) {
                        jsonEndIndex = i;
                        break;
                    }
                }
            }

            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                cleanContent = lines.slice(jsonStartIndex, jsonEndIndex + 1).join('\n');
                if (this.debug) {
                    console.log('Extracted JSON from explanatory response using line parsing');
                }
            } else {
                // Fallback: try to fix incomplete JSON
                let jsonMatch = content.match(/{"source_language"[\s\S]*"content":\s*\[[\s\S]*$/);
                if (jsonMatch) {
                    let jsonStr = jsonMatch[0];

                    // Try to close incomplete JSON structures
                    if (!jsonStr.endsWith('}')) {
                        // Count open braces and brackets to determine what to close
                        const openBraces = (jsonStr.match(/{/g) || []).length - (jsonStr.match(/}/g) || []).length;
                        const openBrackets = (jsonStr.match(/\[/g) || []).length - (jsonStr.match(/\]/g) || []).length;

                        // Close brackets and braces
                        jsonStr += ']'.repeat(Math.max(0, openBrackets));
                        jsonStr += '}'.repeat(Math.max(0, openBraces));

                        if (this.debug) {
                            console.log('Attempted to fix incomplete JSON');
                        }
                    }

                    cleanContent = jsonStr;
                    if (this.debug) {
                        console.log('Extracted JSON using regex fallback');
                    }
                }
            }
        }

        try {
            const parsed = JSON.parse(cleanContent);
            const expanded = this._expandAbbreviatedJson(parsed);
            return {
                ...expanded,
                metadata: {
                    provider: 'groq',
                    model: this.preferredModel,
                    strategy: strategy,
                    usage: response.usage,
                    translatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Failed to parse JSON. Raw content:', content);
            console.error('Clean content:', cleanContent);
            if (response.usage) {
                console.error('Token usage:', response.usage);
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
} else if (typeof window !== 'undefined') {
    window.GroqClient = GroqClient;
}