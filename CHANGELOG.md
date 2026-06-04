# Changelog

## [1.1.1] - 2026-06-04 — Production Stable (CI/CD Green)

### Fixed

- **CI/CD:** Regenerated `package-lock.json` (sync with `package.json`); `npm ci` succeeds on GitHub Actions
- **Build:** TypeScript fix in `AssistantPage.tsx` (invalid JSX attribute)
- **Tests:** 34 tests, coverage ~93% lines on core server modules; thresholds enforced in Vitest
- **Security:** `esbuild` override; production `npm audit` clean (no high/critical)
- **Workflows:** CodeQL analysis, Dependabot, Docker build job, production-only audit in CI

### Changed

- Version **1.1.1**; release title *Masjavas Film V5 Production Stable v1.1.1*
- `npm run typecheck` script alias; CI uses `typecheck` step explicitly

[1.1.1]: https://github.com/masjavas7/masjavas-film-v5/releases/tag/v1.1.1

## [1.1.0] - 2026-06-04 — Production Ready

### Added

- **AI Features:** rekomendasi proyek, pencarian NL (`cari:`), ringkasan film, klasifikasi genre, chat asisten (`/api/ai/*`)
- Monitoring: `/api/metrics`, `/api/monitoring/errors`, error log file
- Security: rate limiter, security headers, error tracker
- Tests: AI, rate limiter, E2E API flow; coverage threshold 80% (modul inti)
- SEO: meta OG/Twitter, JSON-LD, `robots.txt`, `sitemap.xml`
- Deploy: `deploy/nginx/masjavas.conf`, `deploy/ecosystem.config.cjs`
- Docs: `API_DOCUMENTATION.md`, `SYSTEM_ARCHITECTURE.md`, `AI_FEATURES.md`, `MONETIZATION_PLAN.md`, `PROJECT_COMPLETION_REPORT.md`, dan laporan CI/Docker/SEO/Monitoring

### Changed

- Version 1.1.0; Assistant & Library terintegrasi API AI
- Vite manual chunks (vendor, ui)
- CI: `test:coverage` dengan env test

### Security

- Audit ulang; sanitasi config lokal; redaksi laporan RC1

## [1.0.0] - 2026-06-04 — Stable

Rilis awal desktop + API + Docker + dokumentasi dasar.

[1.1.0]: https://github.com/masjavas7/masjavas-film-v5/releases/tag/v1.1.0
[1.0.0]: https://github.com/masjavas7/masjavas-film-v5/releases/tag/v1.0.0