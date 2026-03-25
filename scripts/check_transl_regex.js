import fs from 'fs';

const file = fs.readFileSync('src/i18n/translations.ts', 'utf-8');

// Regex to capture language objects
const langRegex = /([a-z]{2,2}):\s*t\({([\s\S]*?)}\),/g;

let match;
const langs = {};

while ((match = langRegex.exec(file)) !== null) {
  const langMatch = match[1];
  const objStr = match[2];
  
  // Extract keys
  const keys = [];
  const keyRegex = /([a-zA-Z0-9_]+)\s*:/g;
  let keyMatch;
  while ((keyMatch = keyRegex.exec(objStr)) !== null) {
    keys.push(keyMatch[1]);
  }
  
  langs[langMatch] = keys;
}

const base = langs['en'];
let missingFound = false;
for (const [lang, keys] of Object.entries(langs)) {
  if (lang === 'en') continue;
  const missing = base.filter(k => !keys.includes(k));
  if (missing.length > 0) {
    console.log(`Missing in ${lang}: ${missing.join(', ')}`);
    missingFound = true;
  }
}

if (!missingFound) {
  console.log('✅ Regex check: No missing translations found!');
}
