import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'BEQSAN — კარფანჯრები',
        short_name: 'BEQSAN',
        description:
          'ხელით აწყობილი ალუმინისა და მეტალო-პლასტმასის კარფანჯრები ბათუმის ფაბრიკაში.',
        lang: 'ka',
        dir: 'ltr',
        theme_color: '#0A0E14',
        background_color: '#0A0E14',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          // Vector icon works for both regular + maskable purposes on all
          // current Chromium / Safari versions. Once a high-fidelity PNG
          // set arrives in Phase 1.5 we'll re-add 192/512 raster variants;
          // referencing missing PNGs here causes manifest install to fail
          // and Lighthouse to ding PWA score.
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Take over immediately after install so a deploy reaches users on
        // the very next reload instead of lingering behind the old cache.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // NEVER swallow API navigations with the SPA shell — opening a
        // snapshot drawing link (/api/v1/files/*.png) from WhatsApp used
        // to render the React 404 page instead of the image.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'tanstack-vendor': ['@tanstack/react-query', 'axios'],
          'motion-vendor': ['framer-motion'],
          'radix-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
          ],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
});
