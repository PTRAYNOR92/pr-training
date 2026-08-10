import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multi-page static site: each top-level HTML in apps/web/ becomes a route.
export default defineConfig({
  root: __dirname,
  publicDir: false,
  envDir: __dirname,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        about: resolve(__dirname, 'about.html'),
        privacy: resolve(__dirname, 'privacy.html'),
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
