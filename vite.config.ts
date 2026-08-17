import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
