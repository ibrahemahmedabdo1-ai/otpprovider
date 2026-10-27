import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      ENCRYPTION_KEY: 'unit-test-encryption-key-0123456789abcdef',
      APP_SECRET: 'unit-test-app-secret-0123456789abcdef',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://u:p@localhost:5432/unused',
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
});
