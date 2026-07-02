import { chromium, devices } from 'playwright';

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const context = await browser.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, locale: 'ka-GE' });
  const page = await context.newPage();

  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text().slice(0, 200)); });
  page.on('response', (r) => {
    if (r.url().includes('/configurator/snapshot')) console.log('[snapshot resp]', r.status());
  });
  page.on('requestfailed', (r) => {
    if (r.url().includes('snapshot')) console.log('[snapshot FAILED]', r.failure()?.errorText);
  });

  // mimic verify_whatsapp: home first (registers SW), then configurator + 4s
  await page.goto('https://beqsan.iva.ge/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2500);
  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(4000);

  const cta = page.locator('button:has-text("გავაგზავნოთ WhatsApp-ში")').locator('visible=true').first();
  await cta.click();
  console.log('CTA clicked; canvas present:', await page.locator('canvas').count());
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => {
    const hiddenBp = document.querySelector('div[aria-hidden].fixed');
    return {
      hiddenBlueprintMounted: Boolean(hiddenBp),
      hiddenBlueprintHasSvg: Boolean(hiddenBp?.querySelector('svg')),
      modalImg: Boolean(document.querySelector('img[alt]')),
      anchorText: document.querySelector('a[target="_blank"]')?.textContent?.trim().slice(0, 40) ?? null,
    };
  });
  console.log('state after 2.5s:', JSON.stringify(state));
  const attached = await page.waitForSelector('text=ნახაზი მიმაგრებულია', { timeout: 20000 }).then(() => true).catch(() => false);
  console.log('attached:', attached);

  await browser.close();
})();
