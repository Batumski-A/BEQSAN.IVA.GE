import { chromium, devices } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'ka-GE' });
  const page = await context.newPage();

  // 1) Visit the site so the service worker installs and activates.
  await page.goto('https://beqsan.iva.ge/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.waitForTimeout(2000);
  const swActive = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    return Boolean(reg?.active);
  });
  console.log('service worker active:', swActive);

  // 2) Generate a fresh drawing via the real flow to get a valid link.
  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.locator('button:has-text("გავაგზავნოთ WhatsApp-ში")').locator('visible=true').first().click();
  await page.waitForSelector('text=ნახაზი მიმაგრებულია', { timeout: 25000 });
  const href = await page.locator('a:has-text("გახსენი WhatsApp")').first().getAttribute('href');
  const m = decodeURIComponent(href ?? '').match(/https?:\/\/[^\s]+\/api\/v1\/files\/[^\s]+/);
  console.log('drawing link:', m ? m[0] : 'NONE');
  if (!m) { await browser.close(); process.exit(1); }

  // 3) NAVIGATE to the drawing link in the SW-controlled page (Lasha's repro).
  const resp = await page.goto(m[0], { waitUntil: 'load', timeout: 30000 });
  const bodyProbe = await page.evaluate(() => document.body.innerText.slice(0, 80));
  console.log('nav response content-type:', resp?.headers()['content-type']);
  console.log('page shows 404 stub:', bodyProbe.includes('ვერ ვიპოვეთ') ? 'YES (bad)' : 'no (good)');
  await page.screenshot({ path: `${OUT}/sw_nav_drawing.png` });

  await browser.close();
})();
