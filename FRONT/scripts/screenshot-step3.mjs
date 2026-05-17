// Step-3 dimensions screenshots: desktop happy path + mobile + error state.
//   1. Open /configurator?step=1, click window, advance.
//   2. Pick aluminum-thermal, advance to Step 3.
//   3. Capture desktop with default mid-point dims.
//   4. Set width=10 to trigger the out-of-range error and capture.
//   5. Reset and capture mobile viewport.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', '.snapshots');
await mkdir(outDir, { recursive: true });

const base = process.env.URL ?? 'http://localhost:4173';

const browser = await chromium.launch();

async function setupStep3(page) {
  await page.goto(`${base}/configurator?step=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  // Pick first product type (window)
  await page.locator('button[aria-pressed]').first().click();
  await page.waitForTimeout(900); // detail fetch
  // Advance to step 2
  await page.getByRole('button', { name: /გავაგრძელოთ|Continue/ }).first().click();
  await page.waitForURL(/step=2/);
  await page.waitForTimeout(1200);
  // Pick first material (aluminum-thermal)
  await page.locator('button[aria-pressed]').first().click();
  await page.waitForTimeout(900);
  // Advance to step 3
  await page.getByRole('button', { name: /გავაგრძელოთ|Continue/ }).first().click();
  await page.waitForURL(/step=3/);
  await page.waitForTimeout(1500); // initial price fetch
}

// Desktop happy path
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await setupStep3(page);
  await page.screenshot({ path: resolve(outDir, 'configurator-step3-desktop.png') });
  await page.screenshot({ path: resolve(outDir, 'configurator-step3-desktop-full.png'), fullPage: true });
  await context.close();
}

// Desktop error state — set width to 10 (below window min 30)
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await setupStep3(page);

  const widthInput = page.locator('input[type="number"]').first();
  await widthInput.click();
  await widthInput.fill('10');
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(outDir, 'configurator-step3-error.png') });
  await context.close();
}

// Mobile
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
  });
  const page = await context.newPage();
  await setupStep3(page);
  await page.screenshot({ path: resolve(outDir, 'configurator-step3-mobile.png') });
  await context.close();
}

await browser.close();
console.log('Step 3 screenshots in', outDir);
