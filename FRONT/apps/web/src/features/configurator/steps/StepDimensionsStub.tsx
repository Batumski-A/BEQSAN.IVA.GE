import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home } from 'lucide-react';

type Props = {
  onBack: () => void;
  onHome: () => void;
};

export function StepDimensionsStub({ onBack, onHome }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber">
        № 03 · {t('configurator.upcoming')}
      </div>
      <h1 className="mt-4 font-headline text-h2 text-balance text-fg-primary">
        {t('configurator.stub.title')}
      </h1>
      <p className="mt-6 max-w-xl text-body-lg text-pretty text-fg-secondary">
        {t('configurator.stub.body')}
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center gap-2 rounded-sm border border-hairline-strong px-4 font-mono text-mono-spec uppercase tracking-wider text-fg-primary transition-colors hover:border-accent-amber hover:text-accent-amber"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common.actions.back')}
        </button>
        <button
          type="button"
          onClick={onHome}
          className="inline-flex h-11 items-center gap-2 rounded-sm px-4 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary transition-colors hover:text-fg-primary"
        >
          <Home className="h-4 w-4" aria-hidden /> {t('nav.home')}
        </button>
      </div>
    </div>
  );
}
