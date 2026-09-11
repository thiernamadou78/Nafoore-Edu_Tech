import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest (plutôt que generateSW) : on a besoin d'un service
      // worker qui écoute nous-mêmes les events push/notificationclick pour
      // les rappels de pointage (voir src/sw.js).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
      },
      manifest: {
        name: 'Nafoore Education — Espace Enseignant',
        short_name: 'Nafoore Enseignant',
        description: "Planning, pointage et suivi des élèves pour les enseignants Nafoore Education.",
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f3ef',
        theme_color: '#1E3A8A',
        icons: [
          {
            src: '/favicon.png',
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon.png',
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5179,
    // Autorise l'accès via le tunnel HTTPS temporaire (test mobile) — sans ça
    // Vite rejette les requêtes dont le header Host ne correspond pas.
    allowedHosts: ['.loca.lt'],
  },
})
