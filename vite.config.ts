import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ Nombre EXACTO del repo
const REPO = 'english-trainer'

export default defineConfig({
  plugins: [react()],
  base: `/${REPO}/`,
})
