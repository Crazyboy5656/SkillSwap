/**
 * Vercel tek adımda: config üret + public/ kopyala (Vercel varsayılanı public bekler)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// 1) inject-config (aynı ortam: Vercel env değişkenleri process.env'te)
require('./inject-config.js');

// 2) Kökteki static dosyaları public/ altına al
const out = path.join(root, 'public');
if (fs.existsSync(out)) fs.rmSync(out, { recursive: true });
fs.mkdirSync(out, { recursive: true });

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

for (const dir of ['js', 'css', 'skillsswapdesigns']) {
  copyDirRecursive(path.join(root, dir), path.join(out, dir));
}

let htmlCount = 0;
for (const name of fs.readdirSync(root)) {
  if (!name.endsWith('.html')) continue;
  fs.copyFileSync(path.join(root, name), path.join(out, name));
  htmlCount += 1;
}

const indexPath = path.join(out, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('Build failed: public/index.html yok. Kökte .html var mı?');
  process.exit(1);
}
console.log('✓ Vercel build ok — public/ hazır,', htmlCount, 'html');
process.exit(0);
