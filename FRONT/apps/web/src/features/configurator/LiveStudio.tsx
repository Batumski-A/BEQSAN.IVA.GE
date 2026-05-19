import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Box,
  Check,
  DoorOpen,
  GalleryHorizontal,
  Square,
  PanelsTopLeft,
  Eye,
  EyeOff,
  LayoutGrid,
} from 'lucide-react';
import type { ConfigurationPaneInput, HingeSide, PaneOpeningType } from '@beqsan/api-types';

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useProductTypes, type ProductType } from '@/features/catalog/api';
import { useMaterialsByProductType, useConfiguratorPrice } from './api';
import { useConfiguratorStore } from './store';
import { Blueprint2DViewer } from './blueprint/Blueprint2DViewer';

const Scene = lazy(() =>
  import('./3d/Scene').then((m) => ({ default: m.ConfiguratorScene })),
);

type ViewMode = '3d' | '2d' | 'preview';
type ProductSlug = 'window' | 'door' | 'sliding' | 'panoramic' | 'balcony';
type MaterialKey = 'alumil' | 'rehau';

/** Demo's opening dictionary mapped to the BEQSAN PaneOpeningType + HingeSide. */
type OpeningKey =
  | 'fixed'
  | 'turn-left'
  | 'turn-right'
  | 'tilt'
  | 'tilt-turn-left'
  | 'tilt-turn-right'
  | 'slide-left'
  | 'slide-right'
  | 'door-left'
  | 'door-right';

const OPENING_TO_STORE: Record<
  OpeningKey,
  { openingType: PaneOpeningType; hingeSide: HingeSide | null }
> = {
  'fixed': { openingType: 'Fixed', hingeSide: null },
  'turn-left': { openingType: 'Casement', hingeSide: 'Left' },
  'turn-right': { openingType: 'Casement', hingeSide: 'Right' },
  'tilt': { openingType: 'Tilt', hingeSide: null },
  'tilt-turn-left': { openingType: 'TiltAndTurn', hingeSide: 'Left' },
  'tilt-turn-right': { openingType: 'TiltAndTurn', hingeSide: 'Right' },
  'slide-left': { openingType: 'Sliding', hingeSide: 'Left' },
  'slide-right': { openingType: 'Sliding', hingeSide: 'Right' },
  'door-left': { openingType: 'Casement', hingeSide: 'Left' },
  'door-right': { openingType: 'Casement', hingeSide: 'Right' },
};

/** Quick-start templates — the demo's "მზა შაბლონები". */
type Template = {
  id: string;
  labelKey: string;
  productSlug: ProductSlug;
  widthCm: number;
  heightCm: number;
  sections: number;
  ratios: number[];
  openings: OpeningKey[];
};

const TEMPLATES: ReadonlyArray<Template> = [
  {
    id: 't-standard-2',
    labelKey: 'studio.templates.standard2',
    productSlug: 'window',
    widthCm: 150,
    heightCm: 150,
    sections: 2,
    ratios: [0.5, 0.5],
    openings: ['fixed', 'tilt-turn-right'],
  },
  {
    id: 't-balcony',
    labelKey: 'studio.templates.balcony',
    productSlug: 'balcony',
    widthCm: 160,
    heightCm: 220,
    sections: 2,
    ratios: [0.55, 0.45],
    openings: ['door-right', 'tilt-turn-right'],
  },
  {
    id: 't-wide-3',
    labelKey: 'studio.templates.wide3',
    productSlug: 'window',
    widthCm: 220,
    heightCm: 160,
    sections: 3,
    ratios: [0.25, 0.5, 0.25],
    openings: ['fixed', 'tilt-turn-right', 'fixed'],
  },
  {
    id: 't-panoramic',
    labelKey: 'studio.templates.panoramic',
    productSlug: 'panoramic',
    widthCm: 320,
    heightCm: 240,
    sections: 4,
    ratios: [0.25, 0.25, 0.25, 0.25],
    openings: ['fixed', 'tilt-turn-left', 'tilt-turn-right', 'fixed'],
  },
];

