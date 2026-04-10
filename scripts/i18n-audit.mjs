/**
 * i18n Audit Script - Phase 1
 * Scans all .svelte and .ts files for $t() / t() calls,
 * extracts unique keys, compares with each locale file,
 * and generates a missing keys report.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';

const SRC_DIR = join(process.cwd(), 'src');
const LOCALES_DIR = join(SRC_DIR, 'lib', 'i18n', 'locales');
const REPORT_PATH = join(process.cwd(), 'i18n_audit_report.md');

// ─── 1. Collect all source files ───────────────────────
function walkDir(dir, exts) {
  let results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.svelte-kit' || entry === 'build') continue;
      results = results.concat(walkDir(full, exts));
    } else if (exts.includes(extname(full))) {
      results.push(full);
    }
  }
  return results;
}

// ─── 2. Extract i18n keys from source ──────────────────
function extractKeys(files) {
  // Matches: $t("key"), $t('key'), t("key"), t('key')
  // Also matches: $t(`key`) for template literals without expressions
  const patterns = [
    /\$t\(\s*["'`]([^"'`\$\{]+)["'`]\s*[,)]/g,
    /\bt\(\s*["'`]([^"'`\$\{]+)["'`]\s*[,)]/g,
  ];

  const keyMap = new Map(); // key -> Set<file>

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const relPath = relative(process.cwd(), file);
    
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const key = match[1].trim();
        if (!key || key.includes('${')) continue; // skip dynamic keys
        if (!keyMap.has(key)) keyMap.set(key, new Set());
        keyMap.get(key).add(relPath);
      }
    }
  }

  return keyMap;
}

// ─── 3. Flatten locale JSON ────────────────────────────
function flattenJson(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenJson(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function loadLocale(localeName) {
  const localeDir = join(LOCALES_DIR, localeName);
  if (!existsSync(localeDir)) return {};
  
  let merged = {};
  for (const file of readdirSync(localeDir)) {
    if (extname(file) !== '.json') continue;
    try {
      const json = JSON.parse(readFileSync(join(localeDir, file), 'utf-8'));
      Object.assign(merged, flattenJson(json));
    } catch (e) {
      console.error(`  ⚠ Error parsing ${localeName}/${file}: ${e.message}`);
    }
  }
  return merged;
}

// ─── 4. Generate Report ────────────────────────────────
function generateReport(keyMap, locales) {
  const allKeys = [...keyMap.keys()].sort();
  const localeNames = Object.keys(locales);
  
  let md = `# 🌐 i18n Audit Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Total unique keys found in source:** ${allKeys.length}\n`;
  md += `**Locales:** ${localeNames.join(', ')}\n\n`;

  // Summary table
  md += `## Summary\n\n`;
  md += `| Locale | Total Keys | Missing | Coverage |\n`;
  md += `|--------|-----------|---------|----------|\n`;

  const missingByLocale = {};

  for (const locale of localeNames) {
    const flat = locales[locale];
    const missing = allKeys.filter(k => !(k in flat));
    missingByLocale[locale] = missing;
    const coverage = ((allKeys.length - missing.length) / allKeys.length * 100).toFixed(1);
    md += `| ${locale} | ${Object.keys(flat).length} | **${missing.length}** | ${coverage}% |\n`;
  }

  // Extra keys (in locale but not in source)
  md += `\n## Extra Keys (in locale but unused in source)\n\n`;
  for (const locale of localeNames) {
    const flat = locales[locale];
    const extraKeys = Object.keys(flat).filter(k => !keyMap.has(k));
    if (extraKeys.length > 0) {
      md += `### ${locale} (${extraKeys.length} unused)\n\n`;
      md += `<details><summary>Show all</summary>\n\n`;
      for (const k of extraKeys.slice(0, 50)) {
        md += `- \`${k}\`\n`;
      }
      if (extraKeys.length > 50) md += `- ... and ${extraKeys.length - 50} more\n`;
      md += `\n</details>\n\n`;
    }
  }

  // Detailed missing keys per locale
  md += `\n## Missing Keys by Locale\n\n`;
  for (const locale of localeNames) {
    const missing = missingByLocale[locale];
    if (missing.length === 0) {
      md += `### ✅ ${locale} — Complete!\n\n`;
      continue;
    }
    
    md += `### ❌ ${locale} — ${missing.length} missing\n\n`;
    md += `| # | Key | Used In |\n`;
    md += `|---|-----|---------|\n`;
    
    for (let i = 0; i < missing.length; i++) {
      const key = missing[i];
      const files = [...keyMap.get(key)].slice(0, 2).join(', ');
      const more = keyMap.get(key).size > 2 ? ` +${keyMap.get(key).size - 2}` : '';
      md += `| ${i + 1} | \`${key}\` | ${files}${more} |\n`;
    }
    md += `\n`;
  }

  // Dynamic keys warning
  md += `\n## ⚠️ Dynamic Keys (not auditable)\n\n`;
  md += `The following patterns use dynamic key construction and cannot be statically audited:\n\n`;
  md += `- Template literals with expressions: \`\$t(\\\`prefix.\${variable}\\\`)\`\n`;
  md += `- Computed keys: \`$t(someVariable)\`\n\n`;
  md += `These should be manually verified.\n`;

  return md;
}

// ─── Main ──────────────────────────────────────────────
console.log('🔍 i18n Audit — Phase 1\n');

console.log('1. Scanning source files...');
const files = walkDir(SRC_DIR, ['.svelte', '.ts', '.js']);
console.log(`   Found ${files.length} source files`);

console.log('2. Extracting i18n keys...');
const keyMap = extractKeys(files);
console.log(`   Found ${keyMap.size} unique keys`);

console.log('3. Loading locales...');
const localeDirs = readdirSync(LOCALES_DIR).filter(d => statSync(join(LOCALES_DIR, d)).isDirectory());
const locales = {};
for (const locale of localeDirs) {
  locales[locale] = loadLocale(locale);
  console.log(`   ${locale}: ${Object.keys(locales[locale]).length} keys`);
}

console.log('4. Generating report...');
const report = generateReport(keyMap, locales);
writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`\n✅ Report saved to: ${REPORT_PATH}`);

// Quick summary
for (const locale of localeDirs) {
  const flat = locales[locale];
  const missing = [...keyMap.keys()].filter(k => !(k in flat));
  const icon = missing.length === 0 ? '✅' : '❌';
  console.log(`   ${icon} ${locale}: ${missing.length} missing keys`);
}
