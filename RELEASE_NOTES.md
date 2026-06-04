# Catatan Rilis (Release Notes) — MASJAVAS AI v1.0.0
**Aplikasi Pembuat Video Sinematik AI Mandiri (Standalone Desktop Windows)**

Selamat datang di rilis versi desktop resmi pertama untuk **MASJAVAS AI**! Aplikasi ini telah bermigrasi sepenuhnya dari portal web lokal menjadi aplikasi desktop mandiri Windows dengan backend embedded, penanganan jalur penyimpanan terisolasi yang aman, dan transkoding media bawaan yang terintegrasi penuh.

---

## 🚀 Fitur Utama Versi Desktop

1. **Inisialisasi Tanpa Terminal (No Terminal Required)**:
   * Aplikasi berjalan langsung melalui antarmuka visual premium (`MASJAVAS AI.exe`) tanpa memunculkan jendela terminal Windows Command Prompt atau PowerShell.
   * Express backend server berjalan secara otomatis di latar belakang (*background worker*) saat aplikasi diluncurkan.

2. **Deteksi Port Dinamis (Dynamic Local Port Resolution)**:
   * Menggunakan modul pencari port pintar yang memetakan koneksi API gateway lokal ke port kosong pada range `[3000, 3001, 3002, 3010, 0]` pada loopback `127.0.0.1`.
   * Mencegah kegagalan start jika port default `3000` sedang dipakai oleh aplikasi lain.

3. **Penyimpanan Runtime Aman di AppData (Roaming Storage isolation)**:
   * Mengalihkan semua berkas kerja pengguna dari folder kode sumber ke folder data resmi Windows: `%APPDATA%/Roaming/MASJAVAS AI/`.
   * Mengisolasi file konfigurasi, data draf proyek (JSON), unggahan referensi, hasil kompilasi video (ekspor), file temp, dan logs.

4. **Mesin Ekspor FFmpeg Bawaan (Bundled Transcoder)**:
   * Menyertakan binari fisik `ffmpeg.exe` dan `ffprobe.exe` langsung di dalam paket instalasi (`process.resourcesPath`).
   * Memastikan pengguna akhir tidak perlu mengunduh atau mengonfigurasi variabel `PATH` FFmpeg secara manual di Windows.
   * Transkoding video asinkron multi-scene dengan strategi rasio yang aman (`fit_blur`, `crop_center`, `letterbox`) berjalan lancar secara lokal.

5. **Pengamanan Kredensial AI (API Key Secrets Protection)**:
   * Kunci API developer (`GROKPI_API_KEY`) **tidak dibundle** ke dalam installer untuk mencegah kebocoran keamanan.
   * Menyediakan antarmuka input kredensial pada halaman Pengaturan (Settings) aplikasi.
   * API Key disimpan secara lokal di dalam folder AppData pengguna (`config.json`) dengan sensor masking pengaman di sisi klien (`sk-••••••••7890`).

6. **Desain Visual Gelap Premium (Premium Dark Theme & Splash Screen)**:
   * Jendela pemuatan visual premium (*inline splash screen*) beranimasi *breathing pulse* muncul selama Express backend melakukan *handshake health-check*.
   * Jendela utama (*Main Window*) berukuran dinamis yang responsif tanpa bar menu bawaan bawaan sistem operasi.

---

## 📦 Panduan Instalasi (How to Install)

1. Unduh berkas pemasang:
   * **Path Berkas**: `release/MASJAVAS AI Setup 1.0.0.exe`
2. Jalankan berkas `.exe` tersebut:
   * **Mode Interaktif**: Klik ganda berkas tersebut untuk membuka NSIS Setup Wizard, pilih direktori tujuan (mendukung path dengan spasi seperti `C:\Program Files\MASJAVAS AI`), dan pilih opsi pembuatan pintasan (*desktop/start menu shortcut*).
   * **Mode Senyap (Silent Install - Cocok untuk IT/Admin)**:
     Buka PowerShell/CMD dan jalankan perintah:
     ```powershell
     "MASJAVAS AI Setup 1.0.0.exe" /S /D=C:\Program Files\MASJAVAS AI
     ```
