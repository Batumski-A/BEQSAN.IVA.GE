import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import type { HingeSide, PaneOpeningType } from '@beqsan/api-types';
import { useConfiguratorPrice } from '../api';
import { paneRangeFor, useConfiguratorStore } from '../store';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';
import { firstLayoutError, translateLayoutError } from '../layout/layoutErrors';
import { PaneSchematic } from '../layout/PaneSchematic';
import { PricePreview } from './PricePreview';

type Props = {
  onBack: () => void;
  onAdvance: () => void;
};

// Which opening types are offered for a given product type. Mirrors BACK's
// LayoutValidator slug-specific rules — sliding only takes Sliding/Fixed.
function openingsFor(slug: string | null | undefined): PaneOpeningType[] {
  if (slug === 'sliding') return ['Fixed', 'Sliding'];
  return ['Fixed', 'Casement', 'Tilt', 'TiltAndTurn', 'Sliding'];
}

function needsHinge(opening: PaneOpeningType): boolean {
  return opening === 'Casement' || opening === 'TiltAndTurn';
}

export function StepLayout({ onBack, onAdvance }: Props) {
  const { t } = useTranslation();
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);
  const setPaneCount = useConfiguratorStore((s) => s.setPaneCount);
  const setPaneOpening = useConfiguratorStore((s) => s.setPaneOpening);
  const setPaneHinge = useConfiguratorStore((s) => s.setPaneHinge);
  const togglePaneMosquito = useConfiguratorStore((s) => s.togglePaneMosquito);

  const range = paneRangeFor(productType?.slug);
  const availableOpenings = useMemo(() => openingsFor(productType?.slug), [productType?.slug]);

  // Debounce the panes payload so a fast slider drag doesn't flood the
  // server. Same 400 ms window as Step 3.
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
  // Highlight the pane the validator pointed at — flows from metadata.
  const errorPosition =
    layoutError && typeof layoutError.metadata?.position === 'number'
      ? (layoutError.metadata.position as number)
      : null;

  const paneCountLabelId = useId();
  const errorRegionId = useId();

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-8">
      <div className="lg:col-span-3">
        <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
          № 04 · {t('configurator.steps.layout.title')}
        </div>
        <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary">
          {t('configurator.steps.layout.heading')}
        </h1>
        <p className="mt-4 max-w-xl text-body text-pretty text-fg-secondary">
          {t('configurator.steps.layout.intro')}
        </p>

        {/* Pane count — radiogroup of segmented buttons */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <span
              id={paneCountLabelId}
              className="font-mono text-mono-spec uppercase tracking-wider text-fg-secondary"
            >
              {t('configurator.steps.layout.paneCountLabel')}
            </span>
            <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('configurator.steps.layout.paneCountHint', { min: range.min, max: range.max })}
            </span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby={paneCountLabelId}
            className="mt-3 inline-flex flex-wrap gap-1 rounded-sm border border-hairline bg-bg-raised p-1"
          >
            {Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i).map((n) => {
              const active = n === panes.length;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t('configurator.steps.layout.paneCountAria', { count: n })}
                  onClick={() => setPaneCount(n)}
                  className={cn(
                    'inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-sm px-3 font-mono text-mono-spec tabular-nums tracking-wider transition-colors duration-120 ease-standard',
                    active
                      ? 'bg-accent-amber text-bg-base'
                      : 'text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary',
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schematic */}
        <div className="mt-8">
          <PaneSchematic
            panes={panes}
            widthCm={dimensions.widthCm}
            heightCm={dimensions.heightCm}
          />
        </div>

        {/* Per-pane controls */}
        <div className="mt-8 space-y-6">
          {panes.map((pane) => (
            <PaneCard
              key={pane.position}
              position={pane.position}
              opening={pane.openingType}
              hinge={pane.hingeSide}
              mosquito={pane.hasMosquitoNet}
              widthRatio={pane.widthRatio}
              availableOpenings={availableOpenings}
              highlighted={errorPosition === pane.position}
              onOpeningChange={(op) => setPaneOpening(pane.position, op)}
              onHingeChange={(h) => setPaneHinge(pane.position, h)}
              onMosquitoToggle={() => togglePaneMosquito(pane.position)}
            />
          ))}
        </div>

        {/* Server-side layout error (validator metadata interpolated locally) */}
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
            onClick={onAdvance}
            disabled={Boolean(layoutErrorText)}
            className={cn(
              'group inline-flex h-12 items-center gap-3 rounded-sm px-6 font-mono text-mono-spec uppercase tracking-wider transition-all duration-120 ease-standard',
              layoutErrorText
                ? 'cursor-not-allowed bg-bg-elevated text-fg-disabled'
                : 'bg-accent-amber text-bg-base hover:bg-accent-amber-h active:scale-[0.98]',
            )}
          >
            <span>{t('common.actions.continue')}</span>
            <ArrowRight
              className="h-4 w-4 transition-transform group-enabled:group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        </div>
      </div>

      <aside className="lg:col-span-2">
        <PricePreview query={priceQuery} hasSelections={Boolean(material)} />
      </aside>
    </div>
  );
}

