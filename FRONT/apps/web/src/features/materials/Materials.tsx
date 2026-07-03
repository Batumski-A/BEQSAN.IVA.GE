import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { ReactNode, SVGProps } from 'react';

import {
  ThermalBreakProfile,
  TriplePaneIGU,
  FiveChamberPvc,
} from '@/shared/illustrations/MaterialDiagrams';
import { Seo } from '@/shared/seo/Seo';
import { faqSchema } from '@/shared/seo/schema';

const MATERIALS_FAQ = [
  {
    q: 'რა განსხვავებაა ალუმინსა და მეტალოპლასტმასს (PVC) შორის?',
    a: 'ალუმინი უფრო გამძლე და თხელჩარჩოიანია — იდეალურია დიდი კონსტრუქციებისა და პანორამული შემინვისთვის. მეტალოპლასტმასი (PVC) უფრო თბილი და ეკონომიურია საცხოვრებელი ბინებისთვის. BEQSAN ორივეს თერმო-ვერსიას აწყობს ბათუმის ფაბრიკაში.',
  },
  {
    q: 'რომელი პროფილითა და ფურნიტურით მუშაობთ?',
    a: 'ალუმინი — Alumil S-77 და S-91 (საბერძნეთი), PVC — Rehau (გერმანია), ფურნიტურა — Hoppe და G-U. მინა — ენერგო-ეფექტური Low-E და ტრიპლექსი.',
  },
  {
    q: 'რა არის თერმო-ხიდი?',
    a: 'ალუმინის პროფილში ჩადგმული 24–34 მმ პოლიამიდის ჩასართავი, რომელიც წყვეტს სითბოს გადასვლას ალუმინიდან ალუმინში — ამცირებს კონდენსატსა და თბოდანაკარგს.',
  },
  {
    q: 'რა მინაპაკეტს იყენებთ ბათუმის კლიმატისთვის?',
    a: 'ენერგო-ეფექტურ Low-E და საჭიროებისამებრ ტრიპლექს მინაპაკეტებს, რომლებიც ბათუმის ნესტსა და მარილიან ჰაერზეა გათვლილი — ზამთარში თბილი, ზაფხულში გრილი.',
  },
];

// Initial opacity 0.55 (not 0) so the section degrades gracefully if the
// IntersectionObserver never fires — see Process.tsx for the same rationale.
const enter = {
  initial: { opacity: 0.55, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const RAL_PALETTE: Array<{ code: string; hex: string }> = [
  { code: '9016', hex: '#F1F0EA' },
  { code: '7016', hex: '#293133' },
  { code: '8019', hex: '#3D3635' },
  { code: '9005', hex: '#0A0A0A' },
  { code: '7035', hex: '#C5C7C4' },
  { code: '9007', hex: '#8F8F8C' },
];

export default function Materials() {
  const { t } = useTranslation();
  return (
    <>
      <Seo
        route="/materials"
        breadcrumb={[
          { name: 'მთავარი', path: '/' },
          { name: 'მასალები', path: '/materials' },
        ]}
        jsonLd={faqSchema(MATERIALS_FAQ)}
      />

      <Hero t={t} />

      <MaterialSection
        t={t}
        sectionNum="02"
        sectionKey="alum"
        Diagram={ThermalBreakProfile}
        specs={[
          ['alumSpec1Label', 'alumSpec1Value'],
          ['alumSpec2Label', 'alumSpec2Value'],
          ['alumSpec3Label', 'alumSpec3Value'],
          ['alumSpec4Label', 'alumSpec4Value'],
        ]}
        whyKey="alumWhy"
        flipped={false}
      />

      <MaterialSection
        t={t}
        sectionNum="03"
        sectionKey="pvc"
        Diagram={FiveChamberPvc}
        specs={[
          ['pvcSpec1Label', 'pvcSpec1Value'],
          ['pvcSpec2Label', 'pvcSpec2Value'],
          ['pvcSpec3Label', 'pvcSpec3Value'],
          ['pvcSpec4Label', 'pvcSpec4Value'],
        ]}
        whyKey="pvcWhy"
        flipped
      />

      <MaterialSection
        t={t}
        sectionNum="04"
        sectionKey="glass"
        Diagram={TriplePaneIGU}
        specs={[
          ['glassSpec1Label', 'glassSpec1Value'],
          ['glassSpec2Label', 'glassSpec2Value'],
          ['glassSpec3Label', 'glassSpec3Value'],
          ['glassSpec4Label', 'glassSpec4Value'],
        ]}
        whyKey="glassWhy"
        flipped={false}
      />

      <RalSection t={t} />
      <Glossary t={t} />
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
          № 01 · {t('materials.eyebrow')}
        </motion.div>
        <motion.h1
          initial={enter.initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...enter.transition, delay: 0.08 }}
          className="mt-8 max-w-4xl font-display text-display-2 leading-[0.95] tracking-tight text-balance text-fg-primary md:text-display-1"
        >
          {t('materials.heading')}
        </motion.h1>
        <motion.p
          initial={enter.initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...enter.transition, delay: 0.18 }}
          className="mt-10 max-w-2xl text-body-lg text-pretty text-fg-secondary"
        >
          {t('materials.lead')}
        </motion.p>
      </div>
    </section>
  );
}

