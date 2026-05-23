import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Box,
  Check,
  DoorOpen,
  GalleryHorizontal,
  LayoutGrid,
  Minus,
  Move,
  PanelsTopLeft,
  Plus,
  Ruler,
  Square,
  Wind,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import {
  fetchProductTypeDetail,
  useProductTypes,
} from '@/features/catalog/api';
import {
  useColorsByMaterial,
  useConfiguratorPrice,
  useGlassTypesByMaterial,
  useMaterialsByProductType,
  type ColorOption,
} from '@/features/configurator/api';
import {
  paneRangeFor,
  useConfiguratorStore,
} from '@/features/configurator/store';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';

import {
  WindowPreviewSvg,
  type PreviewOpening,
  type SectionSetup,
  type SectionSlot,
} from './WindowPreviewSvg';

type ProductSlug = 'window' | 'door' | 'sliding' | 'panoramic' | 'balcony';

const PRODUCT_BOUNDS: Record<ProductSlug, { minW: number; maxW: number; minH: number; maxH: number; defaultW: number; defaultH: number }> = {
  window: { minW: 50, maxW: 300, minH: 50, maxH: 250, defaultW: 143, defaultH: 120 },
  door: { minW: 70, maxW: 180, minH: 180, maxH: 240, defaultW: 90, defaultH: 210 },
  sliding: { minW: 120, maxW: 400, minH: 100, maxH: 260, defaultW: 240, defaultH: 220 },
  panoramic: { minW: 150, maxW: 400, minH: 120, maxH: 300, defaultW: 280, defaultH: 240 },
  balcony: { minW: 100, maxW: 400, minH: 150, maxH: 260, defaultW: 200, defaultH: 230 },
};

const MATERIAL_BY_FAMILY: Record<ProductSlug, Record<'aluminum' | 'pvc', string>> = {
  window: { aluminum: 'aluminum-thermal', pvc: 'pvc-white' },
  door: { aluminum: 'aluminum-thermal', pvc: 'pvc-white' },
  sliding: { aluminum: 'aluminum-thermal', pvc: 'pvc-white' },
  panoramic: { aluminum: 'aluminum-thermal', pvc: 'pvc-white' },
  balcony: { aluminum: 'aluminum-thermal', pvc: 'pvc-white' },
};

const PRODUCT_TABS: Array<{ slug: ProductSlug; label: string; icon: typeof Square }> = [
  { slug: 'window', label: 'ფანჯარა', icon: Square },
  { slug: 'door', label: 'კარი', icon: DoorOpen },
  { slug: 'sliding', label: 'სალასკა', icon: GalleryHorizontal },
  { slug: 'panoramic', label: 'პანორამა', icon: PanelsTopLeft },
  { slug: 'balcony', label: 'აივანი', icon: LayoutGrid },
];

const OPENINGS: Array<{ id: PreviewOpening; label: string; sub: string }> = [
  { id: 'Fixed', label: 'გლუვი', sub: 'არ იღება' },
  { id: 'Casement', label: 'გვერდითა', sub: 'კლასიკური' },
  { id: 'TiltAndTurn', label: 'ევრო', sub: 'გადახრა + გასაღება' },
  { id: 'Sliding', label: 'მოძრავი', sub: 'სლაიდი' },
];

function defaultOpeningFor(slug: ProductSlug): PreviewOpening {
  if (slug === 'sliding') return 'Sliding';
  if (slug === 'door') return 'Casement';
  return 'TiltAndTurn';
}

function buildDefaultSection(
  slug: ProductSlug,
  widthRatio: number,
  index: number,
): SectionSetup {
  const opening = defaultOpeningFor(slug);
  return {
    widthRatio,
    opening,
    hinge: index % 2 === 0 ? 'Right' : 'Left',
    hasTransom: false,
    transomHeightRatio: 0.3,
    transomOpening: 'Fixed',
    transomHinge: 'Right',
  };
}

function buildDefaultSections(count: number, slug: ProductSlug): SectionSetup[] {
  const r = 1 / count;
  return Array.from({ length: count }, (_, i) => buildDefaultSection(slug, r, i));
}

function normalizeWidths(sections: SectionSetup[]): SectionSetup[] {
  const sum = sections.reduce((s, sec) => s + sec.widthRatio, 0) || 1;
  return sections.map((sec) => ({ ...sec, widthRatio: sec.widthRatio / sum }));
}

function resizeSections(
  prev: SectionSetup[],
  target: number,
  slug: ProductSlug,
): SectionSetup[] {
  if (target === prev.length) return prev;
  if (target < prev.length) {
    return normalizeWidths(prev.slice(0, target));
  }
  // Adding: take width from existing sections evenly, give new ones equal slices.
  const newCount = target;
  const oldCount = prev.length;
  const scale = oldCount / newCount; // shrink existing sections proportionally
  const adjusted = prev.map((sec) => ({ ...sec, widthRatio: sec.widthRatio * scale }));
  const extras: SectionSetup[] = Array.from({ length: target - prev.length }, (_, i) =>
    buildDefaultSection(slug, 1 / newCount, prev.length + i),
  );
  return normalizeWidths([...adjusted, ...extras]);
}

