# Deployment Guide — MASJAVAS Film V5

## 1. VPS Ubuntu

```bash
# Dependencies
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

git clone https://github.com/masjavas7/masjavas-film-v5.git
cd masjavas-film-v5
cp server/.env.example server/.env
# Edit server/.env

npm ci
npm run build
npm install -g pm2

SERVE_STATIC=true NODE_ENV=production pm2 start server/index.js --name masjavas
pm2 save
```

Nginx reverse proxy (opsional):

```nginx
server {
  listen 80;
  server_name film.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
  }
}
```

## 2. Docker (disarankan)

```bash
cp .env.production.example .env
# Set GROKPI_API_KEY, GEMINI_API_KEY

docker compose up -d
curl http://localhost:3000/health
```

## 3. Railway

1. New Project → Deploy from GitHub `masjavas7/masjavas-film-v5`
2. Build: `npm ci && npm run build`
3. Start: `npm start` (uses `SERVE_STATIC=true`)
4. Variables: `GROKPI_API_KEY`, `GEMINI_API_KEY`, `PORT`

## 4. Render

- **Type:** Web Service
- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- **Health check path:** `/health`

## 5. Vercel (frontend only)

Vercel hanya untuk static UI; API harus di host terpisah.

```bash
npm run build
# Deploy folder dist/ dengan VITE_API_BASE_URL=https://api.yourdomain.com
```

Set di Vercel Environment:
`VITE_API_BASE_URL=https://your-api-host`

## 6. Desktop Windows

```bash
# FFmpeg wajib — docs/FFMPEG_SETUP.md
npm run desktop:build
# Installer: release/MASJAVAS AI Setup 1.0.0.exe
```

## Monitoring

| Endpoint | Response |
|----------|----------|
| `GET /health` | `{ "status":"ok", "database":"connected", "version":"1.0.0" }` |

Uptime: gunakan UptimeRobot / Better Stack → ping `/health` setiap 5 menit.

## Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

Workflow `release.yml` membuat GitHub Release otomatis.