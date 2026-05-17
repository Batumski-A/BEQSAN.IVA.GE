# Skill: performance-optimization

**Trigger:** any Lighthouse score < 90, any user complaint about speed, before every release, after any 3D / bundle / image change.

**Source:** [docs/kickoff.md §9.9, §13](../../../docs/kickoff.md). (Skill content past mid-section was truncated in the kickoff message; this file is the authoritative version.)

---

## Performance budget (per page)

| Metric | Target | Hard fail |
|---|---|---|
| LCP | < 2.0s | 2.5s |
| INP | < 150ms | 200ms |
| CLS | 0 | 0.05 |
| TTI | < 3.0s | 4.0s |
| JS bundle (initial) | < 180 KB gzip | 250 KB |
| Image weight (per page) | < 800 KB | 1.2 MB |
| 3D model | < 800 KB Draco | 1.5 MB |
| TBT | < 200ms | 350ms |

**Tools:**
- Lighthouse CI on every PR (fail merge if any metric crosses the hard-fail threshold).
- `vite-bundle-analyzer` report attached to every release tag.
- Custom RUM (web-vitals package → ship to Plausible/Umami custom events) in production.

## Pre-flight checklist (run before claiming a feature is done)

1. Bundle analysis — anything > 50 KB gzip in the **main chunk** that shouldn't be?
2. Below-the-fold content lazy-loaded (`React.lazy` + `Suspense`, `loading="lazy"` on images)?
3. Critical resources have `<link rel="preconnect">` (API origin, fonts, MinIO/S3)?
4. Critical resources have `<link rel="preload">` (hero font, hero image, LCP candidate)?
5. Image dimensions specified (no CLS)?
6. Fonts subsetted via `unicode-range`?
7. Heavy components dynamically imported (Konva, R3F admin charts)?
8. Service worker caches catalog + static assets (PWA)?
9. 3D models Draco-compressed?
10. No render-blocking 3rd-party scripts above the fold?

## Bundle splitting strategy

```
main.js                    < 180 KB gzip   — shell, router, primary nav, home
configurator.js            < 220 KB gzip   — R3F + steps + pricing
canvas-draw.js             < 80 KB gzip    — Konva (loaded only for shape draw step)
admin.js                   separate app    — never shipped to public site
```

**Vite config patterns:**
- `manualChunks` for vendor splits: `three`, `react`, `tanstack`, `radix-ui`.
- `build.target: 'es2020'` (skip transpilation for modern browsers; we don't support IE11 etc.).
- `build.cssCodeSplit: true`.
- `build.minify: 'esbuild'` (fast, good enough).

## Image strategy (recap from frontend-patterns)

- AVIF first, WebP fallback, JPG ultimate.
- `srcSet` with 1x, 2x, 3x.
- Always specify `width` and `height`.
- Use blurhash placeholder (`react-blurhash`) for hero shots.
- Use `<picture>` for art-direction variants (mobile vs desktop crop).
- Compress originals server-side on upload: max 2048px long edge, 80% quality JPG / 70% AVIF.

## 3D performance (recap from 3d-scene-design)

- Draco compression mandatory for all GLTF.
- Mobile: shadows off, dpr `[1, 1.5]`.
- Desktop: shadows on, dpr `[1, 2]`.
- Max 2 directional shadow casters.
- Textures max 2048×2048, basis-compressed where possible.
- `useGLTF` inside `Suspense`, never blocking initial render.

## CSS performance

- Tailwind purge configured to scan only `FRONT/src/**/*.{ts,tsx}` and skip dead-code.
- Use `@layer` to define utilities — they get tree-shaken correctly.
- Inline critical CSS for the hero (use `vite-plugin-critical` or `beasties` at build time).
- Defer non-critical CSS via `<link rel="stylesheet" media="print" onload="this.media='all'">` pattern.

## Network

- HTTP/2 or HTTP/3 (Cloudflare/Caddy at the edge).
- Brotli compression for all text assets.
- CDN cache headers: 1 year for hashed assets, no-cache for HTML.
- Preconnect to: `api.beqsan.iva.ge`, MinIO bucket, Plausible domain.

## Runtime hot paths

| Hot path | Target | Notes |
|---|---|---|
| Configurator price recalc | < 50ms server, < 5ms client mirror | Debounce input 400ms |
| 3D scene render | 16.7ms (60fps) | Limit shadows on mobile |
| List page (admin orders, catalog) | < 100ms TTFB | Dapper query, indexed columns |
| AI dimension estimation | < 8s end-to-end | Skeleton + cancel button |
| Order tracking page | < 200ms TTFB | Cache by phone hash 30s |

## Server-side performance

- Dapper queries < 50ms p95. Add EXPLAIN ANALYZE check for any query > 100ms.
- EF Core writes: use `AsNoTracking()` on reads even when EF, batch saves with `SaveChangesAsync` once per request.
- Connection pooling: 100 connections / instance, monitor saturation in Grafana.
- Output caching for catalog: `[OutputCache(Duration = 300)]` on public list endpoints.

## Monitoring

**Frontend (RUM):**
```ts
import { onLCP, onINP, onCLS, onTTFB } from 'web-vitals';
onLCP(metric => trackVital('lcp', metric.value));
onINP(metric => trackVital('inp', metric.value));
onCLS(metric => trackVital('cls', metric.value));
onTTFB(metric => trackVital('ttfb', metric.value));
```

Ship to Plausible custom events. Dashboard alarms when p75 LCP > 2.5s for 3 consecutive 5-min buckets.

**Backend:**
- Serilog `ApplicationInsights` or `Seq` sink with response-time enrichment.
- Slow-query log: any DB call > 200ms at Warning level.
- Endpoint metrics via `prometheus-net` if Prometheus stack is available on IVA infra; otherwise OpenTelemetry → Cloud9.ge BATUMSKI.

## Anti-patterns

```
❌ Importing all of lodash                             → import specific functions
❌ Loading Konva on home page                          → load only on Step 3c
❌ Inlining base64 hero image                          → use AVIF + preload
❌ Server rendering an admin chart                     → admin app is SPA-only
❌ No image dimensions specified                       → cause CLS
❌ Unbatched useState updates in a loop                → React 18 auto-batches but verify
❌ EF query with .Include().Include().Include()        → use Dapper for the hot read path
❌ No output cache on public catalog                   → cache 5 min
❌ 3D model > 1.5 MB                                   → re-compress with Draco
❌ Polyfill bundle shipped to modern browsers          → target es2020
```

## Related skills

- [3d-scene-design](../3d-scene-design/SKILL.md) — 3D-specific perf rules.
- [frontend-patterns](../frontend-patterns/SKILL.md) — code splitting, lazy routes.
- [deployment-ops](../deployment-ops/SKILL.md) — CDN, compression, edge cache.
