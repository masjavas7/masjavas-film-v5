import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = 'c:\\Users\\Masjavas\\Documents\\APLIKASI MASJAVAS FILM V5';
const DIST_DIR = path.join(WORKSPACE_DIR, 'MASJAVAS_AI_RC1_INTERNAL_TEST');

// Paths inside the artifacts/Gemini environment
const artifactsDir = 'C:\\Users\\Masjavas\\.gemini\\antigravity\\brain\\ed8ef459-adb3-4d6f-927e-eaba22c592c6';
const srcInstaller = path.join(WORKSPACE_DIR, 'release', 'MASJAVAS AI Setup 1.0.0.exe');
const srcReadme = path.join(artifactsDir, 'README_INTERNAL_TESTER.md');
const srcQaReport = path.join(artifactsDir, 'RELEASE_CANDIDATE_QA_REPORT.md');
const srcProviderReport = path.join(artifactsDir, 'provider_evidence_report.md');

const changelogContent = `# MASJAVAS AI — Changelog RC1 (Release Candidate 1)

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
`;

const bugReportContent = `# MASJAVAS AI — Form Laporan Bug Tester Internal (RC1)

Silakan isi formulir berikut secara lengkap jika Anda menemukan kendala saat pengujian internal terbatas.

---

## 👤 Informasi Tester & Lingkungan
* **Nama Tester**: [Nama Anda]
* **Versi Aplikasi**: \`1.0.0-RC1\`
* **Windows Version**: [Contoh: Windows 10 Pro / Windows 11 Home]
* **Spesifikasi PC (Opsional)**: [Contoh: Intel Core i5, RAM 8GB]

## 🛠️ Status Pengaturan & Koneksi
* **GrokPI API Key Valid?**: [Ya / Tidak]
* **Gemini API Key Valid?**: [Ya / Tidak]
* **Internet Stabil?**: [Ya / Tidak]
* **Apakah FFmpeg Terdeteksi?**: [Ya / Tidak / Tidak Tahu]

## 📝 Detail Masalah
* **Project ID**: [Lihat di URL/halaman, misal: project-1780...]
* **Langkah Reproduksi**:
  1. [Langkah 1]
  2. [Langkah 2]
  3. [Langkah 3]
* **Expected Result (Hasil yang Diharapkan)**:
  [Contoh: Audio narasi terputar saat tombol Dengarkan diklik]
* **Actual Result (Hasil Aktual yang Terjadi)**:
  [Contoh: Tombol tidak bereaksi, muncul pop-up error "Gagal memuat berkas"]

## 📁 Bukti & Berkas Pendukung
* **Tangkapan Layar (Screenshot)**: [Lampirkan gambar di sini jika ada]
* **Log Path**:
  - Log Backend: \`%%APPDATA%%/MASJAVAS AI/logs/backend.log\`
  - Log Utama: \`%%APPDATA%%/MASJAVAS AI/logs/main.log\`
  - *Harap salin baris teks error terakhir dari logs di atas dan tempel di bawah ini:*
  \`\`\`text
  [Tempel teks log error di sini]
  \`\`\`
`;

async function main() {
  console.log('--- Creating Internal Testing Package ---');
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    console.log(`Created distribution directory: ${DIST_DIR}`);
  }

  // 1. Write CHANGELOG_RC1.md
  const changelogPath = path.join(DIST_DIR, 'CHANGELOG_RC1.md');
  fs.writeFileSync(changelogPath, changelogContent, 'utf8');
  console.log('✅ Created CHANGELOG_RC1.md');

  // 2. Write BUG_REPORT_TEMPLATE.md
  const bugReportPath = path.join(DIST_DIR, 'BUG_REPORT_TEMPLATE.md');
  fs.writeFileSync(bugReportPath, bugReportContent, 'utf8');
  console.log('✅ Created BUG_REPORT_TEMPLATE.md');

  // 3. Copy README_INTERNAL_TESTER.md
  const readmePath = path.join(DIST_DIR, 'README_INTERNAL_TESTER.md');
  if (fs.existsSync(srcReadme)) {
    fs.copyFileSync(srcReadme, readmePath);
    console.log('✅ Copied README_INTERNAL_TESTER.md');
  } else {
    console.error(`❌ Source README not found at ${srcReadme}`);
  }

  // 4. Copy RELEASE_CANDIDATE_QA_REPORT.md
  const qaReportPath = path.join(DIST_DIR, 'RELEASE_CANDIDATE_QA_REPORT.md');
  if (fs.existsSync(srcQaReport)) {
    fs.copyFileSync(srcQaReport, qaReportPath);
    console.log('✅ Copied RELEASE_CANDIDATE_QA_REPORT.md');
  } else {
    console.error(`❌ Source QA Report not found at ${srcQaReport}`);
  }

  // 5. Copy provider_evidence_report.md
  const providerReportPath = path.join(DIST_DIR, 'provider_evidence_report.md');
  if (fs.existsSync(srcProviderReport)) {
    fs.copyFileSync(srcProviderReport, providerReportPath);
    console.log('✅ Copied provider_evidence_report.md');
  } else {
    console.error(`❌ Source Provider Report not found at ${srcProviderReport}`);
  }

  // 6. Copy Installer
  const installerDest = path.join(DIST_DIR, 'MASJAVAS AI Setup 1.0.0.exe');
  console.log(`Copying installer from ${srcInstaller} to ${installerDest}...`);
  console.log('(This might take several seconds as the file size is ~281MB)');
  
  if (fs.existsSync(srcInstaller)) {
    fs.copyFileSync(srcInstaller, installerDest);
    console.log('✅ Copied MASJAVAS AI Setup 1.0.0.exe successfully!');
  } else {
    console.error(`❌ Installer source not found at ${srcInstaller}`);
  }

  console.log('\n--- INTERNAL RELEASE PACKAGE PREPARATION COMPLETE ---');
}

main().catch(err => {
  console.error('Fatal crash during package copy:', err);
});
