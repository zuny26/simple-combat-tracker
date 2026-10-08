import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/simple-combat-tracker/',
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        legacy: fileURLToPath(new URL('./index.html', import.meta.url)),
        vue: fileURLToPath(new URL('./vue.html', import.meta.url)),
      },
    },
  },
});
