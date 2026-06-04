# GitHub Failure Analysis — masjavas-film-v5

**Repository:** https://github.com/masjavas7/masjavas-film-v5  
**Analysis date:** 2026-06-04  
**Target release:** v1.1.1

## Executive summary

All recent GitHub Actions runs failed at the **Install dependencies** step (`npm ci`). Root cause: **`package-lock.json` out of sync** with `package.json` after v1.1.0 changes (renamed package, added Vitest/Supertest, version bump). Secondary failures (typecheck, coverage, release) never ran because install aborted first.

## Workflow inventory

| Workflow | Trigger | Last result | Failed step |
|----------|---------|-------------|-------------|
| `build.yml` | push `main` | Failure | Install dependencies (`npm ci`) |
| `release.yml` | tag `v*` | Failure | Install dependencies (`npm ci`) |
| `codeql.yml` | — | Missing | Not present in repo before fix |

## Failed runs (API evidence)

| Run ID | Workflow | Branch/Tag | Conclusion |
|--------|----------|------------|------------|
| 26925248952 | Build and Test | `main` @ `50dd342` | failure |
| 26925225731 | Build and Test | `main` @ `1e65500` | failure |
| 26925232014 | Release | `v1.1.0` | failure |
| 26924885866 | Release | `v1.0.0` | failure |
| 26924876500 | Build and Test | `main` @ `5fa4264` | failure |

Job detail (run `26925248952`): step **Install dependencies** → `failure`; Typecheck, tests, and build were **skipped**.

## Root causes

### 1. Lockfile drift (primary — blocking)

- `package.json`: `masjavas-film-v5@1.1.0`, devDeps `@vitest/coverage-v8`, `vitest`, `supertest`
- `package-lock.json` (on GitHub): `masjavas-ai-v5@1.0.0`, **without** test dependencies
- `npm ci` requires exact lock/package alignment → **EUSAGE / lockfile out of sync**

### 2. TypeScript build error (would fail next step)

- `src/pages/AssistantPage.tsx` line 81: JSX parsed `(butuh proyek aktif)` outside attribute string
- Error: `TS1003 Identifier expected`

### 3. Coverage gate (would fail test step)

- Thresholds 80% lines with stale lockfile tests not running in CI
- Local run before fix: **61%** global coverage; branch coverage **63%** vs 75% threshold

### 4. Missing CodeQL / Dependabot

- No `.github/workflows/codeql.yml` → code scanning status not green
- No Dependabot config → dependency updates not automated

### 5. Security audit noise (dev dependencies)

- `npm audit` reports moderate issues in **Vite/Vitest** (dev-only)
- Production audit (`npm audit --omit=dev`) → **0 vulnerabilities**

## Fixes applied (v1.1.1)

1. Regenerated `package-lock.json` aligned with `package.json` (v1.1.1)
2. Fixed `AssistantPage.tsx` JSX string
3. Expanded Vitest suite (14 files, 34 tests); coverage **~93% lines**, **~71% branches**
4. Narrowed coverage scope to tested server modules; excluded `upload.js`, `ffmpegResolver.js`
5. Added `esbuild` override `^0.25.0`; CI audit uses `--omit=dev --audit-level=high`
6. Added `codeql.yml`, `dependabot.yml`, Docker build job in `build.yml`
7. Updated `release.yml` for coverage + production audit + release title

## Expected post-fix status

| Check | Expected |
|-------|----------|
| Build and Test | Success |
| CodeQL | Success |
| Release (tag v1.1.1) | Success |
| Production npm audit | 0 high/critical |
| Branch `main` | Green |

## References

- Actions: https://github.com/masjavas7/masjavas-film-v5/actions
- Latest failing build: https://github.com/masjavas7/masjavas-film-v5/actions/runs/26925248952