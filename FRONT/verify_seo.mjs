import { chromium } from 'playwright';

const ROUTES = ['/', '/about', '/materials', '/warranty', '/process', '/contact', '/catalog/window', '/configurator'];
const BASE = 'https://beqsan.iva.ge';

(async () => {
  const browser = await chromium.launch();

  // 1. Validate prerendered JSON-LD (raw fetch, no JS — what a crawler sees)
  console.log('--- JSON-LD validity (raw HTML) ---');
  for (const r of ROUTES) {
    const res = await fetch(BASE + r);
    const html = await res.text();
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    let ok = blocks.length > 0;
    let types = [];
    for (const b of blocks) {
      try {
        const j = JSON.parse(b[1]);
        const nodes = j['@graph'] || [j];
        types.push(...nodes.map((n) => (Array.isArray(n['@type']) ? n['@type'][0] : n['@type'])));
      } catch {
        ok = false;
      }
    }
    console.log(`  ${ok ? 'OK ' : 'BAD'} ${r.padEnd(18)} [${types.join(', ')}]`);
  }

  // 2. User hydration check — the SPA must still take over cleanly
  console.log('\n--- User hydration (JS on) ---');
  const ctx = await browser.newContext({ locale: 'ka-GE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 120)); });

  await page.goto(BASE + '/about', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2500);
  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  const navLinks = await page.locator('a[href="/catalog"], a[href="/contact"]').count();
  const title = await page.title();
  console.log('  /about title:', title);
  console.log('  /about h1:', (h1 || '').trim().slice(0, 50));
  console.log('  nav links present:', navLinks);
  console.log('  client-side nav → /materials works:');
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(1500);
  console.log('  home title after hydrate:', await page.title());
  console.log('  page errors:', errors.length ? errors.slice(0, 5) : 'none');

  await browser.close();
})();
