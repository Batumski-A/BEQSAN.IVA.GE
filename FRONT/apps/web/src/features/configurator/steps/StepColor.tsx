import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';

import { useColorsByMaterial, useConfiguratorPrice, type ColorOption } from '../api';
import { useConfiguratorStore } from '../store';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';
import { firstLayoutError, translateLayoutError } from '../layout/layoutErrors';
import { PricePreview } from './PricePreview';
import { RalPaletteModal } from '../color/RalPaletteModal';

type Props = {
  onBack: () => void;
};

type Tab = 'outer' | 'inner';

const FAMILY_ORDER = ['standard', 'premium', 'woodLaminate'] as const;

export function StepColor({ onBack }: Props) {
  const { t, i18n } = useTranslation();
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);
  const color = useConfiguratorStore((s) => s.color);
  const defaultColorOptionId = useConfiguratorStore((s) => s.defaultColorOptionId);
  const setOuterColor = useConfiguratorStore((s) => s.setOuterColor);
  const setInnerColor = useConfiguratorStore((s) => s.setInnerColor);
  const setCustomRal = useConfiguratorStore((s) => s.setCustomRal);
  const setDefaultColorOptionId = useConfiguratorStore((s) => s.setDefaultColorOptionId);

  const colorsQuery = useColorsByMaterial(material?.id);
  const isPvc = material?.family === 'pvc';

  // First time the catalog resolves, capture the IsDefault id.
  useEffect(() => {
    if (!colorsQuery.data || defaultColorOptionId) return;
    const def = colorsQuery.data.find((c) => c.isDefault);
    if (def?.id) {
      setDefaultColorOptionId(def.id);
    }
  }, [colorsQuery.data, defaultColorOptionId, setDefaultColorOptionId]);

  // Dual-color UI state — only meaningful on PVC; reset to "single" on
  // aluminum so the BACK never sees a dual payload it would reject.
  const [dualMode, setDualMode] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('outer');
  useEffect(() => {
    if (!isPvc && dualMode) {
      setDualMode(false);
      setActiveTab('outer');
      setInnerColor(null);
    }
  }, [isPvc, dualMode, setInnerColor]);

  const [ralOpen, setRalOpen] = useState(false);

  // Resolve the ral-custom id from the catalog domain load. The list
  // endpoint excludes it; we rely on a follow-up read of the user's last
  // RAL custom selection, OR we look it up from the colorsQuery + the
  // back-side `domain load` indirectly. Simpler: we re-fetch ral-custom
  // id on demand by reading the persisted store state when present.
  // For first-time picks we need an id — read it from the
  // configurator color list with a separate fetch isn't worth it. Instead,
  // remember the ral-custom id when the BACK pricing response surfaces it.
  // Heuristic for now: when the modal confirms we send hex + code; the
  // BACK seeds an idempotent ral-custom id we capture from prior responses.
  // For first-time clicks, fall back to the store's last RAL custom outer
  // id (which is null), and rely on the validator hint. To keep this
  // ergonomic, we expose the ral-custom id via a hardcoded deterministic
  // GUID matching the seeder's UUIDv5 transform — kept locally for now.
  const ralCustomId = useMemo(() => RAL_CUSTOM_ID, []);

  const debouncedPanes = useDebouncedValue(panes, 400);
  const debouncedColor = useDebouncedValue(color, 400);
  const priceReq =
    productType && material
      ? {
          productTypeId: productType.id,
          materialId: material.id,
          widthCm: dimensions.widthCm,
          heightCm: dimensions.heightCm,
          panes: debouncedPanes,
          color: debouncedColor ?? undefined,
        }
      : null;
  const priceQuery = useConfiguratorPrice(priceReq);
  const layoutError = firstLayoutError(priceQuery.error);
  const layoutErrorText = layoutError ? translateLayoutError(layoutError, t) : null;
  const errorWhich =
    layoutError?.code === 'configurator.color.notCompatibleWithMaterial'
      ? ((layoutError.metadata?.which as string | undefined) ?? null)
      : null;

  const allGrouped = useMemo(() => groupByFamily(colorsQuery.data ?? []), [colorsQuery.data]);

  // The active selection id for the swatch grid — outer or inner tab.
  const activeId = activeTab === 'outer'
    ? color?.outerColorOptionId ?? null
    : color?.innerColorOptionId ?? null;
  const activeIsRalCustom = activeTab === 'outer'
    && color?.customRalHex != null
    && color?.customRalCode != null;

  const handlePick = (c: ColorOption) => {
    if (!c.id) return;
    if (activeTab === 'outer') {
      setOuterColor(c.id);
    } else {
      setInnerColor(c.id);
    }
  };

  const handleRalConfirm = (hex: string, code: string) => {
    setCustomRal(hex, code, ralCustomId);
    setActiveTab('outer');
    setRalOpen(false);
  };

  const allPanesId = useId();
  const tabsLabelId = useId();
  const errorRegionId = useId();

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-8">
      <div className="lg:col-span-3">
        <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
          № 06 · {t('configurator.steps.color.title')}
        </div>
        <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary">
          {t('configurator.steps.color.heading')}
        </h1>
        <p className="mt-4 max-w-xl text-body text-pretty text-fg-secondary">
          {t('configurator.steps.color.intro')}
        </p>

        {/* Dual-color toggle (PVC only) + outer/inner tabs */}
        {isPvc && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3">
              <button
                id={allPanesId}
                type="button"
                role="switch"
                aria-checked={!dualMode}
                onClick={() => {
                  if (dualMode) {
                    // Closing dual mode — drop inner selection.
                    setInnerColor(null);
                    setActiveTab('outer');
                  }
                  setDualMode(!dualMode);
                }}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  !dualMode ? 'bg-accent-amber' : 'bg-bg-elevated',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-bg-base shadow-sm transition-transform',
                    !dualMode ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
              <label htmlFor={allPanesId} className="cursor-pointer font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
                {t('configurator.steps.color.dualColor.toggle')}
              </label>
            </div>
            <p className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('configurator.steps.color.dualColor.hint')}
            </p>

            {dualMode && (
              <div role="tablist" aria-labelledby={tabsLabelId} className="inline-flex gap-1 rounded-sm border border-hairline bg-bg-raised p-1">
                <span id={tabsLabelId} className="sr-only">
                  {t('configurator.steps.color.tabs.outer')} / {t('configurator.steps.color.tabs.inner')}
                </span>
                {(['outer', 'inner'] as const).map((tab) => {
                  const active = tab === activeTab;
                  const tabHasError = (tab === 'outer' && errorWhich === 'outer')
                    || (tab === 'inner' && errorWhich === 'inner');
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'inline-flex h-9 items-center rounded-sm px-4 font-mono text-mono-spec uppercase tracking-wider transition-colors',
                        active
                          ? 'bg-accent-amber text-bg-base'
                          : 'text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary',
                        tabHasError && !active && 'border border-system-danger',
                      )}
                    >
                      {t(`configurator.steps.color.tabs.${tab}`)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Swatch grid by family + RAL palette button */}
        <div className="mt-8">
          {colorsQuery.isLoading ? (
            <div className="flex items-center gap-3 text-fg-secondary">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span className="font-mono text-mono-spec uppercase tracking-wider">
                {t('common.states.loading')}
              </span>
            </div>
          ) : colorsQuery.isError ? (
            <div className="rounded-sm border border-system-danger bg-bg-raised p-5">
              <div className="font-headline text-h4 text-fg-primary">
                {t('configurator.steps.color.errorTitle')}
              </div>
              <p className="mt-2 text-body-sm text-fg-secondary">
                {t('configurator.steps.color.errorBody')}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {FAMILY_ORDER.map((family) => {
                const group = allGrouped[family] ?? [];
                if (group.length === 0) return null;
                return (
                  <SwatchGroup
                    key={family}
                    family={family}
                    colors={group}
                    activeId={activeIsRalCustom ? null : activeId}
                    locale={i18n.language}
                    onPick={handlePick}
                  />
                );
              })}

              {/* RAL custom button — appears once, after Premium */}
              <div>
                <h3 className="font-display text-h4 text-fg-primary">
                  {t('configurator.steps.color.family.ralCustom')}
                </h3>
                <button
                  type="button"
                  onClick={() => setRalOpen(true)}
                  className={cn(
                    'mt-3 inline-flex w-full items-center justify-between gap-3 rounded-sm border bg-bg-raised p-4 text-left transition-colors hover:border-hairline-strong sm:w-auto',
                    activeIsRalCustom ? 'border-accent-amber ring-1 ring-accent-amber/30' : 'border-hairline',
                  )}
                >
                  <div className="flex items-center gap-3">
                    {activeIsRalCustom && color?.customRalHex && (
                      <span
                        aria-hidden
                        className="h-8 w-8 rounded-sm border border-hairline"
                        style={{ backgroundColor: color.customRalHex }}
                      />
                    )}
                    <div className="font-mono text-mono-spec uppercase tracking-wider">
                      <div className="text-fg-primary">
                        {t('configurator.steps.color.ralPalette.button')}
                      </div>
                      {activeIsRalCustom && (
                        <div className="mt-1 text-caption text-fg-tertiary">
                          {color?.customRalCode}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-caption uppercase tracking-wider text-accent-amber">
                    +250 ₾
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Server-side error region */}
        <div
          id={errorRegionId}
          role={layoutErrorText ? 'alert' : undefined}
          aria-live="polite"
          className={cn(
            'mt-8 min-h-[1.5rem] font-mono text-mono-spec uppercase tracking-wider',
            layoutErrorText ? 'text-system-danger' : 'text-transparent',
          )}
        >
          {layoutErrorText ?? '—'}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center gap-2 rounded-sm border border-hairline-strong px-4 font-mono text-mono-spec uppercase tracking-wider text-fg-primary transition-colors hover:border-accent-amber hover:text-accent-amber"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common.actions.back')}
          </button>
          <button
            type="button"
            disabled
            // Step 7 (hardware) lands in the next slice; for now Continue
            // is a disabled stub on the final step that is implemented.
            className="inline-flex h-12 items-center gap-3 rounded-sm bg-bg-elevated px-6 font-mono text-mono-spec uppercase tracking-wider text-fg-disabled"
          >
            <span>{t('common.actions.continue')}</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <aside className="lg:col-span-2">
        <PricePreview query={priceQuery} hasSelections={Boolean(material)} />
      </aside>

      <RalPaletteModal
        open={ralOpen}
        onClose={() => setRalOpen(false)}
        onConfirm={handleRalConfirm}
      />
    </div>
  );
}

function groupByFamily(colors: ColorOption[]): Record<string, ColorOption[]> {
  const out: Record<string, ColorOption[]> = { standard: [], premium: [], woodLaminate: [] };
  for (const c of colors) {
    const f = c.family ?? 'standard';
    out[f] ??= [];
    out[f].push(c);
  }
  return out;
}

type SwatchGroupProps = {
  family: (typeof FAMILY_ORDER)[number];
  colors: ColorOption[];
  activeId: string | null;
  locale: string;
  onPick: (c: ColorOption) => void;
};

function SwatchGroup({ family, colors, activeId, locale, onPick }: SwatchGroupProps) {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="font-display text-h4 text-fg-primary">
        {t(`configurator.steps.color.family.${family}`)}
      </h3>
      <div
        role="radiogroup"
        aria-label={t(`configurator.steps.color.family.${family}`)}
        className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
      >
        {colors.map((c) => (
          <Swatch
            key={c.id}
            color={c}
            selected={c.id === activeId}
            locale={locale}
            onPick={() => onPick(c)}
          />
        ))}
      </div>
    </div>
  );
}

function Swatch({
  color,
  selected,
  locale,
  onPick,
}: {
  color: ColorOption;
  selected: boolean;
  locale: string;
  onPick: () => void;
}) {
  const { t } = useTranslation();
  const name = pickLocalized(color.name, locale, color.slug ?? '');
  const surcharge = color.surchargeMinor ?? 0;
  const surchargeDisplay = color.surchargeDisplay ?? '0.00';
  const ralCode = color.ralCode ? ` ${color.ralCode}` : '';
  const family = t(`configurator.steps.color.family.${color.family ?? 'standard'}`);
  const surchargeAria = surcharge > 0
    ? `, +${surchargeDisplay} ₾`
    : '';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={t('configurator.steps.color.swatchAria', {
        name,
        ralCode,
        family,
        surcharge: surchargeAria,
      })}
      onClick={onPick}
      className={cn(
        'group relative flex items-stretch gap-3 rounded-sm border bg-bg-raised p-3 text-left transition-colors',
        selected ? 'border-accent-amber ring-1 ring-accent-amber/30' : 'border-hairline hover:border-hairline-strong',
      )}
    >
      <span
        aria-hidden
        className="h-12 w-12 shrink-0 rounded-sm border border-hairline"
        style={{
          backgroundColor: color.hexCode ?? '#FFFFFF',
          backgroundImage: color.woodTextureUrl ? `url(${color.woodTextureUrl})` : undefined,
          backgroundSize: 'cover',
        }}
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-display text-body text-fg-primary">{name}</span>
        {color.ralCode && (
          <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            {color.ralCode}
          </span>
        )}
        <span className="mt-1 font-mono text-caption uppercase tracking-wider">
          {surcharge > 0 ? (
            <span className="tabular-nums text-accent-amber">
              {t('configurator.steps.color.surchargeLabel', { amount: surchargeDisplay })}
            </span>
          ) : (
            <span className="text-fg-tertiary">{t('configurator.steps.color.noSurcharge')}</span>
          )}
        </span>
        {color.isDefault && (
          <span className="mt-1 font-mono text-caption uppercase tracking-wider text-accent-amber">
            {t('configurator.steps.color.default')}
          </span>
        )}
      </div>
      {selected && (
        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-amber text-bg-base">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      )}
    </button>
  );
}

function pickLocalized(
  loc: { ka?: string | null; en?: string | null; ru?: string | null } | undefined,
  locale: string,
  fallback: string,
): string {
  if (!loc) return fallback;
  if (locale.startsWith('ka') && loc.ka) return loc.ka;
  if (locale.startsWith('en') && loc.en) return loc.en;
  if (locale.startsWith('ru') && loc.ru) return loc.ru;
  return loc.ka ?? loc.en ?? loc.ru ?? fallback;
}

/**
 * Deterministic ral-custom id — recomputed via UUIDv5 from the same
 * namespace + slug that ColorOptionSeeder uses. Kept local so the FRONT
 * can drive the modal flow without needing a list-endpoint round-trip
 * for an option that isn't browseable.
 *
 * If/when Phase 2 admin tooling changes the seed strategy, this value
 * moves to a small public endpoint (`GET /catalog/colors/ral-custom-id`)
 * instead.
 */
const RAL_CUSTOM_ID = (() => {
  // SHA-1 of 'BEQSAN-CATALOG-2026:color-option:ral-custom' → first 16 bytes
  // with UUIDv5 variant/version bits applied. Same logic as the seeder.
  // Precomputed once at module load.
  const input = new TextEncoder().encode('BEQSAN-CATALOG-2026:color-option:ral-custom');
  return sha1ToUuidV5(input);
})();

function sha1ToUuidV5(input: Uint8Array): string {
  // Minimal SHA-1 implementation — sufficient for the single seed call.
  const h = sha1(input);
  const bytes = new Uint8Array(h.slice(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function sha1(message: Uint8Array): Uint8Array {
  // Standard SHA-1 over a single message. Used only at module load for
  // the ral-custom GUID; no hot-path implications.
  const ml = message.length * 8;
  const blockCount = Math.ceil((message.length + 9) / 64);
  const buf = new Uint8Array(blockCount * 64);
  buf.set(message);
  buf[message.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(buf.length - 4, ml);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let i = 0; i < blockCount; i++) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i * 64 + j * 4);
    }
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3]! ^ w[j - 8]! ^ w[j - 14]! ^ w[j - 16]!;
      w[j] = (x << 1) | (x >>> 31);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[j]!) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = t;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0);
  outView.setUint32(4, h1);
  outView.setUint32(8, h2);
  outView.setUint32(12, h3);
  outView.setUint32(16, h4);
  return out;
}
