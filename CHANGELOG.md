# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-06-04 — Masjavas Film V5 Stable

### Added

- Monitoring: `GET /health` dengan `status`, `database`, `version`, `uptimeSec`
- `server/utils/healthCheck.js`, `server/utils/version.js`, `server/middleware/requestLogger.js`
- Testing: Vitest + Supertest (`tests/unit`, `tests/api`, `tests/integration`)
- CI/CD: `.github/workflows/build.yml`, `release.yml`
- Docker: `Dockerfile`, `docker-compose.yml`, `.dockerignore`
- Dokumentasi: `SECURITY_AUDIT.md`, `docs/CODEBASE_ANALYSIS.md`, `BUG_REPORT.md`, `PERFORMANCE_REPORT.md`, `TEST_REPORT.md`, `DEPLOYMENT_GUIDE.md`
- `server/config.json.example`, `.env.production.example`
- Production start: `npm start` (`SERVE_STATIC=true`)

### Changed

- Frontend: lazy-loaded routes (code splitting)
- `projectRepository.listProjects`: cache 5 detik + invalidasi on save
- Static assets: cache headers di production
- `lint` script: TypeScript check (`tsc --noEmit`)
- Preview video: `preload="metadata"`, `playsInline`

### Security

- Audit lengkap (`SECURITY_AUDIT.md`)
- Sanitasi `server/config.json` lokal
- Scratch scripts: env-only API keys
- Debug routes: localhost-only (unchanged, documented)

### Fixed

- Health contract sesuai spesifikasi monitoring
- Env loader: tidak exit di mode test/desktop tanpa key

## [1.0.1] - 2026-06-04 (pre-stable housekeeping)

### Added

- README, INSTALLATION, LICENSE MIT, docs/FFMPEG_SETUP.md

### Security

- Removed exposed API key files from repo
- Multer image validation, debug route hardening

[1.0.0]: https://github.com/masjavas7/masjavas-film-v5/releases/tag/v1.0.0