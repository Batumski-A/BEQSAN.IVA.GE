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
  // Scroll all the way down then back up so IntersectionObserver-based
  // animations (framer-motion whileInView) fire before the screenshot.
  // Chromium's beyond-viewport screenshot capture doesn't actually scroll,
  // so elements that rely on IO would render at their `initial` (opacity 0)
  // unless we force them visible first.
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    const step = Math.max(400, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y <= total; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 250));
  });
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
    reducedMotion: 'reduce',
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
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  // Reset store first.
  await page.goto(`${BASE}/configurator`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
  });

  // Step 1 — landing
  await page.goto(`${BASE}/configurator?step=1`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await snap(page, 'cfg-01-type', viewport);

  // Click the first product card (picker sets store; no auto-advance).
  const productGrid = page.locator('ul li button[aria-pressed]').first();
  await productGrid.waitFor({ state: 'visible', timeout: 10000 });
  await productGrid.click();
  // Wait until productType detail fetch resolves (handlePick is async).
  await page.waitForTimeout(2500);

  // Manually navigate to Step 2 — the guard now passes because productType is set.
  await page.goto(`${BASE}/configurator?step=2`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await snap(page, 'cfg-02-material', viewport);

  // Click first material card. Once selected, navigate forward.
  const matBtn = page.locator('ul li button[aria-pressed]').first();
  await matBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await matBtn.click();
  await page.waitForTimeout(1500);

  // Navigate by URL for remaining steps — store seeds defaults.
  for (const step of [3, 4, 5, 6, 7, 8]) {
    await page.goto(`${BASE}/configurator?step=${step}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const labels = ['', '', '', '03-dimensions', '04-layout', '05-glass', '06-color', '07-accessories', '08-review'];

    // On Step 4, also drive the pane into an openable state so the
    // post-rework features (hinges, overlay labels, breathing animation)
    // show up in the screenshot. Single fixed-pane default would hide them.
    if (step === 4) {
      try {
        // Bump pane count to 2 — radiogroup of pane-count radios sits at the
        // top of the StepLayout content. The first `role=radio` is "1", the
        // second is "2", so we click the 2nd in the first radiogroup.
        const paneCountRadios = page.locator('[role="radiogroup"]').first().locator('[role="radio"]');
        if ((await paneCountRadios.count()) >= 2) {
          await paneCountRadios.nth(1).click();
          await page.waitForTimeout(700);
        }
        // Now click "Casement" (გასაღები) on pane-1 opening radios. The
        // opening-type radiogroup is the 2nd radiogroup (the first is the
        // pane-count). And "გასაღები" is the 2nd radio in there (1st is "ყრუ").
        const openingRadios = page.locator('[role="radiogroup"]').nth(1).locator('[role="radio"]');
        if ((await openingRadios.count()) >= 2) {
          await openingRadios.nth(1).click();
          await page.waitForTimeout(900);
        }
      } catch (e) {
        console.error('  ! step-4 driving failed:', e.message);
      }
    }
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
