import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: 'ka-GE', viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const bytes = { image: 0, font: 0, css: 0, js: 0, other: 0, total: 0 };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', async (r) => {
    try {
      const h = r.headers();
      const len = Number(h['content-length'] || 0);
      const ct = h['content-type'] || '';
      bytes.total += len;
      if (ct.includes('image')) bytes.image += len;
      else if (ct.includes('font') || r.url().includes('gstatic')) bytes.font += len;
      else if (ct.includes('css')) bytes.css += len;
      else if (ct.includes('javascript')) bytes.js += len;
      else bytes.other += len;
    } catch {}
  });

  await page.goto('https://beqsan.iva.ge/', { waitUntil: 'load', timeout: 40000 });
  // LCP via PerformanceObserver
  const lcp = await page.evaluate(() => new Promise((resolve) => {
    let v = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) v = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => resolve(Math.round(v)), 3500);
  }));
  await page.waitForTimeout(500);

  const heroSrc = await page.locator('section img').first().getAttribute('src').catch(() => null);
  const heroVisible = await page.locator('section img').first().isVisible().catch(() => false);
  const kb = (n) => (n / 1024).toFixed(0) + 'KB';
  console.log('--- Live home CWV (first load) ---');
  console.log('  images:', kb(bytes.image), '| fonts:', kb(bytes.font), '| css:', kb(bytes.css), '| js:', kb(bytes.js));
  console.log('  total transferred:', kb(bytes.total));
  console.log('  LCP:', lcp, 'ms', lcp < 2500 ? '(good)' : lcp < 4000 ? '(needs improvement)' : '(poor)');
  console.log('  hero img src:', heroSrc, '| visible:', heroVisible);
  console.log('  page errors:', errors.length ? errors.slice(0, 3) : 'none');
  await browser.close();
})();
