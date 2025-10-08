// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // hace que los assets se resuelvan como rutas relativas -> funciona en
  // GitHub Pages (/english-trainer/) y en Netlify (/)
  base: './',
  plugins: [react()],
})
