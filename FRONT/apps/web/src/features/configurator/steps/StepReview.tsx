import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Send,
} from 'lucide-react';

import type {
  HingeSide,
  InstallationRegion,
  PaneOpeningType,
} from '@beqsan/api-types';
import {
  useBlindTypesByProductType,
  useColorsByMaterial,
  useConfiguratorReview,
  useGlassTypesByMaterial,
  useHandleStylesByMaterial,
  useLockTypesByProductType,
  type ReviewResponse,
} from '../api';
import { useConfiguratorStore, type ConfiguratorStep } from '../store';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';
import { firstLayoutError, translateLayoutError } from '../layout/layoutErrors';

type Props = {
  onBack: () => void;
  onGoToStep: (step: ConfiguratorStep) => void;
  onSendOrder: () => void;
};

const REGIONS: InstallationRegion[] = [
  'Batumi', 'KobuletiCoast', 'Guria', 'Imereti', 'Samegrelo', 'EastGeorgia', 'Other',
];

export function StepReview({ onBack, onGoToStep, onSendOrder }: Props) {
  const { t, i18n } = useTranslation();
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);
  const color = useConfiguratorStore((s) => s.color);
  const accessories = useConfiguratorStore((s) => s.accessories);
  const installation = useConfiguratorStore((s) => s.installation);
  const setInstallation = useConfiguratorStore((s) => s.setInstallation);

  const glassQuery = useGlassTypesByMaterial(material?.id);
  const colorsQuery = useColorsByMaterial(material?.id);
  const handlesQuery = useHandleStylesByMaterial(material?.id);
  const locksQuery = useLockTypesByProductType(productType?.id);
  const blindsQuery = useBlindTypesByProductType(productType?.id);

  const glassById = useMemo(
    () => new Map((glassQuery.data ?? []).map((g) => [g.id!, g] as const)),
    [glassQuery.data],
  );
  const colorsById = useMemo(
    () => new Map((colorsQuery.data ?? []).map((c) => [c.id!, c] as const)),
    [colorsQuery.data],
  );
  const handlesById = useMemo(
    () => new Map((handlesQuery.data ?? []).map((h) => [h.id!, h] as const)),
    [handlesQuery.data],
  );
  const locksById = useMemo(
    () => new Map((locksQuery.data ?? []).map((l) => [l.id!, l] as const)),
    [locksQuery.data],
  );
  const blindsById = useMemo(
    () => new Map((blindsQuery.data ?? []).map((b) => [b.id!, b] as const)),
    [blindsQuery.data],
  );

  // Debounced review request — full configuration with installation.
  const debouncedPanes = useDebouncedValue(panes, 400);
  const debouncedAccessories = useDebouncedValue(accessories, 400);
  const debouncedInstallation = useDebouncedValue(installation, 400);
  const reviewReq =
    productType && material
      ? {
          productTypeId: productType.id,
          materialId: material.id,
          widthCm: dimensions.widthCm,
          heightCm: dimensions.heightCm,
          panes: debouncedPanes,
          color: color ?? undefined,
          accessories: debouncedAccessories ?? undefined,
          installation: debouncedInstallation ?? undefined,
        }
      : null;
  const reviewQuery = useConfiguratorReview(reviewReq);

  const layoutError = firstLayoutError(reviewQuery.error);
  const layoutErrorText = layoutError ? translateLayoutError(layoutError, t) : null;

  const isManualQuote = reviewQuery.data?.pricing?.grouped?.installationIsManualQuote === true;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-8">
      <div className="lg:col-span-3 space-y-8">
        <div>
          <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
            № 08 · {t('configurator.steps.review.title')}
          </div>
          <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary">
            {t('configurator.steps.review.heading')}
          </h1>
          <p className="mt-4 max-w-xl text-body text-pretty text-fg-secondary">
            {t('configurator.steps.review.intro')}
          </p>
        </div>

        <ConfigurationSummary
          productType={productType?.name ?? productType?.slug ?? ''}
          materialName={material?.name ?? material?.slug ?? ''}
          dimensions={dimensions}
          panes={panes.map((p) => ({
            position: p.position,
            openingType: p.openingType,
            hingeSide: p.hingeSide,
            mosquito: p.hasMosquitoNet,
            glass: p.glassTypeId ? pickLocalized(glassById.get(p.glassTypeId)?.name, i18n.language, '') : '',
            extras: p.glassExtras ?? [],
          }))}
          outerColor={color
            ? color.customRalHex
              ? `RAL custom · ${color.customRalCode ?? ''}`
              : pickLocalized(colorsById.get(color.outerColorOptionId)?.name, i18n.language, '')
            : ''}
          innerColor={color?.innerColorOptionId
            && color.innerColorOptionId !== color.outerColorOptionId
              ? pickLocalized(colorsById.get(color.innerColorOptionId)?.name, i18n.language, '')
              : null}
          handleName={accessories?.handleStyleId
            ? pickLocalized(handlesById.get(accessories.handleStyleId)?.name, i18n.language, '')
            : null}
          lockName={accessories?.lockTypeId
            ? pickLocalized(locksById.get(accessories.lockTypeId)?.name, i18n.language, '')
            : null}
          sill={accessories?.sill ?? null}
          blindName={accessories?.blind?.blindTypeId
            ? pickLocalized(blindsById.get(accessories.blind.blindTypeId)?.name, i18n.language, '')
            : null}
          blindControl={accessories?.blind?.control ?? null}
          onEditStep={onGoToStep}
        />

        <InstallationPicker
          selected={installation?.region ?? null}
          cityHint={installation?.cityHint ?? null}
          onPick={(region) => {
            if (region === 'Other') {
              setInstallation({ region, cityHint: installation?.cityHint ?? null });
            } else {
              setInstallation({ region, cityHint: null });
            }
          }}
          onCityHintChange={(hint) => {
            if (installation?.region === 'Other') {
              setInstallation({ region: 'Other', cityHint: hint });
            }
          }}
        />

        <PricingBreakdown
          review={reviewQuery.data ?? null}
          isLoading={reviewQuery.isLoading}
          isManualQuote={isManualQuote}
        />

        <DeliveryCards review={reviewQuery.data ?? null} isLoading={reviewQuery.isLoading} />

        {/* Server-side error */}
        <div
          role={layoutErrorText ? 'alert' : undefined}
          aria-live="polite"
          className={cn(
            'min-h-[1.5rem] font-mono text-mono-spec uppercase tracking-wider',
            layoutErrorText ? 'text-system-danger' : 'text-transparent',
          )}
        >
          {layoutErrorText ?? '—'}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center gap-2 rounded-sm border border-hairline-strong px-4 font-mono text-mono-spec uppercase tracking-wider text-fg-primary transition-colors hover:border-accent-amber hover:text-accent-amber"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common.actions.back')}
          </button>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={onSendOrder}
              disabled={!installation || Boolean(layoutErrorText)}
              className={cn(
                'group inline-flex h-12 items-center gap-3 rounded-sm px-6 font-mono text-mono-spec uppercase tracking-wider transition-all duration-120 ease-standard',
                !installation || layoutErrorText
                  ? 'cursor-not-allowed bg-bg-elevated text-fg-disabled'
                  : 'bg-accent-amber text-bg-base hover:bg-accent-amber-h active:scale-[0.98]',
              )}
            >
              <Send className="h-4 w-4" aria-hidden />
              <span>{t('configurator.steps.review.cta.send')}</span>
            </button>
            <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('configurator.steps.review.cta.nextStepHint')}
            </span>
          </div>
        </div>
      </div>

      <aside className="lg:col-span-2">
        <div className="rounded-sm border border-hairline bg-bg-raised p-5 sticky top-24">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
            {t('configurator.price.eyebrow')}
          </div>
          {reviewQuery.data?.pricing?.grouped ? (
            <>
              <div className="mt-4 font-display text-h2 tabular-nums text-fg-primary">
                {reviewQuery.data.pricing.grouped.grandTotalDisplay} ₾
              </div>
              <div className="mt-1 h-px w-full bg-accent-amber" aria-hidden />
              <p className="mt-3 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                {t('configurator.steps.review.pricing.fixedFor14Days')}
              </p>
            </>
          ) : (
            <div className="mt-6 flex items-center gap-3 text-fg-secondary">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span className="font-mono text-mono-spec uppercase tracking-wider">
                {t('common.states.loading')}
              </span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ── Configuration summary card ─────────────────────────────────────────
type SummaryProps = {
  productType: string;
  materialName: string;
  dimensions: { widthCm: number; heightCm: number };
  panes: Array<{
    position: number;
    openingType: PaneOpeningType;
    hingeSide: HingeSide | null;
    mosquito: boolean;
    glass: string;
    extras: readonly string[];
  }>;
  outerColor: string;
  innerColor: string | null;
  handleName: string | null;
  lockName: string | null;
  sill: { position: 'Inner' | 'Outer' | 'Both' | null | undefined } | null;
  blindName: string | null;
  blindControl: 'Manual' | 'Electric' | 'Remote' | null;
  onEditStep: (step: ConfiguratorStep) => void;
};

function ConfigurationSummary({
  productType, materialName, dimensions,
  panes, outerColor, innerColor,
  handleName, lockName, sill, blindName, blindControl,
  onEditStep,
}: SummaryProps) {
  const { t } = useTranslation();
  const area = ((dimensions.widthCm * dimensions.heightCm) / 10_000).toFixed(2);

  return (
    <article className="rounded-sm border border-hairline bg-bg-raised p-6 space-y-6">
      <SummarySection title={t('configurator.steps.review.summary.product')} step={1} onEdit={onEditStep}>
        <div className="font-display text-h3 text-fg-primary">
          {productType} · {materialName}
        </div>
        <div className="mt-1 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary tabular-nums">
          {t('configurator.steps.review.summary.dimensions', {
            w: dimensions.widthCm, h: dimensions.heightCm, area,
          })}
        </div>
      </SummarySection>

      <SummarySection title={t('configurator.steps.review.summary.panes')} step={4} onEdit={onEditStep}>
        <ul className="space-y-2 font-mono text-body-sm">
          {panes.map((p) => (
            <li key={p.position}>
              <span className="text-fg-secondary">
                {t('configurator.steps.review.summary.pane', { n: p.position })}:
              </span>{' '}
              <span className="text-fg-primary">{openingLabel(t, p.openingType, p.hingeSide)}</span>
              {p.glass && (
                <span className="ml-3 text-fg-tertiary">· {p.glass}</span>
              )}
              {p.extras.length > 0 && (
                <span className="ml-3 text-fg-tertiary">· {p.extras.join(', ')}</span>
              )}
              <span className="ml-3 text-fg-tertiary">
                · {p.mosquito
                  ? t('configurator.steps.review.summary.mosquitoYes')
                  : t('configurator.steps.review.summary.mosquitoNo')}
              </span>
            </li>
          ))}
        </ul>
      </SummarySection>

      {outerColor && (
        <SummarySection title={t('configurator.steps.review.summary.color')} step={6} onEdit={onEditStep}>
          <div className="font-mono text-body-sm">
            <span className="text-fg-secondary">
              {t('configurator.steps.review.summary.colorOuter')}:
            </span>{' '}
            <span className="text-fg-primary">{outerColor}</span>
          </div>
          <div className="mt-1 font-mono text-body-sm">
            <span className="text-fg-secondary">
              {t('configurator.steps.review.summary.colorInner')}:
            </span>{' '}
            <span className="text-fg-primary">
              {innerColor ?? t('configurator.steps.review.summary.colorInnerSame')}
            </span>
          </div>
        </SummarySection>
      )}

      {(handleName || lockName || sill || blindName) && (
        <SummarySection title={t('configurator.steps.review.summary.accessories')} step={7} onEdit={onEditStep}>
          <ul className="space-y-2 font-mono text-body-sm">
            {handleName && (
              <li>
                <span className="text-fg-secondary">{t('configurator.steps.review.summary.handle')}:</span>{' '}
                <span className="text-fg-primary">{handleName}</span>
              </li>
            )}
            {lockName && (
              <li>
                <span className="text-fg-secondary">{t('configurator.steps.review.summary.lock')}:</span>{' '}
                <span className="text-fg-primary">{lockName}</span>
              </li>
            )}
            {sill?.position && (
              <li>
                <span className="text-fg-primary">
                  {sill.position === 'Both'
                    ? t('configurator.steps.review.summary.sillBoth')
                    : t('configurator.steps.review.summary.sill', {
                        position: t(`configurator.steps.accessories.sections.sill.position.${sill.position.toLowerCase()}`),
                      })}
                </span>
              </li>
            )}
            {blindName && blindControl && (
              <li>
                <span className="text-fg-secondary">{t('configurator.steps.review.summary.blind')}:</span>{' '}
                <span className="text-fg-primary">{blindName}</span>
                <span className="ml-2 text-fg-tertiary">
                  · {t(`configurator.steps.review.summary.blind${blindControl}`)}
                </span>
              </li>
            )}
          </ul>
        </SummarySection>
      )}
    </article>
  );
}

function SummarySection({
  title, step, onEdit, children,
}: {
  title: string;
  step: ConfiguratorStep;
  onEdit: (step: ConfiguratorStep) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-dashed border-hairline pb-2">
        <h2 className="font-mono text-mono-spec uppercase tracking-[0.2em] text-fg-tertiary">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1 font-mono text-caption uppercase tracking-wider text-accent-amber transition-colors hover:underline"
        >
          <Pencil className="h-3 w-3" aria-hidden />
          {t('configurator.steps.review.summary.editLink', { n: step })}
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ── Installation region picker ──────────────────────────────────────────
type InstallationPickerProps = {
  selected: InstallationRegion | null;
  cityHint: string | null;
  onPick: (region: InstallationRegion) => void;
  onCityHintChange: (hint: string) => void;
};

function InstallationPicker({ selected, cityHint, onPick, onCityHintChange }: InstallationPickerProps) {
  const { t } = useTranslation();
  const groupLabel = useId();
  return (
    <section>
      <h2 id={groupLabel} className="font-display text-h3 text-fg-primary">
        {t('configurator.steps.review.installation.title')}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={groupLabel}
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {REGIONS.map((region) => {
          const slug = region === 'KobuletiCoast' ? 'kobuletiCoast'
            : region === 'EastGeorgia' ? 'eastGeorgia'
            : region.charAt(0).toLowerCase() + region.slice(1);
          const isSelected = selected === region;
          return (
            <button
              key={region}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onPick(region)}
              className={cn(
                'flex flex-col gap-1 rounded-sm border bg-bg-raised p-4 text-left transition-colors',
                isSelected
                  ? 'border-accent-amber ring-1 ring-accent-amber/30'
                  : 'border-hairline hover:border-hairline-strong',
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-body text-fg-primary">
                  {t(`configurator.steps.review.installation.region.${slug}`)}
                </span>
                <span className={cn(
                  'font-mono text-mono-spec uppercase tracking-wider tabular-nums',
                  isSelected ? 'text-accent-amber' : 'text-fg-secondary',
                )}>
                  {t(`configurator.steps.review.installation.region.${slug}.price`,
                    { defaultValue: '' })}
                </span>
              </div>
              <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                {t(`configurator.steps.review.installation.region.${slug}.cities`,
                  { defaultValue: '' })}
              </span>
            </button>
          );
        })}
      </div>
      {selected === 'Other' && (
        <label className="mt-3 flex flex-col gap-2">
          <span className="font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
            {t('configurator.steps.review.installation.region.other.cityInput')}
          </span>
          <input
            type="text"
            value={cityHint ?? ''}
            onChange={(e) => onCityHintChange(e.target.value)}
            className="h-11 rounded-sm border border-hairline bg-bg-elevated px-3 font-mono text-body text-fg-primary"
          />
        </label>
      )}
    </section>
  );
}

// ── Grouped pricing breakdown ───────────────────────────────────────────
function PricingBreakdown({
  review,
  isLoading,
  isManualQuote,
}: {
  review: ReviewResponse | null;
  isLoading: boolean;
  isManualQuote: boolean;
}) {
  const { t } = useTranslation();
  if (isLoading || !review?.pricing?.grouped) {
    return (
      <div className="rounded-sm border border-hairline bg-bg-raised p-6 flex items-center gap-3 text-fg-secondary">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span className="font-mono text-mono-spec uppercase tracking-wider">
          {t('common.states.loading')}
        </span>
      </div>
    );
  }
  const g = review.pricing.grouped;
  return (
    <article className="rounded-sm border border-hairline bg-bg-raised p-6 font-mono">
      <PriceGroup
        labelKey="configurator.steps.review.pricing.group.material"
        total={g.material?.totalDisplay ?? '0.00'}
        lines={g.material?.lines ?? []}
        currency={g.currency ?? 'GEL'}
      />
      <PriceGroup
        labelKey="configurator.steps.review.pricing.group.glass"
        total={g.glass?.totalDisplay ?? '0.00'}
        lines={g.glass?.lines ?? []}
        currency={g.currency ?? 'GEL'}
      />
      <PriceGroup
        labelKey="configurator.steps.review.pricing.group.color"
        total={g.color?.totalDisplay ?? '0.00'}
        lines={g.color?.lines ?? []}
        currency={g.currency ?? 'GEL'}
      />
      <PriceGroup
        labelKey="configurator.steps.review.pricing.group.accessories"
        total={g.accessories?.totalDisplay ?? '0.00'}
        lines={g.accessories?.lines ?? []}
        currency={g.currency ?? 'GEL'}
      />
      {((g.installation?.lines?.length ?? 0) > 0 || isManualQuote) && (
        <PriceGroup
          labelKey="configurator.steps.review.pricing.group.installation"
          total={g.installation?.totalDisplay ?? '0.00'}
          lines={g.installation?.lines ?? []}
          currency={g.currency ?? 'GEL'}
          inlineNote={isManualQuote ? t('configurator.steps.review.pricing.manualQuote') : null}
        />
      )}
      <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-hairline pt-3 text-body-sm">
        <span className="uppercase tracking-wider text-fg-tertiary">
          {t('configurator.steps.review.pricing.vat')}
        </span>
        <span className="tabular-nums text-fg-primary">
          {g.vatDisplay ?? '0.00'}{' '}
          <span className="text-fg-tertiary">₾</span>
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
          {t('configurator.steps.review.pricing.grandTotal')}
        </span>
        <span className="font-display text-h2 tabular-nums text-fg-primary">
          {g.grandTotalDisplay ?? '0.00'}{' '}
          <span className="font-mono text-h4 text-fg-tertiary">₾</span>
        </span>
      </div>
      <span aria-hidden className="mt-1 block h-px w-full bg-accent-amber" />
      <p className="mt-3 text-caption text-fg-tertiary">
        {t('configurator.steps.review.pricing.fixedFor14Days')}
      </p>
    </article>
  );
}

function PriceGroup({
  labelKey,
  total,
  lines,
  currency,
  inlineNote,
}: {
  labelKey: string;
  total: string;
  lines: Array<{ code?: string | null; label?: string | null; amountDisplay?: string | null }>;
  currency: string;
  inlineNote?: string | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const groupId = useId();
  if (lines.length === 0 && !inlineNote) return null;
  return (
    <div className="border-b border-dashed border-hairline pb-3 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={groupId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-baseline justify-between py-2 text-left transition-colors hover:text-fg-primary"
      >
        <span className="inline-flex items-center gap-2 uppercase tracking-wider text-fg-secondary">
          {open ? <ChevronDown className="h-3 w-3" aria-hidden /> : <ChevronRight className="h-3 w-3" aria-hidden />}
          {t(labelKey)}
        </span>
        <span className="tabular-nums text-fg-primary">
          {total} <span className="text-fg-tertiary">₾</span>
        </span>
      </button>
      {open && (
        <ul id={groupId} className="mt-1 space-y-1 pl-5 text-caption text-fg-tertiary">
          {lines.map((l, i) => (
            <li key={`${l.code}-${i}`} className="flex items-baseline justify-between">
              <span>{l.label}</span>
              <span className="tabular-nums">{l.amountDisplay}</span>
            </li>
          ))}
          {inlineNote && (
            <li className="text-accent-amber">{inlineNote}</li>
          )}
        </ul>
      )}
      {!open && inlineNote && (
        <p className="mt-1 pl-5 text-caption text-accent-amber">{inlineNote}</p>
      )}
      {/* currency is GEL-only for now; render placeholder hidden for layout */}
      <span aria-hidden className="sr-only">{currency}</span>
    </div>
  );
}

// ── Warranty + lead time cards ──────────────────────────────────────────
function DeliveryCards({
  review,
  isLoading,
}: {
  review: ReviewResponse | null;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  if (isLoading || !review?.delivery) {
    return null;
  }
  const w = review.delivery.warranty;
  const l = review.delivery.leadTime;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <article className="rounded-sm border border-hairline bg-bg-raised p-6">
        <h3 className="font-mono text-mono-spec uppercase tracking-[0.2em] text-fg-tertiary">
          {t('configurator.steps.review.warranty.title')}
        </h3>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-display text-d3 tabular-nums text-fg-primary">
            {w?.months ?? 0}
          </span>
          <span className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
            {t('configurator.steps.review.warranty.unit')}
          </span>
        </div>
        <p className="mt-2 text-body-sm text-pretty text-fg-secondary">
          {t('configurator.steps.review.warranty.description')}
        </p>
        {(w?.notes?.length ?? 0) > 0 && (
          <div className="mt-3 border-t border-dashed border-hairline pt-3">
            <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('configurator.steps.review.warranty.notesLabel')}
            </span>
            <ul className="mt-1 space-y-1 text-caption text-fg-secondary">
              {w!.notes!.map((n) => (
                <li key={n}>
                  • {t(`configurator.steps.review.warranty.note${noteKeySuffix(n)}`,
                       { defaultValue: n })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
      <article className="rounded-sm border border-hairline bg-bg-raised p-6">
        <h3 className="font-mono text-mono-spec uppercase tracking-[0.2em] text-fg-tertiary">
          {t('configurator.steps.review.leadTime.title')}
        </h3>
        <dl className="mt-3 space-y-2 font-mono">
          <div className="flex items-baseline justify-between">
            <dt className="text-caption uppercase tracking-wider text-fg-tertiary">
              {t('configurator.steps.review.leadTime.production')}
            </dt>
            <dd className="text-body tabular-nums text-fg-primary">
              {t('configurator.steps.review.leadTime.range', {
                min: l?.productionDaysMin ?? 0, max: l?.productionDaysMax ?? 0,
              })}{' '}
              <span className="text-fg-tertiary">{t('configurator.steps.review.leadTime.unit')}</span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-caption uppercase tracking-wider text-fg-tertiary">
              {t('configurator.steps.review.leadTime.installation')}
            </dt>
            <dd className="text-body tabular-nums text-fg-primary">
              {l?.installationDays ?? 0}{' '}
              <span className="text-fg-tertiary">{t('configurator.steps.review.leadTime.unit')}</span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-dashed border-hairline pt-2">
            <dt className="text-mono-spec uppercase tracking-wider text-fg-secondary">
              {t('configurator.steps.review.leadTime.total')}
            </dt>
            <dd className="font-display text-h3 tabular-nums text-accent-amber">
              {t('configurator.steps.review.leadTime.range', {
                min: l?.totalDaysMin ?? 0, max: l?.totalDaysMax ?? 0,
              })}{' '}
              <span className="font-mono text-mono-spec text-fg-tertiary">
                {t('configurator.steps.review.leadTime.unit')}
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-caption text-fg-tertiary">
          {t('configurator.steps.review.leadTime.starts')}
        </p>
      </article>
    </div>
  );
}

function noteKeySuffix(note: string): string {
  // "smart-lock.vendor.24mo" → "SmartLockVendor"
  if (note === 'smart-lock.vendor.24mo') return 'SmartLockVendor';
  return note;
}

function openingLabel(
  t: (k: string) => string,
  opening: PaneOpeningType,
  hingeSide: HingeSide | null,
): string {
  switch (opening) {
    case 'Fixed':
      return t('configurator.steps.review.summary.openingFixed');
    case 'Tilt':
      return t('configurator.steps.review.summary.openingTilt');
    case 'TiltAndTurn':
      return t('configurator.steps.review.summary.openingTiltTurn');
    case 'Sliding':
      return t('configurator.steps.review.summary.openingSliding');
    case 'Casement':
      return hingeSide === 'Left'
        ? t('configurator.steps.review.summary.openingCasementLeft')
        : t('configurator.steps.review.summary.openingCasementRight');
  }
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

