import { useEffect, lazy, Suspense, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useConfiguratorStore, type ConfiguratorStep } from './store';
import { StepIndicator } from './StepIndicator';
import { StepType } from './steps/StepType';
import { StepMaterial } from './steps/StepMaterial';
import { StepDimensions } from './steps/StepDimensions';
import { StepLayout } from './steps/StepLayout';
import { StepGlass } from './steps/StepGlass';
import { StepColor } from './steps/StepColor';
import { StepAccessories } from './steps/StepAccessories';
import { StepReview } from './steps/StepReview';

// Lazy 3D scene — heavy bundle, only paid when configurator opens.
const ConfiguratorScene = lazy(() =>
  import('./3d/Scene').then((m) => ({ default: m.ConfiguratorScene })),
);

export default function ConfiguratorPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const stepParam = parseStep(params.get('step'));
  const storedStep = useConfiguratorStore((s) => s.step);
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const goToStep = useConfiguratorStore((s) => s.goToStep);

  // Guard rails: each step depends on the prior selection landing. Step 4
  // assumes dimensions exist — the store always seeds them at midpoint, so
  // the only invalid path is missing productType or material.
  useEffect(() => {
    const desired = stepParam ?? storedStep;
    let normalised: ConfiguratorStep = desired;
    if (desired >= 2 && !productType) normalised = 1;
    if (desired >= 3 && !material) {
      normalised = (productType ? 2 : 1) as ConfiguratorStep;
    }
    if (desired >= 4 && !material) {
      normalised = (productType ? 2 : 1) as ConfiguratorStep;
    }
    if (desired >= 5 && !material) {
      normalised = (productType ? 2 : 1) as ConfiguratorStep;
    }
    if (desired >= 6 && !material) {
      normalised = (productType ? 2 : 1) as ConfiguratorStep;
    }
    if (desired >= 7 && !material) {
      normalised = (productType ? 2 : 1) as ConfiguratorStep;
    }
    if (desired >= 8 && !material) {
      normalised = (productType ? 2 : 1) as ConfiguratorStep;
    }

    if (normalised !== stepParam) {
      const next = new URLSearchParams(params);
      next.set('step', String(normalised));
      setParams(next, { replace: true });
    }
    if (normalised !== storedStep) {
      goToStep(normalised);
    }
  }, [stepParam, storedStep, productType, material, params, setParams, goToStep]);

  const activeStep: ConfiguratorStep = useMemo(() => {
    const desired = stepParam ?? storedStep;
    if (desired >= 2 && !productType) return 1;
    if (desired >= 3 && !material) return 2;
    return desired;
  }, [stepParam, storedStep, productType, material]);

  const handleAdvance = (step: ConfiguratorStep) => {
    const next = new URLSearchParams(params);
    next.set('step', String(step));
    setParams(next);
    goToStep(step);
  };

  return (
    <>
      <Helmet>
        <title>{t('configurator.metaTitle')} · BEQSAN</title>
        <meta name="description" content={t('configurator.metaDescription')} />
      </Helmet>

      <section className="mx-auto max-w-content px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
          <aside className="md:col-span-2">
            <StepIndicator currentStep={activeStep} onStepClick={handleAdvance} />
          </aside>

          <div className="md:col-span-6">
            {activeStep === 1 ? (
              <StepType onAdvance={() => handleAdvance(2)} />
            ) : activeStep === 2 ? (
              <StepMaterial
                onBack={() => handleAdvance(1)}
                onAdvance={() => handleAdvance(3)}
              />
            ) : activeStep === 3 ? (
              <StepDimensions
                onBack={() => handleAdvance(2)}
                onAdvance={() => handleAdvance(4)}
              />
            ) : activeStep === 4 ? (
              <StepLayout
                onBack={() => handleAdvance(3)}
                onAdvance={() => handleAdvance(5)}
              />
            ) : activeStep === 5 ? (
              <StepGlass
                onBack={() => handleAdvance(4)}
                onAdvance={() => handleAdvance(6)}
              />
            ) : activeStep === 6 ? (
              <StepColor
                onBack={() => handleAdvance(5)}
                onAdvance={() => handleAdvance(7)}
              />
            ) : activeStep === 7 ? (
              <StepAccessories
                onBack={() => handleAdvance(6)}
                onGoToStep={handleAdvance}
                onAdvance={() => handleAdvance(8)}
              />
            ) : (
              <StepReview
                onBack={() => handleAdvance(7)}
                onGoToStep={handleAdvance}
                onSendOrder={() => handleAdvance(9)}
              />
            )}
          </div>

          <div className="md:col-span-4">
            <div className="sticky top-24">
              {activeStep >= 3 ? (
                <Suspense fallback={<SceneFallback label={t('configurator.scene.loading')} />}>
                  <ConfiguratorScene />
                </Suspense>
              ) : (
                <ScenePlaceholder
                  step={activeStep}
                  title={t('configurator.scene.placeholder.title')}
                  body={t(
                    activeStep === 1
                      ? 'configurator.scene.placeholder.bodyStep1'
                      : 'configurator.scene.placeholder.bodyStep2',
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Right-column placeholder shown on Steps 1-2 — before the user has picked
 * a product type + material, the 3D scene has nothing to draw and was
 * rendering as an empty frame floating in the dark. Editorial copy with
 * the same aspect-square footprint as the Canvas keeps the layout stable
 * when the scene swaps in on Step 3.
 */
function ScenePlaceholder({
  step,
  title,
  body,
}: {
  step: ConfiguratorStep;
  title: string;
  body: string;
}) {
  const padded = step.toString().padStart(2, '0');
  return (
    <div className="relative flex aspect-square flex-col justify-end overflow-hidden rounded-sm border border-hairline bg-bg-elevated p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(245,179,66,0.10),transparent_55%)]"
      />
      <div className="relative z-10 font-mono text-mono-spec uppercase tracking-wider text-accent-amber">
        № {padded} · ხედი
      </div>
      <div className="relative z-10 mt-3 font-headline text-h3 text-balance text-fg-primary">
        {title}
      </div>
      <p className="relative z-10 mt-3 max-w-xs text-body-sm text-pretty text-fg-secondary">
        {body}
      </p>
    </div>
  );
}

function SceneFallback({ label }: { label: string }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-sm border border-hairline bg-bg-elevated">
      <span className="animate-pulse-soft font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
        {label}
      </span>
    </div>
  );
}

function parseStep(raw: string | null): ConfiguratorStep | null {
  if (raw === '1' || raw === '2' || raw === '3' || raw === '4'
      || raw === '5' || raw === '6' || raw === '7' || raw === '8') {
    return Number(raw) as ConfiguratorStep;
  }
  return null;
}
