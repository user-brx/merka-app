import fs from 'fs';

const filePath = './src/i18n/translations.ts';
let code = fs.readFileSync(filePath, 'utf-8');

const relayKeys = `
        relaySettings: '🌐 Relay Settings', relaySettingsDesc: 'Merka connects directly to the Nostr network. You can add or remove relays to stay connected and bypass censorship.',
        addRelay: 'wss://...', invalidRelayUrl: 'Must start with wss://', add: 'Add',
        minRelaysWarning: 'You need at least two relays to ensure a stable connection.',
        restoreDefaults: 'Restore Defaults', confirmRestoreDefaults: 'Are you sure you want to restore the default relays? This will override your current list.',
        relayStatus: { connecting: 'Connecting...', connected: 'Connected', offline: 'Offline', error: 'Error' },`;

const langsToFix = ['es', 'it', 'de', 'hi', 'ja', 'zh', 'ar', 'ru', 'fr', 'tr'];

for (const lang of langsToFix) {
  // Find the block for this language: `lang: t({ ... })`
  const regex = new RegExp("(" + lang + ":\\\\s*t\\\\(\\\\{.*?)(helpNip05:)", "s");
  
  code = code.replace(regex, (match, prefix, suffix) => {
    // Check if it already has relaySettings to avoid duplicating
    if (prefix.includes('relaySettings:')) return match;
    
    // Insert our keys right above helpNip05
    return prefix + relayKeys + '\\n        ' + suffix;
  });
}

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Patched translations.ts');
