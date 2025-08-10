/**
 * JSON Utilities for AI Response Processing
 * Handles parsing, extraction, and repair of potentially malformed JSON from AI providers
 */

class JsonUtils {
    constructor(options = {}) {
        this.debug = options.debug || false;
    }

    /**
     * Robustly parse JSON with automatic extraction and repair
     * @param {string} content - Raw content that may contain JSON
     * @param {Object} options - Parsing options
     * @returns {Object|null} Parsed JSON or null if unsuccessful
     */
    parseRobustly(content, options = {}) {
        if (!content || typeof content !== 'string') return null;

        try {
            // Fast path: try direct parsing first
            return JSON.parse(content);
        } catch (error) {
            if (this.debug) {
                console.log('Direct JSON parse failed, trying extraction...');
            }
        }

        // Try extraction methods
        const extracted = this.extractJsonFromContent(content);
        if (extracted) {
            try {
                return JSON.parse(extracted);
            } catch (error) {
                if (this.debug) {
                    console.log('Extracted JSON parse failed, trying repair on extracted content...');
                }
                
                // Try to repair the extracted content
                const repairedExtracted = this.repairMalformedJson(extracted);
                if (repairedExtracted) {
                    try {
                        return JSON.parse(repairedExtracted);
                    } catch (repairError) {
                        if (this.debug) {
                            console.log('Repair of extracted content also failed');
                        }
                    }
                }
            }
        }


        // Try AI-specific structural fixes for known patterns
        const aiFixed = this.fixAiStructuralErrors(extracted || content);
        if (aiFixed) {
            try {
                return JSON.parse(aiFixed);
            } catch (error) {
                if (this.debug) {
                    console.log('AI structural fixes failed, trying general repair...');
                }
            }
        }

        // Try repair methods on original content (fallback)
        const repaired = this.repairMalformedJson(content);
        if (repaired) {
            try {
                return JSON.parse(repaired);
            } catch (error) {
                if (this.debug) {
                    console.log('All JSON recovery methods failed');
                }
            }
        }

        return null;
    }


