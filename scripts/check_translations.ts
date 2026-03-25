import { translations } from '../src/i18n/translations.ts';

const langs = Object.keys(translations) as (keyof typeof translations)[];
const baseLang = 'en';
const baseKeys = Object.keys(translations[baseLang]);

const missing: Record<string, string[]> = {};

for (const lang of langs) {
  if (lang === baseLang) continue;
  const langKeys = Object.keys(translations[lang]);
  const missingKeys = baseKeys.filter(k => !langKeys.includes(k));
  if (missingKeys.length > 0) {
    missing[lang] = missingKeys;
  }
}

if (Object.keys(missing).length === 0) {
  console.log('✅ All translations are fully matched with English!');
} else {
  console.log(JSON.stringify(missing, null, 2));
}