function MaterialSection({
  t,
  sectionNum,
  sectionKey,
  Diagram,
  specs,
  whyKey,
  flipped,
}: {
  t: TFunction;
  sectionNum: string;
  sectionKey: 'alum' | 'pvc' | 'glass';
  Diagram: (props: SVGProps<SVGSVGElement>) => ReactNode;
  specs: Array<[string, string]>;
  whyKey: string;
  flipped: boolean;
}) {
  return (
    <motion.section
      {...enter}
      className={`border-t border-hairline ${flipped ? 'bg-bg-elevated' : ''}`}
    >
      <div className="mx-auto grid max-w-content gap-12 px-4 py-22 md:grid-cols-12 md:px-8 md:py-30">
        <div
          className={`text-fg-tertiary md:col-span-5 ${
            flipped ? 'md:order-2 md:col-start-8' : 'md:order-1 md:col-start-1'
          }`}
          aria-hidden
        >
          <div className="rounded-sm border border-hairline bg-bg-base p-6">
            <Diagram className="h-auto w-full text-fg-tertiary" />
          </div>
        </div>

        <div
          className={`md:col-span-6 ${
            flipped ? 'md:order-1 md:col-start-1' : 'md:order-2 md:col-start-7'
          }`}
        >
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № {sectionNum}
          </div>
          <h2 className="mt-3 font-headline text-display-2 leading-tight text-balance text-fg-primary">
            {t(`materials.${sectionKey}Title`)}
          </h2>
          <p className="mt-6 max-w-xl text-body-lg text-pretty text-fg-secondary">
            {t(`materials.${sectionKey}Lead`)}
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4">
            {specs.map(([labelKey, valueKey]) => (
              <div
                key={labelKey}
                className="flex flex-col gap-1 border-l border-hairline pl-4"
              >
                <dt className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                  {t(`materials.${labelKey}`)}
                </dt>
                <dd className="font-mono text-mono-spec tabular-nums text-fg-primary">
                  {t(`materials.${valueKey}`)}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 max-w-xl border-l-2 border-accent-amber/60 pl-4 text-body text-pretty text-fg-tertiary">
            {t(`materials.${whyKey}`)}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function RalSection({ t }: { t: TFunction }) {
  return (
    <motion.section {...enter} className="border-t border-hairline">
      <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
              № 05
            </div>
            <h2 className="mt-3 font-headline text-h2 text-balance text-fg-primary">
              {t('materials.ralTitle')}
            </h2>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <p className="max-w-xl text-body-lg text-pretty text-fg-secondary">
              {t('materials.ralLead')}
            </p>
            <div className="mt-10 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
              {t('materials.ralPopular')}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {RAL_PALETTE.map(({ code, hex }) => (
                <li
                  key={code}
                  className="flex items-center gap-3 rounded-sm border border-hairline bg-bg-elevated p-3"
                >
                  <span
                    aria-hidden
                    className="h-10 w-10 shrink-0 rounded-sm border border-hairline-strong"
                    style={{ backgroundColor: hex }}
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-mono-spec text-fg-primary">RAL {code}</div>
                    <div className="truncate text-caption text-fg-tertiary">
                      {t(`materials.ralColors.${code}`)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-xl border-l-2 border-accent-amber/60 pl-4 text-body text-pretty text-fg-tertiary">
              {t('materials.ralNote')}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Glossary({ t }: { t: TFunction }) {
  const TERMS = ['uvalue', 'lowE', 'argon', 'thermal', 'triplex', 'ral', 'casement', 'sliding'];
  return (
    <motion.section {...enter} className="border-y border-hairline bg-bg-elevated">
      <div className="mx-auto max-w-content px-4 py-22 md:px-8 md:py-30">
        <div className="mb-12 max-w-2xl">
          <div className="font-mono text-caption uppercase tracking-[0.2em] text-accent-amber">
            № 06
          </div>
          <h2 className="mt-3 font-headline text-h1 text-balance text-fg-primary">
            {t('materials.glossaryTitle')}
          </h2>
          <p className="mt-6 max-w-xl text-body text-pretty text-fg-secondary">
            {t('materials.glossaryLead')}
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          {TERMS.map((key) => (
            <div key={key} className="border-t border-hairline pt-6">
              <dt className="font-headline text-h4 text-fg-primary">
                {t(`materials.glossary.${key}.term`)}
              </dt>
              <dd className="mt-3 text-body text-pretty text-fg-secondary">
                {t(`materials.glossary.${key}.def`)}
              </dd>
            </div>
          ))}
        </dl>
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
            {t('materials.ctaTitle')}
          </h2>
          <p className="mt-6 max-w-xl text-body-lg text-pretty text-fg-secondary">
            {t('materials.ctaBody')}
          </p>
        </div>
        <div className="flex items-end md:col-span-5 md:justify-end">
          <Link
            to="/configurator"
            className="group inline-flex h-14 items-center gap-3 rounded-sm bg-accent-amber px-7 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-all duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98]"
          >
            <span>{t('materials.ctaButton')}</span>
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
