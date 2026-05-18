// Visual audit screenshot capture for BEQSAN. Hits the deployed staging
// at https://iva.ge:4433/ and walks through: 8 marketing/standalone pages
// + 8 configurator steps, each at desktop (1440×900) and mobile (390×844).
//
// 32 screenshots total. Output: audit/screenshots/<viewport>/<id>.png
// Skips Playwright test runner — direct CDP automation is faster for one-off.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.AUDIT_BASE ?? 'https://iva.ge:4433';

const STATIC_PAGES = [
  { id: '01-home', path: '/' },
  { id: '02-about', path: '/about' },
  { id: '03-process', path: '/process' },
  { id: '04-materials', path: '/materials' },
  { id: '05-warranty', path: '/warranty' },
  { id: '06-contact', path: '/contact' },
  { id: '07-catalog', path: '/catalog' },
  { id: '08-gallery', path: '/gallery' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

async function snap(page, name, viewport) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const fullPath = join('audit', 'screenshots', viewport.name, `${name}.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`  ✓ ${name}`);
}

async function captureStatic(browser, viewport) {
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    deviceScaleFactor: viewport.isMobile ? 2 : 1,
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  for (const p of STATIC_PAGES) {
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(600);
      await snap(page, p.id, viewport);
    } catch (e) {
      console.error(`  ✗ ${p.id}: ${e.message}`);
    }
  }
  await ctx.close();
}

async function captureConfigurator(browser, viewport) {
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    deviceScaleFactor: viewport.isMobile ? 2 : 1,
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  // Reset store first.
  await page.goto(`${BASE}/configurator`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
  });

  // Step 1 — landing
  await page.goto(`${BASE}/configurator?step=1`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await snap(page, 'cfg-01-type', viewport);

  // Click first product type to advance to Step 2
  try {
    await page.locator('button:has-text("ფანჯარა"), button:has-text("Window"), [data-testid="product-type-button"]').first().click({ timeout: 6000 });
  } catch {
    // fallback: any card-shaped button on the page
    const card = page.locator('button, [role="button"]').first();
    await card.click({ timeout: 4000 }).catch(() => {});
  }
  await page.waitForTimeout(1200);
  await snap(page, 'cfg-02-material', viewport);

  // Click first material
  try {
    await page.locator('button:has-text("ALU"), button:has-text("PVC")').first().click({ timeout: 6000 });
  } catch {}
  await page.waitForTimeout(1200);

  // Navigate by URL for remaining steps — store seeds defaults.
  for (const step of [3, 4, 5, 6, 7, 8]) {
    await page.goto(`${BASE}/configurator?step=${step}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const labels = ['', '', '', '03-dimensions', '04-layout', '05-glass', '06-color', '07-accessories', '08-review'];
    await snap(page, `cfg-${labels[step]}`, viewport);
  }

  await ctx.close();
}

const browser = await chromium.launch();
for (const viewport of VIEWPORTS) {
  mkdirSync(join('audit', 'screenshots', viewport.name), { recursive: true });
  console.log(`\n=== ${viewport.name} (${viewport.width}×${viewport.height}) ===`);
  await captureStatic(browser, viewport);
  await captureConfigurator(browser, viewport);
}
await browser.close();
console.log('\n✓ done');
