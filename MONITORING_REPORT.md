# Monitoring Report — MASJAVAS Film V5 v1.1.0

## Endpoints

### GET /health
Kontrak produksi:
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.1.0"
}
```
Field tambahan: `service`, `timestamp`, `uptimeSec`, `mode`, `port`.

### GET /api/metrics
Request count, error count, memory RSS/heap.

### GET /api/monitoring/errors?limit=10
Buffer error terbaru (tanpa API key).

## Logging

| Log | Lokasi |
|-----|--------|
| Access (opsional) | `LOG_ACCESS=true` → `server/logs/access.log` |
| Errors | `server/logs/errors.log` |
| Desktop | `%APPDATA%/MASJAVAS AI/logs/` |

## Uptime monitoring

Configure UptimeRobot / Better Stack:
- URL: `https://your-domain/health`
- Interval: 5 menit
- Alert: email/Slack jika non-200 atau `database != connected`