const GLASS_TIERS = [
  {
    id: 'basic' as const,
    label: 'ორმაგი',
    sub: '4-16-4 mm',
    badge: 'სტანდარტი',
    glassIndex: 0,
  },
  {
    id: 'comfort' as const,
    label: 'ენერგო',
    sub: 'Low-E coating',
    badge: 'რეკომენდებული',
    glassIndex: 1,
  },
  {
    id: 'premium' as const,
    label: 'ტრიპლექსი',
    sub: '4-12-4-12-4 mm',
    badge: 'პრემიუმი',
    glassIndex: 2,
  },
];

const easeOut = [0.16, 1, 0.3, 1] as const;

const TAB_LABELS = {
  ka: {
    product: 'ტიპი',
    dimensions: 'ზომები',
    material: 'მასალა',
    glass: 'მინა',
    qty: 'რაოდენობა',
  },
  en: {
    product: 'Type',
    dimensions: 'Size',
    material: 'Material',
    glass: 'Glass',
    qty: 'Qty',
  },
  ru: {
    product: 'Тип',
    dimensions: 'Размеры',
    material: 'Материал',
    glass: 'Стекло',
    qty: 'Кол-во',
  },
};

export function Estimator({ t, isActive = false }: { t: TFunction; isActive?: boolean }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) ?? 'ka') as 'ka' | 'en' | 'ru';

  // ── Local UI state ──────────────────────────────────────────────
  const [mobileActiveTab, setMobileActiveTab] = useState<'product' | 'dimensions' | 'material' | 'glass' | 'qty' | null>(null);
  const [activeProduct, setActiveProduct] = useState<ProductSlug>('window');
  const [materialFamily, setMaterialFamily] = useState<'aluminum' | 'pvc'>('pvc');
  const [width, setWidth] = useState(PRODUCT_BOUNDS.window.defaultW);
  const [height, setHeight] = useState(PRODUCT_BOUNDS.window.defaultH);
  const [colorSlug, setColorSlug] = useState<string | null>(null);
  const [glassTier, setGlassTier] = useState<'basic' | 'comfort' | 'premium'>('comfort');
  const [sections, setSections] = useState<SectionSetup[]>(() =>
    buildDefaultSections(2, 'window'),
  );
  const [quantity, setQuantity] = useState(1);

  const range = paneRangeFor(activeProduct);
  const canAddSection = sections.length < range.max;
  const canRemoveSection = sections.length > range.min;

  const setSectionCount = (n: number) =>
    setSections((prev) => resizeSections(prev, n, activeProduct));

  const handleSectionChange = (
    index: number,
    slot: SectionSlot,
    next: { opening: PreviewOpening; hinge: 'Left' | 'Right' },
  ) =>
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (slot === 'transom') {
          return { ...s, transomOpening: next.opening, transomHinge: next.hinge };
        }
        return { ...s, opening: next.opening, hinge: next.hinge };
      }),
    );

  const handleToggleTransom = (index: number) =>
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, hasTransom: !s.hasTransom } : s)),
    );

  const handleResizeMullion = (leftIndex: number, newLeftRatio: number) =>
    setSections((prev) => {
      if (leftIndex < 0 || leftIndex + 1 >= prev.length) return prev;
      const left = prev[leftIndex]!;
      const right = prev[leftIndex + 1]!;
      const sumLR = left.widthRatio + right.widthRatio;
      const clamped = Math.max(0.08, Math.min(sumLR - 0.08, newLeftRatio));
      return prev.map((s, i) => {
        if (i === leftIndex) return { ...s, widthRatio: clamped };
        if (i === leftIndex + 1) return { ...s, widthRatio: sumLR - clamped };
        return s;
      });
    });

  const handleResizeTransom = (index: number, newHeightRatio: number) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, transomHeightRatio: Math.max(0.18, Math.min(0.5, newHeightRatio)) }
          : s,
      ),
    );

  const handleDeleteSection = (index: number) =>
    setSections((prev) => {
      if (prev.length <= range.min) return prev;
      const next = prev.filter((_, i) => i !== index);
      return normalizeWidths(next);
    });

  const applyOpeningToAll = (opening: PreviewOpening) =>
    setSections((prev) =>
      prev.map((s, i) => ({
        ...s,
        opening,
        hinge:
          opening === 'Fixed' || opening === 'Sliding'
            ? s.hinge
            : i % 2 === 0
              ? 'Right'
              : 'Left',
      })),
    );
  const applyHingeToAll = (hinge: 'Left' | 'Right') =>
    setSections((prev) =>
      prev.map((s, i) => ({
        ...s,
        hinge: i % 2 === 0 ? hinge : hinge === 'Right' ? 'Left' : 'Right',
      })),
    );

  // Dominant opening across sections — drives the global picker highlight
  const dominantOpening: PreviewOpening = useMemo(() => {
    const tally = new Map<PreviewOpening, number>();
    for (const s of sections) tally.set(s.opening, (tally.get(s.opening) ?? 0) + 1);
    let best: PreviewOpening = sections[0]?.opening ?? 'TiltAndTurn';
    let bestCount = 0;
    for (const [k, v] of tally) {
      if (v > bestCount) {
        best = k;
        bestCount = v;
      }
    }
    return best;
  }, [sections]);
  const allSameOpening = sections.every((s) => s.opening === sections[0]?.opening);
  const dominantHinge: 'Left' | 'Right' = sections[0]?.hinge ?? 'Right';

  // ── Catalog data ────────────────────────────────────────────────
  const productTypesQuery = useProductTypes();
  const selectedPt = productTypesQuery.data?.find((p) => p.slug === activeProduct);

  const materialsQuery = useMaterialsByProductType(selectedPt?.id);
  const targetMaterialSlug = MATERIAL_BY_FAMILY[activeProduct][materialFamily];
  const selectedMaterial =
    materialsQuery.data?.find((m) => m.slug === targetMaterialSlug) ?? materialsQuery.data?.[0];

  const colorsQuery = useColorsByMaterial(selectedMaterial?.id);
  const glassQuery = useGlassTypesByMaterial(selectedMaterial?.id);

  const selectedColor: ColorOption | undefined =
    colorsQuery.data?.find((c) => c.slug === colorSlug) ?? colorsQuery.data?.[0];

  const selectedGlass = useMemo(() => {
    if (!glassQuery.data || glassQuery.data.length === 0) return null;
    const tierIndex = GLASS_TIERS.findIndex((g) => g.id === glassTier);
    const wanted = GLASS_TIERS[tierIndex]?.glassIndex ?? 0;
    return glassQuery.data[Math.min(wanted, glassQuery.data.length - 1)] ?? null;
  }, [glassQuery.data, glassTier]);

  // ── Side effects: keep dimensions + sections valid on product change ─
  useEffect(() => {
    const bounds = PRODUCT_BOUNDS[activeProduct];
    setWidth(bounds.defaultW);
    setHeight(bounds.defaultH);
    const r = paneRangeFor(activeProduct);
    const targetCount = Math.min(Math.max(r.defaultCount, r.min), r.max);
    setSections(buildDefaultSections(targetCount, activeProduct));
  }, [activeProduct]);

  // First color load → adopt default (white)
  useEffect(() => {
    if (!colorSlug && colorsQuery.data && colorsQuery.data.length > 0) {
      const def = colorsQuery.data.find((c) => c.isDefault) ?? colorsQuery.data[0];
      setColorSlug(def.slug ?? null);
    }
  }, [colorsQuery.data, colorSlug]);

  // ── Pricing ─────────────────────────────────────────────────────
  const debouncedWidth = useDebouncedValue(width, 220);
  const debouncedHeight = useDebouncedValue(height, 220);
  // Stable signature: any change to any section's opening/hinge/transom/width
  // triggers a re-quote ~180ms later.
  const sectionsSig = sections
    .map(
      (s) =>
        `${s.opening}:${s.hinge}:${s.widthRatio.toFixed(3)}:${
          s.hasTransom ? `T${s.transomOpening}:${s.transomHinge}:${s.transomHeightRatio.toFixed(2)}` : '-'
        }`,
    )
    .join('|');
  const debouncedSectionsSig = useDebouncedValue(sectionsSig, 180);

  const priceReq = useMemo(() => {
    if (!selectedPt?.id || !selectedMaterial?.id) return null;
    // Renormalize widthRatios to sum to 1.0 with proper rounding so the
    // BACK layout validator accepts the payload.
    const sum = sections.reduce((s, sec) => s + sec.widthRatio, 0) || 1;
    const wirePanes = sections.map((s, i) => {
      const ratio =
        i === sections.length - 1
          ? Number(
              (
                1 -
                sections.slice(0, -1).reduce((acc, x) => acc + Number((x.widthRatio / sum).toFixed(4)), 0)
              ).toFixed(4),
            )
          : Number((s.widthRatio / sum).toFixed(4));
      return {
        position: i + 1,
        widthRatio: ratio,
        openingType: s.opening,
        hingeSide:
          s.opening === 'Casement' || s.opening === 'TiltAndTurn' ? s.hinge : null,
        hasMosquitoNet: false,
        glassTypeId: selectedGlass?.id ?? null,
        glassExtras: [],
        hasTransom: s.hasTransom,
        transomOpeningType: s.hasTransom ? s.transomOpening : null,
        transomHingeSide:
          s.hasTransom && (s.transomOpening === 'Casement' || s.transomOpening === 'TiltAndTurn')
            ? s.transomHinge
            : null,
        transomHeightRatio: s.hasTransom ? s.transomHeightRatio : 0.3,
      };
    });
    return {
      productTypeId: selectedPt.id,
      materialId: selectedMaterial.id,
      widthCm: debouncedWidth,
      heightCm: debouncedHeight,
      panes: wirePanes,
      color: selectedColor?.id
        ? {
            outerColorOptionId: selectedColor.id,
            innerColorOptionId: null,
            customRalHex: null,
            customRalCode: null,
          }
        : undefined,
    };
    // sectionsSig gates re-quotes via the debounce; `sections` provides the
    // wire values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedPt?.id,
    selectedMaterial?.id,
    debouncedWidth,
    debouncedHeight,
    debouncedSectionsSig,
    selectedGlass?.id,
    selectedColor?.id,
  ]);

  const priceQuery = useConfiguratorPrice(priceReq);
  const unitPrice = priceQuery.data?.totalMinor != null ? priceQuery.data.totalMinor / 100 : null;
  const totalPrice = unitPrice != null ? unitPrice * quantity : null;
  const isLoadingPrice = priceQuery.isPending || priceQuery.isFetching;

  // ── "Open 3D" hand-off ──────────────────────────────────────────
  const handleOpenConfigurator = async () => {
    if (!selectedPt?.id || !selectedMaterial?.id) {
      navigate('/configurator');
      return;
    }
    try {
      const detail = await fetchProductTypeDetail(selectedPt.id);
      const store = useConfiguratorStore.getState();
      store.setProductType({
        id: detail.id!,
        slug: detail.slug!,
        name: detail.name?.ka ?? detail.slug!,
        constraints: {
          minWidthCm: detail.constraints?.minWidthCm ?? 50,
          maxWidthCm: detail.constraints?.maxWidthCm ?? 400,
          minHeightCm: detail.constraints?.minHeightCm ?? 50,
          maxHeightCm: detail.constraints?.maxHeightCm ?? 400,
        },
      });
      store.setMaterial({
        id: selectedMaterial.id!,
        slug: selectedMaterial.slug!,
        name: selectedMaterial.name?.ka ?? selectedMaterial.slug!,
        family: selectedMaterial.family === 'aluminum' ? 'aluminum' : 'pvc',
        thermalRating:
          selectedMaterial.thermalRating === 'thermal'
            ? 'thermal'
            : selectedMaterial.thermalRating === 'highthermal'
              ? 'highThermal'
              : selectedMaterial.thermalRating === 'basic'
                ? 'basic'
                : 'none',
        basePricePerSqmMinor: selectedMaterial.basePricePerSqmMinor ?? 0,
        currency: selectedMaterial.currency ?? 'GEL',
      });
      store.setDimensions({ widthCm: width, heightCm: height });
      store.setPaneCount(sections.length);
      // Push custom widths + per-section opening/hinge/glass/transom from local state
      const sumW = sections.reduce((s, sec) => s + sec.widthRatio, 0) || 1;
      store.setPaneRatios(sections.map((s) => s.widthRatio / sumW));
      for (let i = 0; i < sections.length; i++) {
        const pos = i + 1;
        const s = sections[i]!;
        store.setPaneOpening(pos, s.opening);
        if (s.opening === 'Casement' || s.opening === 'TiltAndTurn') {
          store.setPaneHinge(pos, s.hinge);
        } else {
          store.setPaneHinge(pos, null);
        }
        if (selectedGlass?.id) {
          store.setPaneGlass(pos, selectedGlass.id);
        }
        if (s.hasTransom) {
          store.setPaneTransom(pos, true);
          store.setPaneTransomOpening(
            pos,
            s.transomOpening,
            s.transomOpening === 'Casement' || s.transomOpening === 'TiltAndTurn'
              ? s.transomHinge
              : null,
          );
        } else {
          store.setPaneTransom(pos, false);
        }
      }
      if (selectedColor?.id) {
        store.setOuterColor(selectedColor.id);
      }
      navigate('/configurator');
    } catch {
      navigate('/configurator');
    }
  };

  const bounds = PRODUCT_BOUNDS[activeProduct];
  const areaSqm = ((width * height) / 10_000).toFixed(2);
  const frameHex = selectedColor?.hexCode ?? '#F4F4F4';

  return (
    <section id="sec-estimator" className="snap-start snap-always h-full lg:h-auto lg:min-h-screen w-full flex flex-col justify-center py-4 sm:py-6 lg:py-10 bg-studio-ink text-white font-studio relative overflow-hidden lg:overflow-visible">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_85%,rgba(79,70,229,0.07),transparent_55%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full max-h-full lg:max-h-none flex flex-col justify-center overflow-hidden lg:overflow-visible">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, ease: easeOut }}
          className="mb-2 sm:mb-4 text-center flex-shrink-0"
        >
          <span className="mb-1 sm:mb-2 inline-block rounded-full border border-studio-brand/30 bg-studio-brand/15 px-3 py-0.5 sm:px-4 sm:py-1 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-studio-brand-soft backdrop-blur-md">
            ONLINE CALCULATOR · ZERO PHONE CALLS
          </span>
          <h2 className="mb-0.5 sm:mb-1 text-lg sm:text-2xl font-extrabold leading-tight md:text-4xl">
            {t('home.estimatorTitle')}
          </h2>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm font-light leading-relaxed text-slate-400 hidden sm:block">
            {t('home.estimatorSubtitle')}
          </p>
        </motion.div>

        {/* Widget */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, ease: easeOut }}
          className="grid grid-cols-1 overflow-visible rounded-3xl border border-studio-ink-3/60 bg-studio-ink-2/40 shadow-2xl backdrop-blur-xl lg:grid-cols-12"
        >
          {/* ── LEFT: Preview + dimensions + layout ───────────────── */}
          <div className="p-4 sm:p-5 lg:p-5 border-studio-ink-3/60 lg:border-r pb-40 lg:pb-5 flex flex-col justify-between min-h-[320px] lg:min-h-0 col-span-12 lg:col-span-6 overflow-visible">
            {/* Product type tabs */}
            <div className="mb-5 hidden lg:block">
              <SectionLabel>{t('home.calc.productLabel')}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeProduct === tab.slug;
                  return (
                    <button
                      key={tab.slug}
                      onClick={() => setActiveProduct(tab.slug)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm font-bold transition-all duration-200',
                        active
                          ? 'bg-studio-brand text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]'
                          : 'border border-studio-ink-3 bg-studio-ink/60 text-slate-400 hover:border-studio-brand/30 hover:text-white',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section controls */}
            <div className="mb-3.5 hidden lg:flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SectionLabel>
                  {t('home.calc.layoutLabel')}
                  <span className="ml-2 font-mono text-slate-500">
                    {sections.length} / {range.max}
                  </span>
                </SectionLabel>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-studio-ink-3 bg-studio-ink/60 p-1">
                <button
                  onClick={() => setSectionCount(sections.length - 1)}
                  disabled={!canRemoveSection}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-studio-ink-3 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  aria-label="სექციის წაშლა"
                  title="−"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[28px] text-center font-mono text-sm font-bold text-white">
                  {sections.length}
                </span>
                <button
                  onClick={() => setSectionCount(sections.length + 1)}
                  disabled={!canAddSection}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-studio-ink-3 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  aria-label="სექციის დამატება"
                  title="+"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Live preview — click panes to set opening, drag mullions to resize */}
            <div className="mb-3 rounded-2xl border border-studio-ink-3/60 bg-gradient-to-b from-slate-950/60 to-studio-ink/40 p-3 sm:p-6 lg:p-4 min-h-[260px] sm:min-h-[340px] lg:min-h-[280px] lg:max-h-[360px] flex-1 flex items-center justify-center overflow-visible relative">
              <WindowPreviewSvg
                widthCm={width}
                heightCm={height}
                sections={sections}
                frameHex={frameHex}
                onSectionChange={handleSectionChange}
                onToggleTransom={handleToggleTransom}
                onResizeMullion={handleResizeMullion}
                onResizeTransom={handleResizeTransom}
                onDeleteSection={handleDeleteSection}
                canDelete={canRemoveSection}
                className="max-h-[230px] sm:max-h-[320px] lg:max-h-[320px] w-full"
              />
            </div>
            <p className="mb-4 text-center text-[11px] text-slate-500 hidden lg:block">
              💡 დააწექი სექციას — გაღება / ჰორიზონტ. ტიხარი · გადააადგილე ტიხრები მაუსით
            </p>
          </div>

          {/* ── RIGHT: Material, color, glass, opening, qty, price ─ */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-x-5 gap-y-3.5 p-5 lg:col-span-6 relative border-t lg:border-t-0 border-studio-ink-3/60">
            {/* Grid background texture */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px] opacity-[0.025]" />

            {/* Sub-column 1: Material, Glass, Opening Type */}
            <div className="flex flex-col gap-3.5 justify-between">
              {/* Profile Material */}
              <div className="relative">
                <SectionLabel>{t('home.calc.materialLabel')}</SectionLabel>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-studio-ink-3 bg-studio-ink/60 p-1">
                  <MaterialButton
                    active={materialFamily === 'aluminum'}
                    onClick={() => setMaterialFamily('aluminum')}
                    title="ALUMIL"
                    sub="ალუმინი"
                  />
                  <MaterialButton
                    active={materialFamily === 'pvc'}
                    onClick={() => setMaterialFamily('pvc')}
                    title="REHAU"
                    sub="მეტალოპლასტ."
                  />
                </div>
              </div>

              {/* Glass Tier */}
              <div className="relative">
                <SectionLabel>{t('home.calc.glassLabel')}</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {GLASS_TIERS.map((tier) => {
                    const active = glassTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        onClick={() => setGlassTier(tier.id)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-center transition-all duration-200',
                          active
                            ? 'border-studio-brand bg-studio-brand/15 shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                            : 'border-studio-ink-3 bg-studio-ink/60 hover:border-studio-brand/40',
                        )}
                      >
                        <span className={cn('block text-xs font-bold', active ? 'text-white' : 'text-slate-300')}>
                          {tier.label}
                        </span>
                        <span className="block font-mono text-[9px] text-slate-500">
                          {tier.sub.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opening Type */}
              <div className="relative">
                <div className="mb-1 flex items-center justify-between">
                  <SectionLabel>{t('home.calc.openingLabel')}</SectionLabel>
                  {!allSameOpening && (
                    <span className={cn("rounded-md bg-studio-brand/15 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider text-studio-brand-soft", lang === 'ka' ? '' : 'uppercase')}>
                      შერეული
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {OPENINGS.map((o) => {
                    const active = allSameOpening && dominantOpening === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => applyOpeningToAll(o.id)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-all duration-200',
                          active
                            ? 'border-studio-brand bg-studio-brand/15'
                            : 'border-studio-ink-3 bg-studio-ink/60 hover:border-studio-brand/40',
                        )}
                        title="გამოიყენე ყველა სარკმელზე"
                      >
                        <OpeningIcon kind={o.id} active={active} />
                        <span className="flex flex-col">
                          <span className={cn('text-[11px] font-bold', active ? 'text-white' : 'text-slate-300')}>
                            {o.label}
                          </span>
                          <span className="font-mono text-[8px] text-slate-500 leading-none">{o.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {(dominantOpening === 'Casement' || dominantOpening === 'TiltAndTurn') && allSameOpening && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                    <span>ანჯამა:</span>
                    <button
                      onClick={() => applyHingeToAll('Left')}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 font-bold transition-colors',
                        dominantHinge === 'Left'
                          ? 'bg-studio-brand/20 text-studio-brand-soft'
                          : 'text-slate-500 hover:text-white',
                      )}
                    >
                      მარცხ.
                    </button>
                    <button
                      onClick={() => applyHingeToAll('Right')}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 font-bold transition-colors',
                        dominantHinge === 'Right'
                          ? 'bg-studio-brand/20 text-studio-brand-soft'
                          : 'text-slate-500 hover:text-white',
                      )}
                    >
                      მარჯვ.
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-column 2: Dimensions, Color, Qty, Receipt + CTA */}
            <div className="flex flex-col gap-3.5 justify-between">
              {/* Dimension inputs */}
              <div className="relative">
                <div className="grid grid-cols-2 gap-3.5">
                  <DimensionField
                    label={t('home.calc.widthLabel')}
                    value={width}
                    setValue={setWidth}
                    min={bounds.minW}
                    max={bounds.maxW}
                  />
                  <DimensionField
                    label={t('home.calc.heightLabel')}
                    value={height}
                    setValue={setHeight}
                    min={bounds.minH}
                    max={bounds.maxH}
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div className="relative">
                <SectionLabel>{t('home.calc.colorLabel')}</SectionLabel>
                <ColorPicker
                  colors={colorsQuery.data ?? []}
                  selectedSlug={colorSlug}
                  onPick={setColorSlug}
                  lang={lang}
                />
              </div>

              {/* Quantity */}
              <div className="relative">
                <SectionLabel>{t('home.calc.qtyLabel')}</SectionLabel>
                <div className="flex items-center gap-2 rounded-xl border border-studio-ink-3 bg-studio-ink/60 px-2 py-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-studio-ink-3 hover:text-white"
                    aria-label="შემცირება"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex-1 text-center font-mono text-lg font-bold tabular-nums text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-studio-ink-3 hover:text-white"
                    aria-label="გაზრდა"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Receipt + CTA card */}
              <div className="relative rounded-2xl border border-studio-ink-3/80 bg-gradient-to-b from-studio-ink/80 to-slate-950/40 p-3 flex flex-col justify-between flex-grow min-h-[140px]">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400 leading-none">
                    <span>ფართობი</span>
                    <span className="font-mono font-bold tabular-nums text-white">{areaSqm} მ²</span>
                  </div>
                  {quantity > 1 && unitPrice != null && (
                    <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400 leading-none">
                      <span>ერთეული</span>
                      <span className="font-mono font-bold tabular-nums text-slate-300">
                        {formatGel(unitPrice)} ₾
                      </span>
                    </div>
                  )}
                  <div className={cn("mt-1.5 mb-0.5 text-[10px] tracking-wider text-slate-500 leading-none", lang === 'ka' ? '' : 'uppercase')}>
                    {t('home.calc.priceLabel')}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="bg-gradient-to-r from-white via-studio-brand-soft to-indigo-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent tabular-nums drop-shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                      <AnimatedPrice value={totalPrice} loading={isLoadingPrice} />
                    </span>
                    <span className="text-base font-bold text-slate-400">₾</span>
                  </div>
                </div>

                <button
                  onClick={handleOpenConfigurator}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-studio-brand py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:bg-studio-brand-h active:scale-[0.98]"
                >
                  <Box className="h-4 w-4" aria-hidden />
                  <span>{t('home.calc.ctaPrimary')}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile Floating Bottom Price/CTA Drawer */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: isActive ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden flex flex-col border-t border-studio-ink-3 bg-studio-ink/95 backdrop-blur-xl shadow-2xl"
      >
        {/* Row 1: Compact price display & 3D button */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-studio-ink-3/40">
          <div className="flex flex-col">
            <span className={cn("text-[9px] font-bold tracking-wider text-slate-400", lang === 'ka' ? '' : 'uppercase')}>
              {t('home.calc.priceLabel')}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-extrabold tracking-tight text-white tabular-nums">
                <AnimatedPrice value={totalPrice} loading={isLoadingPrice} />
              </span>
              <span className="text-sm font-bold text-slate-400">₾</span>
            </div>
          </div>

          <button
            onClick={handleOpenConfigurator}
            className="flex items-center gap-1.5 rounded-xl bg-studio-brand px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:bg-studio-brand-h active:scale-[0.98]"
          >
            <Box className="h-3.5 w-3.5" aria-hidden />
            <span>{t('home.calc.ctaPrimary')}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {/* Row 2: 5 tab navigation items with small icons */}
        <div className="grid grid-cols-5 gap-1 bg-studio-ink-2/30 p-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
          {(['product', 'dimensions', 'material', 'glass', 'qty'] as const).map((tabId) => {
            const active = mobileActiveTab === tabId;
            const label = TAB_LABELS[lang][tabId];
            
            let Icon = Square;
            if (tabId === 'dimensions') Icon = Ruler;
            else if (tabId === 'material') Icon = PanelsTopLeft;
            else if (tabId === 'glass') Icon = Wind;
            else if (tabId === 'qty') Icon = Plus;

            return (
              <button
                key={tabId}
                onClick={() => setMobileActiveTab(tabId)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl py-1 px-0.5 transition-all duration-200 border',
                  active
                    ? 'bg-studio-brand/10 text-studio-brand-soft border-studio-brand/35 shadow-[0_0_12px_rgba(37,99,235,0.15)]'
                    : 'border-transparent text-slate-400 active:bg-white/5'
                )}
              >
                <Icon className="h-4 w-4 mb-0.5" />
                <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Mobile Slide-up Drawer for Controls */}
      <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-200 lg:hidden',
          mobileActiveTab !== null ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={mobileActiveTab === null}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileActiveTab(null)}
        />
        {/* Sheet Content */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-studio-ink-3 bg-studio-ink-2 px-4 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] shadow-2xl transition-transform duration-300 ease-out flex flex-col gap-5 text-white font-studio',
            mobileActiveTab !== null ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-studio-ink-3/40 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              {mobileActiveTab && TAB_LABELS[lang][mobileActiveTab]}
            </h3>
            <button
              onClick={() => setMobileActiveTab(null)}
              className="rounded-lg bg-studio-ink-3/50 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white"
            >
              დასრულება
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[50vh] pr-1">
            {mobileActiveTab === 'product' && (
              <div className="space-y-5">
                <div>
                  <SectionLabel>{t('home.calc.productLabel')}</SectionLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PRODUCT_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const active = activeProduct === tab.slug;
                      return (
                        <button
                          key={tab.slug}
                          onClick={() => setActiveProduct(tab.slug)}
                          className={cn(
                            'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200',
                            active
                              ? 'bg-studio-brand text-white shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                              : 'border border-studio-ink-3 bg-studio-ink/60 text-slate-400',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mt-2">
                    <SectionLabel>
                      {t('home.calc.layoutLabel')}
                      <span className="ml-2 font-mono text-slate-500">
                        {sections.length} / {range.max}
                      </span>
                    </SectionLabel>
                    <div className="flex items-center gap-1 rounded-xl border border-studio-ink-3 bg-studio-ink/60 p-1">
                      <button
                        onClick={() => setSectionCount(sections.length - 1)}
                        disabled={!canRemoveSection}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[28px] text-center font-mono text-sm font-bold text-white">
                        {sections.length}
                      </span>
                      <button
                        onClick={() => setSectionCount(sections.length + 1)}
                        disabled={!canAddSection}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors disabled:opacity-30"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mobileActiveTab === 'dimensions' && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <DimensionField
                  label={t('home.calc.widthLabel')}
                  value={width}
                  setValue={setWidth}
                  min={bounds.minW}
                  max={bounds.maxW}
                />
                <DimensionField
                  label={t('home.calc.heightLabel')}
                  value={height}
                  setValue={setHeight}
                  min={bounds.minH}
                  max={bounds.maxH}
                />
              </div>
            )}

            {mobileActiveTab === 'material' && (
              <div className="space-y-5">
                <div>
                  <SectionLabel>{t('home.calc.materialLabel')}</SectionLabel>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-studio-ink-3 bg-studio-ink/60 p-1 mt-2">
                    <MaterialButton
                      active={materialFamily === 'aluminum'}
                      onClick={() => setMaterialFamily('aluminum')}
                      title="ALUMIL"
                      sub="თბილი ალუმინი"
                    />
                    <MaterialButton
                      active={materialFamily === 'pvc'}
                      onClick={() => setMaterialFamily('pvc')}
                      title="REHAU"
                      sub="მეტალოპლასტმასი"
                    />
                  </div>
                </div>

                <div>
                  <SectionLabel>{t('home.calc.colorLabel')}</SectionLabel>
                  <div className="mt-2">
                    <ColorPicker
                      colors={colorsQuery.data ?? []}
                      selectedSlug={colorSlug}
                      onPick={setColorSlug}
                      lang={lang}
                    />
                  </div>
                </div>
              </div>
            )}

            {mobileActiveTab === 'glass' && (
              <div className="space-y-5">
                <div>
                  <SectionLabel>{t('home.calc.glassLabel')}</SectionLabel>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {GLASS_TIERS.map((tier) => {
                      const active = glassTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          onClick={() => setGlassTier(tier.id)}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-all duration-200',
                            active
                              ? 'border-studio-brand bg-studio-brand/15 shadow-[0_0_10px_rgba(37,99,235,0.15)]'
                              : 'border-studio-ink-3 bg-studio-ink/60',
                          )}
                        >
                          <div className="flex flex-col">
                            <span className={cn('block text-sm font-bold', active ? 'text-white' : 'text-slate-300')}>
                              {tier.label}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                              {tier.sub}
                            </span>
                          </div>
                          {active && (
                            <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold tracking-wider text-studio-brand-soft", lang === 'ka' ? '' : 'uppercase')}>
                              <Check className="h-3 w-3" /> {tier.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between mt-2">
                    <SectionLabel>{t('home.calc.openingLabel')}</SectionLabel>
                    {!allSameOpening && (
                      <span className={cn("rounded-md bg-studio-brand/15 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-studio-brand-soft", lang === 'ka' ? '' : 'uppercase')}>
                        შერეული
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {OPENINGS.map((o) => {
                      const active = allSameOpening && dominantOpening === o.id;
                      return (
                        <button
                          key={o.id}
                          onClick={() => applyOpeningToAll(o.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
                            active
                              ? 'border-studio-brand bg-studio-brand/15'
                              : 'border-studio-ink-3 bg-studio-ink/60',
                          )}
                        >
                          <OpeningIcon kind={o.id} active={active} />
                          <span className="flex flex-col">
                            <span className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-300')}>
                              {o.label}
                            </span>
                            <span className="font-mono text-[9px] text-slate-500">{o.sub}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {mobileActiveTab === 'qty' && (
              <div>
                <SectionLabel>{t('home.calc.qtyLabel')}</SectionLabel>
                <div className="flex items-center gap-3 rounded-xl border border-studio-ink-3 bg-studio-ink/60 px-2 py-1.5 mt-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-studio-ink-3 hover:text-white"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-center font-mono text-2xl font-bold tabular-nums text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-studio-ink-3 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? 'ka';
  return (
    <div className={cn(
      "mb-3 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] text-studio-brand-soft",
      lang === 'ka' ? '' : 'uppercase'
    )}>
      {children}
    </div>
  );
}

function MaterialButton({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-2.5 text-left transition-all duration-200',
        active
          ? 'bg-studio-ink-2 shadow-lg ring-1 ring-studio-brand/30'
          : 'text-slate-400 hover:text-white',
      )}
    >
      <span className={cn('block font-mono text-[11px] font-bold tracking-wider', active ? 'text-studio-brand-soft' : 'text-slate-500')}>
        {title}
      </span>
      <span className={cn('mt-0.5 block text-xs', active ? 'text-white' : 'text-slate-400')}>
        {sub}
      </span>
    </button>
  );
}

function DimensionField({
  label,
  value,
  setValue,
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? 'ka';
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className={cn(
          "flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] text-studio-brand-soft",
          lang === 'ka' ? '' : 'uppercase'
        )}>
          <Ruler className="h-3.5 w-3.5" />
          {label}
        </span>
        <div className="flex items-center gap-1 rounded-md border border-studio-ink-3 bg-studio-ink/60 px-1.5">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isFinite(v)) setValue(Math.min(max, Math.max(min, v)));
            }}
            className="w-14 bg-transparent py-1 text-right font-mono text-sm font-bold tabular-nums text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-[10px] font-mono text-slate-500">სმ</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value, 10))}
        className="slider-touch w-full"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
        <span>{min} სმ</span>
        <span>{max} სმ</span>
      </div>
    </div>
  );
}

function ColorPicker({
  colors,
  selectedSlug,
  onPick,
  lang,
}: {
  colors: ColorOption[];
  selectedSlug: string | null;
  onPick: (slug: string) => void;
  lang: 'ka' | 'en' | 'ru';
}) {
  if (colors.length === 0) {
    return (
      <div className="rounded-xl border border-studio-ink-3 bg-studio-ink/60 p-4 text-center text-xs text-slate-500">
        იტვირთება...
      </div>
    );
  }

  // Limit to 8 most-common to keep widget compact; rest in 3D configurator.
  const list = colors.slice(0, 8);

  return (
    <div className="grid grid-cols-8 gap-1.5">
      {list.map((c) => {
        const active = selectedSlug === c.slug;
        const hex = c.hexCode ?? '#888';
        const label =
          (lang === 'en' && c.name?.en) ||
          (lang === 'ru' && c.name?.ru) ||
          c.name?.ka ||
          c.slug;
        const surcharge = c.surchargeMinor ?? 0;
        return (
          <button
            key={c.id}
            onClick={() => {
              if (c.slug) onPick(c.slug);
            }}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-xl border transition-all duration-200',
              active
                ? 'border-studio-brand ring-2 ring-studio-brand/40'
                : 'border-studio-ink-3 hover:border-studio-brand/50',
            )}
            aria-label={label ?? undefined}
            title={(label ?? '') + (surcharge > 0 ? ` (+${surcharge / 100} ₾)` : '')}
          >
            <span
              className="absolute inset-0"
              style={{
                background: c.woodTextureUrl
                  ? `${hex} url(${c.woodTextureUrl}) center/cover`
                  : hex,
              }}
            />
            {/* Glossy highlight */}
            <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            {active && (
              <span className="absolute bottom-1 right-1 rounded-full bg-studio-brand p-0.5 text-white shadow">
                <Check className="h-3 w-3" />
              </span>
            )}
            {surcharge > 0 && (
              <span className="absolute left-1 top-1 rounded-md bg-black/65 px-1 font-mono text-[9px] font-bold text-amber-300">
                +{surcharge / 100}₾
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function OpeningIcon({ kind, active }: { kind: PreviewOpening; active: boolean }) {
  const stroke = active ? '#60a5fa' : '#64748b';
  switch (kind) {
    case 'Fixed':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <rect x="3" y="3" width="16" height="16" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'Casement':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <rect x="3" y="3" width="16" height="16" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M3 3 L19 11 L3 19" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'TiltAndTurn':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <rect x="3" y="3" width="16" height="16" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M3 19 L11 5 L19 19" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'Sliding':
      return <Move className={cn('h-5 w-5', active ? 'text-studio-brand-soft' : 'text-slate-500')} aria-hidden />;
    default:
      return <Wind className="h-5 w-5 text-slate-500" aria-hidden />;
  }
}

function AnimatedPrice({ value, loading }: { value: number | null; loading: boolean }) {
  const [display, setDisplay] = useState<number | null>(null);

  useEffect(() => {
    if (value === null) {
      setDisplay(null);
      return;
    }
    if (display === null) {
      setDisplay(value);
      return;
    }
    const start = display;
    const end = value;
    const duration = 450;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  if (loading && display === null) return <span className="animate-pulse opacity-60">····</span>;
  if (display === null) return <span>—</span>;
  return <span>{formatGel(display)}</span>;
}

function formatGel(amount: number) {
  return new Intl.NumberFormat('ka-GE', { maximumFractionDigits: 0 }).format(amount);
}
