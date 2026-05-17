import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Loader2, Star } from 'lucide-react';

import type {
  BlindControl,
  SillPosition,
} from '@beqsan/api-types';
import {
  useBlindTypesByProductType,
  useConfiguratorPrice,
  useHandleStylesByMaterial,
  useLockTypesByProductType,
  type BlindType,
  type HandleStyle,
  type LockType,
} from '../api';
import { useConfiguratorStore } from '../store';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';
import { firstLayoutError, translateLayoutError } from '../layout/layoutErrors';
import { PricePreview } from './PricePreview';

type Props = {
  onBack: () => void;
  onGoToStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => void;
};

export function StepAccessories({ onBack, onGoToStep }: Props) {
  const { t, i18n } = useTranslation();
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);
  const color = useConfiguratorStore((s) => s.color);
  const accessories = useConfiguratorStore((s) => s.accessories);
  const setHandle = useConfiguratorStore((s) => s.setHandle);
  const setLock = useConfiguratorStore((s) => s.setLock);
  const setSill = useConfiguratorStore((s) => s.setSill);
  const setBlind = useConfiguratorStore((s) => s.setBlind);
  const setDefaultHandleAndLock = useConfiguratorStore((s) => s.setDefaultHandleAndLock);

  const handlesQuery = useHandleStylesByMaterial(material?.id);
  const locksQuery = useLockTypesByProductType(productType?.id);
  const blindsQuery = useBlindTypesByProductType(productType?.id);

  const isDoor = productType?.slug === 'door';
  const openableCount = useMemo(
    () => panes.filter((p) => p.openingType !== 'Fixed').length,
    [panes],
  );

  // First-time catalog resolution: capture defaults so the door auto-fill
  // mutator can put a sensible handle + lock on the bundle.
  useEffect(() => {
    if (!handlesQuery.data || !locksQuery.data) return;
    const handleDefault = handlesQuery.data.find((h) => h.isDefault)?.id ?? null;
    const lockDefault = locksQuery.data.find((l) => l.isDefault)?.id ?? null;
    setDefaultHandleAndLock(handleDefault, lockDefault);
  }, [handlesQuery.data, locksQuery.data, setDefaultHandleAndLock]);

  // Debounced price recompute.
  const debouncedPanes = useDebouncedValue(panes, 400);
  const debouncedAccessories = useDebouncedValue(accessories, 400);
  const priceReq =
    productType && material
      ? {
          productTypeId: productType.id,
          materialId: material.id,
          widthCm: dimensions.widthCm,
          heightCm: dimensions.heightCm,
          panes: debouncedPanes,
          color: color ?? undefined,
          accessories: debouncedAccessories ?? undefined,
        }
      : null;
  const priceQuery = useConfiguratorPrice(priceReq);
  const layoutError = firstLayoutError(priceQuery.error);
  const layoutErrorText = layoutError ? translateLayoutError(layoutError, t) : null;

  // Sum the accessory lines so the sticky sub-summary can show them.
  const accessoriesTotalMinor = useMemo(() => {
    if (!priceQuery.data?.lines) return 0;
    return priceQuery.data.lines
      .filter((l) => (l.code ?? '').startsWith('accessory.'))
      .reduce((sum, l) => sum + (l.amountMinor ?? 0), 0);
  }, [priceQuery.data]);
  const accessoriesTotalDisplay = (accessoriesTotalMinor / 100).toFixed(2);

  const errorRegionId = useId();

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-8">
      <div className="lg:col-span-3">
        <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
          № 07 · {t('configurator.steps.accessories.title')}
        </div>
        <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary">
          {t('configurator.steps.accessories.heading')}
        </h1>
        <p className="mt-4 max-w-xl text-body text-pretty text-fg-secondary">
          {t('configurator.steps.accessories.intro')}
        </p>

        {handlesQuery.isLoading || locksQuery.isLoading || blindsQuery.isLoading ? (
          <div className="mt-8 flex items-center gap-3 text-fg-secondary">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="font-mono text-mono-spec uppercase tracking-wider">
              {t('common.states.loading')}
            </span>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {openableCount > 0 && (
              <HandleSection
                handles={handlesQuery.data ?? []}
                selectedId={accessories?.handleStyleId ?? null}
                openableCount={openableCount}
                isDoor={isDoor}
                locale={i18n.language}
                onPick={setHandle}
              />
            )}
            {openableCount > 0 && (
              <LockSection
                locks={locksQuery.data ?? []}
                selectedId={accessories?.lockTypeId ?? null}
                openableCount={openableCount}
                isDoor={isDoor}
                hasFullOpening={panes.some(
                  (p) => p.openingType === 'Casement' || p.openingType === 'TiltAndTurn',
                )}
                locale={i18n.language}
                onPick={setLock}
              />
            )}
            <SillSection
              sill={accessories?.sill ?? null}
              frameWidthCm={dimensions.widthCm}
              onChange={setSill}
            />
            <BlindSection
              blinds={blindsQuery.data ?? []}
              selected={accessories?.blind ?? null}
              locale={i18n.language}
              onChange={setBlind}
            />
            <MosquitoReviewSection
              panes={panes.map((p) => ({ position: p.position, on: p.hasMosquitoNet }))}
              onGoToStep4={() => onGoToStep(4)}
            />
          </div>
        )}

        {/* Sticky-ish accessories sub-summary at column foot */}
        {accessoriesTotalMinor > 0 && (
          <div className="mt-8 border-t border-dashed border-hairline pt-4 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
            {t('configurator.steps.accessories.subSummary', { amount: accessoriesTotalDisplay })}
          </div>
        )}

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
            // Step 8 (review) lands in the next slice. Continue is a
            // disabled stub for now.
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

