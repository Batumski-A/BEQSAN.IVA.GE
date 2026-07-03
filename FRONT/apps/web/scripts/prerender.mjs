/**
 * Build-time prerender for the BEQSAN SPA.
 *
 * Renders each indexable route in a real Chromium (Playwright) — so WebGL,
 * framer-motion and matchMedia behave exactly as in production — then writes
 * the fully-rendered HTML (react-helmet-async head + JSON-LD + content) to
 * dist/<route>/index.html. IIS serves those static files to crawlers; the
 * SPA still hydrates for users. Also emits dist/sitemap.xml.
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/** Static server over the ORIGINAL built dist, SPA-fallback to index.html. */
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

function outFileFor(routePath) {
  if (routePath === '/') return path.join(DIST, 'index.html');
  return path.join(DIST, routePath.replace(/^\//, ''), 'index.html');
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html not found — run `vite build` first.');
    process.exit(1);
  }
  const server = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'ka-GE', viewport: { width: 1366, height: 900 } });

  // Route the SPA's relative /api calls to the live backend so data-driven
  // pages (home, catalog) prerender with real content, not error states.
  await context.route('**/api/**', async (route) => {
    const reqUrl = new URL(route.request().url());
    const target = LIVE_API_ORIGIN + reqUrl.pathname + reqUrl.search;
    try {
      const resp = await fetch(target, { headers: { accept: 'application/json' } });
      const body = Buffer.from(await resp.arrayBuffer());
      route.fulfill({
        status: resp.status,
        headers: {
          'content-type': resp.headers.get('content-type') || 'application/json',
          'access-control-allow-origin': '*',
        },
        body,
      });
    } catch {
      route.abort();
    }
  });

  const page = await context.newPage();
  const captured = [];

  for (const routePath of routes) {
    const url = `http://127.0.0.1:${PORT}${routePath}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    } catch {
      // networkidle can time out on the WebGL studio (RAF/texture loops) —
      // the Helmet head is already injected long before, so continue.
    }
    // Helmet writes the canonical link only after the route component mounts.
    await page.waitForSelector('link[rel="canonical"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);
    const html = '<!DOCTYPE html>\n' + (await page.content()).replace(/^<!DOCTYPE html>/i, '');
    const title = await page.title();
    captured.push({ routePath, html });
    console.log(`[prerender] ${routePath.padEnd(20)} → ${title.slice(0, 60)}`);
  }

  await browser.close();
  server.close();

  // Write nested files first, root (/) last so the loop's served shell was
  // always the vite-built one, never a prerendered page.
  for (const { routePath, html } of captured.filter((c) => c.routePath !== '/')) {
    const out = outFileFor(routePath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html, 'utf8');
  }
  const home = captured.find((c) => c.routePath === '/');
  if (home) fs.writeFileSync(outFileFor('/'), home.html, 'utf8');

  writeSitemap();
  console.log(`[prerender] done — ${captured.length} routes + sitemap.xml`);
}

function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = seo.routes
    .map((r) => {
      const loc = `${seo.site.url}${r.path === '/' ? '/' : r.path}`;
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${r.changefreq}</changefreq>`,
        `    <priority>${r.priority.toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml, 'utf8');
}

main().catch((e) => {
  console.error('[prerender] failed:', e);
  process.exit(1);
});
