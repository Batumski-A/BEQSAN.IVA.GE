import { lazy, useLayoutEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Layout } from '@/features/_layout/Layout';
import { StudioLayout } from '@/features/_layout/StudioLayout';
import { AdminGate } from '@/features/admin/AdminGate';
import type { Locale } from '@/shared/seo/routeMeta';

const Home = lazy(() => import('@/features/home/Home'));
const LiveStudio = lazy(() => import('@/features/configurator/LiveStudio'));
const ConfiguratorWizard = lazy(() => import('@/features/configurator/ConfiguratorPage'));
const Catalog = lazy(() => import('@/features/catalog/Catalog'));
const Gallery = lazy(() => import('@/features/gallery/Gallery'));
const Contact = lazy(() => import('@/features/contact/Contact'));
const About = lazy(() => import('@/features/about/About'));
const Process = lazy(() => import('@/features/process/Process'));
const Materials = lazy(() => import('@/features/materials/Materials'));
const Warranty = lazy(() => import('@/features/warranty/Warranty'));
const OrderTracking = lazy(() => import('@/features/order-tracking/OrderTracking'));
const NotFound = lazy(() => import('@/features/not-found/NotFound'));

// Admin panel — lazy-loaded so /adminpanel chunks ship separately from the
// public bundle. Visitors who never hit /adminpanel never download these.
const AdminLogin = lazy(() =>
  import('@/features/admin/Login').then((m) => ({ default: m.AdminLogin })),
);
const AdminDashboard = lazy(() =>
  import('@/features/admin/Dashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminPricing = lazy(() =>
  import('@/features/admin/PricingPage').then((m) => ({ default: m.PricingPage })),
);
const AdminAccounts = lazy(() =>
  import('@/features/admin/social/AccountsPage').then((m) => ({ default: m.AccountsPage })),
);
const AdminCompose = lazy(() =>
  import('@/features/admin/social/ComposePage').then((m) => ({ default: m.ComposePage })),
);
const AdminInbox = lazy(() =>
  import('@/features/admin/social/InboxPage').then((m) => ({ default: m.InboxPage })),
);
const AdminOrdersList = lazy(() =>
  import('@/features/admin/OrdersListPage').then((m) => ({ default: m.OrdersListPage })),
);
const AdminOrderDetail = lazy(() =>
  import('@/features/admin/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);
const AdminReports = lazy(() =>
  import('@/features/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const AdminWarranties = lazy(() =>
  import('@/features/admin/WarrantiesPage').then((m) => ({ default: m.WarrantiesPage })),
);
const AdminCatalog = lazy(() =>
  import('@/features/admin/CatalogPage').then((m) => ({ default: m.CatalogPage })),
);
const AdminGallery = lazy(() =>
  import('@/features/admin/GalleryPage').then((m) => ({ default: m.GalleryPage })),
);

/**
 * Two layout shells:
 *
 *  - `StudioLayout` — minimal "BEQSAN. / 3D სტუდია" header, used by the new
 *    Modern Studio surfaces (`/` and `/configurator`). The header is hidden on
 *    `/configurator` so the live editor occupies the full viewport.
 *
 *  - `Layout` (legacy Industrial Elegance) — sticky multi-link nav + full
 *    footer, used by every other route until those pages are reskinned.
 *
 * The legacy 8-step configurator wizard stays available at
 * `/configurator/wizard` for transitional QA — it'll be removed once the live
 * editor has feature parity (color picker, accessories, send-order endpoint).
 */
/** The public route tree, language-agnostic (paths are relative so it can be
 *  mounted at the root for ka and under /en, /ru for the other locales). */
function PublicRoutes() {
  return (
    <Routes>
      <Route element={<StudioLayout />}>
        <Route index element={<Home />} />
        <Route path="configurator" element={<LiveStudio />} />
      </Route>
      <Route element={<Layout />}>
        <Route path="configurator/wizard" element={<ConfiguratorWizard />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog/:type" element={<Catalog />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="gallery/:slug" element={<Gallery />} />
        <Route path="about" element={<About />} />
        <Route path="process" element={<Process />} />
        <Route path="materials" element={<Materials />} />
        <Route path="warranty" element={<Warranty />} />
        <Route path="contact" element={<Contact />} />
        <Route path="order/:phone/:code" element={<OrderTracking />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/** Forces i18next to the URL's locale, then renders the public tree. URL is the
 *  source of truth for language (path prefix /en, /ru; ka at root). */
function LocaleShell({ lang }: { lang: Locale }) {
  const { i18n } = useTranslation();
  useLayoutEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang);
  }, [lang, i18n]);
  return <PublicRoutes />;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Admin — root only, never under a locale prefix. AdminLayout renders
          inside each page; login is public, the rest is behind AdminGate. */}
      <Route path="adminpanel/login" element={<AdminLogin />} />
      <Route
        path="adminpanel/*"
        element={
          <AdminGate>
            <AdminRoutes />
          </AdminGate>
        }
      />

      {/* Localized public trees. Static "en"/"ru" segments outrank the ka
          splat, so /en/* and /ru/* win over /*. */}
      <Route path="en/*" element={<LocaleShell lang="en" />} />
      <Route path="ru/*" element={<LocaleShell lang="ru" />} />
      <Route path="/*" element={<LocaleShell lang="ka" />} />
    </Routes>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="orders" element={<AdminOrdersList />} />
      <Route path="orders/:id" element={<AdminOrderDetail />} />
      <Route path="pricing" element={<AdminPricing />} />
      <Route path="catalog" element={<AdminCatalog />} />
      <Route path="gallery" element={<AdminGallery />} />
      <Route path="warranties" element={<AdminWarranties />} />
      <Route path="reports" element={<AdminReports />} />
      <Route path="social" element={<AdminAccounts />} />
      <Route path="social/callback" element={<AdminAccounts />} />
      <Route path="social/compose" element={<AdminCompose />} />
      <Route path="social/inbox" element={<AdminInbox />} />
      <Route path="*" element={<AdminDashboard />} />
    </Routes>
  );
}
