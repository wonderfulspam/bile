/**
 * Userscript Header Configuration
 * Contains metadata block and configuration for Tampermonkey/Greasemonkey
 */

const USERSCRIPT_HEADER = `// ==UserScript==
// @name         Bile - Bilingual Web Page Converter
// @namespace    https://github.com/user/bile
// @version      3.0.0
// @description  Convert web articles to bilingual interactive learning tools using cutting-edge AI models
// @author       Bile Team
// @match        https://*.bbc.com/*
// @match        https://*.cnn.com/*
// @match        https://*.theguardian.com/*
// @match        https://*.nytimes.com/*
// @match        https://*.reuters.com/*
// @match        https://*.taz.de/*
// @match        https://*.spiegel.de/*
// @match        https://*.zeit.de/*
// @match        https://*.faz.net/*
// @match        https://*.elpais.com/*
// @match        https://*.elmundo.es/*
// @match        https://*.lavanguardia.com/*
// @match        https://*.lemonde.fr/*
// @match        https://*.lefigaro.fr/*
// @match        https://*.liberation.fr/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_log
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/user/bile/main/src/bile.user.js
// @downloadURL  https://raw.githubusercontent.com/user/bile/main/src/bile.user.js
// @supportURL   https://github.com/user/bile/issues
// @homepageURL  https://github.com/user/bile
// ==/UserScript==`;

// Supported sites configuration
const SUPPORTED_SITES = {
    // English news sites
    'bbc.com': { language: 'en', name: 'BBC News' },
    'cnn.com': { language: 'en', name: 'CNN' },
    'theguardian.com': { language: 'en', name: 'The Guardian' },
    'nytimes.com': { language: 'en', name: 'New York Times' },
    'reuters.com': { language: 'en', name: 'Reuters' },
    
    // German news sites
    'taz.de': { language: 'de', name: 'taz' },
    'spiegel.de': { language: 'de', name: 'Der Spiegel' },
    'zeit.de': { language: 'de', name: 'Die Zeit' },
    'faz.net': { language: 'de', name: 'Frankfurter Allgemeine' },
    
    // Spanish news sites
    'elpais.com': { language: 'es', name: 'El País' },
    'elmundo.es': { language: 'es', name: 'El Mundo' },
    'lavanguardia.com': { language: 'es', name: 'La Vanguardia' },
    
    // French news sites
    'lemonde.fr': { language: 'fr', name: 'Le Monde' },
    'lefigaro.fr': { language: 'fr', name: 'Le Figaro' },
    'liberation.fr': { language: 'fr', name: 'Libération' }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { USERSCRIPT_HEADER, SUPPORTED_SITES };
}