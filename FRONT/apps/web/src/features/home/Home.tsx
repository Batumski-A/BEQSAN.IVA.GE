import { motion } from 'framer-motion';
import { ArrowRight, Box, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

/**
 * Home page — Modern Studio direction (2026-05-19 pivot + 2026-05-19 polish).
 *
 * Five vertical sections, each animated on view via framer-motion. The
 * `enterFromBelow` preset is shared so the page reads as one continuous
 * editorial flow rather than a stack of independent components.
 *
 * Hero  — full-bleed Pexels still + slow ken-burns scale (1.0 → 1.04 over
 *         18s, ease-out) so it never feels static. Headline / lead / CTA
 *         stagger in on mount.
 * Trust — single hairline row listing supplier brand names.
 * Materials — three product-promise cards with stagger on scroll-in.
 * Stats — four big serif numerals (1998 / ~620 / 1100 m² / 12) on dark.
 * Closer — second amber CTA before footer so the page closes with intent.
 */

const easeOutSoft = [0.16, 1, 0.3, 1] as const;

const enterFromBelow = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: easeOutSoft },
};

const heroEnter = (delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: easeOutSoft },
});

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="bg-studio-paper">
      <Hero t={t} />
      <TrustStrip t={t} />
      <Materials t={t} />
      <Stats t={t} />
      <Closer t={t} />
    </div>
  );
}

