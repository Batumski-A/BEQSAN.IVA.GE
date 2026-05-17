import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

export function Layout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-bg-base/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 md:px-8">
          <Link to="/" className="font-display text-h4 tracking-tight text-fg-primary">
            BEQSAN
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <NavLinkItem to="/configurator">{t('nav.configurator')}</NavLinkItem>
            <NavLinkItem to="/catalog">{t('nav.catalog')}</NavLinkItem>
            <NavLinkItem to="/gallery">{t('nav.gallery')}</NavLinkItem>
            <NavLinkItem to="/contact">{t('nav.contact')}</NavLinkItem>
          </nav>
          <Link
            to="/configurator"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-accent-amber px-5 font-mono text-mono-spec uppercase tracking-wider text-bg-base transition-colors duration-120 ease-standard hover:bg-accent-amber-h active:scale-[0.98]"
          >
            {t('common.actions.configure')}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-hairline bg-bg-elevated">
        <div className="mx-auto grid max-w-content grid-cols-1 gap-12 px-4 py-16 md:grid-cols-4 md:px-8 md:py-22">
          <div className="md:col-span-2">
            <div className="font-display text-h2 tracking-tight">BEQSAN</div>
            <p className="mt-3 max-w-md text-body text-fg-secondary">{t('footer.tagline')}</p>
            <p className="mt-6 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
              {t('footer.address')}
              <span className="mx-2 text-fg-tertiary/60">·</span>
              {t('footer.addressCoords')}
            </p>
          </div>

          <div>
            <p className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('nav.configurator').toUpperCase()}
            </p>
            <ul className="mt-4 space-y-3 text-body-sm text-fg-secondary">
              <li>
                <Link to="/configurator" className="hover:text-fg-primary">
                  {t('nav.configurator')}
                </Link>
              </li>
              <li>
                <Link to="/catalog" className="hover:text-fg-primary">
                  {t('nav.catalog')}
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-fg-primary">
                  {t('nav.gallery')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('footer.phone').toUpperCase()}
            </p>
            <p className="mt-4 font-mono text-mono-spec text-fg-primary">
              {t('footer.phoneValue')}
            </p>
            <p className="mt-6 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              {t('footer.hours').toUpperCase()}
            </p>
            <p className="mt-4 text-body-sm text-fg-secondary">{t('footer.hoursValue')}</p>
          </div>
        </div>
        <div className="border-t border-hairline">
          <div className="mx-auto flex max-w-content items-center justify-between px-4 py-6 text-caption text-fg-tertiary md:px-8">
            <span>
              © 2026 {t('footer.company')}. {t('footer.rights')}.
            </span>
            <span className="font-mono">v0.1.0 · scaffold</span>
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