type PaneCardProps = {
  position: number;
  opening: PaneOpeningType;
  hinge: HingeSide | null;
  mosquito: boolean;
  widthRatio: number;
  availableOpenings: PaneOpeningType[];
  highlighted: boolean;
  onOpeningChange: (op: PaneOpeningType) => void;
  onHingeChange: (h: HingeSide) => void;
  onMosquitoToggle: () => void;
};

function PaneCard({
  position,
  opening,
  hinge,
  mosquito,
  widthRatio,
  availableOpenings,
  highlighted,
  onOpeningChange,
  onHingeChange,
  onMosquitoToggle,
}: PaneCardProps) {
  const { t } = useTranslation();
  const openingGroupId = useId();
  const hingeGroupId = useId();
  const mosquitoId = useId();

  const percent = Math.round(widthRatio * 1000) / 10;
  const showHinge = needsHinge(opening);

  return (
    <fieldset
      className={cn(
        'rounded-sm border bg-bg-raised p-5 transition-colors',
        highlighted ? 'border-system-danger' : 'border-hairline',
      )}
    >
      <legend className="px-2 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
        {t('configurator.steps.layout.paneLabel', { position })}
        <span className="ml-3 text-accent-amber tabular-nums">{percent.toFixed(0)}%</span>
      </legend>

      <div className="mt-2">
        <span
          id={openingGroupId}
          className="font-mono text-caption uppercase tracking-wider text-fg-secondary"
        >
          {t('configurator.steps.layout.openingLabel')}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={openingGroupId}
          className="mt-2 flex flex-wrap gap-2"
        >
          {availableOpenings.map((op) => {
            const active = op === opening;
            return (
              <button
                key={op}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onOpeningChange(op)}
                className={cn(
                  'inline-flex h-10 items-center rounded-sm border px-3 font-mono text-mono-spec uppercase tracking-wider transition-colors duration-120 ease-standard',
                  active
                    ? 'border-accent-amber bg-accent-amber/10 text-accent-amber'
                    : 'border-hairline text-fg-secondary hover:border-hairline-strong hover:text-fg-primary',
                )}
              >
                {t(`configurator.steps.layout.openings.${openingKey(op)}`)}
              </button>
            );
          })}
        </div>
      </div>

      {showHinge && (
        <div className="mt-5">
          <span
            id={hingeGroupId}
            className="font-mono text-caption uppercase tracking-wider text-fg-secondary"
          >
            {t('configurator.steps.layout.hingeLabel')}
          </span>
          <div
            role="radiogroup"
            aria-labelledby={hingeGroupId}
            className="mt-2 inline-flex gap-1 rounded-sm border border-hairline bg-bg-elevated p-1"
          >
            {(['Left', 'Right'] as const).map((side) => {
              const active = hinge === side;
              return (
                <button
                  key={side}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onHingeChange(side)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-sm px-4 font-mono text-mono-spec uppercase tracking-wider transition-colors',
                    active
                      ? 'bg-accent-amber text-bg-base'
                      : 'text-fg-secondary hover:text-fg-primary',
                  )}
                >
                  {t(`configurator.steps.layout.hinges.${side === 'Left' ? 'left' : 'right'}`)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label
        htmlFor={mosquitoId}
        className="mt-5 inline-flex cursor-pointer items-center gap-3 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary"
      >
        <input
          id={mosquitoId}
          type="checkbox"
          checked={mosquito}
          onChange={onMosquitoToggle}
          className="h-4 w-4 rounded-sm border-hairline-strong accent-accent-amber"
        />
        {t('configurator.steps.layout.mosquitoLabel')}
        <span className="text-fg-tertiary">
          · {t('configurator.steps.layout.mosquitoHint')}
        </span>
      </label>
    </fieldset>
  );
}

function openingKey(op: PaneOpeningType): string {
  switch (op) {
    case 'Fixed':
      return 'fixed';
    case 'Casement':
      return 'casement';
    case 'Tilt':
      return 'tilt';
    case 'TiltAndTurn':
      return 'tiltAndTurn';
    case 'Sliding':
      return 'sliding';
  }
}