// ── Handle section ──────────────────────────────────────────────────────
type HandleSectionProps = {
  handles: HandleStyle[];
  selectedId: string | null;
  openableCount: number;
  isDoor: boolean;
  locale: string;
  onPick: (id: string | null) => void;
};

function HandleSection({ handles, selectedId, openableCount, isDoor, locale, onPick }: HandleSectionProps) {
  const { t } = useTranslation();
  const legendId = useId();
  return (
    <fieldset className="rounded-sm border border-hairline bg-bg-raised p-5">
      <legend id={legendId} className="px-2 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
        {t('configurator.steps.accessories.sections.handle.title')}
        <span className="ml-3 text-fg-secondary">
          {t('configurator.steps.accessories.sections.handle.perPaneBadge', { count: openableCount })}
        </span>
      </legend>
      <div
        role="radiogroup"
        aria-labelledby={legendId}
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {handles.map((h) => (
          <AccessoryCard
            key={h.id}
            selected={h.id === selectedId}
            name={pickLocalized(h.name, locale, h.slug ?? '')}
            secondary={h.family ?? ''}
            priceLabel={h.surchargeDisplay
              ? `+${h.surchargeDisplay} ₾/pane`
              : ''}
            isDefault={h.isDefault ?? false}
            onPick={() => onPick(h.id ?? null)}
          />
        ))}
        {!isDoor && (
          <SkipCard
            selected={selectedId === null}
            label={t('configurator.steps.accessories.sections.handle.skip')}
            onPick={() => onPick(null)}
          />
        )}
      </div>
      {isDoor && selectedId === null && (
        <p className="mt-3 font-mono text-caption uppercase tracking-wider text-system-danger">
          {t('configurator.steps.accessories.sections.handle.doorRequired')}
        </p>
      )}
    </fieldset>
  );
}

// ── Lock section ────────────────────────────────────────────────────────
type LockSectionProps = {
  locks: LockType[];
  selectedId: string | null;
  openableCount: number;
  isDoor: boolean;
  hasFullOpening: boolean;
  locale: string;
  onPick: (id: string | null) => void;
};

