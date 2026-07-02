import { chromium, devices } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const context = await browser.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, locale: 'ka-GE' });
  const page = await context.newPage();

  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(3000);

  // switch to 2D blueprint view (Lasha's repro)
  await page.locator('button[title="2D ნახაზი"]').first().click();
  await page.waitForTimeout(1500);

  // open the handoff from 2D mode
  const cta = page.locator('button:has-text("გავაგზავნოთ WhatsApp-ში")').locator('visible=true').first();
  await cta.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/h2d_uploading.png` });

  const attached = await page
    .waitForSelector('text=ნახაზი მიმაგრებულია', { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  console.log('2D-mode drawing attached:', attached);
  await page.screenshot({ path: `${OUT}/h2d_ready.png` });

  const href = await page.locator('a:has-text("გახსენი WhatsApp")').first().getAttribute('href');
  const m = href ? decodeURIComponent(href).match(/https?:\/\/[^\s]+\/api\/v1\/files\/[^\s]+/) : null;
  console.log('drawing link in message:', m ? m[0] : 'NONE');
  if (m) {
    const resp = await context.request.get(m[0]);
    console.log('drawing GET:', resp.status(), resp.headers()['content-type']);
  }

  await browser.close();
})();
