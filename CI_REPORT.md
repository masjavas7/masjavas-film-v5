# CI Report — MASJAVAS Film V5

## Workflows

| File | Trigger | Steps |
|------|---------|-------|
| `.github/workflows/build.yml` | push main/develop, PR | install → tsc → test:coverage → build |
| `.github/workflows/release.yml` | tag `v*` | test → build → GitHub Release |

## Perbaikan v1.1.0

- Ganti `eslint` (tidak terpasang) → `tsc --noEmit`
- Tambah `test:coverage` dengan threshold 80% pada modul inti
- Env CI: `GROKPI_API_KEY`, `VITEST`, `NODE_ENV=test`

## Status

Jalankan di GitHub Actions tab setelah push. Expected: ✅ pass pada Node 20.