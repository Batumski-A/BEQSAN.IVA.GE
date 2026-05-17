import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-content flex-col items-start justify-center px-4 py-22 md:px-8">
      <div className="font-mono text-mono-spec uppercase tracking-wider text-accent-amber">
        404
      </div>
      <h1 className="mt-4 font-headline text-h1 text-balance text-fg-primary">
        {t('stub.notFound')}
      </h1>
      <Link
        to="/"
        className="mt-10 inline-flex h-12 items-center rounded-sm border border-hairline-strong px-6 font-mono text-mono-spec uppercase tracking-wider text-fg-primary transition-colors hover:border-accent-amber hover:text-accent-amber"
      >
        ← {t('nav.home')}
      </Link>
    </section>
  );
}
