import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' => funciona en GitHub Pages bajo /<repo>/ sin router
export default defineConfig({
  plugins: [react()],
  base: './',
})