    /**
     * Fix known AI structural JSON errors
     * @param {string} jsonString - JSON with AI structural errors  
     * @returns {string|null} Fixed JSON or null
     */
    fixAiStructuralErrors(jsonString) {
        if (!jsonString || typeof jsonString !== 'string') return null;
        
        let fixed = jsonString;
        
        // Fix #1: Remove duplicate tm/tr/eo/et fields outside st arrays
        // Pattern: }],"tm":"...","tr":"...","eo":"...","et":"..."},{
        fixed = fixed.replace(/(\}\]),"tm":"[^"]*","tr":"[^"]*","eo":"[^"]*","et":"[^"]*"(\},?\{)/g, '$1$2');
        
        // Fix #2: Wrap bare content objects missing opening brace  
        // Pattern: },"type":"paragraph" should be },{"type":"paragraph"
        fixed = fixed.replace(/(\}),("type":"paragraph")/g, '$1,{$2');
        
        // Fix #3: Add missing closing braces
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        if (openBraces > closeBraces) {
            fixed += '}'.repeat(openBraces - closeBraces);
        }
        
        return fixed !== jsonString ? fixed : null;
    }

    /**
     * Extract clean JSON from content that may have explanatory text before or after
     * @param {string} content - Content containing JSON
     * @returns {string|null} Extracted JSON string or null
     */
    extractJsonFromContent(content) {
        if (!content || typeof content !== 'string') return null;

        // Method 1: Character-by-character JSON extraction
        let braceCount = 0;
        let jsonStart = -1;
        let jsonEnd = -1;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            
            if (char === '{') {
                if (braceCount === 0) {
                    jsonStart = i; // Mark start of potential JSON
                }
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && jsonStart !== -1) {
                    jsonEnd = i; // Mark end of JSON
                    break; // Stop at first complete JSON object
                }
            }
        }
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const candidateJson = content.substring(jsonStart, jsonEnd + 1);
            try {
                JSON.parse(candidateJson);
                return candidateJson;
            } catch (error) {
                // Continue to other methods
            }
        }

        // Method 2: Line-based extraction (for responses with explanatory text)
        const lines = content.split('\n');
        let jsonStartIndex = -1;
        let jsonEndIndex = -1;
        braceCount = 0;

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
            const candidateJson = lines.slice(jsonStartIndex, jsonEndIndex + 1).join('\n');
            try {
                JSON.parse(candidateJson);
                return candidateJson;
            } catch (error) {
                // Continue to other methods
            }
        }

        // Method 3: Regex-based extraction for common patterns
        const jsonRegexPatterns = [
            // Try to match complete JSON structures by finding balanced braces
            /(\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\})/,  // Balanced brace matching
            /(\{"sl"[\s\S]*"content":\s*\[[\s\S]*?\]\s*\})/,  // Abbreviated format with content array
            /(\{"source_language"[\s\S]*"content":\s*\[[\s\S]*?\]\s*\})/  // Standard format with content
        ];

        for (const pattern of jsonRegexPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                try {
                    JSON.parse(match[1]);
                    return match[1];
                } catch (error) {
                    continue;
                }
            }
        }

        // Method 4: Extract incomplete JSON structures (for cases with missing closing braces)
        // Look for opening brace and extract until we hit explanatory text
        const openBrace = content.indexOf('{');
        if (openBrace !== -1) {
            // Find likely end points: periods followed by capital letters, "More", "This", etc.
            const endMarkers = [
                /\.\s+[A-Z]/,  // Period followed by capital letter
                /\s+More\s/i,  // "More" word
                /\s+This\s/i,  // "This" word  
                /\s+The\s/i,   // "The" word
                /\s+Here\s/i,  // "Here" word
                /\s+Note\s/i   // "Note" word
            ];
            
            let potentialEnd = content.length;
            for (const marker of endMarkers) {
                const match = content.substring(openBrace).match(marker);
                if (match) {
                    const markerPos = openBrace + match.index;
                    if (markerPos < potentialEnd) {
                        potentialEnd = markerPos;
                    }
                }
            }
            
            const candidateJson = content.substring(openBrace, potentialEnd).trim();
            
            // Clean up common endings that aren't JSON
            const cleanedCandidate = candidateJson
                .replace(/,?\s*(More|This|The|Here|Note|\.)\s.*$/i, '') // Remove trailing explanatory text
                .trim();
            
            if (cleanedCandidate.length > 2) {
                return cleanedCandidate;
            }
        }

        return null; // Unable to extract valid JSON
    }

    /**
     * Attempt to repair common JSON formatting issues
     * @param {string} jsonString - Potentially malformed JSON string
     * @returns {string|null} Repaired JSON string or null
     */
    repairMalformedJson(jsonString) {
        if (!jsonString || typeof jsonString !== 'string') return null;

        let repaired = jsonString;

        try {
            // Common repair strategies
            const repairs = [
                // Fix trailing commas in objects and arrays
                () => repaired.replace(/,(\s*[}\]])/g, '$1'),
                
                // Fix missing quotes around property names
                () => repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'),
                
                // Fix single quotes to double quotes
                () => repaired.replace(/'/g, '"'),
                
                // Fix double-escaping issues
                () => repaired.replace(/\\\\"/g, '\\"'),
                
                // Fix unescaped quotes in string values (more conservative approach)
                () => repaired.replace(/([^\\])"([^",:}]*)"([^",:}]*)"([^",:}]*)/g, '$1\\"$2\\"$3\\"$4'),
                
                // Fix malformed string concatenation (common AI error)
                () => repaired.replace(/"(\w+)"\s*\+\s*"([^"]*)"/, '"$1$2"'),
                
                // Fix missing closing brackets/braces
                () => {
                    const openBraces = (repaired.match(/{/g) || []).length;
                    const closeBraces = (repaired.match(/}/g) || []).length;
                    const openBrackets = (repaired.match(/\[/g) || []).length;
                    const closeBrackets = (repaired.match(/\]/g) || []).length;
                    
                    let fixed = repaired;
                    
                    // Add missing closing brackets
                    if (openBrackets > closeBrackets) {
                        fixed += ']'.repeat(openBrackets - closeBrackets);
                    }
                    
                    // Add missing closing braces
                    if (openBraces > closeBraces) {
                        fixed += '}'.repeat(openBraces - closeBraces);
                    }
                    
                    return fixed;
                },
                
                // Fix newlines in string values
                () => repaired.replace(/"\s*\n\s*"/g, '" "'),
                
                // Fix common unicode escape issues
                () => repaired.replace(/\\u([0-9A-Fa-f]{4})/g, (match, code) => {
                    try {
                        return String.fromCharCode(parseInt(code, 16));
                    } catch (e) {
                        return match;
                    }
                }),
                
                // Remove any trailing non-JSON content after the last brace
                () => {
                    const lastBrace = repaired.lastIndexOf('}');
                    if (lastBrace !== -1 && lastBrace < repaired.length - 1) {
                        return repaired.substring(0, lastBrace + 1);
                    }
                    return repaired;
                }
            ];

            // First, try applying all common fixes together for multi-issue JSON
            let multiRepaired = repaired;
            
            // Apply common structural fixes all at once
            multiRepaired = multiRepaired.replace(/,(\s*[}\]])/g, '$1'); // Trailing commas
            multiRepaired = multiRepaired.replace(/,\s*$/, ''); // Trailing comma at end of string
            multiRepaired = multiRepaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Unquoted property names
            multiRepaired = multiRepaired.replace(/'/g, '"'); // Single to double quotes
            
            // Add missing closing brackets/braces
            const openBraces = (multiRepaired.match(/{/g) || []).length;
            const closeBraces = (multiRepaired.match(/}/g) || []).length;
            const openBrackets = (multiRepaired.match(/\[/g) || []).length;
            const closeBrackets = (multiRepaired.match(/\]/g) || []).length;
            
            if (openBrackets > closeBrackets) {
                multiRepaired += ']'.repeat(openBrackets - closeBrackets);
            }
            if (openBraces > closeBraces) {
                multiRepaired += '}'.repeat(openBraces - closeBraces);
            }
            
            // Test if multi-fix approach worked
            try {
                JSON.parse(multiRepaired);
                return multiRepaired;
            } catch (e) {
                // If multi-fix didn't work, try individual repairs
            }

            // Apply repairs sequentially (fallback to original approach)
            for (const repair of repairs) {
                repaired = repair();
                
                // Test if this repair made it valid JSON
                try {
                    JSON.parse(repaired);
                    return repaired; // Success! Return the repaired JSON
                } catch (e) {
                    // This repair didn't work, continue with next repair
                    continue;
                }
            }

            // If we get here, none of the individual repairs worked
            // Try a final comprehensive repair
            return this.comprehensiveJsonRepair(repaired);

        } catch (error) {
            if (this.debug) {
                console.warn('JSON repair process failed:', error.message);
            }
            return null;
        }
    }

    /**
     * Last resort comprehensive JSON repair
     * @private
     */
    comprehensiveJsonRepair(jsonString) {
        try {
            // Extract what looks like a valid JSON structure using aggressive parsing
            let repaired = jsonString.trim();
            
            // Find the main JSON object boundaries
            const firstBrace = repaired.indexOf('{');
            if (firstBrace === -1) return null;
            
            let braceCount = 0;
            let jsonEnd = -1;
            
            for (let i = firstBrace; i < repaired.length; i++) {
                if (repaired[i] === '{') braceCount++;
                else if (repaired[i] === '}') braceCount--;
                
                if (braceCount === 0) {
                    jsonEnd = i;
                    break;
                }
            }
            
            if (jsonEnd === -1) {
                // Add missing closing braces
                const openBraces = (repaired.substring(firstBrace).match(/{/g) || []).length;
                const closeBraces = (repaired.substring(firstBrace).match(/}/g) || []).length;
                repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));
                jsonEnd = repaired.length - 1;
            }
            
            repaired = repaired.substring(firstBrace, jsonEnd + 1);
            
            // Final validation
            JSON.parse(repaired);
            return repaired;
            
        } catch (error) {
            return null;
        }
    }

    /**
     * Enhanced error reporting for JSON parsing failures
     * @param {Error} error - JSON parsing error
     * @param {string} content - Content that failed to parse
     * @param {Object} options - Error reporting options
     */
    reportParsingError(error, content, options = {}) {
        console.error('Failed to parse JSON:', error.message);
        
        // Enhanced debugging for specific error location
        if (error.message.includes('column')) {
            const match = error.message.match(/column (\d+)/);
            if (match) {
                const column = parseInt(match[1]);
                console.error(`Error at column ${column}:`);
                console.error(`Context: "${content.substring(Math.max(0, column-30), column+30)}"`);
                console.error(`         ${' '.repeat(Math.min(30, column))}^`);
                
                // Show character codes around the error
                const errorContext = content.substring(Math.max(0, column-5), column+5);
                console.error('Character codes:', errorContext.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
            }
        }
        
        // Save problematic JSON to a file for analysis (only in debug mode)
        if (this.debug && options.saveDebugFile) {
            try {
                const fs = require('fs');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                fs.writeFileSync(`debug-json-${timestamp}.json`, content);
                console.error(`Problematic JSON saved to debug-json-${timestamp}.json`);
            } catch (fsError) {
                console.error('Could not save debug JSON file:', fsError.message);
            }
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JsonUtils;
} else if (typeof window !== 'undefined') {
    window.JsonUtils = JsonUtils;
}