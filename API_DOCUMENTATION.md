# API Documentation — MASJAVAS Film V5 v1.1.0

Base URL (dev): `http://localhost:3000`

## Monitoring

### GET /health
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.1.0",
  "service": "masjavas-film-v5",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "uptimeSec": 120,
  "mode": "dev",
  "port": 3000
}
```

### GET /api/metrics
Runtime counters (requests, errors, memory).

### GET /api/monitoring/errors?limit=10
Recent server errors (no secrets).

## AI Features (v1.1)

### GET /api/ai/recommendations?limit=5
Rekomendasi proyek berdasarkan progress & recency.

### GET /api/ai/search?q=legenda+jawa
Pencarian natural language pada metadata proyek.

### GET /api/ai/projects/:projectId/summary
Ringkasan sinopsis & statistik adegan.

### GET /api/ai/projects/:projectId/genre
Klasifikasi genre otomatis (heuristic).

### POST /api/ai/chat
```json
{ "message": "rekomendasi proyek", "projectId": "optional-id" }
```

## Projects

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | /api/projects | List proyek |
| GET | /api/projects/:id | Detail proyek |
| POST | /api/projects | Buat proyek |
| PUT | /api/projects/:id/snapshot | Simpan snapshot |

Lihat `INTEGRATION_NOTES.md` untuk payload lengkap referensi, adegan, export, TTS.