import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import { PHONE_TEL_HREF as PHONE_HREF, whatsAppUrl } from '@/shared/config/contact';
import { Seo } from '@/shared/seo/Seo';

const enter = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const WHATSAPP_URL = whatsAppUrl();
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=41.6168,41.6367';

export default function Contact() {
  const { t } = useTranslation();
  return (
    <>
      <Seo
        route="/contact"
        breadcrumb={[
          { name: 'მთავარი', path: '/' },
          { name: 'კონტაქტი', path: '/contact' },
        ]}
      />

      <Hero t={t} />
      <Body t={t} />
      <Closer t={t} />
    </>
  );
}

function Hero({ t }: { t: TFunction }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="mx-auto max-w-content px-4 pb-22 pt-30 md:px-8 md:pb-30 md:pt-46">
        <motion.div
          {...enter}
          className="font-mono text-mono-spec uppercase tracking-[0.2em] text-accent-amber"
        >
          № 01 · {t('contact.eyebrow')}
        </motion.div>
        <motion.h1
          {...enter}
          transition={{ ...enter.transition, delay: 0.08 }}
          className="mt-8 max-w-4xl font-display text-display-2 leading-[0.95] tracking-tight text-balance text-fg-primary md:text-display-1"
        >
          {t('contact.heading')}
        </motion.h1>
        <motion.p
          {...enter}
          transition={{ ...enter.transition, delay: 0.18 }}
          className="mt-10 max-w-2xl text-body-lg text-pretty text-fg-secondary"
        >
          {t('contact.lead')}
        </motion.p>
      </div>
    </section>
  );
}

function Body({ t }: { t: TFunction }) {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-22 md:grid-cols-12 md:px-8 md:py-30">
        <div className="space-y-12 md:col-span-5">
          <InfoBlock label={t('contact.workshopLabel')}>
            <p className="font-headline text-h3 text-pretty text-fg-primary">
              {t('contact.workshopAddress')}
            </p>
            <p className="mt-3 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
              {t('contact.coordsValue')}
            </p>
          </InfoBlock>

          <InfoBlock label={t('contact.hoursLabel')}>
            <dl className="mt-1 space-y-2">
              <HoursRow label={t('contact.hoursMonFri')} value={t('contact.hoursMonFriValue')} />
              <HoursRow label={t('contact.hoursSat')} value={t('contact.hoursSatValue')} />
              <HoursRow label={t('contact.hoursSun')} value={t('contact.hoursSunValue')} />
            </dl>
          </InfoBlock>

          <InfoBlock label={t('contact.phoneLabel')}>
            <a
              href={PHONE_HREF}
              className="mt-1 inline-flex items-center gap-3 font-display text-h2 text-fg-primary transition-colors duration-120 hover:text-accent-amber"
            >
              <Phone className="h-5 w-5 text-accent-amber" aria-hidden />
              {t('contact.phoneValue')}
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-sm border border-hairline-strong px-4 font-mono text-mono-spec uppercase tracking-wider text-fg-primary transition-colors duration-120 hover:border-accent-amber hover:text-accent-amber"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t('contact.whatsappCta')}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </InfoBlock>

          <InfoBlock label={t('contact.emailLabel')}>
            <a
              href={`mailto:${t('contact.emailValue')}`}
              className="mt-1 inline-block font-headline text-h3 text-fg-primary transition-colors duration-120 hover:text-accent-amber"
            >
              {t('contact.emailValue')}
            </a>
          </InfoBlock>

          <InfoBlock label={t('contact.directionsLabel')}>
            <p className="mt-2 max-w-md text-body text-pretty text-fg-secondary">
              {t('contact.directions')}
            </p>
          </InfoBlock>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <figure className="rounded-sm border border-hairline bg-bg-elevated p-4">
            <BatumiMap
              ariaLabel={t('contact.mapAriaLabel')}
              northLabel={t('contact.mapNorth')}
              seaLabel={t('contact.mapSea')}
              centerLabel={t('contact.mapCenter')}
              markerLabel={t('contact.mapMarkerLabel')}
            />
            <figcaption className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-hairline pt-4 md:flex-row md:items-center md:gap-4">
              <span className="text-caption text-pretty text-fg-tertiary">
                {t('contact.mapNote')}
              </span>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex shrink-0 items-center gap-2 font-mono text-mono-spec uppercase tracking-wider text-accent-amber"
              >
                <span>{t('contact.openMaps')}</span>
                <ExternalLink
                  className="h-3.5 w-3.5 transition-transform duration-120 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function InfoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-caption uppercase tracking-[0.2em] text-fg-tertiary">
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function HoursRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2 font-mono">
      <dt className="text-mono-spec uppercase tracking-wider text-fg-tertiary">{label}</dt>
      <dd className="text-mono-spec tabular-nums text-fg-primary">{value}</dd>
    </div>
  );
}

