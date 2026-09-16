import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
          if (id.includes('react-router')) return 'router'
          if (id.includes('scheduler')) return 'react-vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
