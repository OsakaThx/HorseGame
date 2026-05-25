const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');

const files = [
  'index.html',
  'style.css',
  'data.js',
  'api.js',
  'auth.js',
  'sprites.js',
  'game.js',
  'ui.js',
  'admin.js',
  'init.js'
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of files) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) copyRecursive(src, path.join(out, file));
}

const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) copyRecursive(assets, path.join(out, 'assets'));

console.log(`Built web app into ${out}`);
