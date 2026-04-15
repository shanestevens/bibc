import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Cache book JSON files for offline reading
        runtimeCaching: [
          {
            urlPattern: /\/src\/data\/books\/.+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bible-books',
              expiration: { maxEntries: 70, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/search-index-\w+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bible-search',
              expiration: { maxEntries: 3, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    cssTarget: 'safari15',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