function LockSection({ locks, selectedId, openableCount, isDoor, hasFullOpening, locale, onPick }: LockSectionProps) {
  const { t } = useTranslation();
  const legendId = useId();
  return (
    <fieldset className="rounded-sm border border-hairline bg-bg-raised p-5">
      <legend id={legendId} className="px-2 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
        {t('configurator.steps.accessories.sections.lock.title')}
        <span className="ml-3 text-fg-secondary">
          {t('configurator.steps.accessories.sections.handle.perPaneBadge', { count: openableCount })}
        </span>
      </legend>
      <div
        role="radiogroup"
        aria-labelledby={legendId}
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {locks.map((l) => {
          const disabled = l.requiresCasementOrTurn === true && !hasFullOpening;
          const grade = l.grade ?? 'basic';
          const gradeKey = grade === 'multiPoint' ? 'multiPoint' : grade;
          return (
            <LockCard
              key={l.id}
              selected={l.id === selectedId}
              name={pickLocalized(l.name, locale, l.slug ?? '')}
              gradeLabel={t(`configurator.steps.accessories.sections.lock.gradeBadge.${gradeKey}`)}
              stars={l.securityRating ?? 0}
              priceLabel={l.surchargeDisplay ? `+${l.surchargeDisplay} ₾/pane` : ''}
              isDefault={l.isDefault ?? false}
              disabled={disabled}
              disabledHint={disabled
                ? t('configurator.steps.accessories.sections.lock.requiresCasement')
                : null}
              onPick={() => {
                if (disabled) return;
                onPick(l.id ?? null);
              }}
            />
          );
        })}
        {!isDoor && (
          <SkipCard
            selected={selectedId === null}
            label={t('configurator.steps.accessories.sections.lock.skip')}
            onPick={() => onPick(null)}
          />
        )}
      </div>
      {isDoor && selectedId === null && (
        <p className="mt-3 font-mono text-caption uppercase tracking-wider text-system-danger">
          {t('configurator.steps.accessories.sections.lock.doorRequired')}
        </p>
      )}
    </fieldset>
  );
}

// ── Sill section ────────────────────────────────────────────────────────
type SillSectionProps = {
  sill: { position?: SillPosition | null; customLengthCm?: number | null } | null;
  frameWidthCm: number;
  onChange: (sill: { position: SillPosition; customLengthCm: number | null } | null) => void;
};