function Hero({ t }: { t: TFunction }) {
  return (
    <section className="relative flex h-[85vh] min-h-[600px] items-center justify-center overflow-hidden">
      {/* Ken-burns: very slow scale 1.0 → 1.04 over 18s. Reduced-motion users
          get a static image (framer-motion honours the OS preference by
          default — initial frame is the resting state). */}
      <motion.img
        src="/video/hero-poster.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="async"
        aria-hidden
        initial={{ scale: 1.0 }}
        animate={{ scale: 1.04 }}
        transition={{ duration: 18, ease: 'easeOut' }}
      />

      <div aria-hidden className="absolute inset-0 bg-studio-ink/65 backdrop-blur-[2px]" />

      {/* Soft amber-vignette glow in lower-right — pulls attention toward the CTA. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_85%,rgba(37,99,235,0.18),transparent_55%)]"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center font-studio text-white">
        <motion.span
          {...heroEnter(0)}
          className="mb-8 inline-block rounded-full border border-studio-brand/30 bg-studio-brand/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-studio-brand-soft backdrop-blur-md"
        >
          {t('home.heroKicker')}
        </motion.span>

        <motion.h1
          {...heroEnter(0.08)}
          className="mb-8 text-5xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-2xl md:text-7xl"
        >
          {t('home.heroTitleLine1')}{' '}
          <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-studio-brand-soft to-indigo-400 bg-clip-text text-transparent">
            {t('home.heroTitleLine2')}
          </span>
        </motion.h1>

        <motion.p
          {...heroEnter(0.2)}
          className="mx-auto mb-10 max-w-2xl text-xl font-light leading-relaxed text-slate-300"
        >
          {t('home.heroLead')}
        </motion.p>

        <motion.div {...heroEnter(0.32)} className="flex items-center justify-center">
          <Link
            to="/configurator"
            className="group flex items-center justify-center gap-3 rounded-full bg-studio-brand px-10 py-4 text-lg font-bold text-white shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.03] hover:bg-studio-brand-h hover:shadow-[0_0_60px_rgba(37,99,235,0.6)]"
          >
            <span>{t('home.heroCta')}</span>
            <Box className="h-5 w-5 transition-transform duration-240 ease-out group-hover:rotate-[12deg]" aria-hidden />
          </Link>
        </motion.div>

        {/* Subtle bouncing scroll hint — sits centred at the bottom of the hero. */}
        <motion.div
          aria-hidden
          {...heroEnter(0.55)}
          className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center"
        >
          <motion.div
            className="h-10 w-px bg-gradient-to-b from-white/0 via-white/40 to-white/0"
            animate={{ opacity: [0.3, 0.9, 0.3], y: [0, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </section>
  );
}

function TrustStrip({ t }: { t: TFunction }) {
  return (
    <motion.section
      {...enterFromBelow}
      className="border-y border-studio-paper-3 bg-studio-paper"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 font-studio text-center sm:flex-row sm:justify-between sm:gap-8 sm:px-6 sm:py-6 lg:px-8">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-studio-fg-soft">
          {t('home.trust.label')}
        </span>
        <span className="font-studio text-base font-medium tracking-wide text-studio-fg-mute">
          {t('home.trust.brands')}
        </span>
      </div>
    </motion.section>
  );
}

function Materials({ t }: { t: TFunction }) {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...enterFromBelow} className="mb-16 text-center font-studio">
          <h2 className="mb-4 text-3xl font-bold text-studio-fg md:text-4xl">
            {t('home.materialsTitle')}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-500">
            {t('home.materialsSubtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 font-studio md:grid-cols-3">
          <AnimatedCard delay={0}>
            <Card
              title={t('home.materials.aluminum.title')}
              body={t('home.materials.aluminum.body')}
              badge={t('home.materials.aluminum.badge')}
            />
          </AnimatedCard>
          <AnimatedCard delay={0.08}>
            <Card
              inverse
              title={t('home.materials.glass.title')}
              body={t('home.materials.glass.body')}
              badge={t('home.materials.glass.badge')}
            />
          </AnimatedCard>
          <AnimatedCard delay={0.16}>
            <Card
              title={t('home.materials.hardware.title')}
              body={t('home.materials.hardware.body')}
              badge={t('home.materials.hardware.badge')}
            />
          </AnimatedCard>
        </div>
      </div>
    </section>
  );
}

function AnimatedCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

function Stats({ t }: { t: TFunction }) {
  const stats: Array<[string, string]> = [
    [t('home.stats.fact1Value'), t('home.stats.fact1Label')],
    [t('home.stats.fact2Value'), t('home.stats.fact2Label')],
    [t('home.stats.fact3Value'), t('home.stats.fact3Label')],
    [t('home.stats.fact4Value'), t('home.stats.fact4Label')],
  ];
  return (
    <section className="relative overflow-hidden bg-studio-ink py-24 font-studio text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...enterFromBelow} className="mb-12 max-w-3xl">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-studio-brand-soft">
            {t('home.stats.eyebrow')}
          </p>
          <h2 className="mb-6 text-3xl font-bold leading-tight md:text-5xl">
            {t('home.stats.title')}
          </h2>
          <p className="max-w-2xl text-lg font-light leading-relaxed text-studio-fg-inv-mute">
            {t('home.stats.lead')}
          </p>
        </motion.div>

        <dl className="grid grid-cols-2 gap-8 border-t border-studio-ink-3 pt-12 md:grid-cols-4">
          {stats.map(([value, label], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: easeOutSoft }}
            >
              <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-studio-fg-inv-soft">
                {label}
              </dt>
              <dd className="mt-3 text-5xl font-bold tabular-nums tracking-tight text-white md:text-6xl">
                {value}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Closer({ t }: { t: TFunction }) {
  return (
    <section className="relative overflow-hidden bg-studio-paper-2 py-24 font-studio">
      {/* soft amber halo behind the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_50%,rgba(37,99,235,0.10),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.p
          {...enterFromBelow}
          className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-studio-brand"
        >
          {t('home.closer.eyebrow')}
        </motion.p>
        <motion.h2
          {...enterFromBelow}
          transition={{ ...enterFromBelow.transition, delay: 0.08 }}
          className="mb-6 text-3xl font-bold leading-tight text-studio-fg md:text-5xl"
        >
          {t('home.closer.title')}
        </motion.h2>
        <motion.p
          {...enterFromBelow}
          transition={{ ...enterFromBelow.transition, delay: 0.16 }}
          className="mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed text-studio-fg-mute"
        >
          {t('home.closer.lead')}
        </motion.p>
        <motion.div
          {...enterFromBelow}
          transition={{ ...enterFromBelow.transition, delay: 0.24 }}
          className="flex items-center justify-center"
        >
          <Link
            to="/configurator"
            className="group flex items-center justify-center gap-3 rounded-full bg-studio-brand px-10 py-4 text-lg font-bold text-white shadow-[0_0_40px_rgba(37,99,235,0.35)] transition-all hover:scale-[1.03] hover:bg-studio-brand-h hover:shadow-[0_0_60px_rgba(37,99,235,0.55)]"
          >
            <span>{t('home.closer.cta')}</span>
            <ArrowRight
              className="h-5 w-5 transition-transform duration-240 ease-out group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </motion.div>
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
      <article className="group h-full rounded-3xl border border-studio-ink-3 bg-studio-fg p-8 shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_25px_60px_-15px_rgba(37,99,235,0.3)]">
        <h3 className="mb-3 text-2xl font-bold text-white">{title}</h3>
        <p className="mb-6 text-slate-400">{body}</p>
        <div className="flex items-center gap-2 font-bold text-studio-brand-soft">
          <Check className="h-5 w-5 transition-transform duration-240 group-hover:scale-110" aria-hidden />
          <span>{badge}</span>
        </div>
      </article>
    );
  }
  return (
    <article className="group h-full rounded-3xl border border-gray-100 bg-white p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-studio-brand/30 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)]">
      <h3 className="mb-3 text-2xl font-bold text-studio-fg">{title}</h3>
      <p className="mb-6 text-studio-fg-mute">{body}</p>
      <div className="flex items-center gap-2 font-bold text-studio-brand">
        <Check className="h-5 w-5 transition-transform duration-240 group-hover:scale-110" aria-hidden />
        <span>{badge}</span>
      </div>
    </article>
  );
}
