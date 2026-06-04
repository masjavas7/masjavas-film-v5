# Docker Report — MASJAVAS Film V5

## Artefak

- `Dockerfile` — multi-stage build (builder + runner)
- `docker-compose.yml` — service `masjavas-api`
- `.dockerignore` — exclude secrets, node_modules, release

## Fitur

| Fitur | Implementasi |
|-------|----------------|
| Healthcheck | `GET /health` via node fetch |
| Restart | `unless-stopped` |
| Production | `NODE_ENV=production`, `SERVE_STATIC=true` |
| Volumes | data, uploads, exports persisten |

## Menjalankan

```bash
docker compose up -d
docker compose ps
curl http://localhost:3000/health
```

## Catatan

- FFmpeg **tidak** di image — mount `resources/ffmpeg` atau gunakan desktop build terpisah untuk export video penuh.