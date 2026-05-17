import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import type { ConfiguratorStep } from './store';
import { cn } from '@/shared/lib/cn';

type StepDef = {
  num: ConfiguratorStep;
  key: string;
  upcoming?: boolean;
};

const STEPS: StepDef[] = [
  { num: 1, key: 'type' },
  { num: 2, key: 'material' },
  { num: 3, key: 'dimensions', upcoming: true },
];

type StepIndicatorProps = {
  currentStep: ConfiguratorStep;
  onStepClick?: (step: ConfiguratorStep) => void;
};

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Desktop — vertical ticker */}
      <nav
        aria-label={t('configurator.stepNavLabel')}
        className="hidden md:flex md:flex-col md:gap-8 md:sticky md:top-24"
      >
        {STEPS.map((s, i) => (
          <StepRow
            key={s.num}
            step={s}
            isActive={s.num === currentStep}
            isPast={s.num < currentStep}
            isLast={i === STEPS.length - 1}
            label={t(`configurator.steps.${s.key}.title`)}
            upcomingLabel={t('configurator.upcoming')}
            onClick={s.upcoming || s.num >= currentStep ? undefined : () => onStepClick?.(s.num)}
          />
        ))}
      </nav>

      {/* Mobile — horizontal mini-rail */}
      <nav
        aria-label={t('configurator.stepNavLabel')}
        className="md:hidden mb-8 flex items-center gap-3 overflow-x-auto"
      >
        {STEPS.map((s) => (
          <MiniStep
            key={s.num}
            step={s}
            isActive={s.num === currentStep}
            isPast={s.num < currentStep}
            label={t(`configurator.steps.${s.key}.title`)}
            upcomingLabel={t('configurator.upcoming')}
            onClick={s.upcoming || s.num >= currentStep ? undefined : () => onStepClick?.(s.num)}
          />
        ))}
      </nav>
    </>
  );
}

function StepRow({
  step,
  isActive,
  isPast,
  isLast,
  label,
  upcomingLabel,
  onClick,
}: {
  step: StepDef;
  isActive: boolean;
  isPast: boolean;
  isLast: boolean;
  label: string;
  upcomingLabel: string;
  onClick?: () => void;
}) {
  const padded = step.num.toString().padStart(2, '0');
  const interactive = Boolean(onClick);

  return (
    <div className="relative flex items-start gap-4">
      {!isLast ? (
        <span
          aria-hidden
          className={cn(
            'absolute left-2 top-7 h-12 w-px transition-colors duration-480 ease-heavy',
            isPast ? 'bg-accent-amber/60' : 'bg-hairline',
          )}
        />
      ) : null}

      <motion.span
        layout
        transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden
        className={cn(
          'mt-1 inline-block h-4 w-4 rounded-full border transition-colors duration-240 ease-standard',
          isActive
            ? 'border-accent-amber bg-accent-amber'
            : isPast
              ? 'border-accent-amber/60 bg-accent-amber/60'
              : 'border-hairline-strong bg-bg-base',
        )}
      />

      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        className={cn(
          'flex flex-col items-start text-left transition-colors duration-120',
          interactive ? 'cursor-pointer hover:text-fg-primary' : 'cursor-default',
        )}
      >
        <span
          className={cn(
            'font-mono text-mono-spec uppercase tracking-wider',
            isActive ? 'text-accent-amber' : 'text-fg-tertiary',
          )}
        >
          {padded}
          {step.upcoming ? <span className="ml-2 text-fg-tertiary">· {upcomingLabel}</span> : null}
        </span>
        <span
          className={cn(
            'mt-1 font-headline text-h4',
            isActive ? 'text-fg-primary' : 'text-fg-secondary',
          )}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

function MiniStep({
  step,
  isActive,
  isPast,
  label,
  upcomingLabel,
  onClick,
}: {
  step: StepDef;
  isActive: boolean;
  isPast: boolean;
  label: string;
  upcomingLabel: string;
  onClick?: () => void;
}) {
  const padded = step.num.toString().padStart(2, '0');
  const interactive = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        'shrink-0 rounded-sm border px-3 py-2 transition-colors duration-120',
        isActive
          ? 'border-accent-amber bg-accent-amber/10'
          : isPast
            ? 'border-accent-amber/40'
            : 'border-hairline',
        interactive ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <span
        className={cn(
          'font-mono text-caption uppercase tracking-wider',
          isActive ? 'text-accent-amber' : 'text-fg-tertiary',
        )}
      >
        {padded}
        {step.upcoming ? <span className="ml-1 text-fg-tertiary">·{upcomingLabel}</span> : null}
      </span>
      <span
        className={cn(
          'mt-0.5 block text-body-sm',
          isActive ? 'text-fg-primary' : 'text-fg-secondary',
        )}
      >
        {label}
      </span>
    </button>
  );
}
