// Step-1 + Step-2 screenshots for /configurator. Uses Playwright to:
//   1. Open Step 1, screenshot the page.
//   2. Click the first product type card to advance.
//   3. Pick the first material, wait for the price preview to render.
//   4. Screenshot Step 2 desktop + mobile + full-page.
// Outputs land under FRONT/.snapshots/.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', '.snapshots');
await mkdir(outDir, { recursive: true });

const base = process.env.URL ?? 'http://localhost:4173';

const browser = await chromium.launch();

async function shoot(viewport, label, scenario) {
  const context = await browser.newContext({
    viewport: viewport.size,
    deviceScaleFactor: viewport.scale,
    isMobile: viewport.mobile ?? false,
  });
  const page = await context.newPage();
  await page.goto(`${base}/configurator?step=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  if (scenario === 'step1') {
    await page.screenshot({ path: resolve(outDir, `configurator-step1-${label}.png`) });
  }

  if (scenario === 'step2') {
    // Click the first product-type card (uses the role=button + aria-pressed).
    const firstType = page.locator('button[aria-pressed]').first();
    await firstType.click();
    await page.waitForTimeout(150);

    // Advance to step 2.
    const continueBtn = page.getByRole('button', { name: /გავაგრძელოთ|Continue/ }).first();
    await continueBtn.click();
    await page.waitForURL(/step=2/);
    await page.waitForTimeout(1200); // materials fetch

    // Click the first material card.
    const firstMaterial = page.locator('button[aria-pressed]').first();
    await firstMaterial.click();
    await page.waitForTimeout(1500); // price /configurator/price round-trip
    await page.screenshot({ path: resolve(outDir, `configurator-step2-${label}.png`) });

    if (label === 'desktop') {
      await page.screenshot({
        path: resolve(outDir, 'configurator-step2-full.png'),
        fullPage: true,
      });
    }
  }

  await context.close();
}

await shoot({ size: { width: 1440, height: 900 }, scale: 2 }, 'desktop', 'step1');
await shoot({ size: { width: 1440, height: 900 }, scale: 2 }, 'desktop', 'step2');
await shoot({ size: { width: 390, height: 844 }, scale: 3, mobile: true }, 'mobile', 'step2');

await browser.close();
console.log('Configurator screenshots in', outDir);
