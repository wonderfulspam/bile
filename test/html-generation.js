#!/usr/bin/env node

/**
 * Test script to generate HTML locally using existing JSON data
 * This lets us test the tab generator fixes without reinstalling userscript
 */

const fs = require('fs');
const path = require('path');

// Load the tab generator module
const BileTabGenerator = require('../src/browser/tab-generator.js');

// Load the sample JSON data
const sampleJsonPath = path.join(__dirname, '../ai/docs/sample-taz-article.en.json');
const sampleData = JSON.parse(fs.readFileSync(sampleJsonPath, 'utf8'));

console.log('🧪 Testing HTML generation with fixed slang term logic...\n');

// Generate HTML using the fixed tab generator
const generatedHtml = BileTabGenerator.generateBasicHtml(sampleData);

// Save the generated HTML to test output directory
const outputPath = path.join(__dirname, 'output', 'test-output.html');
fs.writeFileSync(outputPath, generatedHtml);

console.log(`✅ Generated HTML saved to: ${outputPath}`);
console.log(`📊 Content statistics:`);
console.log(`   - Sections: ${sampleData.content.length}`);
console.log(`   - Total slang terms: ${sampleData.content.reduce((sum, section) => sum + (section.slang_terms?.length || 0), 0)}`);

// Analyze slang term distribution
const slangBySection = sampleData.content.map((section, idx) => ({
    section: idx,
    count: section.slang_terms?.length || 0,
    terms: section.slang_terms?.map(t => t.term) || []
})).filter(s => s.count > 0);

console.log('\n📝 Slang terms by section:');
slangBySection.forEach(section => {
    console.log(`   Section ${section.section}: ${section.count} terms (${section.terms.join(', ')})`);
});

// Check for explanation languages in the data
console.log('\n🔍 Checking explanation languages in JSON data:');
let germanExplanations = 0;
let englishExplanations = 0;

sampleData.content.forEach(section => {
    if (section.slang_terms) {
        section.slang_terms.forEach(term => {
            if (term.explanation_original) {
                // Simple heuristic to detect German vs English
                if (term.explanation_original.includes('ein ') || term.explanation_original.includes('eine ') || /[äöüß]/.test(term.explanation_original)) {
                    germanExplanations++;
                } else {
                    console.log(`   ? Unclear language in explanation_original: "${term.explanation_original.substring(0, 50)}..."`);
                }
            }
            if (term.explanation_translated) {
                if (term.explanation_translated.includes('a ') || term.explanation_translated.includes('the ')) {
                    englishExplanations++;
                } else {
                    console.log(`   ? Unclear language in explanation_translated: "${term.explanation_translated.substring(0, 50)}..."`);
                }
            }
        });
    }
});

console.log(`   - German explanations (explanation_original): ${germanExplanations}`);
console.log(`   - English explanations (explanation_translated): ${englishExplanations}`);

console.log(`\n🌐 Open ${outputPath} in your browser to test the fixes!`);
console.log('   - Check that German tooltips show German explanations');
console.log('   - Check that English tooltips show English explanations');
console.log('   - Check that both versions have slang terms highlighted');