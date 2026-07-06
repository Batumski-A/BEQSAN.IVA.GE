/**
 * Build-time prerender for the BEQSAN SPA — all three languages.
 *
 * Renders each indexable route in ka (root), en (/en/*) and ru (/ru/*) in a real
 * Chromium (Playwright) so WebGL/motion/PWA behave as in production, then writes
 * the fully-rendered per-language HTML (helmet head + hreflang + JSON-LD +
 * content) to dist/<route>/index.html and dist/<lang>/<route>/index.html. Also
 * emits a hreflang-annotated dist/sitemap.xml.
 *
 * Single source of truth: src/shared/seo/seoRoutes.json.
 * Run from the FRONT workspace root:  node apps/web/scripts/prerender.mjs
 */
import { chromium } from 'playwright';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, '..');
const DIST = path.join(WEB, 'dist');
const ROUTES_JSON = path.join(WEB, 'src', 'shared', 'seo', 'seoRoutes.json');
const LIVE_API_ORIGIN = 'https://beqsan.iva.ge';
const PORT = 4319;

const seo = JSON.parse(fs.readFileSync(ROUTES_JSON, 'utf8'));
const routes = seo.routes.map((r) => r.path);
const LOCALES = seo.site.locales; // ['ka','en','ru']
const DEFAULT_LOCALE = seo.site.defaultLocale; // 'ka'

const prefixOf = (lang) => (lang === DEFAULT_LOCALE ? '' : `/${lang}`);
const urlFor = (lang, routePath) => {
  const p = prefixOf(lang);
  return routePath === '/' ? p || '/' : `${p}${routePath}`;
};
const absUrl = (lang, routePath) => {
  const u = urlFor(lang, routePath);
  return `${seo.site.url}${u === '/' ? '/' : u}`;
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

function startServer() {
  const shell = fs.readFileSync(path.join(DIST, 'index.html'));
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const filePath = path.join(DIST, urlPath);
      if (path.extname(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(shell);
    } catch {
      res.writeHead(500);
      res.end('err');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function outFileFor(lang, routePath) {
  const langDir = lang === DEFAULT_LOCALE ? '' : lang;
  const routeDir = routePath === '/' ? '' : routePath.replace(/^\//, '');
  return path.join(DIST, langDir, routeDir, 'index.html');
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html not found — run `vite build` first.');
    process.exit(1);
  }
  const server = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'ka-GE', viewport: { width: 1366, height: 900 } });

  await context.route('**/api/**', async (route) => {
    const reqUrl = new URL(route.request().url());
    try {
      const resp = await fetch(LIVE_API_ORIGIN + reqUrl.pathname + reqUrl.search, {
        headers: { accept: 'application/json' },
      });
      route.fulfill({
        status: resp.status,
        headers: {
          'content-type': resp.headers.get('content-type') || 'application/json',
          'access-control-allow-origin': '*',
        },
        body: Buffer.from(await resp.arrayBuffer()),
      });
    } catch {
      route.abort();
    }
  });

  const page = await context.newPage();
  const captured = [];

  for (const lang of LOCALES) {
    for (const routePath of routes) {
      const url = `http://127.0.0.1:${PORT}${urlFor(lang, routePath)}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      } catch { /* WebGL studio may never hit networkidle; head is ready */ }
      await page.waitForSelector('link[rel="canonical"]', { timeout: 15000 }).catch(() => {});
      // Confirm helmet applied the right language before capturing.
      await page.waitForFunction((l) => document.documentElement.lang === l, lang, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
      const html = '<!DOCTYPE html>\n' + (await page.content()).replace(/^<!DOCTYPE html>/i, '');
      captured.push({ lang, routePath, html });
    }
    console.log(`[prerender] ${lang}: ${routes.length} routes`);
  }

  await browser.close();
  server.close();

  // Write nested files first; the ka root (/) last so the served shell during
  // capture was always the vite-built one.
  for (const { lang, routePath, html } of captured) {
    if (lang === DEFAULT_LOCALE && routePath === '/') continue;
    const out = outFileFor(lang, routePath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html, 'utf8');
  }
  const home = captured.find((c) => c.lang === DEFAULT_LOCALE && c.routePath === '/');
  if (home) fs.writeFileSync(outFileFor(DEFAULT_LOCALE, '/'), home.html, 'utf8');

  writeSitemap();
  console.log(`[prerender] done — ${captured.length} pages (${LOCALES.length} langs) + sitemap.xml`);
}

function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const blocks = [];
  for (const r of seo.routes) {
    const alts = [
      ...LOCALES.map((l) => `      <xhtml:link rel="alternate" hreflang="${l}" href="${absUrl(l, r.path)}" />`),
      `      <xhtml:link rel="alternate" hreflang="x-default" href="${absUrl(DEFAULT_LOCALE, r.path)}" />`,
    ].join('\n');
    for (const lang of LOCALES) {
      blocks.push(
        [
          '  <url>',
          `    <loc>${absUrl(lang, r.path)}</loc>`,
          `    <lastmod>${today}</lastmod>`,
          `    <changefreq>${r.changefreq}</changefreq>`,
          `    <priority>${r.priority.toFixed(1)}</priority>`,
          alts,
          '  </url>',
        ].join('\n'),
      );
    }
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    blocks.join('\n') +
    '\n</urlset>\n';
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml, 'utf8');
}

main().catch((e) => {
  console.error('[prerender] failed:', e);
  process.exit(1);
});
