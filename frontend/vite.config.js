import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://n-notes.onrender.com',
      '/auth': 'https://n-notes.onrender.com',
    },
  },
  build: {
    outDir: 'dist',
  },
})
