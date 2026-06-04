# Test Report — v1.1.0

## Suites (10 files)

| Path | Type |
|------|------|
| `tests/unit/safeError.test.js` | Unit |
| `tests/unit/healthCheck.test.js` | Unit |
| `tests/unit/aiFeaturesService.test.js` | Unit |
| `tests/unit/rateLimiter.test.js` | Unit |
| `tests/unit/localOnly.test.js` | Unit |
| `tests/integration/projectRepository.test.js` | Integration |
| `tests/api/health.test.js` | API |
| `tests/api/ai.test.js` | API |
| `tests/e2e/api-flow.test.js` | E2E |

## Commands

```bash
npm run test
npm run test:coverage
```

## Coverage target

**80%+** on: `server/utils/**`, `server/middleware/**`, `aiFeaturesService.js`, `projectRepository.js`

Enforced in `vitest.config.js` thresholds.

## CI

`build.yml` runs `npm run test:coverage` on every push to `main`.