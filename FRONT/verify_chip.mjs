import { chromium, devices } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const context = await browser.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, locale: 'ka-GE' });
  const page = await context.newPage();

  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(6000); // let the 3D scene + chip mount
  await page.screenshot({ path: `${OUT}/chip_idle.png` });

  const chip = page.locator('button[aria-label^="გახსენი პარამეტრები"]').first();
  const visible = await chip.isVisible();
  console.log('chip always visible:', visible);
  if (visible) {
    const box = await chip.boundingBox();
    console.log('chip size:', box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'n/a');
    await chip.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/chip_open.png` });
    const items = await page.locator('button:has-text("ყრუ")').count();
    console.log('dropdown items rendered (ყრუ found):', items > 0);
  }

  // also re-run the whatsapp handoff quickly to confirm drawing link on live
  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(6000);
  const cta = page.locator('button:has-text("გავაგზავნოთ WhatsApp-ში")').locator('visible=true').first();
  await cta.click();
  const attached = await page
    .waitForSelector('text=ნახაზი მიმაგრებულია', { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  console.log('live snapshot attached:', attached);
  const href = await page.locator('a:has-text("გახსენი WhatsApp")').first().getAttribute('href');
  const m = href ? decodeURIComponent(href).match(/https?:\/\/[^\s]+\/api\/v1\/files\/[^\s]+/) : null;
  console.log('drawing link:', m ? m[0] : 'NONE');
  if (m) {
    const resp = await context.request.get(m[0]);
    console.log('drawing GET:', resp.status(), resp.headers()['content-type']);
  }

  await browser.close();
})();
