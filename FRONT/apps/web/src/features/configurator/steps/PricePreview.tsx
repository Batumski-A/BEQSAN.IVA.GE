import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { PriceBreakdown } from '../api';
import { useConfiguratorStore } from '../store';
import { SHOW_PUBLIC_PRICES } from '@/shared/config/features';

type Props = {
  query: UseQueryResult<PriceBreakdown, unknown>;
  hasSelections: boolean;
};

export function PricePreview({ query, hasSelections }: Props) {
  const { t } = useTranslation();
  const dimensions = useConfiguratorStore((s) => s.dimensions);

  if (!SHOW_PUBLIC_PRICES) {
    // Prices are off — the wizard aside becomes a WhatsApp note instead
    // of a receipt. Dimensions stay so the card still reflects the config.
    return (
      <div className="rounded-sm border border-hairline bg-bg-raised p-6 md:p-7">
        <div className="font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
          {dimensions.widthCm}×{dimensions.heightCm} {t('common.units.cm')}
        </div>
        <p className="mt-6 max-w-sm text-body-sm text-pretty text-fg-secondary">
          {t('studio.whatsapp.eyebrow')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-hairline bg-bg-raised p-6 md:p-7">
      <div className="font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
        {t('configurator.price.eyebrow')}
        <span className="mx-2 text-fg-tertiary/60">·</span>
        {dimensions.widthCm}×{dimensions.heightCm} {t('common.units.cm')}
      </div>

      {!hasSelections ? (
        <p className="mt-6 max-w-sm text-body-sm text-pretty text-fg-secondary">
          {t('configurator.price.needSelections')}
        </p>
      ) : query.isLoading || query.isFetching && !query.data ? (
        <PriceSkeleton loadingLabel={t('configurator.price.loading')} />
      ) : query.data ? (
        <PriceLines breakdown={query.data} />
      ) : query.isError ? (
        <p className="mt-6 text-body-sm text-system-danger">
          {t('configurator.steps.material.errorBody')}
        </p>
      ) : null}

      <p className="mt-6 border-t border-dashed border-hairline pt-4 text-caption text-fg-tertiary">
        {t('configurator.price.footnote')}
      </p>
    </div>
  );
}

function PriceLines({ breakdown }: { breakdown: PriceBreakdown }) {
  const { t } = useTranslation();
  const lines = breakdown.lines ?? [];

  return (
    <div className="mt-6 font-mono">
      <dl className="space-y-3">
        {lines.map((line, i) => (
          <div
            key={`${line.code}-${i}`}
            className="flex items-baseline justify-between border-b border-dashed border-hairline pb-3 text-body-sm"
          >
            <dt className="uppercase tracking-wider text-fg-tertiary">
              {line.code === 'material'
                ? t('configurator.price.material')
                : line.code === 'vat'
                  ? t('configurator.price.vat')
                  : line.label}
            </dt>
            <dd className="tabular-nums text-fg-primary">
              {line.amountDisplay}{' '}
              <span className="text-fg-tertiary">{currencySymbol(line.currency ?? 'GEL')}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-baseline justify-between">
        <span className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
          {t('configurator.price.total')}
        </span>
        <span className="font-display text-h2 tabular-nums text-fg-primary">
          {breakdown.totalDisplay}{' '}
          <span className="font-mono text-h4 text-fg-tertiary">
            {currencySymbol(breakdown.currency ?? 'GEL')}
          </span>
        </span>
      </div>

      <span aria-hidden className="mt-1 block h-px w-full bg-accent-amber" />
    </div>
  );
}

function PriceSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div className="mt-6 space-y-3" aria-busy="true">
      <div className="h-4 w-3/4 animate-pulse-soft rounded-sm bg-bg-elevated" />
      <div className="h-4 w-2/3 animate-pulse-soft rounded-sm bg-bg-elevated" />
      <div className="mt-6 h-10 w-1/2 animate-pulse-soft rounded-sm bg-bg-elevated" />
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'GEL':
      return '₾';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    default:
      return currency;
  }
}
