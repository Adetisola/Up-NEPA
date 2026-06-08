import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true, // Listen on all local IPs
    port: 3000,
    open: true,
  },
});
