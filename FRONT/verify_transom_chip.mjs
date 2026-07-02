import { chromium } from 'playwright';

const OUT = 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/e--BEQSAN-IVA-GE/ea55f0d8-3d89-4c33-85bb-b3280b11fd88/scratchpad/shots';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'ka-GE' });
  const page = await context.newPage();

  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(4000);

  // add transom via bottom chip menu
  await page.locator('button[aria-label^="გახსენი პარამეტრები"]').first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("ჰორიზონტალური ტიხარი")').first().click();
  await page.waitForTimeout(2000);

  const chips = page.locator('button[aria-label^="გახსენი პარამეტრები"]');
  console.log('chips rendered:', await chips.count());

  // the transom chip is the one with the smaller Y (top sash) — pick by position
  const boxes = [];
  for (let i = 0; i < await chips.count(); i++) boxes.push({ i, box: await chips.nth(i).boundingBox() });
  boxes.sort((a, b) => (a.box?.y ?? 9e9) - (b.box?.y ?? 9e9));
  const topChip = chips.nth(boxes[0].i);
  await topChip.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/transom_chip_menu.png` });
  const optionCount = await page.locator('button:has-text("ფრამუგა (ზემოთ)")').count();
  console.log('transom menu shows tilt option:', optionCount > 0);

  // pick tilt and click the top sash glass to test the open animation
  await page.locator('button:has-text("ფრამუგა (ზემოთ)")').first().click();
  await page.waitForTimeout(800);
  const b = boxes[0].box;
  await page.mouse.click(b.x - 60, b.y + b.height / 2); // glass left of the chip
  await page.waitForTimeout(900); // mid/end of tilt animation
  await page.screenshot({ path: `${OUT}/transom_tilted.png` });

  await browser.close();
  console.log('done');
})();
