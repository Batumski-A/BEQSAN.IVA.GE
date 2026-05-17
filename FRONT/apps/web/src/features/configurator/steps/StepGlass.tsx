import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';

import type { GlassExtra } from '@beqsan/api-types';
import { useConfiguratorPrice, useGlassTypesByMaterial, type GlassType } from '../api';
import { useConfiguratorStore } from '../store';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';
import { firstLayoutError, translateLayoutError } from '../layout/layoutErrors';
import { PricePreview } from './PricePreview';

type Props = {
  onBack: () => void;
};

const ALL_EXTRAS: GlassExtra[] = ['LowECoating', 'Tempered', 'Frosted', 'Tinted'];

export function StepGlass({ onBack }: Props) {
  const { t, i18n } = useTranslation();
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);
  const defaultGlassTypeId = useConfiguratorStore((s) => s.defaultGlassTypeId);
  const setPaneGlass = useConfiguratorStore((s) => s.setPaneGlass);
  const setAllPanesGlass = useConfiguratorStore((s) => s.setAllPanesGlass);
  const togglePaneGlassExtra = useConfiguratorStore((s) => s.togglePaneGlassExtra);
  const setDefaultGlassTypeId = useConfiguratorStore((s) => s.setDefaultGlassTypeId);

  const glassQuery = useGlassTypesByMaterial(material?.id);

  // First time the catalog resolves, capture the IsDefault id so the store
  // can seed any pane that hasn't picked glass yet. Re-runs when the
  // material id changes (because the cache key changes too).
  useEffect(() => {
    if (!glassQuery.data || defaultGlassTypeId) return;
    const defaultGlass = glassQuery.data.find((g) => g.isDefault);
    if (defaultGlass?.id) {
      setDefaultGlassTypeId(defaultGlass.id);
    }
  }, [glassQuery.data, defaultGlassTypeId, setDefaultGlassTypeId]);

  // "Same glass on every pane" mode — when all panes share the same id and
  // this flag is on, picking a card sets every pane in one motion. Default
  // ON because most customers want one glass throughout the window.
  const [allPanesMode, setAllPanesMode] = useState(true);
  const [activePane, setActivePane] = useState(1);

  const allGlassIds = panes.map((p) => p.glassTypeId ?? null);
  const allSame = allGlassIds.every((id) => id === allGlassIds[0]);

  // Per-pane glass for the active card grid — in "all panes" mode it's
  // pane 1's selection (which equals every pane's selection when allSame),
  // otherwise the activePane's selection.
  const activePosition = allPanesMode ? 1 : activePane;
  const activeGlassId =
    panes.find((p) => p.position === activePosition)?.glassTypeId ?? defaultGlassTypeId;
  const activeExtras = panes.find((p) => p.position === activePosition)?.glassExtras ?? [];

  // Debounced full configuration → price recompute.
  const debouncedPanes = useDebouncedValue(panes, 400);
  const priceReq =
    productType && material
      ? {
          productTypeId: productType.id,
          materialId: material.id,
          widthCm: dimensions.widthCm,
          heightCm: dimensions.heightCm,
          panes: debouncedPanes,
        }
      : null;
  const priceQuery = useConfiguratorPrice(priceReq);
  const layoutError = firstLayoutError(priceQuery.error);
  const layoutErrorText = layoutError ? translateLayoutError(layoutError, t) : null;
  const errorPosition =
    layoutError && typeof layoutError.metadata?.position === 'number'
      ? (layoutError.metadata.position as number)
      : null;

  const allPanesId = useId();
  const tabsId = useId();
  const errorRegionId = useId();

  const handlePickGlass = (id: string) => {
    if (allPanesMode) {
      setAllPanesGlass(id);
    } else {
      setPaneGlass(activePosition, id);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-8">
      <div className="lg:col-span-3">
        <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
          № 05 · {t('configurator.steps.glass.title')}
        </div>
        <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary">
          {t('configurator.steps.glass.heading')}
        </h1>
        <p className="mt-4 max-w-xl text-body text-pretty text-fg-secondary">
          {t('configurator.steps.glass.intro')}
        </p>

        {/* All-panes toggle (only useful when there's more than one pane) */}
        {panes.length > 1 && (
          <div className="mt-8 flex items-center gap-3">
            <button
              id={allPanesId}
              type="button"
              role="switch"
              aria-checked={allPanesMode && allSame}
              onClick={() => {
                if (!allPanesMode && panes.length > 0 && panes[0]?.glassTypeId) {
                  setAllPanesGlass(panes[0].glassTypeId);
                }
                setAllPanesMode(!allPanesMode);
              }}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                allPanesMode && allSame ? 'bg-accent-amber' : 'bg-bg-elevated',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-bg-base shadow-sm transition-transform',
                  allPanesMode && allSame ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
            <label htmlFor={allPanesId} className="cursor-pointer font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
              {t('configurator.steps.glass.allPanesToggle')}
            </label>
          </div>
        )}

        {/* Per-pane tabs (only when "all panes" off + more than 1 pane) */}
        {!allPanesMode && panes.length > 1 && (
          <div role="tablist" aria-labelledby={tabsId} className="mt-6 flex flex-wrap gap-1 rounded-sm border border-hairline bg-bg-raised p-1">
            <span id={tabsId} className="sr-only">
              {t('configurator.steps.layout.paneCountLabel')}
            </span>
            {panes.map((p) => {
              const active = p.position === activePane;
              return (
                <button
                  key={p.position}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActivePane(p.position)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-sm px-3 font-mono text-mono-spec uppercase tracking-wider transition-colors',
                    active
                      ? 'bg-accent-amber text-bg-base'
                      : 'text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary',
                    errorPosition === p.position && 'border border-system-danger',
                  )}
                >
                  {t('configurator.steps.glass.paneTab', { n: p.position })}
                </button>
              );
            })}
          </div>
        )}

        {/* Glass type card grid */}
        <div className="mt-6">
          {glassQuery.isLoading ? (
            <div className="flex items-center gap-3 text-fg-secondary">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span className="font-mono text-mono-spec uppercase tracking-wider">
                {t('common.states.loading')}
              </span>
            </div>
          ) : glassQuery.isError ? (
            <div className="rounded-sm border border-system-danger bg-bg-raised p-5">
              <div className="font-headline text-h4 text-fg-primary">
                {t('configurator.steps.glass.errorTitle')}
              </div>
              <p className="mt-2 text-body-sm text-fg-secondary">
                {t('configurator.steps.glass.errorBody')}
              </p>
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label={t('configurator.steps.glass.heading')}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {(glassQuery.data ?? []).map((g) => (
                <GlassCard
                  key={g.id}
                  glass={g}
                  selected={g.id === activeGlassId}
                  locale={i18n.language}
                  onSelect={() => handlePickGlass(g.id!)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Extras for the active pane */}
        <div className="mt-8">
          <div className="font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
            {t('configurator.steps.glass.extras.label')}
            {!allPanesMode && panes.length > 1 && (
              <span className="ml-3 text-fg-tertiary">· {t('configurator.steps.glass.paneTab', { n: activePosition })}</span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ALL_EXTRAS.map((extra) => (
              <ExtraCheckbox
                key={extra}
                extra={extra}
                checked={activeExtras.includes(extra)}
                disabled={
                  (extra === 'Frosted' && activeExtras.includes('Tinted')) ||
                  (extra === 'Tinted' && activeExtras.includes('Frosted'))
                }
                onToggle={() => togglePaneGlassExtra(activePosition, extra)}
              />
            ))}
          </div>
        </div>

        {/* Server-side validation error region */}
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
    </div>
  );
}

type GlassCardProps = {
  glass: GlassType;
  selected: boolean;
  locale: string;
  onSelect: () => void;
};

function GlassCard({ glass, selected, locale, onSelect }: GlassCardProps) {
  const { t } = useTranslation();
  // Resolve the Ka name (fall back through locales gracefully).
  const name = (() => {
    const n = glass.name;
    if (!n) return glass.slug ?? '';
    if (locale.startsWith('ka') && n.ka) return n.ka;
    if (locale.startsWith('en') && n.en) return n.en;
    if (locale.startsWith('ru') && n.ru) return n.ru;
    return n.ka ?? n.en ?? n.ru ?? (glass.slug ?? '');
  })();
  const desc = (() => {
    const d = glass.shortDescription;
    if (!d) return '';
    if (locale.startsWith('ka') && d.ka) return d.ka;
    if (locale.startsWith('en') && d.en) return d.en;
    if (locale.startsWith('ru') && d.ru) return d.ru;
    return d.ka ?? d.en ?? d.ru ?? '';
  })();

  const surcharge = glass.surchargePerSqmMinor ?? 0;
  const surchargeDisplay = glass.surchargePerSqmDisplay ?? '0.00';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col items-stretch rounded-sm border bg-bg-raised p-4 text-left transition-colors duration-120 ease-standard',
        selected
          ? 'border-accent-amber ring-1 ring-accent-amber/30'
          : 'border-hairline hover:border-hairline-strong',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <LayerIcon count={glass.paneCount ?? 2} />
        {glass.isDefault && (
          <span className="font-mono text-caption uppercase tracking-wider text-accent-amber">
            {t('configurator.steps.glass.default')}
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-h4 text-fg-primary">{name}</div>
      <p className="mt-1 text-body-sm text-pretty text-fg-secondary">{desc}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-dashed border-hairline pt-3 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
        <span>
          {t('configurator.steps.glass.uValueLabel')}
          <span className="ml-1 tabular-nums text-fg-primary">{glass.uValue?.toFixed(1)}</span>{' '}
          <span>{t('configurator.steps.glass.uValueUnit')}</span>
        </span>
        <span>
          {surcharge > 0 ? (
            <span className="tabular-nums text-accent-amber">
              {t('configurator.steps.glass.surchargeLabel', { amount: surchargeDisplay })}
            </span>
          ) : (
            <span>{t('configurator.steps.glass.noSurcharge')}</span>
          )}
        </span>
      </div>
      {selected && (
        <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-amber text-bg-base">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      )}
    </button>
  );
}

function LayerIcon({ count }: { count: number }) {
  // Tiny inline SVG showing N stacked glass layers. Reads as informational
  // to screen-readers via the parent button's accessible name.
  const w = 28;
  const h = 24;
  const layerSpacing = Math.min(5, Math.max(2, h / (count + 1)));
  const offsetX = 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-7 text-accent-amber" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={offsetX + i * 1.5}
          y={2 + i * layerSpacing * 0.5}
          width={w - 4 - i * 3}
          height={h - 4 - i * layerSpacing}
          fill="currentColor"
          opacity={0.18 + i * 0.16}
          stroke="currentColor"
          strokeWidth={0.5}
        />
      ))}
    </svg>
  );
}

type ExtraCheckboxProps = {
  extra: GlassExtra;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
};

function ExtraCheckbox({ extra, checked, disabled, onToggle }: ExtraCheckboxProps) {
  const { t } = useTranslation();
  const key = extraKey(extra);
  const id = useId();
  const describedById = `${id}-desc`;

  return (
    <label
      htmlFor={id}
      aria-disabled={disabled}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-sm border bg-bg-raised p-3 transition-colors',
        checked ? 'border-accent-amber bg-accent-amber/5' : 'border-hairline hover:border-hairline-strong',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        aria-describedby={describedById}
        className="mt-1 h-4 w-4 shrink-0 rounded-sm border-hairline-strong accent-accent-amber"
      />
      <span className="flex-1">
        <span className="block font-mono text-mono-spec uppercase tracking-wider text-fg-primary">
          {t(`configurator.steps.glass.extras.${key}`)}
        </span>
        <span id={describedById} className="mt-1 block text-caption text-fg-secondary">
          {t(`configurator.steps.glass.extras.${key}Description`)}
        </span>
      </span>
    </label>
  );
}

function extraKey(extra: GlassExtra): string {
  switch (extra) {
    case 'LowECoating':
      return 'lowE';
    case 'Tempered':
      return 'tempered';
    case 'Frosted':
      return 'frosted';
    case 'Tinted':
      return 'tinted';
  }
}
