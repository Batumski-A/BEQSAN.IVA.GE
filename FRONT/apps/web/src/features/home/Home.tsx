import { Box, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

/**
 * Home page — Modern Studio direction (2026-05-19 pivot).
 * Mirrors the Gemini prototype layout: 85vh dark hero with looping video +
 * three-card materials section (white / dark / white rhythm). All copy
 * routes through i18n; tokens come from the `studio.*` Tailwind scale.
 */
export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="bg-studio-paper">
      <Hero t={t} />
      <Materials t={t} />
    </div>
  );
}

function Hero({ t }: { t: TFunction }) {
  return (
    <section className="relative flex h-[85vh] min-h-[600px] items-center justify-center overflow-hidden">
      {/* Hero plate. Phase 1.5 will swap this <img> for a <video autoPlay loop
          muted> of installed Batumi windows. Until that footage exists, the
          Pexels architectural still keeps the surface from rendering as a
          flat dark void. */}
      <img
        src="/video/hero-poster.jpg"
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover"
        loading="eager"
        decoding="async"
        aria-hidden
      />

      <div aria-hidden className="absolute inset-0 bg-studio-ink/60 backdrop-blur-[2px]" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center font-studio text-white">
        <span className="mb-8 inline-block rounded-full border border-studio-brand/30 bg-studio-brand/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-studio-brand-soft backdrop-blur-md">
          {t('home.heroKicker')}
        </span>

        <h1 className="mb-8 text-5xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-2xl md:text-7xl">
          {t('home.heroTitleLine1')}
          {' '}
          <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-studio-brand-soft to-indigo-400 bg-clip-text text-transparent">
            {t('home.heroTitleLine2')}
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-xl font-light leading-relaxed text-slate-300">
          {t('home.heroLead')}
        </p>

        <div className="flex items-center justify-center">
          <Link
            to="/configurator"
            className="flex items-center justify-center gap-3 rounded-full bg-studio-brand px-10 py-4 text-lg font-bold text-white shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all hover:scale-105 hover:bg-studio-brand-h"
          >
            <span>{t('home.heroCta')}</span>
            <Box className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Materials({ t }: { t: TFunction }) {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center font-studio">
          <h2 className="mb-4 text-3xl font-bold text-studio-fg md:text-4xl">
            {t('home.materialsTitle')}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-500">
            {t('home.materialsSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 font-studio md:grid-cols-3">
          <Card
            title={t('home.materials.aluminum.title')}
            body={t('home.materials.aluminum.body')}
            badge={t('home.materials.aluminum.badge')}
          />
          <Card
            inverse
            title={t('home.materials.glass.title')}
            body={t('home.materials.glass.body')}
            badge={t('home.materials.glass.badge')}
          />
          <Card
            title={t('home.materials.hardware.title')}
            body={t('home.materials.hardware.body')}
            badge={t('home.materials.hardware.badge')}
          />
        </div>
      </div>
    </section>
  );
}

type CardProps = {
  title: string;
  body: string;
  badge: string;
  inverse?: boolean;
};

function Card({ title, body, badge, inverse }: CardProps) {
  if (inverse) {
    return (
      <article className="rounded-3xl border border-studio-ink-3 bg-studio-fg p-8 shadow-2xl transition-transform hover:-translate-y-2">
        <h3 className="mb-3 text-2xl font-bold text-white">{title}</h3>
        <p className="mb-6 text-slate-400">{body}</p>
        <div className="flex items-center gap-2 font-bold text-studio-brand-soft">
          <Check className="h-5 w-5" aria-hidden />
          <span>{badge}</span>
        </div>
      </article>
    );
  }
  return (
    <article className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl transition-transform hover:-translate-y-2">
      <h3 className="mb-3 text-2xl font-bold text-studio-fg">{title}</h3>
      <p className="mb-6 text-studio-fg-mute">{body}</p>
      <div className="flex items-center gap-2 font-bold text-studio-brand">
        <Check className="h-5 w-5" aria-hidden />
        <span>{badge}</span>
      </div>
    </article>
  );
}
