import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { useMaterialsByProductType, useConfiguratorPrice, type Material } from '../api';
import { resolveLocalized } from '@/features/catalog/localized';
import { useConfiguratorStore } from '../store';
import { cn } from '@/shared/lib/cn';
import { PricePreview } from './PricePreview';

type Props = {
  onBack: () => void;
  onAdvance: () => void;
};

type ThermalKey = 'none' | 'basic' | 'thermal' | 'highThermal';
type FamilyKey = 'aluminum' | 'pvc';

export function StepMaterial({ onBack, onAdvance }: Props) {
  const { t, i18n } = useTranslation();
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const setMaterial = useConfiguratorStore((s) => s.setMaterial);
  const dimensions = useConfiguratorStore((s) => s.dimensions);

  const { data, isLoading, isError, refetch } = useMaterialsByProductType(productType?.id);

  const priceReq =
    productType && material
      ? {
          productTypeId: productType.id,
          materialId: material.id,
          widthCm: dimensions.widthCm,
          heightCm: dimensions.heightCm,
        }
      : null;
  const priceQuery = useConfiguratorPrice(priceReq);

  const handlePick = (m: Material) => {
    setMaterial({
      id: String(m.id),
      slug: m.slug ?? '',
      name: resolveLocalized(m.name, i18n.language),
      family: (m.family ?? 'aluminum') as FamilyKey,
      thermalRating: (m.thermalRating ?? 'basic') as ThermalKey,
      basePricePerSqmMinor: Number(m.basePricePerSqmMinor ?? 0),
      currency: m.currency ?? 'GEL',
    });
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-8">
      <div className="lg:col-span-3">
        <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
          № 02 · {t('configurator.steps.material.title')}
        </div>
        <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary">
          {t('configurator.steps.material.heading')}
        </h1>
        <p className="mt-4 max-w-xl text-body text-pretty text-fg-secondary">
          {t('configurator.steps.material.intro')}
        </p>

        {isLoading ? (
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="h-44 animate-pulse-soft rounded-sm border border-hairline bg-bg-raised"
                aria-hidden
              />
            ))}
          </ul>
        ) : null}

        {isError ? (
          <div className="mt-8 border-t border-hairline pt-6">
            <p className="font-mono text-mono-spec uppercase tracking-wider text-system-danger">
              {t('configurator.steps.material.errorTitle')}
            </p>
            <p className="mt-3 text-body-sm text-fg-secondary">
              {t('configurator.steps.material.errorBody')}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 inline-flex h-10 items-center rounded-sm border border-hairline-strong px-4 font-mono text-mono-spec uppercase tracking-wider text-fg-primary transition-colors hover:border-accent-amber hover:text-accent-amber"
            >
              {t('common.actions.retry')}
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && data ? (
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.map((m) => {
              const isSelected = material?.id === String(m.id);
              const family = (m.family ?? 'aluminum') as FamilyKey;
              const thermal = (m.thermalRating ?? 'basic') as ThermalKey;
              const name = resolveLocalized(m.name, i18n.language);
              const desc = resolveLocalized(m.shortDescription, i18n.language);

              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(m)}
                    aria-pressed={isSelected}
                    className={cn(
                      'group relative flex w-full flex-col gap-3 rounded-sm border bg-bg-raised p-5 text-left transition-all duration-240 ease-standard',
                      isSelected
                        ? 'border-accent-amber shadow-[0_0_0_1px_var(--tw-shadow-color)] shadow-accent-amber/60'
                        : 'border-hairline hover:-translate-y-0.5 hover:border-hairline-strong',
                    )}
                  >
                    {isSelected ? (
                      <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-amber text-bg-base">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                    ) : null}

                    <span className="inline-flex w-fit items-center rounded-sm border border-hairline px-2 py-0.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                      {t(`configurator.steps.material.family.${family}`)}
                    </span>

                    <span className="font-headline text-h4 tracking-tight text-fg-primary">
                      {name}
                    </span>
                    <span className="text-body-sm text-pretty text-fg-secondary">{desc}</span>

                    <ThermalDots rating={thermal} />

                    <div className="mt-2 flex items-baseline justify-between border-t border-hairline pt-3 font-mono text-caption uppercase tracking-wider">
                      <span className="text-fg-tertiary">
                        {t('configurator.steps.material.startingFrom')}
                      </span>
                      <span className="tabular-nums text-fg-primary">
                        {m.basePricePerSqmDisplay ?? '—'}{' '}
                        <span className="text-fg-tertiary">₾/მ²</span>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-10 flex items-center justify-between">
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
            disabled={!material}
            className={cn(
              'group inline-flex h-12 items-center gap-3 rounded-sm px-6 font-mono text-mono-spec uppercase tracking-wider transition-all duration-120 ease-standard',
              material
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
        <PricePreview query={priceQuery} hasSelections={Boolean(material)} />
      </aside>
    </div>
  );
}

function ThermalDots({ rating }: { rating: ThermalKey }) {
  const filledByRating: Record<ThermalKey, number> = {
    none: 0,
    basic: 1,
    thermal: 2,
    highThermal: 3,
  };
  const filled = filledByRating[rating];
  return (
    <div className="flex items-center gap-2 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              i < filled ? 'bg-accent-amber' : 'bg-hairline-strong',
            )}
          />
        ))}
      </span>
    </div>
  );
}
