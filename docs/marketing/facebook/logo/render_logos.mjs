import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const DIR = 'e:/BEQSAN.IVA.GE/docs/marketing/facebook/logo';
const mark = readFileSync(`${DIR}/beqsan-mark.svg`, 'utf8');
// inline version without the rounded card background (for compositions)
const markBare = mark
  .replace(/<rect width="512" height="512" rx="96"[^/]*\/>/, '')
  .replace('<svg xmlns', '<svg style="display:block" xmlns');

const font = `font-family:'Segoe UI','Arial',sans-serif;`;

const pages = [
  {
    name: 'logo-profile.png',
    w: 1024, h: 1024,
    html: `
      <div style="width:1024px;height:1024px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
                  background:radial-gradient(circle at 32% 24%,#1A2540 0%,#0F172A 60%,#0B1120 100%);">
        <div style="width:430px;height:430px">${markBare}</div>
        <div style="${font}font-size:118px;font-weight:800;letter-spacing:0.05em;color:#F8FAFC;line-height:1">
          BEQSAN<span style="color:#2563EB">.</span>
        </div>
        <div style="${font}font-size:30px;font-weight:600;letter-spacing:0.5em;color:#8FA3BF;margin-top:10px;padding-left:0.5em">
          BATUMI · 1998
        </div>
      </div>`,
  },
  {
    name: 'logo-horizontal-dark.png',
    w: 1500, h: 500,
    html: `
      <div style="width:1500px;height:500px;display:flex;align-items:center;justify-content:center;gap:56px;
                  background:linear-gradient(135deg,#141F38 0%,#0F172A 55%,#0B1120 100%);">
        <div style="width:340px;height:340px">${markBare}</div>
        <div>
          <div style="${font}font-size:150px;font-weight:800;letter-spacing:0.04em;color:#F8FAFC;line-height:1">
            BEQSAN<span style="color:#2563EB">.</span>
          </div>
          <div style="${font}font-size:34px;font-weight:600;letter-spacing:0.42em;color:#8FA3BF;margin-top:16px">
            კარ-ფანჯარა · ბათუმი · 1998
          </div>
        </div>
      </div>`,
  },
  {
    name: 'logo-horizontal-light.png',
    w: 1500, h: 500,
    html: `
      <div style="width:1500px;height:500px;display:flex;align-items:center;justify-content:center;gap:56px;background:#FFFFFF;">
        <div style="width:340px;height:340px;filter:invert(0)">${markBare
          .replaceAll('#F8FAFC', '#0F172A')}</div>
        <div>
          <div style="${font}font-size:150px;font-weight:800;letter-spacing:0.04em;color:#0F172A;line-height:1">
            BEQSAN<span style="color:#2563EB">.</span>
          </div>
          <div style="${font}font-size:34px;font-weight:600;letter-spacing:0.42em;color:#64748B;margin-top:16px">
            კარ-ფანჯარა · ბათუმი · 1998
          </div>
        </div>
      </div>`,
  },
];

(async () => {
  const browser = await chromium.launch();
  for (const p of pages) {
    const page = await browser.newPage({
      viewport: { width: p.w, height: p.h },
      deviceScaleFactor: 2, // render at 2x for max sharpness
    });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}</style></head><body>${p.html}</body></html>`);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${DIR}/${p.name}` });
    await page.close();
    console.log('rendered', p.name);
  }
  // mark-only square (from the SVG itself, with its rounded card bg)
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><body style="margin:0">${mark.replace('viewBox="0 0 512 512"', 'viewBox="0 0 512 512" width="1024" height="1024"')}</body>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/logo-mark-app-icon.png` });
  console.log('rendered logo-mark-app-icon.png');
  await browser.close();
})();
