import { chromium, devices } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const context = await browser.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, locale: 'ka-GE' });
  const page = await context.newPage();

  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(6000);

  const chip = page.locator('button[aria-label^="გახსენი პარამეტრები"]').first();
  await chip.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/dd_open.png` });

  const vh = page.viewportSize().height;
  const lastItem = page.locator('button:has-text("ვერტიკალური ტიხარი")').first();
  const lastBox = await lastItem.boundingBox().catch(() => null);
  console.log('last item box:', lastBox ? `y=${Math.round(lastBox.y)}..${Math.round(lastBox.y + lastBox.height)} (viewport ${vh})` : 'not found');
  if (lastBox) {
    // scroll inside the menu if needed, then click it to prove reachability
    await lastItem.scrollIntoViewIfNeeded();
    console.log('last item visible after scroll:', await lastItem.isVisible());
  }

  await browser.close();
})();
