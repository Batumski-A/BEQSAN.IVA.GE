import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from '@/features/_layout/Layout';

const Home = lazy(() => import('@/features/home/Home'));
const Configurator = lazy(() => import('@/features/configurator/ConfiguratorPage'));
const Catalog = lazy(() => import('@/features/catalog/Catalog'));
const Gallery = lazy(() => import('@/features/gallery/Gallery'));
const Contact = lazy(() => import('@/features/contact/Contact'));
const About = lazy(() => import('@/features/about/About'));
const Process = lazy(() => import('@/features/process/Process'));
const Materials = lazy(() => import('@/features/materials/Materials'));
const Warranty = lazy(() => import('@/features/warranty/Warranty'));
const OrderTracking = lazy(() => import('@/features/order-tracking/OrderTracking'));
const NotFound = lazy(() => import('@/features/not-found/NotFound'));

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="configurator" element={<Configurator />} />
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
