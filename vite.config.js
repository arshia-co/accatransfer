import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve('src/transfer'),
    },
  },
  server: {
    fs: {
      // Dev-only: the project folder contains spaces; when tooling launches
      // Vite via the Windows 8.3 short path (ACCASM~1), the fs allow-list
      // comparison fails on the long/short mismatch. Safe to keep for a
      // local demo; remove if the folder is renamed without spaces.
      strict: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'vendor-framer';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
        },
      },
    },
    chunkSizeWarningLimit: 700,
    target: ['es2020', 'safari14'],
  },
})
