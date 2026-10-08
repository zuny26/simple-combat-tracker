import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    // Keep node:test and Playwright files in their own runners.
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
