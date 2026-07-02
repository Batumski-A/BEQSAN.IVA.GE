import { chromium, devices } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'ka-GE' });
  const page = await context.newPage();

  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(4000);

  // add a transom via the pane chip menu (same path a user takes)
  await page.locator('button[aria-label^="გახსენი პარამეტრები"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("ჰორიზონტალური ტიხარი")').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/tb_3d.png` });

  // switch to 2D blueprint
  await page.locator('button[title="2D ნახაზი"]').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/tb_blueprint.png` });

  // open handoff and inspect the modal preview (rasterized blueprint)
  await page.locator('button:has-text("გავაგზავნოთ WhatsApp-ში")').locator('visible=true').first().click();
  await page.waitForSelector('text=ნახაზი მიმაგრებულია', { timeout: 25000 });
  await page.screenshot({ path: `${OUT}/tb_modal.png` });

  console.log('done');
  await browser.close();
})();
