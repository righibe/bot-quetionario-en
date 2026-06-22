/* eslint-disable */
// Copies static data assets (the questions JSON) into the compiled dist folder
// so the production build can read them next to the JS files.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src', 'data');
const destDir = path.join(root, 'dist', 'data');

if (!fs.existsSync(srcDir)) {
  console.warn('[copy-data] No src/data directory found, skipping.');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

for (const file of fs.readdirSync(srcDir)) {
  if (!file.endsWith('.json')) continue;
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  console.log(`[copy-data] Copied ${file} -> dist/data/${file}`);
}