const PRODUCT_LIST: ReadonlyArray<{ slug: ProductSlug; labelKey: string; icon: typeof Square }> = [
  { slug: 'window', labelKey: 'studio.products.window', icon: Square },
  { slug: 'door', labelKey: 'studio.products.door', icon: DoorOpen },
  { slug: 'sliding', labelKey: 'studio.products.sliding', icon: GalleryHorizontal },
  { slug: 'panoramic', labelKey: 'studio.products.panoramic', icon: PanelsTopLeft },
  { slug: 'balcony', labelKey: 'studio.products.balcony', icon: LayoutGrid },
];

/** Match these to BACK seeder slugs (MaterialSeeder.cs). */
const MATERIAL_SLUG_BY_PRODUCT: Record<ProductSlug, Record<MaterialKey, string>> = {
  window: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  door: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  sliding: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  panoramic: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  balcony: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
};

/** Two-decimal Georgian price formatting: `1 234 ₾`. */
function formatGel(amount: number): string {
  return new Intl.NumberFormat('ka-GE', { maximumFractionDigits: 0 }).format(amount);
}

export default function LiveStudio() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [orderOpen, setOrderOpen] = useState(false);
  const [materialKey, setMaterialKey] = useState<MaterialKey>('alumil');

  // Store reads
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);

  // Store writes
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);
  const setPaneCount = useConfiguratorStore((s) => s.setPaneCount);
  const setPaneOpening = useConfiguratorStore((s) => s.setPaneOpening);
  const setPaneHinge = useConfiguratorStore((s) => s.setPaneHinge);
  const setPaneRatios = useConfiguratorStore((s) => s.setPaneRatios);

  // Catalog
  const productTypesQuery = useProductTypes();
  const materialsQuery = useMaterialsByProductType(productType?.id ?? null);

  // Map product slug → load detail, hydrate store
  const selectedProductSlug: ProductSlug = (productType?.slug as ProductSlug) ?? 'window';

  // First-load: hydrate window/aluminum-thermal/200x150/2 sections if store empty.
  useEffect(() => {
    if (productType !== null) return;
    if (!productTypesQuery.data) return;
    const window = productTypesQuery.data.find((p) => p.slug === 'window');
    if (!window) return;
    void hydrateProductBySlug('window', productTypesQuery.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productTypesQuery.data, productType]);

  async function hydrateProductBySlug(slug: ProductSlug, list: ProductType[]) {
    const pt = list.find((p) => p.slug === slug);
    if (!pt?.id) return;
    // Fetch detail to get constraints.
    const { fetchProductTypeDetail } = await import('@/features/catalog/api');
    try {
      const detail = await fetchProductTypeDetail(pt.id);
      if (!detail.id || !detail.slug) return;
      useConfiguratorStore.getState().setProductType({
        id: detail.id,
        slug: detail.slug,
        name: detail.name?.ka ?? detail.slug,
        constraints: {
          minWidthCm: detail.constraints?.minWidthCm ?? 50,
          maxWidthCm: detail.constraints?.maxWidthCm ?? 400,
          minHeightCm: detail.constraints?.minHeightCm ?? 50,
          maxHeightCm: detail.constraints?.maxHeightCm ?? 400,
        },
      });
    } catch {
      /* network error swallowed — UI shows skeleton */
    }
  }

  // Material auto-pick — when product changes OR materialKey toggles, resolve and set.
  useEffect(() => {
    if (!productType?.slug) return;
    if (!materialsQuery.data) return;
    const targetSlug = MATERIAL_SLUG_BY_PRODUCT[productType.slug as ProductSlug]?.[materialKey];
    if (!targetSlug) return;
    if (material?.slug === targetSlug) return;
    const m = materialsQuery.data.find((x) => x.slug === targetSlug);
    if (!m?.id || !m.slug) return;
    const familyValue = typeof m.family === 'string' ? m.family.toLowerCase() : '';
    const thermalValue = typeof m.thermalRating === 'string' ? m.thermalRating.toLowerCase() : '';
    useConfiguratorStore.getState().setMaterial({
      id: m.id,
      slug: m.slug,
      name: m.name?.ka ?? m.slug,
      family: familyValue === 'aluminum' ? 'aluminum' : 'pvc',
      thermalRating:
        thermalValue === 'thermal'
          ? 'thermal'
          : thermalValue === 'highthermal'
            ? 'highThermal'
            : thermalValue === 'basic'
              ? 'basic'
              : 'none',
      basePricePerSqmMinor: m.basePricePerSqmMinor ?? 0,
      currency: m.currency ?? 'GEL',
    });
  }, [productType?.slug, materialKey, materialsQuery.data, material?.slug]);

  // Price — debounced, only when productType + material both resolved.
  const debouncedWidth = useDebouncedValue(dimensions.widthCm, 220);
  const debouncedHeight = useDebouncedValue(dimensions.heightCm, 220);
  const priceReq = useMemo(() => {
    if (!productType || !material) return null;
    return {
      productTypeId: productType.id,
      materialId: material.id,
      widthCm: debouncedWidth,
      heightCm: debouncedHeight,
      panes,
    };
  }, [productType, material, debouncedWidth, debouncedHeight, panes]);
  const priceQuery = useConfiguratorPrice(priceReq);

  // Handlers
  const onPickProduct = (slug: ProductSlug) => {
    if (!productTypesQuery.data) return;
    void hydrateProductBySlug(slug, productTypesQuery.data);
  };

  const onApplyTemplate = (tpl: Template) => {
    if (!productTypesQuery.data) return;
    void (async () => {
      await hydrateProductBySlug(tpl.productSlug, productTypesQuery.data!);
      const store = useConfiguratorStore.getState();
      store.setDimensions({ widthCm: tpl.widthCm, heightCm: tpl.heightCm });
      store.setPaneCount(tpl.sections);
      store.setPaneRatios(tpl.ratios);
      // Apply openings after pane count change settled.
      for (let i = 0; i < tpl.openings.length; i++) {
        const key = tpl.openings[i]!;
        const mapped = OPENING_TO_STORE[key];
        store.setPaneOpening(i + 1, mapped.openingType);
        store.setPaneHinge(i + 1, mapped.hingeSide);
      }
    })();
  };

  const onSetSections = (n: number) => {
    setPaneCount(n);
  };

  const onSetWeightLR = (leftPercent: number) => {
    const l = Math.max(0.2, Math.min(0.8, leftPercent / 100));
    setPaneRatios([l, 1 - l]);
  };

  const onSetThreeWeights = (preset: 'equal' | 'wide-middle') => {
    setPaneRatios(preset === 'equal' ? [1 / 3, 1 / 3, 1 / 3] : [0.25, 0.5, 0.25]);
  };

  const onSetPaneOpening = (paneIndex: number, key: OpeningKey) => {
    const mapped = OPENING_TO_STORE[key];
    setPaneOpening(paneIndex + 1, mapped.openingType);
    setPaneHinge(paneIndex + 1, mapped.hingeSide);
  };

  const price = priceQuery.data?.totalMinor != null ? priceQuery.data.totalMinor / 100 : null;
  const isLoadingPrice = priceQuery.isPending || priceQuery.isFetching;
  const showPanels = viewMode !== 'preview';

  /**
   * Controls bundle passed into <Scene> for the in-scene dropdowns + W/H
   * inputs. The right-panel form drives the same store, so these in-scene
   * controls stay in sync automatically via Zustand reactivity. Preview mode
   * (panels hidden) also hides these controls.
   */
  const sceneInteractive = useMemo(() => {
    if (!showPanels) return undefined;
    const interactiveOptions: ReadonlyArray<{ value: OpeningKey; labelKey: string }> = [
      { value: 'fixed', labelKey: 'studio.opening.fixed' },
      { value: 'tilt-turn-left', labelKey: 'studio.opening.tiltTurnLeft' },
      { value: 'tilt-turn-right', labelKey: 'studio.opening.tiltTurnRight' },
      { value: 'turn-left', labelKey: 'studio.opening.turnLeft' },
      { value: 'turn-right', labelKey: 'studio.opening.turnRight' },
      { value: 'tilt', labelKey: 'studio.opening.tilt' },
      { value: 'slide-left', labelKey: 'studio.opening.slideLeft' },
      { value: 'slide-right', labelKey: 'studio.opening.slideRight' },
      { value: 'door-left', labelKey: 'studio.opening.doorLeft' },
      { value: 'door-right', labelKey: 'studio.opening.doorRight' },
    ];
    return {
      panes: {
        options: interactiveOptions.map((o) => ({ value: o.value, label: t(o.labelKey) })),
        valueFor: (p: ConfigurationPaneInput) => storeToOpeningKey(p.openingType, p.hingeSide ?? null),
        onChange: (paneIndex: number, value: string) => {
          // paneIndex from Scene is 1-based (pane.position).
          const mapped = OPENING_TO_STORE[value as OpeningKey];
          if (!mapped) return;
          setPaneOpening(paneIndex, mapped.openingType);
          setPaneHinge(paneIndex, mapped.hingeSide);
        },
      },
      dimensions: {
        widthCm: dimensions.widthCm,
        heightCm: dimensions.heightCm,
        minWidthCm: productType?.constraints.minWidthCm ?? 50,
        maxWidthCm: productType?.constraints.maxWidthCm ?? 400,
        minHeightCm: productType?.constraints.minHeightCm ?? 50,
        maxHeightCm: productType?.constraints.maxHeightCm ?? 400,
        onWidthChange: (cm: number) => setDimensions({ widthCm: cm }),
        onHeightChange: (cm: number) => setDimensions({ heightCm: cm }),
      },
    };
  }, [showPanels, t, dimensions.widthCm, dimensions.heightCm, productType, setDimensions, setPaneOpening, setPaneHinge]);

  return (
    <>
      <Helmet>
        <title>{t('studio.metaTitle')} · BEQSAN</title>
        <meta name="description" content={t('studio.metaDescription')} />
      </Helmet>

      <div className="relative h-screen w-full overflow-hidden bg-studio-ink font-studio">
        {/* Live preview canvas — 3D or 2D blueprint */}
        <div className="absolute inset-0">
          {viewMode === '2d' ? (
            <div className="h-full w-full p-12 lg:p-20">
              <Blueprint2DViewer />
            </div>
          ) : (
            <Suspense fallback={null}>
              <Scene interactive={sceneInteractive} />
            </Suspense>
          )}
        </div>

        {/* Top-left: back chip */}
        {showPanels ? (
          <Link
            to="/"
            className="absolute left-6 top-6 z-30 inline-flex items-center justify-center rounded-xl border border-studio-ink-3 bg-studio-ink-2/80 p-3 text-studio-fg-inv-mute shadow-lg backdrop-blur-md transition-colors hover:bg-studio-ink-3"
            aria-label={t('studio.nav.back')}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
        ) : (
          // Even in preview, show a subtle exit so the user isn't trapped.
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className="absolute left-6 top-6 z-30 inline-flex items-center justify-center rounded-xl border border-studio-ink-3 bg-studio-ink-2/60 p-3 text-studio-fg-inv-soft shadow-lg backdrop-blur-md transition-colors hover:bg-studio-ink-3"
            aria-label={t('studio.viewMode.exitPreview')}
          >
            <Eye className="h-5 w-5" aria-hidden />
          </button>
        )}

        {/* Top-right: view mode toggle + price chip */}
        <div className="absolute right-6 top-6 z-40 flex items-center gap-3">
          <div className="flex rounded-xl border border-studio-ink-3 bg-studio-ink-2/90 p-1 shadow-xl backdrop-blur-md">
            <ViewToggle
              active={viewMode === '3d'}
              onClick={() => setViewMode('3d')}
              label={t('studio.viewMode.threeD')}
              icon={<Box className="h-4 w-4" aria-hidden />}
            />
            <ViewToggle
              active={viewMode === '2d'}
              onClick={() => setViewMode('2d')}
              label={t('studio.viewMode.twoD')}
              icon={<Square className="h-4 w-4" aria-hidden />}
            />
            <ViewToggle
              active={viewMode === 'preview'}
              onClick={() => setViewMode(viewMode === 'preview' ? '3d' : 'preview')}
              label={t('studio.viewMode.preview')}
              icon={viewMode === 'preview' ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            />
          </div>

          {showPanels ? (
            <div className="flex items-center rounded-2xl border border-studio-ink-3 bg-studio-ink/90 p-2 pl-6 shadow-2xl backdrop-blur-xl">
              <div className="mr-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-studio-fg-inv-soft">
                  {t('studio.price.eyebrow')}
                </p>
                <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-white">
                  {isLoadingPrice && price === null ? '—' : price !== null ? formatGel(price) : '—'}
                  <span className="ml-1 text-sm text-studio-fg-inv-soft">₾</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderOpen(true)}
                className="rounded-xl bg-studio-brand px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-colors hover:bg-studio-brand-h"
              >
                {t('studio.price.cta')}
              </button>
            </div>
          ) : null}
        </div>

        {/* Left panel: product / templates / material */}
        {showPanels ? (
          <aside className="absolute left-6 top-24 z-30 flex max-h-[calc(100vh-8rem)] w-72 flex-col gap-4 overflow-y-auto pb-10">
            <Panel label={t('studio.panel.product')}>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_LIST.map((p) => {
                  const Icon = p.icon;
                  const active = selectedProductSlug === p.slug;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => onPickProduct(p.slug)}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-xl border p-3 transition-all',
                        active
                          ? 'border-studio-brand bg-studio-brand text-white'
                          : 'border-studio-ink-3 bg-studio-ink/50 text-studio-fg-inv-mute hover:bg-studio-ink-3',
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                      <span className="mt-2 text-[10px] font-medium">{t(p.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel label={t('studio.panel.templates')} accent>
              <div className="flex flex-col gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onApplyTemplate(tpl)}
                    className="rounded-lg border border-studio-ink-3 bg-studio-ink/50 px-3 py-2 text-left text-xs font-medium text-studio-fg-inv-mute transition-colors hover:bg-studio-ink-3 hover:text-white"
                  >
                    {t(tpl.labelKey)}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel label={t('studio.panel.profile')}>
              <div className="flex flex-col gap-2">
                <ProfileChoice
                  active={materialKey === 'alumil'}
                  onClick={() => setMaterialKey('alumil')}
                  title={t('studio.profile.alumil.title')}
                  sub={t('studio.profile.alumil.sub')}
                />
                <ProfileChoice
                  active={materialKey === 'rehau'}
                  onClick={() => setMaterialKey('rehau')}
                  title={t('studio.profile.rehau.title')}
                  sub={t('studio.profile.rehau.sub')}
                />
              </div>
            </Panel>
          </aside>
        ) : null}

        {/* Right panel: parameters / sections */}
        {showPanels ? (
          <aside className="absolute right-6 top-24 z-30 flex max-h-[calc(100vh-8rem)] w-80 flex-col gap-4 overflow-y-auto pb-10">
            <Panel label={t('studio.panel.parameters')}>
              <div className="space-y-4">
                <DimensionSlider
                  label={t('studio.params.width')}
                  value={dimensions.widthCm}
                  min={productType?.constraints.minWidthCm ?? 50}
                  max={productType?.constraints.maxWidthCm ?? 400}
                  onChange={(v) => setDimensions({ widthCm: v })}
                />
                <DimensionSlider
                  label={t('studio.params.height')}
                  value={dimensions.heightCm}
                  min={productType?.constraints.minHeightCm ?? 50}
                  max={productType?.constraints.maxHeightCm ?? 400}
                  onChange={(v) => setDimensions({ heightCm: v })}
                />
              </div>
            </Panel>

            <Panel label={t('studio.panel.distribution')}>
              <SectionsControl
                count={panes.length}
                onChange={onSetSections}
                max={paneMaxFor(selectedProductSlug)}
              />

              {panes.length === 2 ? (
                <div className="mt-5 rounded-xl border border-studio-ink-3/60 bg-studio-ink/40 p-3">
                  <div className="mb-2 flex justify-between text-xs text-studio-fg-inv-soft">
                    <span>{t('studio.params.left')}</span>
                    <span>{t('studio.params.right')}</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={80}
                    value={Math.round((panes[0]?.widthRatio ?? 0.5) * 100)}
                    onChange={(e) => onSetWeightLR(parseInt(e.target.value, 10))}
                    className="mb-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-studio-ink-3 accent-studio-brand"
                  />
                  <div className="flex justify-between font-mono text-xs font-bold tabular-nums text-studio-brand-soft">
                    <span>{Math.round((panes[0]?.widthRatio ?? 0.5) * dimensions.widthCm)}{t('common.units.cm')}</span>
                    <span>{Math.round((panes[1]?.widthRatio ?? 0.5) * dimensions.widthCm)}{t('common.units.cm')}</span>
                  </div>
                </div>
              ) : null}

              {panes.length === 3 ? (
                <div className="mt-5 rounded-xl border border-studio-ink-3/60 bg-studio-ink/40 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-studio-fg-inv-soft">
                    {t('studio.params.proportions')}
                  </p>
                  <div className="grid gap-2">
                    <PresetChip
                      active={Math.abs((panes[0]?.widthRatio ?? 0) - 1 / 3) < 0.02}
                      onClick={() => onSetThreeWeights('equal')}
                      label={t('studio.params.equal3')}
                    />
                    <PresetChip
                      active={Math.abs((panes[1]?.widthRatio ?? 0) - 0.5) < 0.02}
                      onClick={() => onSetThreeWeights('wide-middle')}
                      label={t('studio.params.wideMiddle')}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <p className="mb-2 text-xs text-studio-fg-inv-mute">{t('studio.params.openings')}</p>
                <div className="grid grid-cols-1 gap-2">
                  {panes.map((p, i) => (
                    <PaneOpeningRow
                      key={p.position}
                      index={i}
                      pane={p}
                      onChange={(key) => onSetPaneOpening(i, key)}
                      productSlug={selectedProductSlug}
                    />
                  ))}
                </div>
              </div>
            </Panel>
          </aside>
        ) : null}

        {/* Order overlay */}
        {orderOpen ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-studio-ink/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-studio-fg">
                {t('studio.order.thanksTitle')}
              </h2>
              <p className="mb-6 text-sm text-studio-fg-mute">{t('studio.order.thanksBody')}</p>
              <button
                type="button"
                onClick={() => setOrderOpen(false)}
                className="w-full rounded-xl bg-studio-fg py-3 font-bold text-white transition-colors hover:bg-studio-ink-2"
              >
                {t('studio.order.close')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function paneMaxFor(slug: ProductSlug): number {
  switch (slug) {
    case 'door':
      return 2;
    case 'sliding':
      return 4;
    case 'panoramic':
      return 6;
    case 'balcony':
      return 4;
    case 'window':
    default:
      return 4;
  }
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

type PanelProps = {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
};

function Panel({ label, accent, children }: PanelProps) {
  return (
    <div className="rounded-2xl border border-studio-ink-3/50 bg-studio-ink-2/80 p-4 shadow-2xl backdrop-blur-md">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-studio-fg-inv-soft">
        {accent ? <LayoutGrid className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </p>
      {children}
    </div>
  );
}

type ProfileChoiceProps = {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
};

function ProfileChoice({ active, onClick, title, sub }: ProfileChoiceProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition-all',
        active
          ? 'border-studio-brand bg-studio-ink-3 text-white'
          : 'border-studio-ink-3 bg-studio-ink/50 text-studio-fg-inv-mute hover:bg-studio-ink-3',
      )}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span className="mt-1 block text-xs opacity-70">{sub}</span>
    </button>
  );
}

type DimensionSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
};

function DimensionSlider({ label, value, min, max, onChange }: DimensionSliderProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-studio-fg-inv-mute">
        <span>{label}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(parseInt(e.target.value || '0', 10), min, max))}
          className="w-16 rounded border border-studio-ink-3 bg-studio-ink py-1 text-center font-mono text-studio-brand-soft outline-none"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-studio-ink-3 accent-studio-brand"
      />
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

type SectionsControlProps = {
  count: number;
  onChange: (n: number) => void;
  max: number;
};

function SectionsControl({ count, onChange, max }: SectionsControlProps) {
  const options = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div>
      <p className="mb-2 text-xs text-studio-fg-inv-mute">{useTranslation().t('studio.params.sections')}</p>
      <div className="flex gap-1 rounded-lg bg-studio-ink p-1">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-bold transition-all',
              count === n
                ? 'bg-studio-brand text-white'
                : 'text-studio-fg-inv-mute hover:bg-studio-ink-3',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

type PresetChipProps = { active: boolean; onClick: () => void; label: string };

function PresetChip({ active, onClick, label }: PresetChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border py-1.5 text-xs transition-colors',
        active
          ? 'border-studio-brand bg-studio-brand/20 text-studio-brand-soft'
          : 'border-studio-ink-3 bg-studio-ink-2 text-studio-fg-inv-mute hover:bg-studio-ink-3',
      )}
    >
      {label}
    </button>
  );
}

type ViewToggleProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
};

function ViewToggle({ active, onClick, label, icon }: ViewToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
        active ? 'bg-studio-brand text-white' : 'text-studio-fg-inv-mute hover:text-white',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

type PaneOpeningRowProps = {
  index: number;
  pane: ConfigurationPaneInput;
  onChange: (key: OpeningKey) => void;
  productSlug: ProductSlug;
};

function PaneOpeningRow({ index, pane, onChange, productSlug }: PaneOpeningRowProps) {
  const { t } = useTranslation();
  const current = storeToOpeningKey(pane.openingType, pane.hingeSide ?? null);
  const isDoor = productSlug === 'door' || productSlug === 'balcony';
  const isSliding = productSlug === 'sliding' || productSlug === 'panoramic';

  const options: ReadonlyArray<{ key: OpeningKey; labelKey: string }> = useMemo(() => {
    if (isSliding) {
      return [
        { key: 'fixed', labelKey: 'studio.opening.fixed' },
        { key: 'slide-left', labelKey: 'studio.opening.slideLeft' },
        { key: 'slide-right', labelKey: 'studio.opening.slideRight' },
      ];
    }
    if (isDoor) {
      return [
        { key: 'fixed', labelKey: 'studio.opening.fixed' },
        { key: 'door-left', labelKey: 'studio.opening.doorLeft' },
        { key: 'door-right', labelKey: 'studio.opening.doorRight' },
        { key: 'tilt-turn-left', labelKey: 'studio.opening.tiltTurnLeft' },
        { key: 'tilt-turn-right', labelKey: 'studio.opening.tiltTurnRight' },
      ];
    }
    return [
      { key: 'fixed', labelKey: 'studio.opening.fixed' },
      { key: 'tilt', labelKey: 'studio.opening.tilt' },
      { key: 'turn-left', labelKey: 'studio.opening.turnLeft' },
      { key: 'turn-right', labelKey: 'studio.opening.turnRight' },
      { key: 'tilt-turn-left', labelKey: 'studio.opening.tiltTurnLeft' },
      { key: 'tilt-turn-right', labelKey: 'studio.opening.tiltTurnRight' },
    ];
  }, [isDoor, isSliding]);

  return (
    <div className="rounded-lg border border-studio-ink-3/60 bg-studio-ink/40 p-2">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-studio-fg-inv-soft">
        {t('studio.params.paneN', { n: index + 1 })}
      </p>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as OpeningKey)}
        className="w-full rounded-md border border-studio-ink-3 bg-studio-ink-2 px-2 py-1.5 text-xs font-medium text-studio-fg-inv-mute outline-none focus:border-studio-brand"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {t(o.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}

function storeToOpeningKey(opening: PaneOpeningType, hinge: HingeSide | null): OpeningKey {
  switch (opening) {
    case 'Fixed':
      return 'fixed';
    case 'Tilt':
      return 'tilt';
    case 'Casement':
      return hinge === 'Left' ? 'turn-left' : 'turn-right';
    case 'TiltAndTurn':
      return hinge === 'Left' ? 'tilt-turn-left' : 'tilt-turn-right';
    case 'Sliding':
      return hinge === 'Left' ? 'slide-left' : 'slide-right';
    default:
      return 'fixed';
  }
}
