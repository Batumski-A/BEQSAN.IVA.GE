// One-shot capture of the Modern Studio surfaces (Home + LiveStudio).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.AUDIT_BASE ?? 'https://iva.ge:4433';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  mkdirSync(join('audit', 'studio', v.name), { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    isMobile: v.isMobile,
    deviceScaleFactor: v.isMobile ? 2 : 1,
    ignoreHTTPSErrors: true,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  console.log(`\n=== ${v.name} ${v.width}x${v.height} ===`);

  for (const [id, path] of [
    ['01-home', '/'],
    ['02-livestudio', '/configurator'],
  ]) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2200);
      // Scroll through to fire whileInView animations
      await page.evaluate(async () => {
        const total = document.documentElement.scrollHeight;
        const step = Math.max(400, Math.floor(window.innerHeight * 0.7));
        for (let y = 0; y <= total; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 200));
      });
      await page.waitForTimeout(400);
      await page.screenshot({
        path: join('audit', 'studio', v.name, `${id}.png`),
        fullPage: id !== '02-livestudio', // LiveStudio is 100vh fixed
      });
      console.log(`  ✓ ${id}`);
    } catch (e) {
      console.log(`  ✗ ${id}: ${e.message}`);
    }
  }

  await ctx.close();
}
await browser.close();
console.log('\n✓ done');
