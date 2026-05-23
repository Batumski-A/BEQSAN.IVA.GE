import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import { useConfiguratorStore, type ConfiguratorStep } from '../store';
import { StepIndicator } from '../StepIndicator';
import { Blueprint2DViewer } from '../blueprint/Blueprint2DViewer';
import { ViewModeToggle, type ViewMode } from './ViewModeToggle';
import { PriceChip } from './PriceChip';

// Lazy 3D — same boundary as the legacy ConfiguratorPage so the bundle
// budget doesn't move.
const ConfiguratorScene = lazy(() =>
  import('../3d/Scene').then((m) => ({ default: m.ConfiguratorScene })),
);

type Props = {
  activeStep: ConfiguratorStep;
  onStepClick: (step: ConfiguratorStep) => void;
  onSendOrder: () => void;
  children: ReactNode;
};

/**
 * Modern Studio shell wrapping BEQSAN's 8-step configurator. The shell is a
 * full-bleed dark canvas hosting:
 *
 *   • back chip + StepIndicator (top-center horizontal rail).
 *   • ViewModeToggle + PriceChip + primary CTA (top-right).
 *   • The lazy R3F scene docked absolute inset-0 behind everything (3D + Preview).
 *   • <Blueprint2DViewer> swapped in when mode === '2d'.
 *   • A right-side floating glass panel (~360px) rendering the active step's
 *     content via the `children` prop. The 8 existing step components keep
 *     their data flow + pricing-API logic intact.
 *
 * The shell owns ONE piece of local state: viewMode. Everything else still
 * flows through the existing Zustand store and TanStack queries.
 */
export function ConfiguratorShell({
  activeStep,
  onStepClick,
  onSendOrder,
  children,
}: Props) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const reducedMotion = useReducedMotion();
  const material = useConfiguratorStore((s) => s.material);

  const sceneReady = activeStep >= 3 && Boolean(material);
  const panelsVisible = viewMode !== 'preview';

  const panelTransition: Transition = reducedMotion
    ? { duration: 0.1, ease: 'linear' }
    : { duration: 0.32, ease: [0.16, 1, 0.3, 1] };

  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-studio-ink font-studio text-studio-fg-inv">
      {/* Layer 1 — canvas (3D scene or 2D blueprint). The 3D scene sits in
          a docking wrapper that strips its own rounded-card chrome via
          absolute inset-0; the blueprint is a self-contained SVG card. */}
      <div className="absolute inset-0 z-0">
        {viewMode === '2d' ? (
          <div className="h-full w-full p-6 md:p-10 lg:p-16">
            <Blueprint2DViewer />
          </div>
        ) : sceneReady ? (
          <Suspense fallback={<SceneFallback label={t('configurator.scene.loading')} />}>
            <div className="absolute inset-0">
              <ConfiguratorScene />
            </div>
          </Suspense>
        ) : (
          <ScenePlaceholder
            title={t('configurator.scene.placeholder.title')}
            body={t(
              activeStep === 1
                ? 'configurator.scene.placeholder.bodyStep1'
                : 'configurator.scene.placeholder.bodyStep2',
            )}
          />
        )}
      </div>

      {/* Layer 2 — back chip (always on, even in preview mode) */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 md:left-6 md:top-6">
        <Link
          to="/"
          aria-label={t('configurator.shell.back')}
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-studio-ink-3/50 bg-studio-ink-2/80 text-studio-fg-inv-mute shadow-2xl backdrop-blur-md transition-colors duration-200 hover:text-studio-fg-inv motion-reduce:transition-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {/* Layer 3 — top step indicator */}
      {panelsVisible ? (
        <motion.div
          key="step-rail"
          initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={panelTransition}
          className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 md:top-6"
        >
          <div className="pointer-events-auto rounded-2xl border border-studio-ink-3/50 bg-studio-ink-2/80 px-4 py-2 shadow-2xl backdrop-blur-md">
            <ShellStepIndicator currentStep={activeStep} onStepClick={onStepClick} />
          </div>
        </motion.div>
      ) : null}

      {/* Layer 4 — top-right cluster (view mode + price + CTA) */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-3 md:right-6 md:top-6">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        {panelsVisible ? <PriceChip onSendOrder={onSendOrder} /> : null}
      </div>

      {/* Layer 5 — right floating step panel */}
      {panelsVisible ? (
        <motion.aside
          key={`step-panel-${activeStep}`}
          initial={{ opacity: 0, x: reducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={panelTransition}
          className={cn(
            'absolute right-4 top-24 z-20 flex max-h-[calc(100vh-7rem)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-studio-ink-3/50 bg-studio-ink-2/80 shadow-2xl backdrop-blur-md md:right-6 md:top-28',
          )}
          aria-label={t('configurator.shell.stepPanelAria')}
        >
          <div className="overflow-y-auto p-5 [&_h1]:!text-h4 [&_h1]:!text-studio-fg-inv [&_h2]:!text-studio-fg-inv [&_p]:!text-studio-fg-inv-mute">
            {children}
          </div>
        </motion.aside>
      ) : null}

      {/* Layer 6 — preview-mode hint, only when panels are hidden */}
      {!panelsVisible ? (
        <div
          aria-live="polite"
          className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-studio-ink-3/50 bg-studio-ink-2/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-studio-fg-inv-mute shadow-2xl backdrop-blur-md"
        >
          {t('configurator.shell.previewHint')}
        </div>
      ) : null}
    </main>
  );
}

/**
 * Compact horizontal version of the step indicator for the shell's top-center
 * dock. We re-use the existing <StepIndicator> on mobile-mode (which already
 * renders a horizontal mini-rail), wrapped so the dark-on-dark blends with
 * the glass panel.
 */
function ShellStepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: ConfiguratorStep;
  onStepClick: (step: ConfiguratorStep) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <StepIndicator currentStep={currentStep} onStepClick={onStepClick} />
    </div>
  );
}

function SceneFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="animate-pulse-soft font-mono text-xs font-bold uppercase tracking-wider text-studio-fg-inv-soft">
        {label}
      </span>
    </div>
  );
}

function ScenePlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(37,99,235,0.18),transparent_55%)]"
      />
      <div className="relative z-10 max-w-md px-6 text-center">
        <h2 className="text-balance text-3xl font-extrabold leading-tight text-studio-fg-inv md:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-pretty text-sm text-studio-fg-inv-mute md:text-base">
          {body}
        </p>
      </div>
    </div>
  );
}
