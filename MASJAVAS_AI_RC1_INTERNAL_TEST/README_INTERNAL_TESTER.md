# Panduan Pengujian Internal MASJAVAS AI (Release Candidate)

Dokumen ini ditujukan untuk tim QA internal MASJAVAS AI dalam melakukan pengujian fungsionalitas aplikasi desktop `MASJAVAS AI.exe` (versi 1.0.0).

---

## 📦 File Distribusi
Aplikasi didistribusikan dalam dua format di folder `release/`:
1. **Windows Installer**: [MASJAVAS AI Setup 1.0.0.exe](file:///c:/Users/Masjavas/Documents/APLIKASI%20MASJAVAS%20FILM%20V5/release/MASJAVAS%20AI%20Setup%201.0.0.exe)
   - Cocok untuk pengujian instalasi normal pada Windows.
2. **Portable / Unpacked**: Folder [win-unpacked](file:///c:/Users/Masjavas/Documents/APLIKASI%20MASJAVAS%20FILM%20V5/release/win-unpacked/)
   - Berisi file eksekusi [MASJAVAS AI.exe](file:///c:/Users/Masjavas/Documents/APLIKASI%20MASJAVAS%20FILM%20V5/release/win-unpacked/MASJAVAS%20AI.exe) yang langsung dapat dijalankan tanpa proses instalasi.

---

## 🛠️ Cara Instalasi & Persiapan

### 1. Jalankan Aplikasi
- **Menggunakan Installer**: Klik ganda `MASJAVAS AI Setup 1.0.0.exe` dan ikuti wizard instalasi hingga selesai. Aplikasi akan otomatis membuat pintasan (shortcut) di Desktop dan Start Menu Anda.
- **Menggunakan Portable**: Masuk ke folder `release/win-unpacked/` dan jalankan `MASJAVAS AI.exe`.

### 2. Isi Kredensial API Key
Sebelum membuat film pertama Anda, pastikan untuk mengisi kunci API di halaman **Pengaturan**:
1. Klik tombol **Pengaturan** (ikon gerigi) pada pojok kanan atas aplikasi.
2. Isi **GrokPI API Key**: Kunci API untuk membuat skrip cerita, gambar referensi, storyboard panel, dan rendering adegan video.
3. Isi **Gemini API Key**: Kunci API Google AI Studio untuk layanan pembaca narasi suara (*Voice Narrator / TTS*).

### 3. Test Koneksi
Setelah mengisi kunci API:
- Klik tombol **Tes Koneksi** untuk masing-masing penyedia (GrokPI & Gemini).
- Pastikan status tes menampilkan indikator hijau **Terkoneksi / Valid** sebelum kembali ke halaman beranda.

---

## 🎬 Cara Membuat Project Pertama Anda

Ikuti alur kerja 8 tahap berikut untuk menguji sistem secara penuh:

1. **Step 1: Tulis Ide**
   - Ketik atau tempel ide cerita Anda di textarea input (misal: *"Kisah persahabatan kelinci dan kura-kura"*).
2. **Step 2: Pilih Gaya**
   - Pilih preset gaya visual (misal: *Sinematik*), aspek rasio (misal: *16:9 Widescreen*), dan durasi adegan yang diinginkan.
3. **Step 3: Referensi**
   - Klik *Generate Auto References* untuk membuat gambar referensi. Perhatikan apakah status gambar referensi yang terbuat jujur secara metadata (menampilkan label **REAL** atau **FALLBACK** jika penyedia sibuk).
4. **Step 4: Review Cerita**
   - Jalankan proses pembagian adegan. Anda akan mendapatkan draf naskah narasi lengkap yang dipecah menjadi beberapa adegan terstruktur.
5. **Step 5: Narasi Audio (AudioPrep Workspace)**
   - Pilih jenis pengisi suara (*Voice Narrator*) pilihan Anda (misal: *Charon* untuk suara tegap, atau *Aoede* untuk suara lembut).
   - Klik tombol **Dengarkan Sampel** untuk memutar contoh suaranya terlebih dahulu.
   - Klik **Generate Semua Audio** untuk memulai antrean pembacaan narasi secara otomatis.
   - *Uji Stale State*: Edit salah satu baris teks narasi secara manual. Pastikan adegan tersebut berubah status menjadi **Stale (Teks Berubah)** dan gerbang navigasi menuju Step 6 terkunci.
   - *Uji Recovery*: Klik **Generate Ulang** khusus adegan tersebut untuk memperbaruinya ke status **Ready** sehingga gerbang Step 6 terbuka kembali.
6. **Step 6: Cek Adegan**
   - Klik **Generate Storyboard** untuk membuat visual 5 panel per adegan.
   - Klik **Render Video** pada minimal satu adegan pilihan untuk melihat hasil render video riil dari penyedia.
7. **Step 7: Preview**
   - Putar video draf utuh film Anda untuk melakukan peninjauan akhir.
8. **Step 8: Download**
   - Klik tombol **Ekspor Film**. Tunggu hingga proses asinkron selesai 100%.
   - Verifikasi berkas hasil ekspor pada folder keluaran.

---

## 📂 Lokasi File & Berkas Sistem

Semua data proyek, unggahan sementara, dan logs disimpan di direktori lokal pengguna (`%APPDATA%/MASJAVAS AI/`):
- **Lokasi Ekspor**: `%APPDATA%/MASJAVAS AI/exports/<project-id>/<job-id>/`
  - Berisi: `final.mp4`, `subtitles.srt`, `subtitles.ass`, `manifest.json`, dan `edit-package.zip`.
- **Lokasi Unggahan Media**: `%APPDATA%/MASJAVAS AI/uploads/`
- **Lokasi Logs**: `%APPDATA%/MASJAVAS AI/logs/`
  - Berisi berkas: `backend.log` dan `main.log` yang merekam jalannya aplikasi secara waktu nyata.

---

## 🐞 Cara Melaporkan Bug
Jika Anda menemukan kesalahan (*error*), kegagalan ekspor, atau perilaku aplikasi yang tidak wajar:
1. Catat langkah-langkah sebelum masalah terjadi (misal: durasi proyek, preset yang digunakan).
2. Ambil gambar tangkapan layar (*screenshot*) dari masalah tersebut.
3. Salin berkas logs dari folder `%APPDATA%/MASJAVAS AI/logs/backend.log`.
4. Kirim laporan ke tim pengembang MASJAVAS AI dengan menyertakan detail berkas logs tersebut.

---

## ✅ Lembar Checklist Pengujian (Tester Checklist)

Silakan isi lembar penilaian berikut saat melakukan pengujian fungsionalitas:

| Fitur | Skenario Pengujian | Hasil Aktual (Lolos/Gagal) | Catatan / Kendala |
| :--- | :--- | :--- | :--- |
| **Input & Textarea** | Bisa mengetik ide cerita, paste teks panjang, dan hapus teks tanpa masalah regression shortcut keyboard (Ctrl+A, Ctrl+V). | | |
| **Gaya & Preset** | Bisa memilih aspek rasio (16:9, 9:16, 1:1) dan pengaturan durasi tersimpan di pengaturan proyek. | | |
| **Referensi** | Bisa men-generate auto references secara lengkap dengan label metadata jujur (REAL / FALLBACK). | | |
| **Review Cerita** | Cerita berhasil dipecah menjadi adegan draf lengkap dengan emosi, rangkuman aksi, dan instruksi kamera. | | |
| **Casting Suara** | Bisa memilih jenis suara (Charon, Aoede, Kore, dll.), memutar pratinjau (*voice preview*), dan mengunci suara proyek. | | |
| **TTS Queue** | Proses batch TTS berjalan paralel secara stabil (concurrency = 2) tanpa ada berkas audio kosong (durasi > 1s). | | |
| **Stale State Gate** | Gerbang navigasi Cek Adegan otomatis terkunci saat teks narasi diedit manual (audio ditandai stale). | | |
| **Cek Adegan** | Storyboard panel ter-generate lengkap (5 panel per adegan) dan video minimal 1 adegan riil berhasil dirender. | | |
| **Project Preview** | Seluruh video adegan dan suara narasi tersinkronisasi dengan baik pada pemutar video utama. | | |
| **Video Export** | Penggabungan video FFmpeg sukses memproduksi `final.mp4`, subtitle standar SRT & premium ASS, berkas manifest, dan berkas edit ZIP. | | |
| **Persistence** | Menutup aplikasi dan membukanya kembali tetap mempertahankan seluruh metadata proyek, audio, storyboard, dan video. | | |
