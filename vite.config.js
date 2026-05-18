import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Logo2.png', 'Empanada.png', 'Goal.png', 'Mate.png', 'bandoneon.png', 'Tango.mp3'],
      manifest: {
        name: 'Che Boludo!',
        short_name: 'CheBoludo',
        description: 'Learn Argentine Spanish slang the real way',
        start_url: '/',
        display: 'standalone',
        background_color: '#050d1a',
        theme_color: '#050d1a',
        orientation: 'portrait-primary',
        icons: [
          { src: '/Logo2.png', sizes: '192x192', type: 'image/png' },
          { src: '/Logo2.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,mp3}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
