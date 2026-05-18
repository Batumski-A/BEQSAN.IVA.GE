import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { ReactNode, SVGProps } from 'react';

import {
  MeasurementIllustration,
  DraftingIllustration,
  ProfileStockIllustration,
  CuttingIllustration,
  AssemblyIllustration,
  GlassInstallIllustration,
  InstallationIllustration,
} from '@/shared/illustrations/WorkshopIllustrations';

// Initial opacity sits at 0.55 (not 0) so if IntersectionObserver fails to
// fire — slow JS on mid-tier mobile, screen-reader fast-scroll, Playwright's
// beyond-viewport capture — the section remains legible instead of going
// completely blank. The 0.55→1 settle still reads as a soft entrance.
const enter = {
  initial: { opacity: 0.55, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

type Stage = {
  num: '1' | '2' | '3' | '4' | '5' | '6' | '7';
  Illustration: (props: SVGProps<SVGSVGElement>) => ReactNode;
};

const STAGES: Stage[] = [
  { num: '1', Illustration: MeasurementIllustration },
  { num: '2', Illustration: DraftingIllustration },
  { num: '3', Illustration: ProfileStockIllustration },
  { num: '4', Illustration: CuttingIllustration },
  { num: '5', Illustration: AssemblyIllustration },
  { num: '6', Illustration: GlassInstallIllustration },
  { num: '7', Illustration: InstallationIllustration },
];

export default function Process() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('process.metaTitle')} · BEQSAN</title>
        <meta name="description" content={t('process.metaDescription')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'BEQSAN window manufacturing process',
            description:
              "Seven-stage manufacturing process from on-site measurement to installation in Roman Sharashidze's Salibauri workshop.",
            step: STAGES.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: t(`process.stages.${s.num}.title`),
              text: t(`process.stages.${s.num}.body1`),
            })),
          })}
        </script>
      </Helmet>

      <Hero t={t} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
          <div className="mb-16 font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
            {t('process.stagesLabel')}
          </div>
          <ol className="space-y-22 md:space-y-30">
            {STAGES.map((stage, i) => (
              <StageRow
                key={stage.num}
                t={t}
                num={stage.num}
                Illustration={stage.Illustration}
                flipped={i % 2 === 1}
              />
            ))}
          </ol>
        </div>
      </section>

      <CtaBlock t={t} />
    </>
  );
}

function Hero({ t }: { t: TFunction }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="mx-auto max-w-content px-4 pb-22 pt-30 md:px-8 md:pb-30 md:pt-46">
        <motion.div
          initial={enter.initial}
          animate={{ opacity: 1, y: 0 }}
          transition={enter.transition}
          className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber"
        >
          № 01 · {t('process.eyebrow')}
        </motion.div>
        <motion.h1
          initial={enter.initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...enter.transition, delay: 0.08 }}
          className="mt-8 max-w-4xl font-display text-display-2 leading-[0.95] tracking-tight text-balance text-fg-primary md:text-display-1"
        >
          {t('process.heading')}
        </motion.h1>
        <motion.p
          initial={enter.initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...enter.transition, delay: 0.18 }}
          className="mt-10 max-w-2xl text-body-lg text-pretty text-fg-secondary"
        >
          {t('process.lead')}
        </motion.p>
      </div>
    </section>
  );
}

function StageRow({
  t,
  num,
  Illustration,
  flipped,
}: {
  t: TFunction;
  num: Stage['num'];
  Illustration: Stage['Illustration'];
  flipped: boolean;
}) {
  return (
    <motion.li {...enter} className="relative grid gap-12 md:grid-cols-12">
      {/* Number badge column */}
      <div
        className={`md:col-span-1 ${
          flipped ? 'md:order-2 md:col-start-12' : 'md:order-1 md:col-start-1'
        }`}
      >
        <div className="flex items-baseline gap-2 border-t border-hairline pt-3">
          <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            №
          </span>
          <span className="font-display text-display-2 leading-none text-accent-amber">
            {num.padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Illustration column */}
      <div
        className={`text-fg-tertiary md:col-span-5 ${
          flipped ? 'md:order-1 md:col-start-1' : 'md:order-2 md:col-start-3'
        }`}
        aria-hidden
      >
        <div className="aspect-[3/2] w-full rounded-sm border border-hairline bg-bg-elevated p-4">
          <Illustration className="h-full w-full text-fg-tertiary" />
        </div>
      </div>

      {/* Copy + spec column */}
      <div
        className={`md:col-span-5 ${
          flipped ? 'md:order-3 md:col-start-7' : 'md:order-3 md:col-start-8'
        }`}
      >
        <h2 className="font-headline text-h2 text-balance text-fg-primary">
          {t(`process.stages.${num}.title`)}
        </h2>
        <p className="mt-6 text-body text-pretty text-fg-secondary">
          {t(`process.stages.${num}.body1`)}
        </p>
        <p className="mt-4 text-body text-pretty text-fg-secondary">
          {t(`process.stages.${num}.body2`)}
        </p>

        <dl className="mt-8 flex items-baseline justify-between gap-4 border-b border-hairline pb-2 font-mono">
          <dt className="text-mono-spec uppercase tracking-wider text-fg-tertiary">
            {t(`process.stages.${num}.specLabel`)}
          </dt>
          <dd className="text-mono-spec tabular-nums text-fg-primary">
            {t(`process.stages.${num}.specValue`)}
            <span className="ml-1 text-fg-tertiary">
              {t(`process.stages.${num}.specUnit`)}
            </span>
          </dd>
        </dl>
      </div>
    </motion.li>
  );
}

function CtaBlock({ t }: { t: TFunction }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-hairline bg-bg-elevated">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-22 md:grid-cols-12 md:px-8 md:py-30">
        <div className="md:col-span-7">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № 08 · შემდეგი ნაბიჯი
          </div>
          <h2 className="mt-4 font-headline text-h1 text-balance text-fg-primary">
            {t('process.ctaTitle')}
          </h2>
          <p className="mt-6 max-w-xl text-body-lg text-pretty text-fg-secondary">
            {t('process.ctaBody')}
          </p>
        </div>
        <div className="flex items-end md:col-span-5 md:justify-end">
          <Link
            to="/configurator"
            className="group inline-flex h-14 items-center gap-3 rounded-sm bg-accent-amber px-7 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-all duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98]"
          >
            <span>{t('process.ctaButton')}</span>
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
