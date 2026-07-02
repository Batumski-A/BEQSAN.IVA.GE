import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    args: ['--ignore-certificate-errors']
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER RUNTIME ERROR] ${err.message}`);
    console.log(err.stack);
  });

  console.log('Navigating to https://beqsan.iva.ge/configurator ...');
  await page.goto('https://beqsan.iva.ge/configurator', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Selecting standard 2-pane template ("სტანდარტი · 2 ფრთა")...');
  // Click the template button
  const templateButton = page.locator('button:has-text("სტანდარტი · 2 ფრთა")');
  await templateButton.click();
  console.log('Clicked template. Waiting 3 seconds for model update...');
  await page.waitForTimeout(3000);

  console.log('Clicking the open button ("გახსენი")...');
  const openButton = page.locator('button:has-text("გახსენი")');
  await openButton.click();
  console.log('Clicked open button. Waiting 5 seconds for turn/tilt animation...');
  await page.waitForTimeout(5000);

  // Take a screenshot of the open hinged window
  const screenshotPath = 'C:/Users/Administrator/.gemini/antigravity/brain/5c5d4afd-da68-4ef7-964a-c797f5f861ff/scratch/playwright_screenshot_hinged.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
  console.log('Done!');
})();
