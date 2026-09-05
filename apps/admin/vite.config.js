import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Autorise l'accès via le tunnel HTTPS temporaire (test mobile) — sans ça
    // Vite rejette les requêtes dont le header Host ne correspond pas.
    allowedHosts: ['.loca.lt'],
  },
})
