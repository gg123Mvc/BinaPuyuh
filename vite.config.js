import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        verify: resolve(__dirname, 'verify.html'),
        confirmation: resolve(__dirname, 'confirmation.html')
      }
    }
  },
  server: {
    port: 3000
  }
});
