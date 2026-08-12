/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'The Cursed Apple — Deadlock Companion',
        short_name: 'Cursed Apple',
        description:
          'Spawn timers, hero guides, item stats, matchups, and live matches for Deadlock.',
        theme_color: '#17110b',
        background_color: '#17110b',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        // the ambient poster is 1.3MB — let the browser's HTTP cache handle it
        globIgnores: ['**/default-bg-*.webp'],
        // auth endpoints must always hit the network, never the SPA shell
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/assets-bucket\.deadlock-api\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'deadlock-art',
              expiration: { maxEntries: 600, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.deadlock-api\.com\/v1\/assets\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'deadlock-assets-api',
              expiration: { maxEntries: 40, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
