// Captures the home page at desktop + mobile and writes PNGs under FRONT/.snapshots/.
// Used for visual proof — Lasha asked for terminal output of `pnpm build` + screenshot.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', '.snapshots');
await mkdir(outDir, { recursive: true });

const url = process.env.URL ?? 'http://localhost:4173/';

const browser = await chromium.launch();

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const desktopPage = await desktop.newPage();
await desktopPage.goto(url, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1500); // hero animation
await desktopPage.screenshot({ path: resolve(outDir, 'home-desktop.png'), fullPage: false });
await desktopPage.screenshot({ path: resolve(outDir, 'home-desktop-full.png'), fullPage: true });

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
});
const mobilePage = await mobile.newPage();
await mobilePage.goto(url, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(1500);
await mobilePage.screenshot({ path: resolve(outDir, 'home-mobile.png'), fullPage: false });

await browser.close();

console.log('Screenshots written to', outDir);
