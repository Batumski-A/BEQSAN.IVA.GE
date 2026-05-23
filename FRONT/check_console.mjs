import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    args: ['--ignore-certificate-errors']
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
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
  
  console.log('Waiting 5 seconds for React/Three.js rendering...');
  await page.waitForTimeout(5000);

  // Take a screenshot just in case
  await page.screenshot({ path: 'C:/Users/Administrator/.gemini/antigravity/brain/5c5d4afd-da68-4ef7-964a-c797f5f861ff/scratch/playwright_screenshot.png' });
  console.log('Screenshot saved to scratch/playwright_screenshot.png');

  await browser.close();
  console.log('Done!');
})();
