import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, RefreshCw } from 'lucide-react';

import { useProductTypes, type ProductType } from './api';
import { resolveLocalized } from './localized';
import { ProductIllustrationFor } from '@/shared/illustrations/ProductIllustrations';

export default function Catalog() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = useProductTypes();

  return (
    <>
      <Helmet>
        <title>{t('catalog.metaTitle')} · BEQSAN</title>
        <meta name="description" content={t('catalog.metaDescription')} />
      </Helmet>

      <section className="mx-auto max-w-content px-4 pb-12 pt-22 md:px-8 md:pb-16 md:pt-30">
        <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
          № 02 · {t('catalog.eyebrow')}
        </div>
        <h1 className="mt-4 max-w-3xl font-headline text-h1 text-balance text-fg-primary md:text-display-2">
          {t('catalog.heading')}
        </h1>
        <p className="mt-6 max-w-2xl text-body-lg text-pretty text-fg-secondary">
          {t('catalog.intro')}
        </p>
      </section>

      <section className="mx-auto max-w-content px-4 pb-30 md:px-8">
        {isLoading ? <SkeletonGrid /> : null}

        {isError ? (
          <ErrorState
            onRetry={() => void refetch()}
            isRetrying={isFetching}
            tRetry={t('common.actions.retry')}
            tBody={t('catalog.errorBody')}
            tTitle={t('catalog.errorTitle')}
          />
        ) : null}

        {!isLoading && !isError && data?.length === 0 ? (
          <EmptyState body={t('catalog.empty')} />
        ) : null}

        {!isLoading && !isError && data && data.length > 0 ? (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {data.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} locale={i18n.language} t={t} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </>
  );
}

function ProductCard({
  product,
  locale,
  t,
}: {
  product: ProductType;
  locale: string;
  t: (key: string) => string;
}) {
  const name = resolveLocalized(product.name, locale);
  const description = resolveLocalized(product.shortDescription, locale);
  const heroSeedColor = heroTintFor(product.slug ?? 'default');

  return (
    <Link
      to={`/catalog/${product.slug ?? ''}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-hairline bg-bg-raised transition-all duration-240 ease-standard hover:-translate-y-0.5 hover:border-hairline-strong"
    >
      <div
        aria-hidden
        className="relative h-44 w-full overflow-hidden bg-bg-elevated"
        style={{ backgroundColor: heroSeedColor }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.4) 12px, rgba(255,255,255,0.4) 13px)",
          }}
        />
        {/* Per-product hairline schematic — Phase 1 stand-in for Roman's
            real workshop photography. Inherits text-fg-tertiary for the
            base stroke so it reads softly against the tinted background. */}
        <div className="absolute inset-0 flex items-center justify-center p-4 text-fg-secondary transition-colors duration-240 group-hover:text-fg-primary">
          {ProductIllustrationFor(product.slug, {
            className: 'h-full w-full max-w-[80%]',
          })}
        </div>
        <span className="absolute bottom-3 left-4 font-mono text-caption uppercase tracking-wider text-fg-primary/80">
          {product.slug?.toUpperCase()}
        </span>
        <span className="absolute right-4 top-3 font-mono text-caption uppercase tracking-wider text-fg-primary/70">
          № {String(product.sortOrder ?? 0).padStart(2, '0')}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <h2 className="font-headline text-h3 tracking-tight text-fg-primary">{name}</h2>
        <p className="text-body text-pretty text-fg-secondary">{description}</p>

        <dl className="mt-4 space-y-1.5 border-t border-hairline pt-4">
          <SpecRow label={t('catalog.spec.materialLabel')} value={t('catalog.spec.materialValue')} />
          <SpecRow label={t('catalog.spec.installLabel')} value={t('catalog.spec.installValue')} />
          <SpecRow label={t('catalog.spec.priceLabel')} value={t('catalog.spec.priceValue')} />
        </dl>

        <div className="mt-auto flex items-center justify-between pt-4 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary transition-colors group-hover:text-accent-amber">
          <span>{t('common.actions.explore')}</span>
          <ArrowRight
            className="h-4 w-4 transition-transform duration-240 ease-standard group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between font-mono text-caption uppercase tracking-wider">
      <dt className="text-fg-tertiary">{label}</dt>
      <dd className="tabular-nums text-fg-primary">{value}</dd>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <ul
      className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-sm border border-hairline bg-bg-raised"
          aria-hidden
        >
          <div className="h-44 w-full animate-pulse-soft bg-bg-elevated" />
          <div className="space-y-3 p-6">
            <div className="h-6 w-2/3 animate-pulse-soft rounded-sm bg-bg-elevated" />
            <div className="h-4 w-full animate-pulse-soft rounded-sm bg-bg-elevated" />
            <div className="h-4 w-4/5 animate-pulse-soft rounded-sm bg-bg-elevated" />
            <div className="mt-6 h-px w-full bg-hairline" />
            <div className="h-3 w-1/2 animate-pulse-soft rounded-sm bg-bg-elevated" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ body }: { body: string }) {
  return (
    <div className="border-t border-hairline pt-12 font-headline text-h3 text-pretty text-fg-secondary">
      {body}
    </div>
  );
}

function ErrorState({
  onRetry,
  isRetrying,
  tTitle,
  tBody,
  tRetry,
}: {
  onRetry: () => void;
  isRetrying: boolean;
  tTitle: string;
  tBody: string;
  tRetry: string;
}) {
  return (
    <div className="border-t border-hairline pt-12">
      <div className="font-mono text-mono-spec uppercase tracking-wider text-system-danger">
        {tTitle}
      </div>
      <p className="mt-3 max-w-xl text-body text-pretty text-fg-secondary">{tBody}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm border border-hairline-strong px-5 font-mono text-mono-spec uppercase tracking-wider text-fg-primary transition-colors duration-120 hover:border-accent-amber hover:text-accent-amber disabled:opacity-50"
      >
        <RefreshCw
          className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
          aria-hidden
        />
        {tRetry}
      </button>
    </div>
  );
}

// Picks a deterministic muted tint per product slug so the placeholder hero
// is recognisable but never competes with the real workshop photos that will
// replace it.
function heroTintFor(slug: string): string {
  const palette = [
    'oklch(28% 0.022 240)', // aluminum cool
    'oklch(26% 0.020 75)', // amber-shadow
    'oklch(24% 0.015 200)', // ink-blue
    'oklch(22% 0.018 30)', // brown-warm
    'oklch(25% 0.012 290)', // slate
  ];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length] ?? palette[0];
}
