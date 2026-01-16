import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 50', 'safari >= 10'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      modernPolyfills: ['es.promise', 'es.array.iterator'],
    }),
  ],
  base: './',
  build: {
    target: 'es2015',
    minify: 'terser',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife', // Immediately Invoked Function Expression - no modules
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
})
