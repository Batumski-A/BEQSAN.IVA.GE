import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation, type TFunction } from 'react-i18next';

const heroEnter = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.96,
    ease: [0.16, 1, 0.3, 1] as const,
  },
};

const staggered = (delay: number) => ({
  ...heroEnter,
  transition: { ...heroEnter.transition, delay },
});

export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      <Hero t={t} />
      <Specs t={t} />
      <Values t={t} />
      <CtaBlock t={t} />
    </>
  );
}

function Hero({ t }: { t: TFunction }) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Vertical hairline rule on the right — technical-drawing decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-8 top-0 hidden h-full w-px bg-hairline md:block"
      />

      <div className="mx-auto grid max-w-content gap-12 px-4 pb-22 pt-30 md:grid-cols-12 md:px-8 md:pb-30 md:pt-46">
        <div className="md:col-span-8 md:col-start-1">
          <motion.div
            {...staggered(0)}
            className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber"
            aria-hidden
          >
            № 01 · ფაბრიკული ფანჯრები
          </motion.div>

          <motion.h1
            {...staggered(0.08)}
            className="mt-8 font-display text-display-2 leading-[0.95] tracking-tight text-balance text-fg-primary md:text-display-1"
          >
            {t('home.heroTitle')}
          </motion.h1>

          <motion.p
            {...staggered(0.18)}
            className="mt-10 max-w-xl text-body-lg text-pretty text-fg-secondary"
          >
            {t('home.heroSub')}
          </motion.p>

          <motion.div {...staggered(0.28)} className="mt-12 flex flex-wrap items-center gap-6">
            <Link
              to="/configurator"
              className="group inline-flex h-14 items-center gap-3 rounded-sm bg-accent-amber px-7 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-all duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98]"
            >
              <span>{t('home.heroCta')}</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-240 ease-standard group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('home.heroCtaSub')}
            </span>
          </motion.div>
        </div>

        {/* Right-side decoration column — technical drawing markers */}
        <div className="hidden md:col-span-3 md:col-start-10 md:flex md:flex-col md:justify-end">
          <DrawingMarker label="W" value="120" unit="სმ" />
          <DrawingMarker label="H" value="145" unit="სმ" className="mt-3" />
          <DrawingMarker label="U" value="1.2" unit="W/მ²K" className="mt-3" />
          <div className="mt-6 border-t border-hairline pt-4 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            სალიბაური, ბათუმი
            <br />
            41,6168° N · 41,6367° E
          </div>
        </div>
      </div>
    </section>
  );
}

function DrawingMarker({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-hairline pb-2 font-mono ${className ?? ''}`}
    >
      <span className="text-mono-spec uppercase tracking-wider text-fg-tertiary">{label}</span>
      <span className="text-mono-spec tabular-nums text-fg-primary">
        {value}
        <span className="ml-1 text-fg-tertiary">{unit}</span>
      </span>
    </div>
  );
}

function Specs({ t }: { t: TFunction }) {
  const items: Array<[string, string]> = [
    [t('home.spec1Label'), t('home.spec1Value')],
    [t('home.spec2Label'), t('home.spec2Value')],
    [t('home.spec3Label'), t('home.spec3Value')],
    [t('home.spec4Label'), t('home.spec4Value')],
  ];

  return (
    <section className="border-y border-hairline bg-bg-elevated">
      <div className="mx-auto max-w-content px-4 py-12 md:px-8 md:py-16">
        <div className="mb-8 font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
          {t('home.specsLabel')}
        </div>
        <dl className="grid grid-cols-1 gap-y-6 md:grid-cols-4 md:gap-x-8 md:gap-y-0">
          {items.map(([label, value]) => (
            <div key={label} className="md:border-r md:border-hairline md:pr-8 md:last:border-r-0">
              <dt className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
                {label}
              </dt>
              <dd className="mt-2 font-mono text-body-lg tabular-nums text-fg-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Values({ t }: { t: TFunction }) {
  const items: Array<{ n: string; title: string; body: string }> = [
    { n: '01', title: t('home.value1Title'), body: t('home.value1Body') },
    { n: '02', title: t('home.value2Title'), body: t('home.value2Body') },
    { n: '03', title: t('home.value3Title'), body: t('home.value3Body') },
  ];

  return (
    <section className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
      <div className="mb-12 max-w-2xl">
        <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
          № 02 · სამუშაო პროცესი
        </div>
        <h2 className="mt-4 font-headline text-h1 text-balance text-fg-primary md:text-h1">
          {t('home.valuesTitle')}
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
            № 03 · შემდეგი ნაბიჯი
          </div>
          <h2 className="mt-4 font-headline text-h1 text-balance text-fg-primary">
            {t('home.ctaTitle')}
          </h2>
          <p className="mt-6 max-w-xl text-body-lg text-pretty text-fg-secondary">
            {t('home.ctaBody')}
          </p>
        </div>
        <div className="flex items-end md:col-span-5 md:justify-end">
          <Link
            to="/configurator"
            className="group inline-flex h-14 items-center gap-3 rounded-sm bg-accent-amber px-7 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-all duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98]"
          >
            <span>{t('home.heroCta')}</span>
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
