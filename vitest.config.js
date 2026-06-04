import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'server/utils/**',
        'server/middleware/**',
        'server/services/aiFeaturesService.js',
        'server/services/projectRepository.js'
      ],
      exclude: ['server/data/**', 'server/temp/**', 'server/routes/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },
    testTimeout: 15000
  }
});