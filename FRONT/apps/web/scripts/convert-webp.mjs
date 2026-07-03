/**
 * Convert public/img PNGs to WebP using Chromium's canvas encoder (no native
 * deps). Caps the long edge at 1600px (hero is full-bleed; cards are tiny) and
 * exports quality 0.82. Skips the brand logo (referenced as PNG by JSON-LD).
 *
 * Run from the FRONT workspace root:  node apps/web/scripts/convert-webp.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.resolve(__dirname, '..', 'public', 'img');
const SKIP = new Set(['beqsan-logo.png']);
const MAX_EDGE = 1600;
const QUALITY = 0.82;

const files = fs.readdirSync(IMG_DIR).filter((f) => f.endsWith('.png') && !SKIP.has(f));

const browser = await chromium.launch();
const page = await browser.newPage();
let before = 0;
let after = 0;

for (const file of files) {
  const src = path.join(IMG_DIR, file);
  const b64 = fs.readFileSync(src).toString('base64');
  const dataUrl = `data:image/png;base64,${b64}`;
  const webp = await page.evaluate(
    async ({ dataUrl, maxEdge, quality }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = dataUrl;
      });
      let { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/webp', quality);
    },
    { dataUrl, maxEdge: MAX_EDGE, quality: QUALITY },
  );
  const out = path.join(IMG_DIR, file.replace(/\.png$/, '.webp'));
  const buf = Buffer.from(webp.split(',')[1], 'base64');
  fs.writeFileSync(out, buf);
  const inKb = fs.statSync(src).size / 1024;
  const outKb = buf.length / 1024;
  before += inKb;
  after += outKb;
  console.log(`  ${file.padEnd(32)} ${inKb.toFixed(0).padStart(4)}KB → ${outKb.toFixed(0).padStart(4)}KB (webp)`);
}

await browser.close();
console.log(`\n  total ${before.toFixed(0)}KB → ${after.toFixed(0)}KB (-${Math.round((1 - after / before) * 100)}%)`);