3. Buka aplikasi melalui:
   * Pintasan Desktop (**MASJAVAS AI**)
   * Start Menu (**MASJAVAS AI**)
   * Berkas utama langsung: `MASJAVAS AI.exe` di direktori instalasi.

---

## 🛠️ Jalur Penyimpanan Data (Data Location Paths)

* **Direktori Aplikasi Terpasang (Installed Directory)**:
  `C:\Users\<Nama_User>\AppData\Local\Programs\MASJAVAS AI\`
* **Direktori Data Pengguna (UserData AppData Roaming)**:
  `C:\Users\<Nama_User>\AppData\Roaming\MASJAVAS AI\`
  * Subdirektori di dalamnya:
    * `data/projects/` : Berkas draf proyek fisik (`.json` dan `.backup.json`).
    * `uploads/` : File gambar referensi yang diunggah pengguna.
    * `exports/` : Hasil akhir file video (`final.mp4`), teks subtitle (`subtitles.srt`), manifes audit (`manifest.json`), dan bundel zip (`edit-package.zip`).
    * `temp/` : Direktori pemrosesan sementara frame/audio transkoding.
    * `logs/` : Berkas pencatatan aktivitas API.
    * `config.json` : Tempat penyimpanan terenkripsi API Key GrokPI dan Base URL endpoint.

---

## ⚙️ Cara Mengonfigurasi API Key (GrokPI Settings)

1. Buka aplikasi **MASJAVAS AI** untuk pertama kali.
2. Karena rilis bersih tidak membawa API Key bawaan, server tidak akan crash. Navigasikan ke menu **Pengaturan** (Settings) di bilah navigasi sisi kiri.
3. Masukkan data kredensial Anda:
   * **GrokPI API Key**: Masukkan token akses aman Anda (berawalan `sk-...`).
   * **GrokPI Base URL**: Masukkan URL API yang valid (default: `https://www.grokpi.masjavas.my.id/v1`).
4. Klik tombol **Simpan pengaturan** (Save Settings).
5. Aplikasi akan langsung memverifikasi kredensial Anda. Status indikator di bagian atas akan berubah menjadi `"Siap digunakan"` (Ready to use).

---

## ⚠️ Masalah yang Diketahui (Known Issues)

1. **Pertama Kali Booting di Beberapa PC**:
   Splash screen pemuatan awal mungkin membutuhkan waktu hingga 3-5 detik lebih lama pada saat peluncuran pertama karena sistem operasi Windows sedang memverifikasi integritas file biner untuk pertama kalinya.
2. **Leftover Backup Files saat Uninstall**:
   Saat aplikasi di-uninstall via uninstaller bawaan, berkas di direktori program `MASJAVAS AI` terhapus bersih 100%, tetapi folder data proyek pengguna di `%APPDATA%/Roaming/MASJAVAS AI` **sengaja tetap dipertahankan**. Hal ini dirancang agar data hasil kerja pengguna tidak hilang saat melakukan instalasi ulang atau pembaruan versi (update).

---

## 🔍 Pemecahan Masalah (Troubleshooting)

* **Aplikasi Menampilkan Pesan "Workspace Gagal Disiapkan"**:
  * *Penyebab*: Kemungkinan Express backend gagal memicu listen socket karena pembatasan ketat aturan firewall lokal atau port tabrakan ekstrem.
  * *Solusi*: Tutup aplikasi sepenuhnya via Task Manager (pastikan proses `MASJAVAS AI.exe` bersih), lalu jalankan ulang sebagai Administrator (*Run as Administrator*).
* **Video Gagal Ter-render di Step 5**:
  * *Penyebab*: API key belum diisi di halaman Pengaturan, atau kuota batas kredit AI GrokPI Anda habis.
  * *Solusi*: Masuk ke halaman Pengaturan, verifikasi keabsahan API Key Anda, dan pastikan koneksi internet stabil.
* **Ingin Melakukan Pembersihan Data Secara Total (Clean Uninstall)**:
  * *Solusi*: Jalankan uninstall aplikasi secara normal. Setelah selesai, hapus folder data pengguna secara manual di:
    `C:\Users\<Nama_User>\AppData\Roaming\MASJAVAS AI\`
