import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Menu, X } from 'lucide-react';

import { SUPPORTED_LOCALES, type Locale } from '@/i18n';
import { cn } from '@/shared/lib/cn';

const LOCALE_LABEL: Record<Locale, string> = {
  ka: 'ქარ',
  en: 'EN',
  ru: 'РУ',
};

const LOCALE_FULL: Record<Locale, string> = {
  ka: 'ქართული',
  en: 'English',
  ru: 'Русский',
};

export function Layout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const studioRef = useRef<HTMLDivElement | null>(null);

  // Close on route change.
  useEffect(() => {
    setMobileOpen(false);
    setStudioOpen(false);
  }, [location.pathname]);

  // Close dropdown on outside-click / Escape.
  useEffect(() => {
    if (!studioOpen) return;
    function onClick(e: MouseEvent) {
      if (!studioRef.current?.contains(e.target as Node)) setStudioOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setStudioOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [studioOpen]);

  const studioActive =
    location.pathname.startsWith('/about') ||
    location.pathname.startsWith('/process') ||
    location.pathname.startsWith('/materials');

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent-amber focus:px-4 focus:py-2 focus:font-mono focus:text-mono-spec focus:uppercase focus:tracking-wider focus:text-bg-base"
      >
        {t('nav.skipToContent')}
      </a>

      <header className="sticky top-0 z-40 border-b border-hairline bg-bg-base/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 md:px-8">
          <Link
            to="/"
            className="font-display text-h4 tracking-tight text-fg-primary"
            aria-label="BEQSAN"
          >
            BEQSAN
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            <div ref={studioRef} className="relative">
              <button
                type="button"
                onClick={() => setStudioOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={studioOpen}
                aria-label={t('nav.studioGroupAria')}
                className={cn(
                  'inline-flex items-center gap-1 text-body-sm transition-colors duration-120',
                  studioActive || studioOpen
                    ? 'text-fg-primary'
                    : 'text-fg-secondary hover:text-fg-primary',
                )}
              >
                {t('nav.studioGroup')}
                <ChevronDown
                  size={14}
                  className={cn(
                    'transition-transform duration-180 ease-standard',
                    studioOpen ? 'rotate-180' : 'rotate-0',
                  )}
                  aria-hidden
                />
              </button>
              {studioOpen ? (
                <div
                  role="menu"
                  className="absolute left-1/2 top-full z-50 mt-3 w-56 -translate-x-1/2 rounded-sm border border-hairline bg-bg-elevated shadow-lg"
                >
                  <DropdownLink to="/about" label={t('nav.about')} />
                  <DropdownLink to="/process" label={t('nav.process')} />
                  <DropdownLink to="/materials" label={t('nav.materials')} />
                </div>
              ) : null}
            </div>
            <NavLinkItem to="/configurator">{t('nav.configurator')}</NavLinkItem>
            <NavLinkItem to="/catalog">{t('nav.catalog')}</NavLinkItem>
            <NavLinkItem to="/gallery">{t('nav.gallery')}</NavLinkItem>
            <NavLinkItem to="/warranty">{t('nav.warranty')}</NavLinkItem>
            <NavLinkItem to="/contact">{t('nav.contact')}</NavLinkItem>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/configurator"
              className="hidden h-11 items-center justify-center rounded-sm bg-accent-amber px-5 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-colors duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98] md:inline-flex"
            >
              {t('common.actions.configure')}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-hairline text-fg-primary md:hidden"
            >
              {mobileOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div
            id="mobile-nav"
            className="border-t border-hairline bg-bg-base md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.studioGroupAria')}
          >
            <nav
              aria-label="Mobile primary"
              className="mx-auto flex max-w-content flex-col gap-1 px-4 py-4"
            >
              <MobileLink to="/about" label={t('nav.about')} />
              <MobileLink to="/process" label={t('nav.process')} />
              <MobileLink to="/materials" label={t('nav.materials')} />
              <MobileLink to="/configurator" label={t('nav.configurator')} />
              <MobileLink to="/catalog" label={t('nav.catalog')} />
              <MobileLink to="/gallery" label={t('nav.gallery')} />
              <MobileLink to="/warranty" label={t('nav.warranty')} />
              <MobileLink to="/contact" label={t('nav.contact')} />
              <Link
                to="/configurator"
                className="mt-4 inline-flex h-12 items-center justify-center rounded-sm bg-accent-amber font-mono text-mono-spec uppercase tracking-wider text-bg-base"
              >
                {t('common.actions.configure')}
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-hairline bg-bg-elevated">
        <div className="mx-auto grid max-w-content grid-cols-1 gap-12 px-4 py-16 md:grid-cols-12 md:px-8 md:py-22">
          {/* Brand column */}
          <div className="md:col-span-5">
            <div className="font-display text-h2 tracking-tight">BEQSAN</div>
            <p className="mt-3 max-w-md text-body text-fg-secondary">{t('footer.tagline')}</p>
            <p className="mt-6 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
              {t('footer.address')}
              <span className="mx-2 text-fg-tertiary/60">·</span>
              {t('footer.addressCoords')}
            </p>
          </div>

          {/* Explore */}
          <div className="md:col-span-2">
            <p className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('footer.explore')}
            </p>
            <ul className="mt-4 space-y-3 text-body-sm text-fg-secondary">
              <FooterLink to="/configurator">{t('nav.configurator')}</FooterLink>
              <FooterLink to="/catalog">{t('nav.catalog')}</FooterLink>
              <FooterLink to="/gallery">{t('nav.gallery')}</FooterLink>
              <FooterLink to="/warranty">{t('nav.warranty')}</FooterLink>
            </ul>
          </div>

          {/* Studio */}
          <div className="md:col-span-2">
            <p className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('footer.studio')}
            </p>
            <ul className="mt-4 space-y-3 text-body-sm text-fg-secondary">
              <FooterLink to="/about">{t('nav.about')}</FooterLink>
              <FooterLink to="/process">{t('nav.process')}</FooterLink>
              <FooterLink to="/materials">{t('nav.materials')}</FooterLink>
              <FooterLink to="/contact">{t('nav.contact')}</FooterLink>
            </ul>
          </div>

          {/* Reach */}
          <div className="md:col-span-3">
            <p className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('footer.reach')}
            </p>
            <p className="mt-4 font-mono text-mono-spec text-fg-primary">
              {t('footer.phoneValue')}
            </p>
            <a
              href={`mailto:${t('footer.emailValue')}`}
              className="mt-2 block text-body-sm text-fg-secondary hover:text-fg-primary"
            >
              {t('footer.emailValue')}
            </a>
            <p className="mt-6 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('footer.hours')}
            </p>
            <p className="mt-3 text-body-sm text-fg-secondary">{t('footer.hoursValue')}</p>
            <p className="text-body-sm text-fg-secondary">{t('footer.hoursSat')}</p>

            <div className="mt-8">
              <p className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                {t('footer.languageLabel')}
              </p>
              <div
                role="group"
                aria-label={t('footer.languageLabel')}
                className="mt-3 inline-flex overflow-hidden rounded-sm border border-hairline"
              >
                {SUPPORTED_LOCALES.map((loc) => {
                  const active = i18n.resolvedLanguage === loc || i18n.language === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => void i18n.changeLanguage(loc)}
                      aria-pressed={active}
                      aria-label={LOCALE_FULL[loc]}
                      className={cn(
                        'border-r border-hairline px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors duration-120 last:border-r-0',
                        active
                          ? 'bg-accent-amber/15 text-accent-amber'
                          : 'text-fg-tertiary hover:text-fg-primary',
                      )}
                    >
                      {LOCALE_LABEL[loc]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-hairline">
          <div className="mx-auto flex flex-col items-start justify-between gap-2 px-4 py-6 text-caption text-fg-tertiary md:flex-row md:items-center md:px-8">
            <span>
              © 2026 {t('footer.company')}. {t('footer.rights')}.
            </span>
            <span className="font-mono">{t('footer.credit')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLinkItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'text-body-sm transition-colors duration-120',
          isActive ? 'text-fg-primary' : 'text-fg-secondary hover:text-fg-primary',
        )
      }
    >
      {children}
    </NavLink>
  );
}

function DropdownLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      role="menuitem"
      className={({ isActive }) =>
        cn(
          'block border-b border-hairline px-4 py-3 text-body-sm transition-colors duration-120 last:border-b-0',
          isActive
            ? 'bg-bg-raised text-fg-primary'
            : 'text-fg-secondary hover:bg-bg-raised hover:text-fg-primary',
        )
      }
    >
      {label}
    </NavLink>
  );
}

function MobileLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'block border-b border-hairline py-3 text-body transition-colors duration-120 last:border-b-0',
          isActive ? 'text-fg-primary' : 'text-fg-secondary',
        )
      }
    >
      {label}
    </NavLink>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="hover:text-fg-primary">
        {children}
      </Link>
    </li>
  );
}
