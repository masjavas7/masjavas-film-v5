# Test Report — MASJAVAS Film V5 v1.0.0

## Framework

- **Runner:** Vitest 2.x
- **API tests:** Supertest
- **Lokasi:** `tests/`

## Suite

| File | Tipe | Cakupan |
|------|------|---------|
| `tests/unit/safeError.test.js` | Unit | Error sanitization |
| `tests/unit/healthCheck.test.js` | Unit | Health payload |
| `tests/api/health.test.js` | API | `/health`, `/api/health` |
| `tests/integration/projectRepository.test.js` | Integration | JSON storage + cache |

## Menjalankan

```bash
npm install
npm run test
npm run test:coverage
```

## Target coverage

| Target | Status v1.0.0 |
|--------|----------------|
| 80%+ global | **Not met** (fokus modul inti) |
| Core utils/middleware | ~85% pada file yang di-include |

Coverage sengaja dibatasi ke modul stabil (`vitest.config.js`). Perluasan ke `sceneService`, `grokpiClient` direncanakan v1.1.

## CI

GitHub Actions `build.yml` menjalankan `npm run test` pada setiap push ke `main`.

## Hasil terakhir (lokal)

Jalankan `npm run test` setelah `npm install` untuk angka aktual. Exit code 0 diharapkan di Node 20+.