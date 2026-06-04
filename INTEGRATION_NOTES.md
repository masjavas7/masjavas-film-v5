# Catatan Integrasi Backend - MASJAVAS AI

Dokumen ini berisi spesifikasi kebutuhan API dan payload data untuk menghubungkan frontend MASJAVAS AI dengan backend production.

## 1. Daftar Layanan & Service Layer

Seluruh modul layanan dibungkus di dalam folder `src/services/` dan menggunakan data tiruan (*mock Promises*). Developer backend harus mengganti implementasi di file-file berikut:

* **[projectService.ts](file:///c:/Users/Masjavas/Documents/APLIKASI%20MASJAVAS%20FILM%20V5/src/services/projectService.ts)**: Pembuatan proyek baru dan draf narasi awal.
* **[referenceService.ts](file:///c:/Users/Masjavas/Documents/APLIKASI%20MASJAVAS%20FILM%20V5/src/services/referenceService.ts)**: Pengambilan referensi otomatis (Master Bible) serta pengunggahan referensi manual.
* **[sceneService.ts](file:///c:/Users/Masjavas/Documents/APLIKASI%20MASJAVAS%20FILM%20V5/src/services/sceneService.ts)**: Pembuatan detail adegan, instruksi kustom, storyboard, dan pemicu pembuatan video per adegan.
* **[exportService.ts](file:///c:/Users/Masjavas/Documents/APLIKASI%20MASJAVAS%20FILM%20V5/src/services/exportService.ts)**: Kompilasi final proyek dan download hasil akhir (Video, Subtitle SRT, Aset Bundle).

---

## 2. Struktur Payload API (Spesifikasi JSON)

### A. Pengunggahan Referensi Gambar (Upload Reference)
* **Konteks Global Proyek**: `uploadProjectReference(projectId, file, category)`
* **Konteks Adegan (Scene)**: `uploadSceneReference(sceneId, file, category)`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`

#### Request Payload:
```text
file: [Binary File Image]
category: "Karakter" | "Lokasi" | "Mood" | "Style" | "Referensi Tambahan"
```

#### Response Payload (JSON - `ReferenceItem`):
```json
{
  "id": "ref-manual-178491823901",
  "title": "wajah_hari",
  "imageUrl": "https://storage.masjavas.ai/references/wajah_hari.png",
  "type": "manual",
  "category": "Karakter",
  "description": "Gambar diunggah oleh user."
}
```

---

### B. Generate Auto References
* **Method**: `POST`
* **Endpoint**: `/api/projects/:projectId/references/auto`

#### Request Payload:
```json
{
  "projectId": "project-123",
  "storyBible": {
    "genre": "Cinematic Action Thriller",
    "theme": "Escape under heavy rain",
    "notes": "Hari & Wiwi escaping on a retro motorcycle"
  },
  "narration": "Dalam kegelapan malam yang diguyur hujan deras, Hari dan Wiwi memacu motor tuanya memasuki terowongan bypass kota...",
  "sceneList": [
    "Scene 1: Deru Mesin Hujan",
    "Scene 2: Sorot Lampu Misterius",
    "Scene 3: Split Second Escape"
  ]
}
```

#### Response Payload (JSON):
```json
[
  {
    "referenceId": "ref-auto-1",
    "title": "Hari (Karakter Utama)",
    "category": "Karakter",
    "source": "Master Bible",
    "imageUrl": "https://storage.masjavas.ai/references/hari_portrait.png",
    "usageScope": "global",
    "status": "ready"
  },
  {
    "referenceId": "ref-auto-2",
    "title": "Terowongan Gelap (Lokasi)",
    "category": "Lokasi",
    "source": "Narasi",
    "imageUrl": "https://storage.masjavas.ai/references/dark_tunnel.png",
    "usageScope": "global",
    "status": "ready"
  }
]
```

---

### C. Pembuatan Storyboard (Generate Storyboard)
* **Method**: `POST`
* **Endpoint**: `/api/scenes/:sceneId/storyboard`

#### Request Payload:
```json
{
  "sceneId": "scene-3",
  "narration": "Hari menarik gas motor dalam-dalam. Motor melesat keluar terowongan tepat beberapa saat sebelum mobil hitam itu kehilangan kendali.",
  "references": [
    "ref-auto-1",
    "ref-auto-2"
  ],
  "visualStyle": "Noir Cinematic Style",
  "durationSec": 10
}
```

#### Response Payload (JSON):
```json
{
  "storyboardImageUrl": "https://storage.masjavas.ai/storyboards/scene_3_hero.png",
  "heroFrame": {
    "imageUrl": "https://storage.masjavas.ai/storyboards/scene_3_hero.png",
    "description": "Hari melirik spion, lampu mobil pengejar makin silau di malam hujan lebat."
  },
  "panels": [
    {
      "order": 1,
      "label": "Hook Visual",
      "timeRange": "0.0–2.0s",
      "shot": "Wide shot",
      "action": "Motor melesat masuk terowongan gelap bypass kota saat hujan lebat.",
      "dialogue": null,
      "sfx": "Engine roar, rain splatter, echo",
      "transition": "CUT",
      "imageUrl": "https://storage.masjavas.ai/storyboards/s3_p1.png"
    },
    {
      "order": 2,
      "label": "Narasi Mulai",
      "timeRange": "2.0–5.5s",
      "shot": "Medium tracking shot",
      "action": "Karakter utama memacu motor, lampu jalan basah memantul dramatis.",
      "dialogue": null,
      "sfx": "Tire splash, background thunder",
      "transition": "CUT",
      "imageUrl": "https://storage.masjavas.ai/storyboards/s3_p2.png"
    },
    {
      "order": 3,
      "label": "Aksi / Dialog",
      "timeRange": "5.5–7.0s",
      "shot": "Close-up / action shot",
      "action": "Wiwi berseru panik menunjuk ke arah belakang.",
      "dialogue": "Wiwi: Mereka dekat!",
      "sfx": "Gas engine revs up",
      "transition": "CUT",
      "imageUrl": "https://storage.masjavas.ai/storyboards/s3_p3.png"
    },
    {
      "order": 4,
      "label": "Detail Emosi",
      "timeRange": "7.0–8.8s",
      "shot": "Close-up",
      "action": "Hari fokus menatap ke depan, visor helm basah butiran air.",
      "dialogue": null,
      "sfx": "Heartbeat slow-motion",
      "transition": "MATCH CUT",
      "imageUrl": "https://storage.masjavas.ai/storyboards/s3_p4.png"
    },
    {
      "order": 5,
      "label": "Transisi",
      "timeRange": "8.8–10.0s",
      "shot": "Rear tracking shot",
      "action": "Motor melaju kencang keluar terowongan menuju jalan raya terbuka.",
      "dialogue": null,
      "sfx": "Rain splatter, wind fade out",
      "transition": "CUT TO NEXT SCENE",
      "imageUrl": "https://storage.masjavas.ai/storyboards/s3_p5.png"
    }
  ]
}
```

---

### D. Pembuatan Video Adegan (Generate Scene Video)
* **Method**: `POST`
* **Endpoint**: `/api/scenes/:sceneId/video`

#### Request Payload:
```json
{
  "sceneId": "scene-3",
  "storyboardImageUrl": "https://storage.masjavas.ai/storyboards/scene_3_full_grid.png",
  "referenceImages": [
    "https://storage.masjavas.ai/references/hari_portrait.png",
    "https://storage.masjavas.ai/references/dark_tunnel.png"
  ],
  "videoInstruction": "Sudut dinamis mengikuti (dynamic tracking) motor menyalip celah sempit lalu melesat keluar terowongan gelap. Di latar belakang mobil hitam tergelincir menabrak dinding.",
  "settings": {
    "quality": "Tinggi",
    "aspectRatio": "16:9 Widescreen"
  },
  "durationSec": 10
}
```

#### Response Payload (JSON):
```json
{
  "jobId": "job-render-99201",
  "status": "processing",
  "previewUrl": "https://storage.masjavas.ai/previews/scene_3_low_res.mp4",
  "videoUrl": "https://storage.masjavas.ai/renders/scene_3_high_res.mp4",
  "errorMessage": null
}
```

---

### E. Kompilasi Video Final & Ekspor (Export Final)
* **Method**: `POST`
* **Endpoint**: `/api/projects/:projectId/export`

#### Request Payload:
```json
{
  "projectId": "project-123",
  "approvedSceneIds": [
    "scene-1",
    "scene-2",
    "scene-3"
  ],
  "includeSubtitle": true,
  "includeEditPackage": true
}
```

#### Response Payload (JSON):
```json
{
  "mp4Url": "https://storage.masjavas.ai/exports/project_123_final.mp4",
  "subtitleUrl": "https://storage.masjavas.ai/exports/project_123_final.srt",
  "packageZipUrl": "https://storage.masjavas.ai/exports/project_123_bundle.zip",
  "manifestUrl": "https://storage.masjavas.ai/exports/project_123_manifest.json"
}
```

---

## 3. Aturan Keamanan (Security Rules)

Untuk menjamin keamanan kredensial dan keandalan sistem dalam lingkungan produksi:

* **Pencegahan Kebocoran API Key**: API key penyedia (`gf-...`) tidak boleh disimpan di frontend, tidak boleh diakses via `import.meta.env` di React, dan tidak boleh masuk ke bundel kode browser.
* **Perantara Backend**: Semua pemanggilan fungsi kecerdasan buatan (generasi narasi, referensi otomatis, storyboard, rendering video) wajib melalui server backend lokal (`/api/...`) sebagai perantara (proxy).
* **Secret Server-Side**: Kredensial `GROKPI_API_KEY` harus dimuat secara eksklusif dari environment server atau secret manager backend.
* **Masking Header Otorisasi**: Header `Authorization` dengan Bearer key provider tidak boleh dimasukkan ke dalam log browser atau terekspos di DevTools client.
* **Siklus Rotasi**: Jika kunci API Gateway GrokPI pernah secara tidak sengaja tersimpan dalam `.env` frontend atau ter-commit ke dalam repositori, kunci tersebut wajib di-rotate/di-generate ulang segera.

---

## 2. Status Realisasi Endpoint Backend Proxy

Semua endpoint API lokal berikut aktif dan melayani payload terbaru dengan klasifikasi kesiapan backend riil:

| No | Endpoint | Method | Status | Realisasi | Catatan / Alasan |
|---|---|---|---|---|---|
| 1 | `/api/health` | `GET` | **Aktif** | **REAL** | Health check status server riil. |
| 2 | `/api/projects/:projectId/narration` | `POST` | **Aktif** | **REAL** | Menghasilkan naskah narasi melalui GrokPI Expert. |
| 3 | `/api/projects/:projectId/references/auto` | `POST` | **Aktif** | **REAL** | Menghasilkan referensi visual otomatis (Gambar asli via `grok-imagine-1.0`). |
| 4 | `/api/projects/:projectId/references` | `POST` | **Aktif** | **REAL** | Mengunggah referensi proyek global manual via Multer. |
| 5 | `/api/scenes/:sceneId/references` | `POST` | **Aktif** | **REAL** | Mengunggah referensi tingkat adegan via Multer. |
| 6 | `/api/references/:refId/replace` | `POST` | **Aktif** | **REAL** | Mengganti berkas referensi visual pada disk server. |
| 7 | `/api/references/:refId` | `DELETE` | **Aktif** | **REAL** | Menghapus berkas referensi visual dari disk server. |
| 8 | `/api/scenes/:sceneId/storyboard` | `POST` | **Aktif** | **REAL** | Menyusun detail **5 beat panel & Hero Frame** (sketsa paralel). |
| 9 | `/api/scenes/:sceneId/video` | `POST` | **Aktif** | **REAL** | Mendaftarkan antrean rendering video adegan secara Async ke provider. |
| 10 | `/api/scenes/video/jobs/:jobId` | `GET` | **Aktif** | **REAL** | Polling status rendering video asinkron secara dinamis hingga status `completed` (terbukti menghasilkan berkas MP4 riil dari provider). |
| 11 | `/api/projects/:projectId/export` | `POST` | **Aktif** | **REAL-MVP** | Mengunduh berkas final MP4 (fallback video scene 1), subtitles.srt, manifest.json, dan ZIP package yang dibuat secara fisik di disk server. |
| 12 | `/api/projects/:projectId/export/status` | `GET` | **Aktif** | **REAL-MVP** | Mengambil status progress ekspor dengan tautan download server lokal riil. |
