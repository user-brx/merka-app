const fs = require('fs');
let c = fs.readFileSync('src/i18n/translations.ts', 'utf8');
// The file has a literal backslash followed by 'n'
c = c.replace(/\\n\s*helpNip05:/g, '\n        helpNip05:');
fs.writeFileSync('src/i18n/translations.ts', c, 'utf8');
console.log('Fixed for real.');
