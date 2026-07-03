import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ShieldCheck,
  Square,
  GalleryHorizontal,
  LayoutGrid,
  PanelsTopLeft,
  Grid
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { useProductTypes, fetchProductTypeDetail } from '@/features/catalog/api';
import { useConfiguratorStore, paneRangeFor } from '@/features/configurator/store';
import { Estimator } from './Estimator';
import { Seo } from '@/shared/seo/Seo';

type ProductSlug = 'window' | 'door' | 'sliding' | 'panoramic' | 'balcony' | 'veranda';
type MaterialKey = 'alumil' | 'rehau';

const MATERIAL_SLUG_BY_PRODUCT: Record<ProductSlug, Record<MaterialKey, string>> = {
  window: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  door: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  sliding: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  panoramic: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  balcony: { alumil: 'aluminum-thermal', rehau: 'pvc-white' },
  veranda: { alumil: 'aluminum-thermal', rehau: 'aluminum-high-thermal' },
};

const FALLBACK_CONSTRAINTS: Record<ProductSlug, { minW: number; maxW: number; minH: number; maxH: number }> = {
  window: { minW: 50, maxW: 300, minH: 50, maxH: 250 },
  door: { minW: 70, maxW: 180, minH: 180, maxH: 240 },
  sliding: { minW: 120, maxW: 400, minH: 100, maxH: 260 },
  panoramic: { minW: 150, maxW: 400, minH: 120, maxH: 300 },
  balcony: { minW: 100, maxW: 400, minH: 150, maxH: 260 },
  veranda: { minW: 150, maxW: 400, minH: 150, maxH: 300 },
};

const easeOutSoft = [0.16, 1, 0.3, 1] as const;

const enterFromBelow = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-35px' },
  transition: { duration: 0.85, ease: easeOutSoft },
};

const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-35px' },
  transition: { duration: 0.75, ease: easeOutSoft },
};

const slideInLeft = {
  initial: { opacity: 0, x: -40 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: '-35px' },
  transition: { duration: 0.85, ease: easeOutSoft },
};

const slideInRight = {
  initial: { opacity: 0, x: 40 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: '-35px' },
  transition: { duration: 0.85, ease: easeOutSoft },
};



const HERO_SLIDES = [
  {
    image: '/img/modern-pvc-window.webp',
    kicker: 'REHAU PVC SYSTEMS',
    titleLine1: 'გერმანული ხარისხი &',
    titleLine2: 'უმაღლესი იზოლაცია',
    lead: 'პრემიუმ კლასის PVC კარ-ფანჯრები Rehau Synego-ს პროფილებით. მაქსიმალური ენერგოეფექტურობა და ხმაურის დაცვა თქვენი სახლისთვის.',
    productSlug: 'window' as ProductSlug,
    materialKey: 'rehau' as MaterialKey,
    specs: [
      { label: 'მწარმოებელი', value: 'Rehau (გერმანია)' },
      { label: 'პროფილი', value: 'Synego (7-კამერიანი)' },
      { label: 'თბოიზოლაცია', value: 'Uf ≈ 1.0 W/m²K' }
    ]
  },
  {
    image: '/img/aluminum-sliding-door.webp',
    kicker: 'ALUMIL SLIDING PORTALS',
    titleLine1: 'პანორამული ხედები &',
    titleLine2: 'თანამედროვე დიზაინი',
    lead: 'ალუმინის თერმო-სლაიდერები Alumil S-77 სერიით. მინიმალისტური დიზაინი, ულტრა-წვრილი ჩარჩოები და უნაკლო მოძრაობის მექანიზმები.',
    productSlug: 'sliding' as ProductSlug,
    materialKey: 'alumil' as MaterialKey,
    specs: [
      { label: 'სისტემა', value: 'Alumil S-77' },
      { label: 'გაღების ტიპი', value: 'მოძრავი სლაიდერი' },
      { label: 'ზღურბლი', value: 'მინიმალური (Flush)' }
    ]
  },
  {
    image: '/img/panoramic-facade-vitrage.webp',
    kicker: 'FACADE VITRAGES',
    titleLine1: 'არქიტექტურული ვიტრაჟები &',
    titleLine2: 'შუშის ფასადები',
    lead: 'დიდი ზომის ალუმინის ვიტრაჟები და საფასადე კონსტრუქციები. იდეალური გადაწყვეტა თანამედროვე ვილებისთვის, კომერციული სივრცეებისა და საოფისე შენობებისთვის.',
    productSlug: 'panoramic' as ProductSlug,
    materialKey: 'alumil' as MaterialKey,
    specs: [
      { label: 'კონსტრუქცია', value: 'თერმოხიდიანი ალუმინი' },
      { label: 'მინის ტიპი', value: 'ენგერგო ორმაგი/სამმაგი' },
      { label: 'უსაფრთხოება', value: 'ნაწრთობი მინა' }
    ]
  },
  {
    image: '/img/balcony-block-door.webp',
    kicker: 'BALCONY BLOCKS',
    titleLine1: 'კომფორტი & ფუნქციურობა',
    titleLine2: 'თქვენი აივნისთვის',
    lead: 'მეტალოპლასტმასის და ალუმინის სააივანო ბლოკები (კარისა და ფანჯრის კომბინაცია). ინდივიდუალური გაღების რეჟიმებითა და საიმედო ჩაკეტვის სისტემებით.',
    productSlug: 'balcony' as ProductSlug,
    materialKey: 'rehau' as MaterialKey,
    specs: [
      { label: 'კომპოზიცია', value: 'კარი + ფანჯარა' },
      { label: 'მასალა', value: 'PVC ან ALU არჩევით' },
      { label: 'ჩაკეტვა', value: 'მრავალწერტილოვანი' }
    ]
  }
];

