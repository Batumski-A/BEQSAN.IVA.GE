import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

/**
 * Minimal layout for Modern Studio surfaces (`/` and `/configurator`).
 * Renders a white sticky nav with the BEQSAN logo + a single "3D სტუდია" CTA.
 * On `/configurator` the nav is hidden entirely so the live editor takes the
 * full viewport — the in-scene back button + view toggle replace it.
 * All other site routes still flow through the legacy <Layout/>.
 */
export function StudioLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);

  const showNav = !location.pathname.startsWith('/configurator');

  // Capture global scroll events (including container scrolls inside sub-pages)
  useEffect(() => {
    const handleScroll = () => {
      const snapContainer = document.querySelector('.snap-y');
      const scrollTop = snapContainer
        ? snapContainer.scrollTop
        : (window.scrollY || document.documentElement.scrollTop);
      setScrolled(scrollTop > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const isCollapsed = scrolled && !headerHovered;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {showNav ? (
        <nav
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
          className="flex-shrink-0 border-b border-gray-100 bg-white/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md transition-all duration-300"
        >
          <div
            className={cn(
              "mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300",
              isCollapsed ? "h-11" : "h-20"
            )}
          >
            <Link
              to="/"
              className={cn(
                "font-studio font-bold tracking-tighter text-studio-fg transition-all duration-300",
                isCollapsed ? "text-lg" : "text-2xl"
              )}
              aria-label="BEQSAN"
            >
              BEQSAN<span className="text-studio-brand">.</span>
            </Link>
            <Link
              to="/configurator"
              className={cn(
                "rounded-full bg-studio-fg font-studio font-medium text-white shadow-sm transition-all hover:bg-studio-ink-2 hover:shadow-md duration-300 inline-flex items-center justify-center whitespace-nowrap",
                isCollapsed
                  ? "opacity-0 pointer-events-none w-0 scale-75 overflow-hidden px-0 py-0"
                  : "px-5 py-2.5 text-sm opacity-100 scale-100"
              )}
            >
              {t('studio.nav.ctaLaunch')}
            </Link>
          </div>
        </nav>
      ) : null}
      <main className="flex-grow overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
}

