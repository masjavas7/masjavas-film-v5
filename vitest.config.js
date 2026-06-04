import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'server/utils/safeError.js',
        'server/utils/healthCheck.js',
        'server/utils/runtimePaths.js',
        'server/utils/metrics.js',
        'server/utils/errorTracker.js',
        'server/utils/logger.js',
        'server/utils/version.js',
        'server/middleware/errorHandler.js',
        'server/middleware/localOnly.js',
        'server/middleware/rateLimiter.js',
        'server/middleware/requestLogger.js',
        'server/middleware/securityHeaders.js',
        'server/services/aiFeaturesService.js',
        'server/services/projectRepository.js'
      ],
      exclude: [
        'server/data/**',
        'server/temp/**',
        'server/routes/**',
        'server/middleware/upload.js'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80
      }
    },
    testTimeout: 15000
  }
});