const SECTIONS = [
  { id: 'sec-hero', label: 'მთავარი' },
  { id: 'sec-catalog', label: 'კატალოგი' },
  { id: 'sec-estimator', label: 'კალკულატორი' },
  { id: 'sec-materials', label: 'მასალები' },
  { id: 'sec-stats', label: 'სტატისტიკა' },
  { id: 'sec-closer', label: 'კონტაქტი' },
];

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const productTypesQuery = useProductTypes();
  const [activeSection, setActiveSection] = useState('sec-hero');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = ['sec-hero', 'sec-catalog', 'sec-estimator', 'sec-materials', 'sec-stats', 'sec-closer'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
        rootMargin: '-5% 0px -5% 0px',
      }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const container = containerRef.current;
    if (el && container) {
      const top = el.offsetTop;
      container.scrollTo({ top, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const handleConfiguratorLaunch = async (slug: ProductSlug, materialKey: MaterialKey) => {
    if (!productTypesQuery.data) {
      navigate('/configurator');
      return;
    }
    const pt = productTypesQuery.data.find((p) => p.slug === slug);
    if (!pt?.id) {
      navigate('/configurator');
      return;
    }

    try {
      const detail = await fetchProductTypeDetail(pt.id);
      const { api, unwrap } = await import('@/shared/api/client');
      const response = await api.get(`/catalog/product-types/${pt.id}/materials`);
      const materials = (await unwrap(response)) as any;
      const targetSlug = MATERIAL_SLUG_BY_PRODUCT[slug]?.[materialKey] || (materials && materials.length > 0 ? materials[0].slug : undefined);
      const m = materials && materials.length > 0 ? (materials.find((x: any) => x.slug === targetSlug) || materials[0]) : undefined;

      if (!m) {
        navigate('/configurator');
        return;
      }

      const familyValue = typeof m.family === 'string' ? m.family.toLowerCase() : '';
      const thermalValue = typeof m.thermalRating === 'string' ? m.thermalRating.toLowerCase() : '';

      const store = useConfiguratorStore.getState();
      store.setProductType({
        id: detail.id!,
        slug: detail.slug!,
        name: detail.name?.ka ?? detail.slug!,
        constraints: {
          minWidthCm: detail.constraints?.minWidthCm ?? 50,
          maxWidthCm: detail.constraints?.maxWidthCm ?? 400,
          minHeightCm: detail.constraints?.minHeightCm ?? 50,
          maxHeightCm: detail.constraints?.maxHeightCm ?? 400,
        },
      });

      const constraints = FALLBACK_CONSTRAINTS[slug];
      const widthVal = Math.round((constraints.minW + constraints.maxW) / 2);
      const heightVal = Math.round((constraints.minH + constraints.maxH) / 2);

      store.setDimensions({ widthCm: widthVal, heightCm: heightVal });

      const { defaultCount } = paneRangeFor(detail.slug);
      store.setPaneCount(defaultCount);
      store.setPaneRatios(Array(defaultCount).fill(1 / defaultCount));

      store.setMaterial({
        id: m.id!,
        slug: m.slug!,
        name: m.name?.ka ?? m.slug!,
        family: familyValue === 'aluminum' ? 'aluminum' : 'pvc',
        thermalRating:
          thermalValue === 'thermal'
            ? 'thermal'
            : thermalValue === 'highthermal'
              ? 'highThermal'
              : thermalValue === 'basic'
                ? 'basic'
                : 'none',
        basePricePerSqmMinor: m.basePricePerSqmMinor ?? 0,
        currency: m.currency ?? 'GEL',
      });

      navigate('/configurator');
    } catch {
      navigate('/configurator');
    }
  };

  return (
    <div ref={containerRef} className="bg-studio-paper h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth relative">
      <Seo route="/" preloadImage="/img/modern-pvc-window.webp" />
      {/* Floating Bubbles Navigation */}
      <div className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3.5 items-center bg-slate-900/10 dark:bg-white/5 backdrop-blur-md border border-slate-200/20 dark:border-white/5 rounded-full py-4 px-2 shadow-xl">
        {SECTIONS.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              className="group relative flex items-center justify-center p-1.5 focus:outline-none"
              aria-label={sec.label}
            >
              {/* Dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-studio-brand scale-125 shadow-[0_0_12px_rgba(37,99,235,0.85)] ring-2 ring-studio-brand/20'
                    : 'bg-slate-400/40 hover:bg-slate-400/80 hover:scale-110'
                }`}
              />
              {/* Tooltip */}
              <span className="absolute right-8 top-1/2 -translate-y-1/2 bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold py-1 px-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-white/10 shadow-lg font-studio font-semibold">
                {sec.label}
              </span>
            </button>
          );
        })}
      </div>

      <div id="sec-hero" className="snap-start snap-always h-full w-full flex flex-col justify-between relative overflow-hidden bg-studio-paper">
        <Hero t={t} onLaunch={handleConfiguratorLaunch} scrollToSection={scrollToSection} />
        <TrustStrip t={t} />
      </div>
      <ProductCatalog t={t} onLaunch={handleConfiguratorLaunch} />
      <Estimator t={t} isActive={activeSection === 'sec-estimator'} />
      <Materials t={t} />
      <Stats t={t} />
      <Closer t={t} />
    </div>
  );
}

