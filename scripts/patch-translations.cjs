const fs = require('fs');

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
  const findStr = lang + ": t({";
  const helpTarget = "helpNip05:";
  
  const blockStart = code.indexOf(findStr);
  if (blockStart === -1) continue;
  
  const targetPos = code.indexOf(helpTarget, blockStart);
  if (targetPos === -1) continue;
  
  const blockChunk = code.slice(blockStart, targetPos);
  if (blockChunk.includes('relaySettings:')) continue;
  
  code = code.slice(0, targetPos) + relayKeys + '\\n        ' + code.slice(targetPos);
}

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Patched translations.ts successfully!');
