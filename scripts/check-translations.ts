import { translations } from '../src/i18n/translations.js';

const enKeys = Object.keys(translations.en).sort();
console.log('Total EN keys:', enKeys.length);

const langs = ['en', 'pt', 'es', 'it', 'de', 'hi', 'ja', 'zh', 'ar', 'ru', 'fr', 'tr', 'fa', 'vi', 'uk'];

for (const lang of langs) {
  const langKey = lang as keyof typeof translations;
  const trans = translations[langKey] || {};
  const langKeys = Object.keys(trans);
  
  const missing = enKeys.filter(k => !langKeys.includes(k));
  const extra = langKeys.filter(k => !enKeys.includes(k));
  
  if (missing.length > 0 || extra.length > 0) {
    console.log(`Language ${lang} has differences!`);
    if (missing.length > 0) console.log(`  Missing: ${missing.join(', ')}`);
    if (extra.length > 0) console.log(`  Extra: ${extra.join(', ')}`);
  } else {
    console.log(`Language ${lang} is perfectly matching EN.`);
  }
}
