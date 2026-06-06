import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    basicSsl()
  ],
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
