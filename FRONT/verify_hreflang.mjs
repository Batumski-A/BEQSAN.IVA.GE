import { chromium } from 'playwright';

const BASE = process.env.VERIFY_BASE ?? 'https://beqsan.iva.ge';
const CHECK = [
  ['/', '/en', '/ru'],
  ['/about', '/en/about', '/ru/about'],
  ['/catalog/window', '/en/catalog/window', '/ru/catalog/window'],
];

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block' });

  console.log('--- raw HTML per language (what a crawler sees) ---');
  for (const group of CHECK) {
    for (const url of group) {
      const html = await (await fetch(BASE + url)).text();
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      const canon = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1] || '';
      const htmlLang = (html.match(/<html[^>]*lang="([^"]*)"/) || [])[1] || '';
      const hreflangs = [...html.matchAll(/hreflang="([^"]*)"/g)].map((m) => m[1]).join(',');
      console.log(`  ${url.padEnd(22)} lang=${htmlLang.padEnd(3)} hreflang=[${hreflangs}]`);
      console.log(`      title: ${title.slice(0, 58)}`);
      console.log(`      canonical: ${canon}`);
    }
  }

  console.log('\n--- user experience: language switch + hydration ---');
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/en/about', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2000);
  console.log('  /en/about → html lang:', await page.evaluate(() => document.documentElement.lang));
  console.log('  /en/about → title:', await page.title());
  // click a nav link, confirm it stays in /en
  const navHref = await page.locator('a[href^="/en/"]').first().getAttribute('href').catch(() => null);
  console.log('  first in-page nav link:', navHref, navHref?.startsWith('/en/') ? '(stays EN ✓)' : '(dropped ✗)');
  console.log('  page errors:', errors.length ? errors.slice(0, 3) : 'none');

  await browser.close();
})();
