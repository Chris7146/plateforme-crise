/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Les exercices se jouent sur plusieurs appareils : le serveur de
    // développement écoute sur le réseau local, sans quoi les tablettes et les
    // QR codes pointant vers « localhost » ne mènent nulle part.
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
