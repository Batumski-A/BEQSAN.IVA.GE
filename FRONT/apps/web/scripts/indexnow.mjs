/**
 * Notify Bing + Yandex (and other IndexNow engines) that BEQSAN's URLs are
 * new/updated, so they crawl immediately instead of waiting weeks. Yandex is
 * the key engine for the Russian-speaking Batumi market.
 *
 * The key file (public/<key>.txt) must be deployed and reachable at the host
 * root first. Run from the FRONT workspace root:  node apps/web/scripts/indexnow.mjs
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seo = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'src', 'shared', 'seo', 'seoRoutes.json'), 'utf8'),
);

const KEY = '5ba1d009833b128b8949a5541570598c';
const HOST = 'beqsan.iva.ge';
const origin = seo.site.url;
const prefixOf = (lang) => (lang === seo.site.defaultLocale ? '' : `/${lang}`);
const urlList = seo.site.locales.flatMap((lang) =>
  seo.routes.map((r) => {
    const u = `${prefixOf(lang)}${r.path === '/' ? '/' : r.path}`;
    return `${origin}${u === '/' ? '/' : u}`;
  }),
);

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `${origin}/${KEY}.txt`,
  urlList,
};

const resp = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
console.log(`[indexnow] submitted ${urlList.length} URLs → HTTP ${resp.status} ${resp.statusText}`);
if (resp.status !== 200 && resp.status !== 202) {
  console.log('[indexnow] body:', (await resp.text()).slice(0, 300));
}
