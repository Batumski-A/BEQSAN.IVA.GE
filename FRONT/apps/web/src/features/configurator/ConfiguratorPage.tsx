import { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useConfiguratorStore, type ConfiguratorStep } from './store';
import { StepType } from './steps/StepType';
import { StepMaterial } from './steps/StepMaterial';
import { StepDimensions } from './steps/StepDimensions';
import { StepLayout } from './steps/StepLayout';
import { StepGlass } from './steps/StepGlass';
import { StepColor } from './steps/StepColor';
import { StepAccessories } from './steps/StepAccessories';
import { StepReview } from './steps/StepReview';
import { ConfiguratorShell } from './shell/ConfiguratorShell';

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

  const handleSendOrder = () => handleAdvance(9);

  return (
    <>
      <Helmet>
        <title>{t('configurator.metaTitle')} · BEQSAN</title>
        <meta name="description" content={t('configurator.metaDescription')} />
      </Helmet>

      <ConfiguratorShell
        activeStep={activeStep}
        onStepClick={handleAdvance}
        onSendOrder={handleSendOrder}
      >
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
            onSendOrder={handleSendOrder}
          />
        )}
      </ConfiguratorShell>
    </>
  );
}

function parseStep(raw: string | null): ConfiguratorStep | null {
  if (
    raw === '1' || raw === '2' || raw === '3' || raw === '4' ||
    raw === '5' || raw === '6' || raw === '7' || raw === '8'
  ) {
    return Number(raw) as ConfiguratorStep;
  }
  return null;
}
