import { useEffect, lazy, Suspense, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useConfiguratorStore, type ConfiguratorStep } from './store';
import { StepIndicator } from './StepIndicator';
import { StepType } from './steps/StepType';
import { StepMaterial } from './steps/StepMaterial';
import { StepDimensions } from './steps/StepDimensions';
import { StepDimensionsStub } from './steps/StepDimensionsStub';

// Lazy 3D scene — heavy bundle, only paid when configurator opens.
const ConfiguratorScene = lazy(() =>
  import('./3d/Scene').then((m) => ({ default: m.ConfiguratorScene })),
);

export default function ConfiguratorPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const stepParam = parseStep(params.get('step'));
  const storedStep = useConfiguratorStore((s) => s.step);
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const goToStep = useConfiguratorStore((s) => s.goToStep);

  // Guard rails: step 2 needs productType, step 3 needs material, step 4 needs
  // valid dimensions (TODO when Step 4 lands — for now step 4 is the cliff).
  useEffect(() => {
    const desired = stepParam ?? storedStep;
    let normalised: ConfiguratorStep = desired;
    if (desired >= 2 && !productType) normalised = 1;
    if (desired >= 3 && !material) {
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
            ) : (
              <StepDimensionsStub onBack={() => handleAdvance(3)} onHome={() => navigate('/')} />
            )}
          </div>

          <div className="md:col-span-4">
            <div className="sticky top-24">
              <Suspense fallback={<SceneFallback label={t('configurator.scene.loading')} />}>
                <ConfiguratorScene />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </>
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
  if (raw === '1' || raw === '2' || raw === '3' || raw === '4') {
    return Number(raw) as ConfiguratorStep;
  }
  return null;
}
