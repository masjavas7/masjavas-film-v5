# Panduan Instalasi — MASJAVAS Film V5

## 1. Prasyarat

1. Instal **Node.js LTS (20+)** dari https://nodejs.org/
2. Pastikan perintah tersedia di terminal:

```powershell
node --version
npm --version
```

3. (Opsional) **Git** untuk clone repository.

## 2. Clone / salin proyek

```powershell
git clone https://github.com/<username>/masjavas-film-v5.git
cd masjavas-film-v5
```

Jika folder masih bernama `APLIKASI MASJAVAS FILM V5`, gunakan folder dalam yang berisi `package.json`.

## 3. Instal dependensi

```powershell
npm install
```

## 4. Konfigurasi environment

### Backend (wajib untuk mode dev web)

```powershell
copy server\.env.example server\.env
```

Edit `server/.env`:

```env
PORT=3000
GROKPI_BASE_URL=https://www.grokpi.masjavas.my.id/v1
GROKPI_API_KEY=sk-your-key-here
```

> Tanpa `GROKPI_API_KEY`, server dev akan exit kecuali `MASJAVAS_DESKTOP=true`. Desktop meminta kunci lewat **Settings**.

### Frontend (opsional)

```powershell
copy .env.example .env
```

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 5. Menjalankan — mode pengembangan

### Web + API (disarankan)

```powershell
npm run dev:all
```

- UI: http://localhost:5174  
- API health: http://localhost:3000/api/health  

### Desktop (Electron)

```powershell
npm run desktop:dev
```

Memulai backend embedded, Vite, lalu jendela Electron.

## 6. Build produksi

### Frontend saja

```powershell
npm run build
npm run preview
```

### Installer Windows (NSIS)

```powershell
npm run desktop:build
```

Output: `release/MASJAVAS AI Setup 1.0.0.exe` (nama produk di `package.json` build config).

Unduh FFmpeg ke `resources/ffmpeg/win32/` — lihat [docs/FFMPEG_SETUP.md](./docs/FFMPEG_SETUP.md) (binary tidak ada di GitHub karena limit ukuran file).

## 7. Data pengguna (desktop terpasang)

Setelah instalasi desktop, data disimpan di:

```
%APPDATA%\MASJAVAS AI\
├── config.json
├── data\projects\*.json
├── uploads\
├── exports\
├── temp\
└── logs\
```

API key **tidak** disertakan di installer; konfigurasi lewat menu **Settings**.

## 8. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `npm` tidak dikenali | Instal Node.js, restart terminal |
| Port 5174 / 3000 dipakai | Tutup proses lain atau ubah `vite.config.ts` / `PORT` |
| `Missing GROKPI_API_KEY` | Isi `server/.env` atau Settings (desktop) |
| Upload gagal | Hanya PNG/JPG/WEBP/GIF, maks. 10 MB |
| FFmpeg tidak ditemukan | Pastikan `resources/ffmpeg/win32` ada sebelum `desktop:build` |
| Debug endpoint 403 | Endpoint `/api/debug/*` hanya dari localhost |

## 9. Push ke GitHub (maintainer)

```powershell
git init
git add .
git commit -m "Initial commit - Masjavas Film V5"
git branch -M main
git remote add origin https://github.com/<username>/masjavas-film-v5.git
git push -u origin main
```

Buat repository **public** di GitHub dengan nama `masjavas-film-v5`, centang README jika kosong (akan ditimpa push), tambahkan LICENSE MIT jika belum ada di repo lokal.