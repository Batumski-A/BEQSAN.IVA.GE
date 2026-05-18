import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

const enter = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const COVERAGE_ROWS = ['alum', 'pvc', 'glass', 'fittings', 'install'] as const;
const NOT_COVERED_KEYS = [0, 1, 2, 3] as const;
const PROCESS_STEPS = ['1', '2', '3'] as const;
const CARE_KEYS = [0, 1, 2, 3] as const;

export default function Warranty() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('warranty.metaTitle')} · BEQSAN</title>
        <meta name="description" content={t('warranty.metaDescription')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: t('warranty.metaTitle'),
            description: t('warranty.metaDescription'),
            author: { '@type': 'Organization', name: 'BEQSAN LTD' },
            publisher: { '@type': 'Organization', name: 'BEQSAN LTD' },
            datePublished: '2026-05-17',
            inLanguage: 'ka-GE',
          })}
        </script>
      </Helmet>

      <Hero t={t} />
      <Coverage t={t} />
      <NotCovered t={t} />
      <Process t={t} />
      <Climate t={t} />
      <Care t={t} />
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
          № 01 · {t('warranty.eyebrow')}
        </motion.div>
        <motion.h1
          initial={enter.initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...enter.transition, delay: 0.08 }}
          className="mt-8 max-w-4xl font-display text-display-2 leading-[0.95] tracking-tight text-balance text-fg-primary md:text-display-1"
        >
          {t('warranty.heading')}
        </motion.h1>
        <motion.p
          initial={enter.initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...enter.transition, delay: 0.18 }}
          className="mt-10 max-w-2xl text-body-lg text-pretty text-fg-secondary"
        >
          {t('warranty.lead')}
        </motion.p>
      </div>
    </section>
  );
}

function Coverage({ t }: { t: TFunction }) {
  return (
    <motion.section {...enter} className="border-t border-hairline bg-bg-elevated">
      <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
        <div className="mb-10 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-accent-amber" aria-hidden />
          <h2 className="font-headline text-h2 text-fg-primary">
            {t('warranty.coversTitle')}
          </h2>
        </div>
        <div className="overflow-x-auto rounded-sm border border-hairline bg-bg-base">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-hairline">
                <th className="px-6 py-4 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                  {t('warranty.coversTable.elementHeader')}
                </th>
                <th className="px-6 py-4 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                  {t('warranty.coversTable.durationHeader')}
                </th>
                <th className="px-6 py-4 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                  —
                </th>
              </tr>
            </thead>
            <tbody>
              {COVERAGE_ROWS.map((key, i) => (
                <tr
                  key={key}
                  className={i === COVERAGE_ROWS.length - 1 ? '' : 'border-b border-hairline'}
                >
                  <td className="px-6 py-5 font-headline text-h4 text-fg-primary">
                    {t(`warranty.coversTable.rows.${key}.element`)}
                  </td>
                  <td className="px-6 py-5 font-mono text-mono-spec text-accent-amber">
                    {t(`warranty.coversTable.rows.${key}.duration`)}
                  </td>
                  <td className="px-6 py-5 text-body text-fg-secondary">
                    {t(`warranty.coversTable.rows.${key}.note`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}

function NotCovered({ t }: { t: TFunction }) {
  return (
    <motion.section {...enter} className="border-t border-hairline">
      <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-fg-tertiary" aria-hidden />
              <div className="font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
                № 03
              </div>
            </div>
            <h2 className="mt-3 font-headline text-h2 text-balance text-fg-primary">
              {t('warranty.notCoveredTitle')}
            </h2>
          </div>
          <ul className="space-y-4 md:col-span-7 md:col-start-6">
            {NOT_COVERED_KEYS.map((i) => (
              <li
                key={i}
                className="flex gap-4 border-b border-hairline pb-4 text-body text-fg-secondary"
              >
                <span className="font-mono text-mono-spec text-fg-tertiary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-pretty">{t(`warranty.notCovered.${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}

function Process({ t }: { t: TFunction }) {
  return (
    <motion.section {...enter} className="border-t border-hairline bg-bg-elevated">
      <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
        <div className="mb-12 max-w-2xl">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № 04
          </div>
          <h2 className="mt-3 font-headline text-h1 text-balance text-fg-primary">
            {t('warranty.processTitle')}
          </h2>
        </div>
        <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
          {PROCESS_STEPS.map((n) => (
            <li
              key={n}
              className="flex flex-col gap-4 border-t border-hairline pt-6"
            >
              <span className="font-display text-display-2 leading-none text-accent-amber">
                {n.padStart(2, '0')}
              </span>
              <h3 className="font-headline text-h3 text-fg-primary">
                {t(`warranty.processSteps.${n}.title`)}
              </h3>
              <p className="text-body text-pretty text-fg-secondary">
                {t(`warranty.processSteps.${n}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </motion.section>
  );
}

function Climate({ t }: { t: TFunction }) {
  return (
    <motion.section {...enter} className="border-t border-hairline">
      <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
              № 05
            </div>
            <h2 className="mt-3 font-headline text-h2 text-balance text-fg-primary">
              {t('warranty.climateTitle')}
            </h2>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <p className="text-body-lg text-pretty text-fg-secondary">
              {t('warranty.climateBody')}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Care({ t }: { t: TFunction }) {
  return (
    <motion.section {...enter} className="border-t border-hairline bg-bg-elevated">
      <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
        <div className="mb-12 max-w-2xl">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № 06
          </div>
          <h2 className="mt-3 font-headline text-h1 text-balance text-fg-primary">
            {t('warranty.careTitle')}
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {CARE_KEYS.map((i) => (
            <li
              key={i}
              className="flex gap-4 rounded-sm border border-hairline bg-bg-base p-6 text-body text-pretty text-fg-secondary"
            >
              <span className="font-mono text-mono-spec uppercase tracking-wider text-accent-amber">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{t(`warranty.careTips.${i}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

function CtaBlock({ t }: { t: TFunction }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-hairline">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-22 md:grid-cols-12 md:px-8 md:py-30">
        <div className="md:col-span-7">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № 07 · შემდეგი ნაბიჯი
          </div>
          <h2 className="mt-4 font-headline text-h1 text-balance text-fg-primary">
            {t('warranty.ctaTitle')}
          </h2>
          <p className="mt-6 max-w-xl text-body-lg text-pretty text-fg-secondary">
            {t('warranty.ctaBody')}
          </p>
        </div>
        <div className="flex items-end md:col-span-5 md:justify-end">
          <Link
            to="/contact"
            className="group inline-flex h-14 items-center gap-3 rounded-sm bg-accent-amber px-7 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-all duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98]"
          >
            <span>{t('warranty.ctaButton')}</span>
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
