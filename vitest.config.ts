import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    // Run the typed combat, persistence, and mounted UI seams; Playwright stays separate.
    include: ['test/component/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
