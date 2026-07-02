/**
 * Rasterize an inline SVG element to a PNG data-URL.
 *
 * Used by the WhatsApp handoff to attach the 2D blueprint when the 3D
 * canvas isn't mounted (2D view mode) or its capture failed. Works only
 * for self-contained SVGs (inline stroke/fill attributes, no external
 * refs) — which Blueprint2DViewer is.
 */
export async function svgToPngDataUrl(
  svg: SVGSVGElement,
  opts: { scale?: number; background?: string } = {},
): Promise<string> {
  const { scale = 2, background = '#f8fafc' } = opts;

  const rectSize = svg.getBoundingClientRect();
  const vb = svg.viewBox?.baseVal;
  const cssW = rectSize.width || vb?.width || 800;
  const cssH = rectSize.height || vb?.height || 600;

  // iOS Safari silently draws NOTHING when an SVG image has only a viewBox —
  // clone the node and pin explicit width/height before serializing.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(cssW));
  clone.setAttribute('height', String(cssH));

  const xml = new XMLSerializer().serializeToString(clone);
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG rasterization failed'));
    img.src = src;
  });

  const rect = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round((rect.width || 800) * scale));
  const h = Math.max(1, Math.round((rect.height || 600) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}
