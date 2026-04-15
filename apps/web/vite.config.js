import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multi-page static site: each top-level HTML in public/ becomes a route.
export default defineConfig({
  root: 'public',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        login: resolve(__dirname, 'public/login.html'),
        about: resolve(__dirname, 'public/about.html'),
        privacy: resolve(__dirname, 'public/privacy.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
