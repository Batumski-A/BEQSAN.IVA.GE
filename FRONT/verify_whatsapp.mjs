import { chromium, devices } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';
const BASE = process.env.VERIFY_BASE ?? 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'ka-GE' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // ── Home: no prices, Georgian eyebrow, no carousel arrows on phone ──
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2000);
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('home contains "₾":', bodyText.includes('₾') ? 'YES (check where!)' : 'no');
  console.log('home contains "ONLINE CALCULATOR":', bodyText.includes('ONLINE CALCULATOR') ? 'YES (bad)' : 'no');
  await page.screenshot({ path: `${OUT}/v_home.png` });

  // ── Configurator: no auto-open sheet, WhatsApp CTA, modal flow ──
  await page.goto(BASE + '/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(4000);
  const sheetOpen = await page.evaluate(() => {
    const wrap = document.querySelector('div.fixed.inset-0.z-50');
    return wrap ? wrap.className.includes('opacity-100') : false;
  });
  console.log('mobile sheet auto-open:', sheetOpen ? 'YES (bad)' : 'no (good)');
  await page.screenshot({ path: `${OUT}/v_conf.png` });

  const confText = await page.evaluate(() => document.body.innerText);
  console.log('configurator shows ₾:', confText.includes('₾') ? 'YES (bad)' : 'no (good)');

  // tap the WhatsApp CTA in the mobile bottom bar
  const cta = page.locator('button:has-text("გავაგზავნოთ WhatsApp-ში")').locator('visible=true').first();
  console.log('CTA visible:', await cta.isVisible());
  await cta.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/v_modal.png` });

  // wait for attach confirmation (upload roundtrip)
  const attached = await page
    .waitForSelector('text=ნახაზი მიმაგრებულია', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  console.log('snapshot attached:', attached);
  await page.screenshot({ path: `${OUT}/v_modal_attached.png` });

  const href = await page
    .locator('a:has-text("გახსენი WhatsApp")')
    .first()
    .getAttribute('href');
  console.log('wa.me href:', href);

  if (href) {
    const m = decodeURIComponent(href).match(/https?:\/\/[^\s]+\/api\/v1\/files\/[^\s]+/);
    console.log('drawing link in message:', m ? m[0] : 'NONE');
    if (m) {
      const resp = await context.request.get(m[0]);
      console.log('drawing GET status:', resp.status(), 'content-type:', resp.headers()['content-type']);
    }
  }

  console.log('page errors:', errors.length ? errors.slice(0, 5) : 'none');
  await browser.close();
})();