function Hero({
  t,
  onLaunch,
  scrollToSection,
}: {
  t: TFunction;
  onLaunch: (slug: ProductSlug, materialKey: MaterialKey) => void;
  scrollToSection: (id: string) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const activeSlide = HERO_SLIDES[current];

  return (
    <section
      className="relative flex flex-1 items-center justify-center overflow-hidden py-4 sm:py-6 md:py-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Slideshow */}
      <div className="absolute inset-0 z-0 select-none">
        {HERO_SLIDES.map((slide, index) => (
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{
              opacity: index === current ? 1 : 0,
              scale: index === current ? 1.05 : 1.0
            }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={slide.image}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              aria-hidden
            />
          </motion.div>
        ))}
      </div>

      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-studio-ink via-studio-ink/80 to-studio-ink/50 backdrop-blur-[0.5px]" />

      {/* Dynamic ambient highlight glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(37,99,235,0.18),transparent_60%)] animate-pulse duration-[6000ms]"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 w-full md:h-full flex flex-col justify-center py-12 sm:py-16 md:py-20 font-studio text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          {/* Main Slide Info */}
          <div className="lg:col-span-7 text-left">
            <motion.div
              key={`kicker-${current}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-3 sm:mb-6 inline-block rounded-full border border-studio-brand/40 bg-studio-brand/20 px-3 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-studio-brand-soft backdrop-blur-md"
            >
              {activeSlide.kicker}
            </motion.div>

            <motion.h1
              key={`title-${current}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-3 sm:mb-6 text-xl sm:text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-2xl"
            >
              {activeSlide.titleLine1}{' '}
              <br />
              <span className="bg-gradient-to-r from-studio-brand-soft via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                {activeSlide.titleLine2}
              </span>
            </motion.h1>

            <motion.p
              key={`lead-${current}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-4 sm:mb-8 max-w-xl text-xs sm:text-base md:text-lg font-light leading-relaxed text-slate-300"
            >
              {activeSlide.lead}
            </motion.p>

            <motion.div
              key={`actions-${current}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 w-full sm:w-auto"
            >
              <button
                onClick={() => onLaunch(activeSlide.productSlug, activeSlide.materialKey)}
                className="group flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-studio-brand px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-[0_0_35px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.03] hover:bg-studio-brand-h hover:shadow-[0_0_55px_rgba(37,99,235,0.6)]"
              >
                <span>{t('home.heroCta')}</span>
                <Box className="h-4 w-4 transition-transform duration-300 ease-out group-hover:rotate-[12deg]" aria-hidden />
              </button>
              <a
                href="#sec-estimator"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('sec-estimator');
                }}
                className="group flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-5 py-3.5 text-sm sm:text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/40"
              >
                <span>{t('home.heroCtaSecondary')}</span>
                <ChevronRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1" aria-hidden />
              </a>
            </motion.div>
          </div>

          {/* Dynamic Technical Specs Grid */}
          <div className="lg:col-span-5 hidden lg:block">
            <motion.div
              key={`specs-${current}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 shadow-2xl backdrop-blur-lg"
            >
              <span className="block font-mono text-[10px] font-bold tracking-[0.2em] text-studio-brand-soft mb-6">
                ტექნიკური მახასიათებლები
              </span>
              <div className="flex flex-col gap-5">
                {activeSlide.specs.map((spec, specIdx) => (
                  <div key={specIdx} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
                    <span className="text-sm font-light text-slate-400">{spec.label}</span>
                    <span className="text-sm font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5">{spec.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Slider Controls */}
      <div className="absolute bottom-4 sm:bottom-10 left-4 right-4 z-20 mx-auto max-w-7xl flex items-center justify-between pointer-events-none">
        {/* Navigation Arrows */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-md transition-all hover:bg-white/15 hover:border-white/30 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next Slide"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-md transition-all hover:bg-white/15 hover:border-white/30 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2.5 pointer-events-auto items-center">
          {HERO_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === current ? 'w-8 bg-studio-brand' : 'w-2.5 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustStrip({ t }: { t: TFunction }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? 'ka';

  return (
    <motion.section
      {...fadeIn}
      className="border-y border-studio-paper-3 bg-studio-paper/40 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 font-studio text-center sm:flex-row sm:justify-between sm:gap-8 sm:px-6 sm:py-6 lg:px-8">
        <span className={`font-mono text-[10px] font-bold tracking-[0.25em] text-studio-brand ${lang === 'ka' ? '' : 'uppercase'}`}>
          {t('home.trust.label')}
        </span>
        <span className="font-studio text-base font-semibold tracking-wider text-studio-fg-mute">
          {t('home.trust.brands')}
        </span>
      </div>
    </motion.section>
  );
}

/* Product Catalog Showcase Section */
function ProductCatalog({ t, onLaunch }: { t: TFunction; onLaunch: (slug: ProductSlug, materialKey: MaterialKey) => void }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? 'ka';
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const catalogItems = [
    {
      slug: 'window' as ProductSlug,
      materialKey: 'rehau' as MaterialKey,
      title: t('home.catalog.pvc.title'),
      desc: t('home.catalog.pvc.description'),
      badge: t('home.catalog.pvc.badge'),
      image: '/img/modern-pvc-window.webp',
      icon: Square,
      tags: ['Rehau Synego', '5 კამერა', 'ხმაურის ჩახშობა']
    },
    {
      slug: 'window' as ProductSlug,
      materialKey: 'alumil' as MaterialKey,
      title: t('home.catalog.aluminum.title'),
      desc: t('home.catalog.aluminum.description'),
      badge: t('home.catalog.aluminum.badge'),
      image: '/img/modern-aluminum-window.webp',
      icon: LayoutGrid,
      tags: ['Alumil S-77', 'თერმოხიდი', 'ანოდირებული ფერი']
    },
    {
      slug: 'sliding' as ProductSlug,
      materialKey: 'alumil' as MaterialKey,
      title: t('home.catalog.sliding.title'),
      desc: t('home.catalog.sliding.description'),
      badge: t('home.catalog.sliding.badge'),
      image: '/img/aluminum-sliding-door.webp',
      icon: GalleryHorizontal,
      tags: ['მოძრავი სლაიდი', 'სივრცის ოპტიმიზაცია', 'დაბალი ზღურბლი']
    },
    {
      slug: 'panoramic' as ProductSlug,
      materialKey: 'alumil' as MaterialKey,
      title: t('home.catalog.vitrages.title'),
      desc: t('home.catalog.vitrages.description'),
      badge: t('home.catalog.vitrages.badge'),
      image: '/img/panoramic-facade-vitrage.webp',
      icon: PanelsTopLeft,
      tags: ['ფასადური ვიტრაჟი', 'მაქსიმალური განათება', 'ენერგო მინა']
    },
    {
      slug: 'window' as ProductSlug,
      materialKey: 'rehau' as MaterialKey,
      title: t('home.catalog.nets.title'),
      desc: t('home.catalog.nets.description'),
      badge: t('home.catalog.nets.badge'),
      image: '/img/premium-mosquito-net.webp',
      icon: Grid,
      tags: ['პლისე ბადეები', 'ინტეგრირებული', 'კოროზიისგან დაცვა']
    }
  ];

  return (
    <section id="sec-catalog" className="snap-start snap-always h-full w-full flex flex-col justify-center py-4 sm:py-10 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full flex flex-col justify-between overflow-hidden">
        <motion.div {...enterFromBelow} className="mb-3 sm:mb-8 text-center font-studio flex-shrink-0">
          <h2 className="mb-1 text-lg font-extrabold text-studio-fg sm:text-3xl md:text-5xl">
            {t('home.catalogTitle')}
          </h2>
          <p className="mx-auto max-w-2xl text-[11px] sm:text-sm md:text-base text-slate-500 font-light leading-relaxed">
            {t('home.catalogSubtitle')}
          </p>
        </motion.div>

        {/* Carousel Wrapper */}
        <div className="relative w-full overflow-hidden flex-grow flex items-center">
          {/* Navigation arrows */}
          {/* Hidden on phones — the 85vw cards peek and swipe naturally;
              the centered arrows used to overlap the card titles. */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 z-20 hidden sm:flex justify-between pointer-events-none px-2 sm:px-4">
            <button
              onClick={() => scrollCarousel('left')}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md backdrop-blur-sm border border-slate-200 transition-all active:scale-95"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md backdrop-blur-sm border border-slate-200 transition-all active:scale-95"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={carouselRef}
            className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth gap-6 py-8 px-4 w-full scrollbar-none"
          >
            {catalogItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="w-[85vw] sm:w-[350px] flex-shrink-0 snap-start"
                >
                  <motion.article
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-35px' }}
                    transition={{ duration: 0.65, delay: index * 0.08, ease: easeOutSoft }}
                    className="group relative flex flex-col justify-between h-full rounded-3xl border border-slate-100 bg-white shadow-lg overflow-hidden transition-all duration-300 hover:border-studio-brand/30 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)]"
                  >
                    {/* Top Image Part */}
                    <div className="relative h-32 sm:h-44 w-full overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        width={350}
                        height={176}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Floating badge */}
                      <span className={`absolute top-4 right-4 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1.5 text-[10px] font-bold text-white tracking-wider border border-white/10 ${lang === 'ka' ? '' : 'uppercase'}`}>
                        {item.badge}
                      </span>

                      {/* Glassmorphic Icon */}
                      <div className="absolute bottom-4 left-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-2 text-white shadow-lg">
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                    </div>

                    {/* Bottom Content Part */}
                    <div className="p-4 sm:p-6 flex flex-col justify-between flex-grow">
                      <div>
                        <h3 className="mb-2 text-xl font-bold text-studio-fg group-hover:text-studio-brand transition-colors duration-200">
                          {item.title}
                        </h3>

                        <p className="mb-4 text-xs text-studio-fg-mute font-light leading-relaxed min-h-[36px]">
                          {item.desc}
                        </p>
                      </div>

                      <div>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {item.tags.map((t, idx) => (
                            <span key={idx} className="rounded-md bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-500 border border-slate-100">
                              {t}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => onLaunch(item.slug, item.materialKey)}
                          className="w-full flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-studio-brand hover:text-white hover:border-studio-brand transition-all duration-200"
                        >
                          <span>დიზაინი 3D-ში</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.article>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}


function Materials({ t }: { t: TFunction }) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const offset = direction === 'left' ? -300 : 300;
      carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section id="sec-materials" className="snap-start snap-always h-full w-full flex flex-col justify-center py-4 sm:py-10 bg-slate-50 border-t border-slate-100 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full flex flex-col justify-between overflow-hidden">
        <motion.div {...enterFromBelow} className="mb-3 sm:mb-8 text-center font-studio flex-shrink-0">
          <h2 className="mb-1 text-lg font-extrabold text-studio-fg sm:text-3xl md:text-4xl">
            {t('home.materialsTitle')}
          </h2>
          <p className="mx-auto max-w-2xl text-[11px] sm:text-sm md:text-base text-slate-500 font-light leading-relaxed">
            {t('home.materialsSubtitle')}
          </p>
        </motion.div>

        {/* Carousel Wrapper */}
        <div className="relative w-full overflow-hidden flex-grow flex items-center">
          {/* Tablet-only arrows — phones swipe (arrows overlapped card
              titles), desktop lg shows the full grid. */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 z-20 hidden sm:flex justify-between pointer-events-none px-2 lg:hidden">
            <button
              onClick={() => scrollCarousel('left')}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md backdrop-blur-sm border border-slate-200 transition-all active:scale-95"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md backdrop-blur-sm border border-slate-200 transition-all active:scale-95"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={carouselRef}
            className="flex lg:grid lg:grid-cols-4 overflow-x-auto overflow-y-hidden lg:overflow-x-visible lg:overflow-y-visible snap-x snap-mandatory lg:snap-none gap-6 py-8 px-4 lg:py-4 lg:px-2 w-full scrollbar-none"
          >
            <div className="w-[80vw] sm:w-[280px] lg:w-auto flex-shrink-0 snap-start">
              <AnimatedCard delay={0}>
                <Card
                  title={t('home.materials.pvc.title')}
                  body={t('home.materials.pvc.body')}
                  badge={t('home.materials.pvc.badge')}
                  icon={Square}
                  image="/img/pvc-profile-detail.webp"
                />
              </AnimatedCard>
            </div>
            <div className="w-[80vw] sm:w-[280px] lg:w-auto flex-shrink-0 snap-start">
              <AnimatedCard delay={0.06}>
                <Card
                  inverse
                  title={t('home.materials.aluminum.title')}
                  body={t('home.materials.aluminum.body')}
                  badge={t('home.materials.aluminum.badge')}
                  icon={Cpu}
                  image="/img/aluminum-profile-detail.webp"
                />
              </AnimatedCard>
            </div>
            <div className="w-[80vw] sm:w-[280px] lg:w-auto flex-shrink-0 snap-start">
              <AnimatedCard delay={0.12}>
                <Card
                  title={t('home.materials.sliding.title')}
                  body={t('home.materials.sliding.body')}
                  badge={t('home.materials.sliding.badge')}
                  icon={GalleryHorizontal}
                  image="/img/sliding-roller-detail.webp"
                />
              </AnimatedCard>
            </div>
            <div className="w-[80vw] sm:w-[280px] lg:w-auto flex-shrink-0 snap-start">
              <AnimatedCard delay={0.18}>
                <Card
                  inverse
                  title={t('home.materials.hardware.title')}
                  body={t('home.materials.hardware.body')}
                  badge={t('home.materials.hardware.badge')}
                  icon={ShieldCheck}
                  image="/img/premium-handle-detail.webp"
                />
              </AnimatedCard>
            </div>
          </div>
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
      viewport={{ once: true, margin: '-35px' }}
      transition={{ duration: 0.65, delay, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

function Stats({ t }: { t: TFunction }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? 'ka';

  const stats: Array<[string, string]> = [
    [t('home.stats.fact1Value'), t('home.stats.fact1Label')],
    [t('home.stats.fact2Value'), t('home.stats.fact2Label')],
    [t('home.stats.fact3Value'), t('home.stats.fact3Label')],
    [t('home.stats.fact4Value'), t('home.stats.fact4Label')],
  ];
  return (
    <section id="sec-stats" className="snap-start snap-always h-full w-full flex flex-col justify-center py-4 sm:py-10 bg-studio-ink font-studio text-white border-t border-studio-ink-3 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(37,99,235,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_80%,rgba(79,70,229,0.05),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full flex flex-col justify-center">
        <motion.div {...slideInLeft} className="mb-4 sm:mb-10 max-w-3xl flex-shrink-0">
          <p className={`mb-1 sm:mb-2 font-mono text-[10px] font-bold tracking-[0.25em] text-studio-brand ${lang === 'ka' ? '' : 'uppercase'}`}>
            {t('home.stats.eyebrow')}
          </p>
          <h2 className="mb-2 sm:mb-4 text-lg sm:text-3xl md:text-5xl font-extrabold leading-tight">
            {t('home.stats.title')}
          </h2>
          <p className="max-w-2xl text-[11px] sm:text-sm md:text-base font-light leading-relaxed text-slate-400">
            {t('home.stats.lead')}
          </p>
        </motion.div>

        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(([value, label], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-35px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: easeOutSoft }}
              className="rounded-2xl border border-studio-ink-3 bg-studio-ink-2/30 p-3.5 sm:p-5 backdrop-blur-sm"
            >
              <dt className={`font-mono text-[9px] font-bold tracking-[0.25em] text-studio-brand-soft ${lang === 'ka' ? '' : 'uppercase'}`}>
                {label}
              </dt>
              <dd className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-white md:text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
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
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? 'ka';

  return (
    <section id="sec-closer" className="snap-start snap-always h-full w-full flex flex-col justify-center py-4 sm:py-10 bg-studio-paper-2 font-studio relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_50%,rgba(37,99,235,0.10),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8 w-full flex flex-col justify-center">
        <motion.p
          {...fadeIn}
          className={`mb-1 sm:mb-2 font-mono text-[10px] font-bold tracking-[0.25em] text-studio-brand ${lang === 'ka' ? '' : 'uppercase'}`}
        >
          {t('home.closer.eyebrow')}
        </motion.p>
        <motion.h2
          {...enterFromBelow}
          transition={{ ...enterFromBelow.transition, delay: 0.08 }}
          className="mb-2 sm:mb-4 text-lg sm:text-3xl md:text-5xl font-extrabold leading-tight text-studio-fg"
        >
          {t('home.closer.title')}
        </motion.h2>
        <motion.p
          {...slideInRight}
          transition={{ ...slideInRight.transition, delay: 0.16 }}
          className="mx-auto mb-4 sm:mb-8 max-w-2xl text-xs sm:text-sm md:text-base font-light leading-relaxed text-studio-fg-mute"
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
            className="group flex items-center justify-center gap-3 rounded-full bg-studio-brand px-10 py-4 text-base font-bold text-white shadow-[0_0_40px_rgba(37,99,235,0.35)] transition-all hover:scale-[1.03] hover:bg-studio-brand-h hover:shadow-[0_0_60px_rgba(37,99,235,0.55)]"
          >
            <span>{t('home.closer.cta')}</span>
            <ArrowRight
              className="h-5 w-5 transition-transform duration-300 ease-out group-hover:translate-x-1"
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
  icon: typeof Box;
  image?: string;
  inverse?: boolean;
};

function Card({ title, body, badge, icon: Icon, image, inverse }: CardProps) {
  const content = (
    <>
      {image && (
        <div className="relative h-32 sm:h-44 w-full overflow-hidden border-b border-slate-100/50">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}
      <div className={image ? 'p-4 pt-3 sm:p-6 sm:pt-5' : 'p-4 sm:p-8'}>
        <div className={`mb-4 rounded-xl p-2.5 w-fit ${inverse ? 'bg-white/5 text-studio-brand-soft' : 'bg-studio-brand/5 text-studio-brand'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className={`mb-2.5 text-xl font-bold transition-colors duration-200 ${inverse ? 'text-white' : 'text-studio-fg group-hover:text-studio-brand'}`}>
          {title}
        </h3>
        <p className={`mb-5 text-xs font-light leading-relaxed min-h-[48px] ${inverse ? 'text-slate-400' : 'text-studio-fg-mute'}`}>
          {body}
        </p>
        <div className={`flex items-center gap-2 font-bold text-xs ${inverse ? 'text-studio-brand-soft' : 'text-studio-brand'}`}>
          <Check className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" aria-hidden />
          <span>{badge}</span>
        </div>
      </div>
    </>
  );

  return (
    <article className={`group h-full rounded-3xl border overflow-hidden transition-all duration-300 hover:-translate-y-2 ${
      inverse 
        ? 'border-studio-ink-3 bg-studio-fg shadow-2xl hover:shadow-[0_25px_60px_-15px_rgba(37,99,235,0.25)]' 
        : 'border-slate-100 bg-white shadow-xl hover:border-studio-brand/20 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)]'
    }`}>
      {content}
    </article>
  );
}
