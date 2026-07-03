import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import {
  AssemblyIllustration,
  WorkshopHeroIllustration,
} from '@/shared/illustrations/WorkshopIllustrations';
import { Seo } from '@/shared/seo/Seo';

const enter = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
};

const staggered = (delay: number) => ({
  ...enter,
  transition: { ...enter.transition, delay },
});

export default function About() {
  const { t } = useTranslation();
  return (
    <>
      <Seo
        route="/about"
        breadcrumb={[
          { name: 'მთავარი', path: '/' },
          { name: 'ჩვენ შესახებ', path: '/about' },
        ]}
      />

      <Hero t={t} />
      <Intro t={t} />
      <Quote t={t} />
      <Facts t={t} />
      <Suppliers t={t} />
      <Founder t={t} />
      <Values t={t} />
      <CtaBlock t={t} />
    </>
  );
}

function Hero({ t }: { t: TFunction }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="mx-auto grid max-w-content gap-12 px-4 pb-22 pt-30 md:grid-cols-12 md:px-8 md:pb-30 md:pt-46">
        <div className="md:col-span-7">
          <motion.div
            {...staggered(0)}
            className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber"
          >
            № 01 · {t('about.eyebrow')}
          </motion.div>
          <motion.h1
            {...staggered(0.08)}
            className="mt-8 font-display text-display-2 leading-[0.95] tracking-tight text-balance text-fg-primary md:text-display-1"
          >
            {t('about.heading')}
          </motion.h1>
          <motion.p
            {...staggered(0.18)}
            className="mt-10 max-w-xl text-body-lg text-pretty text-fg-secondary"
          >
            {t('about.lead')}
          </motion.p>
        </div>
        <motion.div
          {...staggered(0.24)}
          className="hidden text-fg-tertiary md:col-span-5 md:flex md:items-end md:justify-end"
          aria-hidden
        >
          <WorkshopHeroIllustration className="w-full max-w-md text-fg-tertiary" />
        </motion.div>
      </div>
    </section>
  );
}

function Intro({ t }: { t: TFunction }) {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-22 md:grid-cols-12 md:px-8 md:py-30">
        <div className="md:col-span-3">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
            № 02
          </div>
          <h2 className="mt-3 font-headline text-h2 text-balance text-fg-primary">
            {t('about.introTitle')}
          </h2>
        </div>
        <div className="space-y-6 md:col-span-7 md:col-start-5">
          <p className="text-body-lg text-pretty text-fg-secondary">{t('about.introBody1')}</p>
          <p className="text-body-lg text-pretty text-fg-secondary">{t('about.introBody2')}</p>
        </div>
      </div>
    </section>
  );
}

function Quote({ t }: { t: TFunction }) {
  return (
    <section className="border-y border-hairline bg-bg-elevated">
      <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
        <figure className="mx-auto max-w-3xl text-center">
          <span aria-hidden className="block font-display text-display-1 leading-none text-accent-amber">
            "
          </span>
          <blockquote className="mt-6 font-display text-h1 leading-tight text-balance text-fg-primary md:text-display-2">
            {t('about.quote')}
          </blockquote>
          <figcaption className="mt-10 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
            — <cite className="not-italic">{t('about.quoteAuthor')}</cite>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Facts({ t }: { t: TFunction }) {
  const items: Array<[string, string]> = [
    [t('about.fact1Label'), t('about.fact1Value')],
    [t('about.fact2Label'), t('about.fact2Value')],
    [t('about.fact3Label'), t('about.fact3Value')],
    [t('about.fact4Label'), t('about.fact4Value')],
  ];
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-22">
        <div className="mb-10 font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
          {t('about.factsLabel')}
        </div>
        <dl className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-x-8 md:gap-y-0">
          {items.map(([label, value]) => (
            <div
              key={label}
              className="md:border-r md:border-hairline md:pr-8 md:last:border-r-0"
            >
              <dt className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
                {label}
              </dt>
              <dd className="mt-3 font-display text-display-2 leading-none tabular-nums text-fg-primary">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Suppliers({ t }: { t: TFunction }) {
  return (
    <section className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № 03
          </div>
          <h2 className="mt-3 font-headline text-h2 text-balance text-fg-primary">
            {t('about.suppliersTitle')}
          </h2>
        </div>
        <div className="md:col-span-7 md:col-start-6">
          <p className="text-body-lg text-pretty text-fg-secondary">
            {t('about.suppliersBody')}
          </p>
          <p className="mt-6 border-l-2 border-accent-amber/60 pl-4 text-body text-pretty text-fg-tertiary">
            {t('about.suppliersNote')}
          </p>
        </div>
      </div>
    </section>
  );
}

function Founder({ t }: { t: TFunction }) {
  return (
    <section className="border-y border-hairline bg-bg-elevated">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-22 md:grid-cols-12 md:px-8 md:py-30">
        <div className="text-fg-tertiary md:col-span-5" aria-hidden>
          <AssemblyIllustration className="w-full max-w-md text-fg-tertiary" />
        </div>
        <div className="md:col-span-6 md:col-start-7">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
            № 04 · {t('about.founderRole')}
          </div>
          <h2 className="mt-3 font-headline text-display-2 leading-tight text-balance text-fg-primary">
            {t('about.founderTitle')}
          </h2>
          <p className="mt-8 max-w-xl text-body-lg text-pretty text-fg-secondary">
            {t('about.founderBio')}
          </p>
        </div>
      </div>
    </section>
  );
}

function Values({ t }: { t: TFunction }) {
  const items: Array<{ n: string; title: string; body: string }> = [
    { n: '01', title: t('about.value1Title'), body: t('about.value1Body') },
    { n: '02', title: t('about.value2Title'), body: t('about.value2Body') },
    { n: '03', title: t('about.value3Title'), body: t('about.value3Body') },
  ];
  return (
    <section className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
      <div className="mb-12 max-w-2xl">
        <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
          № 05 · {t('about.valuesTitle')}
        </div>
        <h2 className="mt-4 font-headline text-h1 text-balance text-fg-primary">
          {t('about.valuesTitle')}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
        {items.map((item) => (
          <article
            key={item.n}
            className="group flex flex-col gap-4 border-t border-hairline pt-6 transition-colors duration-240 ease-standard hover:border-hairline-strong"
          >
            <span className="font-mono text-mono-spec uppercase tracking-wider text-accent-amber">
              {item.n}
            </span>
            <h3 className="font-headline text-h3 text-fg-primary">{item.title}</h3>
            <p className="text-body text-pretty text-fg-secondary">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CtaBlock({ t }: { t: TFunction }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-hairline bg-bg-elevated">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-22 md:grid-cols-12 md:px-8 md:py-30">
        <div className="md:col-span-7">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № 06 · {t('about.ctaTitle')}
          </div>
          <h2 className="mt-4 font-headline text-h1 text-balance text-fg-primary">
            {t('about.ctaTitle')}
          </h2>
          <p className="mt-6 max-w-xl text-body-lg text-pretty text-fg-secondary">
            {t('about.ctaBody')}
          </p>
        </div>
        <div className="flex items-end md:col-span-5 md:justify-end">
          <Link
            to="/gallery"
            className="group inline-flex h-14 items-center gap-3 rounded-sm bg-accent-amber px-7 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-all duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98]"
          >
            <span>{t('about.ctaButton')}</span>
            <ArrowRight
              className="h-4 w-4 transition-transform duration-240 ease-standard group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
