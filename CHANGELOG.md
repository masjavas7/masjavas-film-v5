# Changelog

Semua perubahan penting pada proyek **MASJAVAS Film V5** didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.1] - 2026-06-04

### Added

- `README.md`, `INSTALLATION.md`, `CHANGELOG.md` untuk onboarding developer
- `LICENSE` (MIT)
- `.env.example` di root proyek
- `server/middleware/localOnly.js` — pembatasan akses debug ke localhost
- Metadata `repository` dan `license` di `package.json`

### Changed

- Nama paket npm: `masjavas-film-v5`
- File referensi TTS standalone dipindah ke `docs/reference/masjavas_tts_service_production.ts`
- `.gitignore` diperluas (release, electron artifacts, scratch media, secrets)
- Upload referensi: validasi MIME/extension gambar + batas body JSON 2 MB
- Debug `open-logs`: `execFile` + validasi path di bawah `userDataDir`

### Removed

- `test_blur.mp4` (artefak uji di root)

### Security

- Route `/api/debug/*` hanya dapat diakses dari loopback
- Filter tipe file pada Multer (mencegah upload non-gambar)
- Menghapus file docs yang berisi kunci API dari repository

### Fixed

- FFmpeg tidak di-push ke GitHub (batas 100 MB); unduhan manual: `docs/FFMPEG_SETUP.md`

## [1.0.0] - 2026 (Release Candidate)

### Added

- Aplikasi desktop Electron dengan backend Express embedded
- Alur produksi film: ide, referensi, audio prep, adegan, preview, ekspor
- Penyimpanan proyek JSON + cache `localStorage`
- Integrasi GrokPI untuk gambar/video
- TTS Gemini via `server/services/ttsService.js`
- FFmpeg bundled untuk ekspor Windows
- Dokumen internal: `RELEASE_NOTES.md`, `INTEGRATION_NOTES.md`, folder `MASJAVAS_AI_RC1_INTERNAL_TEST`

[1.0.1]: https://github.com/masjavas/masjavas-film-v5/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/masjavas/masjavas-film-v5/releases/tag/v1.0.0