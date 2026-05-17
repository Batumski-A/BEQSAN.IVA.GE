import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { useConfiguratorPrice } from '../api';
import { useConfiguratorStore } from '../store';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';
import { PricePreview } from './PricePreview';

type Props = {
  onBack: () => void;
  onAdvance: () => void;
};

export function StepDimensions({ onBack, onAdvance }: Props) {
  const { t } = useTranslation();
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);

  // Safe defaults — Step 1's guard rail redirects here only when productType is set,
  // but TS doesn't know that, so we fall back to the global range.
  const constraints = productType?.constraints ?? {
    minWidthCm: 30,
    maxWidthCm: 400,
    minHeightCm: 30,
    maxHeightCm: 400,
  };

  const widthInRange =
    dimensions.widthCm >= constraints.minWidthCm && dimensions.widthCm <= constraints.maxWidthCm;
  const heightInRange =
    dimensions.heightCm >= constraints.minHeightCm && dimensions.heightCm <= constraints.maxHeightCm;
  const dimsValid = widthInRange && heightInRange;

  const debounced = useDebouncedValue(dimensions, 400);

  // Only ask the server when the inputs are in-range. Out-of-range mirror the
  // server validation locally — the price would 400 anyway.
  const priceReq =
    productType && material && dimsValid
      ? {
          productTypeId: productType.id,
          materialId: material.id,
          widthCm: debounced.widthCm,
          heightCm: debounced.heightCm,
        }
      : null;
  const priceQuery = useConfiguratorPrice(priceReq);

  const widthId = useId();
  const heightId = useId();

  const handleWidth = (next: number) => {
    setDimensions({ widthCm: Math.max(0, Math.round(next)) });
  };
  const handleHeight = (next: number) => {
    setDimensions({ heightCm: Math.max(0, Math.round(next)) });
  };

  const areaMSq = ((dimensions.widthCm * dimensions.heightCm) / 10_000).toFixed(2);
  const wMetres = (dimensions.widthCm / 100).toFixed(2);
  const hMetres = (dimensions.heightCm / 100).toFixed(2);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-8">
      <div className="lg:col-span-3">
        <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
          № 03 · {t('configurator.steps.dimensions.title')}
        </div>
        <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary">
          {t('configurator.steps.dimensions.heading')}
        </h1>
        <p className="mt-4 max-w-xl text-body text-pretty text-fg-secondary">
          {t('configurator.steps.dimensions.intro')}
        </p>

        <div className="mt-10 space-y-8">
          <DimensionInput
            id={widthId}
            label={t('configurator.steps.dimensions.widthLabel')}
            value={dimensions.widthCm}
            min={constraints.minWidthCm}
            max={constraints.maxWidthCm}
            inRange={widthInRange}
            onChange={handleWidth}
            errorText={
              widthInRange
                ? null
                : t('configurator.errors.dimensions.widthOutOfRange', {
                    min: constraints.minWidthCm,
                    max: constraints.maxWidthCm,
                  })
            }
            unitLabel={t('common.units.cm')}
            srLabel={t('configurator.steps.dimensions.srWidth', {
              value: dimensions.widthCm,
              unit: t('common.units.cm'),
            })}
          />

          <DimensionInput
            id={heightId}
            label={t('configurator.steps.dimensions.heightLabel')}
            value={dimensions.heightCm}
            min={constraints.minHeightCm}
            max={constraints.maxHeightCm}
            inRange={heightInRange}
            onChange={handleHeight}
            errorText={
              heightInRange
                ? null
                : t('configurator.errors.dimensions.heightOutOfRange', {
                    min: constraints.minHeightCm,
                    max: constraints.maxHeightCm,
                  })
            }
            unitLabel={t('common.units.cm')}
            srLabel={t('configurator.steps.dimensions.srHeight', {
              value: dimensions.heightCm,
              unit: t('common.units.cm'),
            })}
          />

          <div className="border-t border-hairline pt-6 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
            <span className="text-fg-tertiary">{t('configurator.steps.dimensions.areaLabel')}</span>{' '}
            <span className="tabular-nums text-fg-primary">
              {wMetres} × {hMetres} {t('common.units.m')}
            </span>{' '}
            <span className="text-fg-tertiary">·</span>{' '}
            <span className="tabular-nums text-accent-amber">
              {areaMSq} {t('common.units.sqm')}
            </span>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between">
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
            disabled={!dimsValid}
            className={cn(
              'group inline-flex h-12 items-center gap-3 rounded-sm px-6 font-mono text-mono-spec uppercase tracking-wider transition-all duration-120 ease-standard',
              dimsValid
                ? 'bg-accent-amber text-bg-base hover:bg-accent-amber-h active:scale-[0.98]'
                : 'cursor-not-allowed bg-bg-elevated text-fg-disabled',
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
        <PricePreview query={priceQuery} hasSelections={Boolean(material) && dimsValid} />
      </aside>
    </div>
  );
}

type DimensionInputProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  inRange: boolean;
  onChange: (next: number) => void;
  errorText: string | null;
  unitLabel: string;
  srLabel: string;
};

function DimensionInput({
  id,
  label,
  value,
  min,
  max,
  inRange,
  onChange,
  errorText,
  unitLabel,
  srLabel,
}: DimensionInputProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
          {label}
        </label>
        <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary" id={hintId}>
          {min}–{max} {unitLabel}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          pattern="\d*"
          value={value}
          min={min}
          max={max}
          step={1}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          aria-describedby={`${hintId}${errorText ? ` ${errorId}` : ''}`}
          aria-invalid={!inRange}
          className={cn(
            'h-14 w-32 rounded-sm bg-bg-raised px-4 font-mono text-h3 tabular-nums text-fg-primary',
            'border transition-colors duration-120 ease-standard',
            inRange
              ? 'border-hairline focus:border-accent-amber focus:outline focus:outline-2 focus:outline-accent-amber focus:outline-offset-2'
              : 'border-system-danger focus:outline focus:outline-2 focus:outline-system-danger focus:outline-offset-2',
          )}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={Math.min(Math.max(value, min), max)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={srLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value} ${unitLabel}`}
          className="dimension-slider h-2 flex-1 cursor-ew-resize appearance-none rounded-full bg-bg-elevated"
        />
        <span className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
          {unitLabel}
        </span>
      </div>

      <div
        id={errorId}
        role={errorText ? 'alert' : undefined}
        aria-live="polite"
        className={cn(
          'mt-2 min-h-[1.25rem] font-mono text-caption uppercase tracking-wider transition-colors',
          errorText ? 'text-system-danger' : 'text-fg-tertiary',
        )}
      >
        {errorText ?? <span className="text-fg-tertiary/0">—</span>}
      </div>
    </div>
  );
}
