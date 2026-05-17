import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from '@/features/_layout/Layout';

const Home = lazy(() => import('@/features/home/Home'));
const Configurator = lazy(() => import('@/features/configurator/Configurator'));
const Catalog = lazy(() => import('@/features/catalog/Catalog'));
const Gallery = lazy(() => import('@/features/gallery/Gallery'));
const Contact = lazy(() => import('@/features/contact/Contact'));
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
        <Route path="contact" element={<Contact />} />
        <Route path="order/:phone/:code" element={<OrderTracking />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
