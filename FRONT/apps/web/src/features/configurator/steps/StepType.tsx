import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

import {
  catalogKeys,
  useProductTypes,
  type ProductType,
  type ProductTypeDetail,
} from '@/features/catalog/api';
import { resolveLocalized } from '@/features/catalog/localized';
import { api, unwrap, type ApiResponse } from '@/shared/api/client';
import { useConfiguratorStore } from '../store';
import { cn } from '@/shared/lib/cn';

type Props = {
  onAdvance: () => void;
};

export function StepType({ onAdvance }: Props) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = useProductTypes();
  const queryClient = useQueryClient();

  const productType = useConfiguratorStore((s) => s.productType);
  const setProductType = useConfiguratorStore((s) => s.setProductType);
  const [picking, setPicking] = useState<string | null>(null);

  const handlePick = async (p: ProductType) => {
    if (!p.slug || !p.id) return;
    const slug = p.slug;
    setPicking(slug);
    try {
      // Pull detail (with constraints) into TanStack cache so the store
      // gets a fully-populated SelectedProductType — Step 3 needs the
      // bounds immediately and we don't want to flash a stale dimension.
      const detail = await queryClient.fetchQuery({
        queryKey: catalogKeys.productTypeDetail(slug),
        queryFn: async () => {
          const response = await api.get<ApiResponse<ProductTypeDetail>>(
            `/catalog/product-types/${encodeURIComponent(slug)}`,
          );
          return unwrap(response);
        },
        staleTime: 5 * 60_000,
      });

      setProductType({
        id: String(detail.id ?? p.id),
        slug: detail.slug ?? slug,
        name: resolveLocalized(detail.name, i18n.language),
        constraints: {
          minWidthCm: detail.constraints?.minWidthCm ?? 30,
          maxWidthCm: detail.constraints?.maxWidthCm ?? 400,
          minHeightCm: detail.constraints?.minHeightCm ?? 30,
          maxHeightCm: detail.constraints?.maxHeightCm ?? 400,
        },
      });
    } finally {
      setPicking(null);
    }
  };

  return (
    <div>
      <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
        № 01 · {t('configurator.steps.type.title')}
      </div>
      <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary md:text-display-2">
        {t('configurator.steps.type.heading')}
      </h1>
      <p className="mt-6 max-w-xl text-body-lg text-pretty text-fg-secondary">
        {t('configurator.steps.type.intro')}
      </p>

      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse-soft rounded-sm border border-hairline bg-bg-raised"
              aria-hidden
            />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="mt-10 border-t border-hairline pt-8">
          <p className="font-mono text-mono-spec uppercase tracking-wider text-system-danger">
            {t('catalog.errorTitle')}
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
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.map((p) => {
            const isSelected = productType?.id === String(p.id);
            const isPicking = picking === p.slug;
            const name = resolveLocalized(p.name, i18n.language);
            const desc = resolveLocalized(p.shortDescription, i18n.language);

            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => void handlePick(p)}
                  aria-pressed={isSelected}
                  disabled={Boolean(picking) && !isPicking}
                  className={cn(
                    'group relative flex w-full flex-col gap-2 rounded-sm border bg-bg-raised p-5 text-left transition-all duration-240 ease-standard',
                    isSelected
                      ? 'border-accent-amber shadow-[0_0_0_1px_var(--tw-shadow-color)] shadow-accent-amber/60'
                      : 'border-hairline hover:-translate-y-0.5 hover:border-hairline-strong',
                    Boolean(picking) && !isPicking && 'opacity-50',
                  )}
                >
                  {isSelected ? (
                    <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-amber text-bg-base">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : isPicking ? (
                    <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center text-accent-amber">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    </span>
                  ) : null}
                  <span className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
                    {p.slug?.toUpperCase()}
                  </span>
                  <span className="font-headline text-h3 tracking-tight text-fg-primary">
                    {name}
                  </span>
                  <span className="text-body-sm text-pretty text-fg-secondary">{desc}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-10 flex items-center justify-end">
        <button
          type="button"
          onClick={onAdvance}
          disabled={!productType}
          className={cn(
            'group inline-flex h-12 items-center gap-3 rounded-sm px-6 font-mono text-mono-spec uppercase tracking-wider transition-all duration-120 ease-standard',
            productType
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
  );
}