function BatumiMap({
  ariaLabel,
  northLabel,
  seaLabel,
  centerLabel,
  markerLabel,
}: {
  ariaLabel: string;
  northLabel: string;
  seaLabel: string;
  centerLabel: string;
  markerLabel: string;
}) {
  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full"
    >
      <title>{ariaLabel}</title>
      <desc>
        ბათუმის ჩრდილოეთ მხარის სტილიზებული რუკა — შავი ზღვა მარცხნივ, BEQSAN
        სახელოსნო სალიბაურში მონიშნულია ქარვის ფერის ნიშნით.
      </desc>

      <g className="text-fg-tertiary" stroke="currentColor" strokeWidth="0.4">
        {Array.from({ length: 24 }).flatMap((_, r) =>
          Array.from({ length: 8 }).map((__, c) => (
            <line
              key={`s${r}-${c}`}
              x1={4 + c * 12}
              y1={6 + r * 10}
              x2={9 + c * 12}
              y2={6 + r * 10}
              opacity={0.35}
            />
          )),
        )}
      </g>

      <g
        className="text-fg-secondary"
        stroke="currentColor"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 100 4 C 96 30, 110 50, 102 80 S 96 130, 110 160 S 122 200, 110 236" />
      </g>

      <g
        className="text-fg-tertiary"
        stroke="currentColor"
        strokeWidth="0.3"
        opacity="0.5"
      >
        <line x1="110" y1="40" x2="316" y2="40" />
        <line x1="110" y1="80" x2="316" y2="80" />
        <line x1="110" y1="120" x2="316" y2="120" />
        <line x1="110" y1="160" x2="316" y2="160" />
        <line x1="110" y1="200" x2="316" y2="200" />
        <line x1="140" y1="6" x2="140" y2="236" />
        <line x1="180" y1="6" x2="180" y2="236" />
        <line x1="220" y1="6" x2="220" y2="236" />
        <line x1="260" y1="6" x2="260" y2="236" />
        <line x1="300" y1="6" x2="300" y2="236" />
      </g>

      <g stroke="currentColor" strokeWidth="1.2" className="text-fg-secondary">
        <line x1="118" y1="200" x2="300" y2="60" strokeDasharray="3 2" />
      </g>

      <g className="text-fg-secondary">
        <circle cx="160" cy="180" r="3" fill="currentColor" />
        <text
          x="168"
          y="184"
          fill="currentColor"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.4"
        >
          {centerLabel}
        </text>
      </g>

      <g className="text-accent-amber">
        <circle
          cx="230"
          cy="80"
          r="9"
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <circle cx="230" cy="80" r="3.5" fill="currentColor" />
        <text
          x="246"
          y="84"
          fill="currentColor"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.4"
        >
          {markerLabel}
        </text>
      </g>

      <g
        fill="currentColor"
        className="text-fg-tertiary"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.6"
      >
        <text x="298" y="18">{northLabel}</text>
        <line
          x1="309"
          y1="22"
          x2="309"
          y2="32"
          stroke="currentColor"
          strokeWidth="0.6"
        />
        <polygon points="306,22 309,17 312,22" fill="currentColor" />
        <text
          x="20"
          y="125"
          transform="rotate(-90 20 125)"
          opacity="0.7"
        >
          {seaLabel}
        </text>
      </g>
    </svg>
  );
}

function Closer({ t }: { t: TFunction }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-hairline bg-bg-elevated">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-22 md:grid-cols-12 md:px-8 md:py-30">
        <div className="md:col-span-7">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № 02 · {t('contact.closerTitle')}
          </div>
          <h2 className="mt-4 font-headline text-h1 text-balance text-fg-primary">
            {t('contact.closerTitle')}
          </h2>
          <p className="mt-6 max-w-2xl text-body-lg text-pretty text-fg-secondary">
            {t('contact.closerBody')}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:col-span-5 md:items-end md:justify-end">
          <Link
            to="/configurator"
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-sm bg-accent-amber px-7 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-all duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98]"
          >
            <span>{t('contact.closerCta1')}</span>
            <ArrowRight
              className="h-4 w-4 transition-transform duration-240 ease-standard group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <a
            href={PHONE_HREF}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-sm border border-hairline-strong px-7 font-mono text-mono-spec uppercase tracking-wider text-fg-primary transition-colors duration-120 hover:border-accent-amber hover:text-accent-amber"
          >
            <Phone className="h-4 w-4" aria-hidden />
            {t('contact.closerCta2')}
          </a>
        </div>
      </div>
    </section>
  );
}
