import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Modern web build used for browser preview/development.
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          media: ['hls.js'],
          icons: ['react-icons/fa'],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
})
