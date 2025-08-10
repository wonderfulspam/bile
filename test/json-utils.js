#!/usr/bin/env node

/**
 * JsonUtils Direct Tests
 * Tests the JsonUtils class directly with various malformed JSON inputs
 */

const JsonUtils = require('../src/core/json-utils.js');

class JsonUtilsTester {
    constructor() {
        this.jsonUtils = new JsonUtils({ debug: false });
        this.passed = 0;
        this.failed = 0;
    }

    async runTests() {
        console.log('🧪 JsonUtils Direct Test Suite');
        console.log('===============================\n');

        await this.testBasicParsing();
        await this.testExtraction();
        await this.testRepair();
        await this.testRobustParsing();
        await this.testEdgeCases();
        
        console.log('===============================');
        console.log(`🎯 Tests completed: ${this.passed}/${this.passed + this.failed} passed`);
        
        if (this.failed === 0) {
            console.log('🎉 All JsonUtils tests passed!');
            return true;
        } else {
            console.log(`❌ ${this.failed} test(s) failed`);
            return false;
        }
    }

    test(name, testFn) {
        console.log(`🔍 Testing: ${name}`);
        try {
            const result = testFn();
            if (result) {
                console.log('   ✅ Passed');
                this.passed++;
            } else {
                console.log('   ❌ Failed');
                this.failed++;
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            this.failed++;
        }
        console.log('');
    }

    async testBasicParsing() {
        console.log('📦 Basic JSON Parsing Tests...\n');

        this.test('Valid JSON object', () => {
            const json = '{"test": "value", "number": 123}';
            const result = this.jsonUtils.parseRobustly(json);
            return result && result.test === 'value' && result.number === 123;
        });

        this.test('Valid JSON array', () => {
            const json = '[{"test": "value1"}, {"test": "value2"}]';
            const result = this.jsonUtils.parseRobustly(json);
            return Array.isArray(result) && result.length === 2 && result[0].test === 'value1';
        });

        this.test('Empty JSON object', () => {
            const json = '{}';
            const result = this.jsonUtils.parseRobustly(json);
            return result && typeof result === 'object' && Object.keys(result).length === 0;
        });

        this.test('Null input', () => {
            const result = this.jsonUtils.parseRobustly(null);
            return result === null;
        });

        this.test('Empty string input', () => {
            const result = this.jsonUtils.parseRobustly('');
            return result === null;
        });
    }

    async testExtraction() {
        console.log('🔍 JSON Extraction Tests...\n');

        this.test('JSON with leading text', () => {
            const content = 'Here is the JSON response: {"test": "value"}';
            const extracted = this.jsonUtils.extractJsonFromContent(content);
            return extracted === '{"test": "value"}';
        });

        this.test('JSON with trailing text', () => {
            const content = '{"test": "value"}\n\nThis is some explanatory text.';
            const extracted = this.jsonUtils.extractJsonFromContent(content);
            return extracted === '{"test": "value"}';
        });

        this.test('JSON with both leading and trailing text', () => {
            const content = 'Response:\n{"test": "value"}\nEnd of response.';
            const extracted = this.jsonUtils.extractJsonFromContent(content);
            return extracted === '{"test": "value"}';
        });

        this.test('Complex nested JSON extraction', () => {
            const content = 'Here is the data: {"outer": {"inner": {"test": "value"}}} More text here.';
            const extracted = this.jsonUtils.extractJsonFromContent(content);
            return extracted === '{"outer": {"inner": {"test": "value"}}}';
        });

        this.test('Multiple JSON objects - should extract first', () => {
            const content = '{"first": "value"} {"second": "value"}';
            const extracted = this.jsonUtils.extractJsonFromContent(content);
            return extracted === '{"first": "value"}';
        });
    }

    async testRepair() {
        console.log('🔧 JSON Repair Tests...\n');

        this.test('Trailing comma in object', () => {
            const json = '{"test": "value", "number": 123,}';
            const repaired = this.jsonUtils.repairMalformedJson(json);
            return repaired && JSON.parse(repaired).test === 'value';
        });

        this.test('Trailing comma in array', () => {
            const json = '["item1", "item2",]';
            const repaired = this.jsonUtils.repairMalformedJson(json);
            const parsed = JSON.parse(repaired);
            return Array.isArray(parsed) && parsed.length === 2;
        });

        this.test('Missing closing brace', () => {
            const json = '{"test": "value", "nested": {"inner": "value"}';
            const repaired = this.jsonUtils.repairMalformedJson(json);
            return repaired && JSON.parse(repaired).nested.inner === 'value';
        });

        this.test('Single quotes to double quotes', () => {
            const json = "{'test': 'value', 'number': 123}";
            const repaired = this.jsonUtils.repairMalformedJson(json);
            return repaired && JSON.parse(repaired).test === 'value';
        });

        this.test('Unquoted property names', () => {
            const json = '{test: "value", number: 123}';
            const repaired = this.jsonUtils.repairMalformedJson(json);
            return repaired && JSON.parse(repaired).test === 'value';
        });

        this.test('Double-escaped quotes', () => {
            const json = '{"text": "value with \\\\"quotes\\\\" inside"}';
            const repaired = this.jsonUtils.repairMalformedJson(json);
            return repaired && JSON.parse(repaired).text.includes('"quotes"');
        });
    }

    async testRobustParsing() {
        console.log('💪 Robust Parsing Integration Tests...\n');

        this.test('Complex malformed JSON with multiple issues', () => {
            const json = `Here is the response: {'test': "value", number: 123, array: ["item1", "item2",], More explanation here.`;
            const result = this.jsonUtils.parseRobustly(json);
            return result && result.test === 'value' && result.number === 123;
        });

        this.test('Real-world AI response format', () => {
            const content = `{"sl":"en","tl":"es","content":[{"type":"paragraph","o":"Hello world","t":"Hola mundo"}]}

This translation includes cultural adaptations.`;
            const result = this.jsonUtils.parseRobustly(content);
            return result && result.sl === 'en' && result.content[0].t === 'Hola mundo';
        });

        this.test('Escaped quotes in values', () => {
            const json = '{"text": "She said \\"Hello\\" to me"}';
            const result = this.jsonUtils.parseRobustly(json);
            return result && result.text === 'She said "Hello" to me';
        });

        this.test('Unicode characters', () => {
            const json = '{"text": "Café résumé naïve 🌟"}';
            const result = this.jsonUtils.parseRobustly(json);
            return result && result.text.includes('Café') && result.text.includes('🌟');
        });
    }

    async testEdgeCases() {
        console.log('🎯 Edge Case Tests...\n');

        this.test('Very large JSON object', () => {
            const largeData = Array.from({length: 1000}, (_, i) => `"key${i}": "value${i}"`).join(',');
            const json = `{${largeData}}`;
            const result = this.jsonUtils.parseRobustly(json);
            return result && result.key0 === 'value0' && result.key999 === 'value999';
        });

        this.test('Deeply nested JSON', () => {
            const json = '{"level1":{"level2":{"level3":{"level4":{"value":"deep"}}}}}';
            const result = this.jsonUtils.parseRobustly(json);
            return result && result.level1.level2.level3.level4.value === 'deep';
        });

        this.test('JSON with newlines in string values', () => {
            const json = '{"multiline": "line1\\nline2\\nline3"}';
            const result = this.jsonUtils.parseRobustly(json);
            return result && result.multiline.includes('line1');
        });

        this.test('Empty arrays and objects', () => {
            const json = '{"empty_obj": {}, "empty_array": [], "null_value": null}';
            const result = this.jsonUtils.parseRobustly(json);
            return result && 
                   typeof result.empty_obj === 'object' && 
                   Array.isArray(result.empty_array) && 
                   result.null_value === null;
        });

        this.test('Numbers and booleans', () => {
            const json = '{"int": 123, "float": 45.67, "true": true, "false": false}';
            const result = this.jsonUtils.parseRobustly(json);
            return result && 
                   result.int === 123 && 
                   result.float === 45.67 && 
                   result.true === true && 
                   result.false === false;
        });
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new JsonUtilsTester();
    tester.runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(console.error);
}

module.exports = JsonUtilsTester;