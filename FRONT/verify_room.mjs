import { chromium, devices } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });

  // Desktop — apartment preset
  const desk = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'ka-GE', ignoreHTTPSErrors: true });
  const dp = await desk.newPage();
  await dp.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await dp.waitForSelector('canvas', { timeout: 30000 });
  await dp.waitForTimeout(4000);
  const binaBtn = dp.locator('button[title="ბინა"], button:has-text("ბინა")').first();
  await binaBtn.click();
  await dp.waitForTimeout(6000); // textures + CSG
  await dp.screenshot({ path: `${OUT}/room_apartment_desktop.png` });
  const veranda = dp.locator('button[title="ვერანდა"], button[aria-label*="ვერანდა"]').first();
  if (await veranda.count()) {
    await veranda.click();
    await dp.waitForTimeout(6000);
    await dp.screenshot({ path: `${OUT}/room_veranda_desktop.png` });
  }
  await desk.close();

  // Mobile — home carousel (arrows must be gone) + configurator idle
  const mob = await browser.newContext({ ...devices['iPhone 13'], locale: 'ka-GE', ignoreHTTPSErrors: true });
  const mp = await mob.newPage();
  await mp.goto('https://beqsan.iva.ge/', { waitUntil: 'networkidle', timeout: 40000 });
  await mp.waitForTimeout(2000);
  await mp.evaluate(() => {
    const el = document.querySelector('.snap-y');
    if (el) el.scrollTo({ top: el.clientHeight * 5, behavior: 'instant' });
  });
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: `${OUT}/home_catalog_mobile.png` });
  await mob.close();

  await browser.close();
  console.log('done');
})();
