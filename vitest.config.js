import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['server/utils/**', 'server/middleware/**', 'server/services/projectRepository.js'],
      exclude: ['server/data/**', 'server/temp/**', 'server/routes/**']
    },
    testTimeout: 15000
  }
});