function SillSection({ sill, frameWidthCm, onChange }: SillSectionProps) {
  const { t } = useTranslation();
  const enabled = sill !== null;
  const position = (sill?.position ?? 'Inner') as SillPosition;
  const customLength = sill?.customLengthCm ?? null;
  const [useCustom, setUseCustom] = useState(customLength !== null);

  return (
    <fieldset className="rounded-sm border border-hairline bg-bg-raised p-5">
      <legend className="px-2 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
        {t('configurator.steps.accessories.sections.sill.title')}
        <span className="ml-3 text-fg-secondary">
          {t('configurator.steps.accessories.sections.sill.perMeterHint')}
        </span>
      </legend>
      <label className="mt-2 inline-flex cursor-pointer items-center gap-3 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              onChange({ position: 'Inner', customLengthCm: null });
              setUseCustom(false);
            } else {
              onChange(null);
              setUseCustom(false);
            }
          }}
          className="h-4 w-4 rounded-sm border-hairline-strong accent-accent-amber"
        />
        {t('configurator.steps.accessories.sections.sill.toggle')}
      </label>

      {enabled && (
        <div className="mt-4 space-y-4">
          <div role="radiogroup" aria-label={t('configurator.steps.accessories.sections.sill.position.label')}>
            <div className="font-mono text-caption uppercase tracking-wider text-fg-secondary">
              {t('configurator.steps.accessories.sections.sill.position.label')}
            </div>
            <div className="mt-2 inline-flex gap-1 rounded-sm border border-hairline bg-bg-elevated p-1">
              {(['Inner', 'Outer', 'Both'] as const).map((p) => {
                const active = p === position;
                const key = p.toLowerCase() as Lowercase<typeof p>;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ position: p, customLengthCm: customLength })}
                    className={cn(
                      'inline-flex h-9 items-center rounded-sm px-3 font-mono text-mono-spec uppercase tracking-wider transition-colors',
                      active
                        ? 'bg-accent-amber text-bg-base'
                        : 'text-fg-secondary hover:text-fg-primary',
                    )}
                  >
                    {t(`configurator.steps.accessories.sections.sill.position.${key}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="font-mono text-caption uppercase tracking-wider text-fg-secondary">
              {t('configurator.steps.accessories.sections.sill.length.label')}
            </div>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-3 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => {
                  setUseCustom(e.target.checked);
                  onChange({
                    position,
                    customLengthCm: e.target.checked ? frameWidthCm : null,
                  });
                }}
                className="h-4 w-4 rounded-sm border-hairline-strong accent-accent-amber"
              />
              {useCustom
                ? t('configurator.steps.accessories.sections.sill.length.customToggle')
                : t('configurator.steps.accessories.sections.sill.length.auto', { cm: frameWidthCm })}
            </label>
            {useCustom && (
              <input
                type="number"
                min={30}
                max={800}
                step={1}
                value={customLength ?? frameWidthCm}
                onChange={(e) =>
                  onChange({ position, customLengthCm: Number(e.target.value || 0) })
                }
                aria-label={t('configurator.steps.accessories.sections.sill.length.customRange')}
                className="mt-2 h-11 w-32 rounded-sm border border-hairline bg-bg-elevated px-3 font-mono text-mono-spec tabular-nums text-fg-primary"
              />
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}

// ── Blind section ───────────────────────────────────────────────────────
type BlindSectionProps = {
  blinds: BlindType[];
  selected: { blindTypeId: string; control: BlindControl } | null;
  locale: string;
  onChange: (blind: { blindTypeId: string; control: BlindControl } | null) => void;
};

function BlindSection({ blinds, selected, locale, onChange }: BlindSectionProps) {
  const { t } = useTranslation();
  const enabled = selected !== null;
  const legendId = useId();
  const selectedBlind = selected ? blinds.find((b) => b.id === selected.blindTypeId) : null;

  return (
    <fieldset className="rounded-sm border border-hairline bg-bg-raised p-5">
      <legend id={legendId} className="px-2 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
        {t('configurator.steps.accessories.sections.blind.title')}
      </legend>
      <label className="mt-2 inline-flex cursor-pointer items-center gap-3 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked && blinds.length > 0) {
              onChange({ blindTypeId: blinds[0]!.id!, control: 'Manual' });
            } else {
              onChange(null);
            }
          }}
          className="h-4 w-4 rounded-sm border-hairline-strong accent-accent-amber"
        />
        {t('configurator.steps.accessories.sections.blind.toggle')}
      </label>

      {enabled && (
        <div className="mt-4 space-y-4">
          <div role="radiogroup" aria-labelledby={legendId} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {blinds.map((b) => {
              const active = selected?.blindTypeId === b.id;
              const placement = b.placement ?? 'external';
              return (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ blindTypeId: b.id!, control: 'Manual' })}
                  className={cn(
                    'flex flex-col items-stretch gap-2 rounded-sm border bg-bg-elevated p-4 text-left transition-colors',
                    active
                      ? 'border-accent-amber ring-1 ring-accent-amber/30'
                      : 'border-hairline hover:border-hairline-strong',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                      {t(`configurator.steps.accessories.sections.blind.placement.${placement}`)}
                    </span>
                    {active && (
                      <Check className="h-4 w-4 text-accent-amber" aria-hidden />
                    )}
                  </div>
                  <span className="font-display text-body text-fg-primary">
                    {pickLocalized(b.name, locale, b.slug ?? '')}
                  </span>
                  <span className="font-mono text-caption uppercase tracking-wider text-accent-amber">
                    {t('configurator.steps.accessories.sections.blind.pricingHint', {
                      base: b.baseMountingDisplay ?? '0.00',
                      perSqm: b.surchargePerSqmDisplay ?? '0.00',
                    })}
                  </span>
                </button>
              );
            })}
          </div>

          {selected && selectedBlind && (
            <div role="radiogroup" aria-label={t('configurator.steps.accessories.sections.blind.control.label')}>
              <div className="font-mono text-caption uppercase tracking-wider text-fg-secondary">
                {t('configurator.steps.accessories.sections.blind.control.label')}
              </div>
              <div className="mt-2 inline-flex gap-1 rounded-sm border border-hairline bg-bg-elevated p-1">
                {(['Manual', 'Electric', 'Remote'] as const).map((ctl) => {
                  const active = ctl === selected.control;
                  const disabled = ctl !== 'Manual' && selectedBlind.supportsElectric !== true;
                  return (
                    <button
                      key={ctl}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        onChange({ blindTypeId: selected.blindTypeId, control: ctl });
                      }}
                      className={cn(
                        'inline-flex h-9 items-center rounded-sm px-3 font-mono text-mono-spec uppercase tracking-wider transition-colors',
                        active
                          ? 'bg-accent-amber text-bg-base'
                          : disabled
                            ? 'cursor-not-allowed text-fg-disabled'
                            : 'text-fg-secondary hover:text-fg-primary',
                      )}
                    >
                      {t(`configurator.steps.accessories.sections.blind.control.${ctl.toLowerCase()}`)}
                      {ctl === 'Electric' && (
                        <span className="ml-2 text-fg-tertiary">
                          {t('configurator.steps.accessories.sections.blind.control.electricSurcharge')}
                        </span>
                      )}
                      {ctl === 'Remote' && (
                        <span className="ml-2 text-fg-tertiary">
                          {t('configurator.steps.accessories.sections.blind.control.remoteSurcharge')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}

// ── Mosquito review section ─────────────────────────────────────────────
function MosquitoReviewSection({
  panes,
  onGoToStep4,
}: {
  panes: { position: number; on: boolean }[];
  onGoToStep4: () => void;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="rounded-sm border border-hairline bg-bg-raised p-5">
      <legend className="px-2 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
        {t('configurator.steps.accessories.sections.mosquito.title')}
      </legend>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {panes.map((p) => (
          <span
            key={p.position}
            className={cn(
              'inline-flex items-center gap-1 rounded-sm border px-3 py-1 font-mono text-caption uppercase tracking-wider',
              p.on
                ? 'border-accent-amber text-accent-amber'
                : 'border-hairline text-fg-tertiary',
            )}
          >
            {t('configurator.steps.accessories.sections.mosquito.paneSummary', {
              n: p.position,
              state: p.on
                ? t('configurator.steps.accessories.sections.mosquito.paneOn')
                : t('configurator.steps.accessories.sections.mosquito.paneOff'),
            })}
          </span>
        ))}
        <button
          type="button"
          onClick={onGoToStep4}
          className="inline-flex items-center gap-1 font-mono text-mono-spec uppercase tracking-wider text-accent-amber transition-colors hover:underline"
        >
          {t('configurator.steps.accessories.sections.mosquito.review')}
          <ChevronRight className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </fieldset>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────
type AccessoryCardProps = {
  selected: boolean;
  name: string;
  secondary: string;
  priceLabel: string;
  isDefault: boolean;
  onPick: () => void;
};

function AccessoryCard({ selected, name, secondary, priceLabel, isDefault, onPick }: AccessoryCardProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={cn(
        'relative flex flex-col items-stretch gap-1 rounded-sm border bg-bg-elevated p-3 text-left transition-colors',
        selected
          ? 'border-accent-amber ring-1 ring-accent-amber/30'
          : 'border-hairline hover:border-hairline-strong',
      )}
    >
      <span className="font-display text-body text-fg-primary">{name}</span>
      <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
        {secondary}
      </span>
      <span className="font-mono text-caption uppercase tracking-wider text-accent-amber tabular-nums">
        {priceLabel}
      </span>
      {isDefault && (
        <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          {t('configurator.steps.color.default')}
        </span>
      )}
      {selected && (
        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-amber text-bg-base">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      )}
    </button>
  );
}

type LockCardProps = {
  selected: boolean;
  name: string;
  priceLabel: string;
  isDefault: boolean;
  onPick: () => void;
  gradeLabel: string;
  stars: number;
  disabled: boolean;
  disabledHint: string | null;
};

function LockCard({
  selected,
  name,
  gradeLabel,
  stars,
  priceLabel,
  disabled,
  disabledHint,
  onPick,
}: LockCardProps) {
  const hintId = useId();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      aria-describedby={disabled && disabledHint ? hintId : undefined}
      onClick={onPick}
      className={cn(
        'relative flex flex-col items-stretch gap-1 rounded-sm border bg-bg-elevated p-3 text-left transition-colors',
        disabled
          ? 'cursor-not-allowed border-hairline opacity-50'
          : selected
            ? 'border-accent-amber ring-1 ring-accent-amber/30'
            : 'border-hairline hover:border-hairline-strong',
      )}
    >
      <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
        {gradeLabel}
      </span>
      <span className="font-display text-body text-fg-primary">{name}</span>
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn('h-3 w-3', i < stars ? 'fill-accent-amber text-accent-amber' : 'text-fg-tertiary')}
          />
        ))}
      </span>
      <span className="font-mono text-caption uppercase tracking-wider text-accent-amber tabular-nums">
        {priceLabel}
      </span>
      {disabled && disabledHint && (
        <span id={hintId} className="mt-1 font-mono text-caption uppercase tracking-wider text-fg-disabled">
          {disabledHint}
        </span>
      )}
      {selected && (
        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-amber text-bg-base">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      )}
    </button>
  );
}

function SkipCard({ selected, label, onPick }: { selected: boolean; label: string; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={cn(
        'flex items-center justify-center rounded-sm border border-dashed bg-bg-raised p-3 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary transition-colors',
        selected
          ? 'border-accent-amber text-accent-amber'
          : 'border-hairline hover:border-hairline-strong hover:text-fg-primary',
      )}
    >
      {label}
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
