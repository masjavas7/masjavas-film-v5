# MASJAVAS AI — Changelog RC1 (Release Candidate 1)

**Status Rilis**: READY_FOR_INTERNAL_RELEASE (Release Candidate 1)
**Tanggal**: 2026-06-01
**Versi**: 1.0.0

## 🌟 Fitur Utama
1. **Alur Pembuatan Film 8 Tahap**: Tulis Ide → Pilih Gaya → Referensi → Review Cerita → Narasi Audio → Cek Adegan → Preview → Download.
2. **AudioPrep Workspace (Siapkan Narasi Audio)**: 
   - Grid seleksi 8 pengisi suara resmi Gemini prebuilt.
   - Fitur dengarkan contoh preview suara 3 detik.
   - Kunci suara project (Voice Lock) & override terkonfirmasi.
   - Antrean paralel cepat (concurrency 2) dengan cooldown cerdas 6-8s untuk menangani kuota rate-limit.
3. **Gerbang Navigasi Step 6**: Pencegahan cutoff, validasi audio kosong (>10KB), dan pengamanan konsistensi suara antar adegan sebelum masuk pembuatan storyboard.
4. **Stale State Recovery**: Perubahan teks narasi menandai scene sebagai stale, mengunci navigasi ke Step 6, dan menyediakan opsi rollback cepat atau regenerasi granular per adegan.
5. **Storyboard & Video Rendering**: Pembuatan storyboard 5 panel per adegan dan video scene riil terintegrasi dengan kejujuran evidence (no mock / fake claims).
6. **Stitching & Export Pipeline**: Stitching gabungan video FFmpeg, normalisasi audio, burn-in subtitle ASS premium, manifest.json, dan bundling ZIP paket edit.

## 🐛 Perbaikan Bug Utama
* **Arsitektur Step 5**: Memperbaiki masalah urutan di mana daftar adegan tidak tersedia pada tahap Narasi Audio dengan menyusunnya langsung dari Review Cerita.
* **Kecepatan TTS**: Memperbaiki pemrosesan lambat TTS dengan paralelisme terbatas dan hidrasi progresif UI.
* **Anti-Cutoff & Fit**: Logika penyesuaian tempo otomatis (fitting) untuk mencegah kalimat narasi terpotong di akhir adegan.
* **Sterility Video Prompt**: Pencegahan masuknya instruksi audio/narator ke generator video untuk menghindari regression visual clapboard.

## ⚠️ Known Risks
1. **Provider Rate Limit (GrokPI)**: Penumpukan permintaan ke server eksternal berisiko memicu HTTP 429 (solusi: tombol resume queue & exponential backoff).
2. **Koneksi Internet**: Hilang koneksi internet di tengah pengerjaan (solusi: database auto-saves).
3. **API Key Invalid**: Kunci API salah ketik atau kehabisan kredit.
4. **Antivirus Windows**: Windows Defender berpotensi memblokir FFmpeg eksternal (solusi: digital signature).
5. **FFmpeg Runtime Dependency**: Kegagalan memanggil FFmpeg di beberapa mesin Windows non-admin (solusi: auto fallback copy).
6. **Performa PC Rendah**: Proses rendering ekspor berat pada prosesor jadul (solusi: asinkron progress bar).
