# MASJAVAS Film V5 — Production Ready v1.1.0

Aplikasi desktop **AI cinematic video production** untuk membuat film pendek berbasis adegan: dari ide, referensi visual, persiapan audio (TTS), komposer adegan, storyboard, preview, hingga ekspor video final dengan FFmpeg.

## Ringkasan teknologi

| Lapisan | Teknologi |
|--------|-----------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, Zustand, React Router |
| Desktop | Electron 42, electron-builder (NSIS Windows) |
| Backend | Node.js, Express 5 |
| Penyimpanan | File JSON di `%APPDATA%/MASJAVAS AI/data/projects/` + cache `localStorage` |
| Media | FFmpeg (lokal di `resources/ffmpeg/` — lihat `docs/FFMPEG_SETUP.md`), Multer upload |
| AI Gateway | GrokPI API (`GROKPI_BASE_URL`, kunci di Settings / `config.json`) |

## Fitur utama

- Alur proyek terpandu: Start → Idea → Presets → References → Review → Audio Prep → Scenes → Preview → Export
- Perpustakaan proyek (Library) dengan sinkronisasi server + fallback offline
- Generate referensi otomatis (Master Bible) dan upload manual
- TTS per adegan (Gemini) dengan validasi durasi audio
- Storyboard & generate video per adegan via GrokPI
- Ekspor MP4, subtitle SRT, manifest, dan edit package ZIP
- Mode desktop mandiri: backend embedded, port dinamis, data di AppData
- Pengaturan API key GrokPI di UI (tidak dibundle di installer)

## Persyaratan

- Windows 10/11 (64-bit) untuk build desktop
- Node.js 20+ dan npm 10+
- Ruang disk untuk `node_modules`, build `dist/`, dan artefak `release/`

## Instalasi cepat

Lihat [INSTALLATION.md](./INSTALLATION.md) untuk langkah lengkap.

```bash
cd "APLIKASI MASJAVAS FILM V5"
npm install
cp server/.env.example server/.env
# Edit server/.env — set GROKPI_API_KEY
npm run dev:all
```

Buka http://localhost:5174

## Menjalankan aplikasi

| Mode | Perintah | Keterangan |
|------|----------|------------|
| Web dev | `npm run dev:all` | Vite :5174 + API :3000 |
| Frontend saja | `npm run dev` | Perlu backend terpisah |
| Backend saja | `npm run server` | Express API |
| Desktop dev | `npm run desktop:dev` | Electron + embedded server |
| Build web | `npm run build` | Output ke `dist/` |
| Installer Windows | `npm run desktop:build` | Output ke `release/` |

## Konfigurasi environment

- **Root** `.env.example` — `VITE_API_BASE_URL` (opsional)
- **Server** `server/.env.example` — `PORT`, `GROKPI_BASE_URL`, `GROKPI_API_KEY`
- Desktop: kunci disimpan di `%APPDATA%/MASJAVAS AI/config.json` lewat halaman Settings

## Struktur folder

```
├── desktop/          # Electron main, preload, server launcher
├── server/           # Express API, services, routes, middleware
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── config/
├── src/              # React UI (pages, components, stores, services)
├── public/           # Aset statis Vite
├── resources/        # FFmpeg, ikon, branding (desktop build)
├── docs/             # Dokumentasi internal & referensi
├── scratch/          # Skrip QA/dev (tidak wajib produksi)
└── dist/             # Hasil build frontend (gitignored)
```

## Modul utama

| Modul | Fungsi |
|-------|--------|
| `src/pages/*` | Layar alur produksi film |
| `src/stores/*` | State Zustand (proyek, adegan, library) |
| `src/services/*` | Klien HTTP ke API backend |
| `server/services/projectRepository.js` | CRUD proyek (JSON files) |
| `server/services/sceneService.js` | Adegan, storyboard, render queue |
| `server/services/ttsService.js` | Text-to-speech production |
| `server/services/exportService.js` | Kompilasi video & paket ekspor |
| `server/services/grokpiClient.js` | Klien GrokPI (gambar/video) |
| `desktop/main.js` | Lifecycle Electron, splash, AppData paths |

## Dokumentasi tambahan

- [INSTALLATION.md](./INSTALLATION.md) — instalasi & troubleshooting
- [CHANGELOG.md](./CHANGELOG.md) — riwayat perubahan
- [RELEASE_NOTES.md](./RELEASE_NOTES.md) — catatan rilis desktop RC
- [INTEGRATION_NOTES.md](./INTEGRATION_NOTES.md) — spesifikasi API untuk integrasi

## Lisensi

MIT — lihat [LICENSE](./LICENSE).