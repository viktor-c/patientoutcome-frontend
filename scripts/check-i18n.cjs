const fs = require('node:fs');
const path = require('node:path');
const { createJiti } = require('jiti');

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const localesDir = path.join(srcDir, 'locales');

const jiti = createJiti(projectRoot);

const localeFiles = ['en.ts', 'de.ts'];

function flattenKeys(obj, prefix = '', keys = new Set()) {
  if (obj === null || obj === undefined) return keys;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) keys.add(prefix);
    return keys;
  }

  const entries = Object.entries(obj);
  if (entries.length === 0) {
    if (prefix) keys.add(prefix);
    return keys;
  }

  for (const [key, value] of entries) {
    const next = prefix ? `${prefix}.${key}` : key;
    flattenKeys(value, next, keys);
  }

  return keys;
}

function collectFiles(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'api' || entry.name === 'node_modules' || entry.name === 'dist') continue;
      collectFiles(fullPath, exts, out);
      continue;
    }
    if (exts.has(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }
  return out;
}

function extractTranslationKeys(fileContent) {
  const keys = new Set();

  const patterns = [
    /\b(?:t|\$t)\s*\(\s*['\"]([^'\"]+)['\"]/g,
    /\bi18n\.global\.t\s*\(\s*['\"]([^'\"]+)['\"]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(fileContent)) !== null) {
      keys.add(match[1]);
    }
  }

  return keys;
}

function loadLocale(localeFile) {
  const absolutePath = path.join(localesDir, localeFile);
  const localeModule = jiti(absolutePath);
  return localeModule.default || localeModule;
}

function printList(title, values) {
  if (values.length === 0) return;
  console.error(`\n${title}`);
  for (const value of values) {
    console.error(`  - ${value}`);
  }
}

function collectStringLeafPaths(obj, prefix = '', out = []) {
  if (obj === null || obj === undefined) return out;

  if (typeof obj === 'string') {
    out.push({ path: prefix, value: obj });
    return out;
  }

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return out;
  }

  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    collectStringLeafPaths(value, next, out);
  }

  return out;
}

function findDuplicateStrings(localeMessages, minCount = 3) {
  const leaves = collectStringLeafPaths(localeMessages);
  const valueToPaths = new Map();

  for (const leaf of leaves) {
    if (!leaf.value || leaf.value.startsWith('@:')) continue;

    const normalized = leaf.value.trim();
    if (!normalized) continue;

    const paths = valueToPaths.get(normalized) || [];
    paths.push(leaf.path);
    valueToPaths.set(normalized, paths);
  }

  const duplicates = [];
  for (const [value, paths] of valueToPaths.entries()) {
    if (paths.length >= minCount) {
      duplicates.push({ value, count: paths.length, paths: paths.sort() });
    }
  }

  duplicates.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return duplicates;
}

function main() {
  const checkUsage = process.argv.includes('--check-usage');
  const checkDuplicates = process.argv.includes('--check-duplicates');
  const localeData = {};
  const localeKeys = {};

  for (const localeFile of localeFiles) {
    const localeName = path.basename(localeFile, path.extname(localeFile));
    const data = loadLocale(localeFile);
    localeData[localeName] = data;
    localeKeys[localeName] = flattenKeys(data);
  }

  const baseLocale = 'en';
  const baseKeys = localeKeys[baseLocale];

  const usedKeys = new Set();
  if (checkUsage) {
    const sourceFiles = collectFiles(srcDir, new Set(['.vue', '.ts']));
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const fileKeys = extractTranslationKeys(content);
      for (const key of fileKeys) usedKeys.add(key);
    }
  }

  if (checkDuplicates) {
    for (const [localeName, data] of Object.entries(localeData)) {
      const duplicates = findDuplicateStrings(data, 3);
      if (duplicates.length === 0) {
        continue;
      }

      const report = duplicates.map((entry) => `${JSON.stringify(entry.value)} (${entry.count}x) -> ${entry.paths.join(', ')}`);
      printList(`Duplicate raw strings in '${localeName}' (3+ occurrences)`, report);
    }
  }

  let hasErrors = false;

  for (const [localeName, keys] of Object.entries(localeKeys)) {
    if (localeName === baseLocale) continue;
    const missingFromLocale = [...baseKeys].filter((k) => !keys.has(k)).sort();
    if (missingFromLocale.length > 0) {
      hasErrors = true;
      printList(`Missing keys in locale '${localeName}' (vs '${baseLocale}')`, missingFromLocale);
    }
  }

  if (checkUsage) {
    const missingFromBase = [...usedKeys].filter((k) => !baseKeys.has(k)).sort();
    if (missingFromBase.length > 0) {
      hasErrors = true;
      printList(`Keys used in source but missing in '${baseLocale}'`, missingFromBase);
    }

    for (const [localeName, keys] of Object.entries(localeKeys)) {
      const missingFromLocale = [...usedKeys].filter((k) => !keys.has(k)).sort();
      if (missingFromLocale.length > 0) {
        hasErrors = true;
        printList(`Keys used in source but missing in '${localeName}'`, missingFromLocale);
      }
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
    return;
  }

  if (!checkUsage && !checkDuplicates) {
    console.log('i18n check passed: locale files have matching key sets.');
    console.log('Tip: run with --check-usage to also validate keys referenced in source files.');
    return;
  }

  if (checkUsage && checkDuplicates) {
    console.log('i18n check passed: locale files match and source key references are defined.');
    console.log('Duplicate string report printed above for aliasing opportunities.');
    return;
  }

  if (checkUsage) {
    console.log('i18n check passed: locale files match and source key references are defined.');
    return;
  }

  console.log('i18n key-set check passed; duplicate string report printed above.');
}

main();
