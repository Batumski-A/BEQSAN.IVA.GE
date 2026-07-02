import { chromium, devices } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'ka-GE' });
  const page = await context.newPage();

  // real-user conditions: SW installs on home visit
  await page.goto('https://beqsan.iva.ge/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.evaluate(() => navigator.serviceWorker?.ready);

  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.locator('button:has-text("გავაგზავნოთ WhatsApp-ში")').locator('visible=true').first().click();
  await page.waitForSelector('text=ნახაზი მიმაგრებულია', { timeout: 25000 });
  await page.screenshot({ path: `${OUT}/share_modal.png` });

  const href = await page.locator('a:has-text("გახსენი WhatsApp")').first().getAttribute('href');
  const decoded = decodeURIComponent(href ?? '');
  const share = decoded.match(/https?:\/\/[^\s]+\/api\/v1\/share\/[^\s]+/);
  console.log('share link in message:', share ? share[0] : 'NONE');
  if (!share) { await browser.close(); process.exit(1); }

  // fetch the share page like WhatsApp's crawler would
  const resp = await context.request.get(share[0]);
  const html = await resp.text();
  const og = html.match(/property="og:image" content="([^"]+)"/);
  console.log('share page status:', resp.status(), '| og:image:', og ? og[1] : 'MISSING');
  if (og) {
    const img = await context.request.get(og[1]);
    console.log('og image GET:', img.status(), img.headers()['content-type']);
  }

  // navigate to the share page in the SW-controlled browser (human click path)
  const nav = await page.goto(share[0], { waitUntil: 'load', timeout: 30000 });
  const body = await page.evaluate(() => document.body.innerText.slice(0, 60));
  console.log('nav content-type:', nav?.headers()['content-type'], '| 404 stub:', body.includes('ვერ ვიპოვეთ') ? 'YES' : 'no');
  await page.screenshot({ path: `${OUT}/share_page.png` });

  await browser.close();
})();
