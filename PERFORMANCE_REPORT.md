# Performance Report — MASJAVAS Film V5 v1.0.0

## Target vs aktual

| Metrik | Target | Aktual (estimasi dev) | Status |
|--------|--------|------------------------|--------|
| Lighthouse | > 90 | Belum diukur otomatis* | Pending CI |
| First load | < 3 s | ~1.5–2.5 s setelah code-split | On track |
| API `/health` | < 500 ms | < 50 ms | Pass |
| API list projects | < 500 ms | < 200 ms (cached) | Pass |

\* Lighthouse memerlukan build production + Chrome; jalankan manual: `npm run build && npm run preview`

## Optimasi yang diterapkan

### Frontend
- **Code splitting** — lazy route pages (`App.tsx`)
- **HashRouter** — menghindari reload penuh di Electron
- **Video** — `preload="metadata"` mengurangi bandwidth awal

### Backend
- **Project list cache** — 5 detik TTL (`projectRepository.js`)
- **Static cache headers** — `maxAge` 1h uploads/exports di production
- **Request logger** — deteksi request > 2 s
- **JSON body limit** — 2 MB

### Infrastruktur
- Docker multi-stage build (hanya `dist` + `server` di image final)
- `SERVE_STATIC` — satu port untuk UI + API

## Rekomendasi lanjutan

1. Tambah `compression` middleware (gzip) di Express production
2. CDN untuk asset `dist/assets/*` jika deploy Vercel
3. Service Worker / HTTP cache untuk `index.html` (hati-hati dengan HashRouter)
4. Profiling FFmpeg queue — export multi-scene

## Pengukuran manual

```bash
# Health latency
curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3000/health

# Build size
npm run build && du -sh dist/
```