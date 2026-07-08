const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public');
const dest = path.join(__dirname, '..', 'dist', 'public');

fs.cpSync(src, dest, { recursive: true });

console.log(`[copy-public-assets] ${src} -> ${dest}`);
