# Step 5 — Reference-Locked Video Pipeline

## Problem

Generate Video di Step 5 hanya mengirimkan `videoInstruction` (teks pendek) ke GrokPI. Semua artefak scene lainnya — storyboard panels, hero frame, reference images, narasi, beat map — diabaikan. Hasil video terlihat generik/template.

Selain itu, output panel masih memuat fallback video `w3schools.com/html/mov_bbb.mp4` (Big Buck Bunny) sebagai "hasil generate" — ini melanggar aturan no-placeholder.

## Proposed Changes

### 1. Backend — New Modules

> [!IMPORTANT]
> Semua modul baru di `server/services/`. Tidak ada modul yang mengekspos API key atau melakukan direct call dari frontend.

---

#### [NEW] [sceneReferenceResolver.js](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/server/services/sceneReferenceResolver.js)

Menerima scene data dan project references, lalu mengelompokkan berdasarkan role:
- `storyboard_structure` — dari hero frame + storyboard panel images
- `character_identity` — dari references kategori "Karakter"
- `environment_lock` — dari references kategori "Lokasi"
- `manual_user_reference` — dari references kategori "Mood", "Style", manual uploads
- `previousVideoRef` — video scene sebelumnya (jika ada)

Output: Array `ProviderReferenceImage[]` dengan role, weight, dan usageRule.

---

#### [NEW] [scenePromptPackageBuilder.js](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/server/services/scenePromptPackageBuilder.js)

Menerima:
- Scene data (narration, storyboard, references, settings)
- Resolved references dari `sceneReferenceResolver`
- Video instruction dari user

Membangun objek `ScenePromptPackage` lengkap dengan:
- scene info, storyboard data, categorized references
- video settings (duration, quality, aspect ratio)
- content hash untuk dedup

---

#### [NEW] [videoPromptBuilder.js](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/server/services/videoPromptBuilder.js)

Menggunakan `ScenePromptPackage` untuk menghasilkan text prompt final berdasarkan template 10 detik dari knowledge file:
- Reference role instructions
- 10-second audio timing rule
- Beat map dari 5 storyboard panels
- Scene narration & dialogue
- Camera, motion, style, sound dari storyboard data
- Negative prompt (no storyboard grid, no labels, no watermark, dll)

---

#### [NEW] [videoPromptValidator.js](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/server/services/videoPromptValidator.js)

Validasi sebelum kirim ke provider:
- `durationSec === 10`
- Narration exists
- Storyboard panels exist (≥ 1 panel image)
- Reference images exist
- Prompt mentions reference roles
- Prompt contains timing rule
- Prompt forbids storyboard grid

Returns `{ passed: boolean, warnings: string[], errors: string[] }`.

---

#### [NEW] [providerPayloadBuilder.js](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/server/services/providerPayloadBuilder.js)

Build provider-ready payload:
```js
{
  prompt: finalVideoPrompt,
  durationSec: 10,
  aspectRatio: "16:9",
  quality: "high",
  referenceImages: ProviderReferenceImage[]
}
```

Abstraksi: jika GrokPI video API memiliki field name berbeda untuk image references, konversi di sini.

---

### 2. Backend — Modified Modules

#### [MODIFY] [sceneService.js](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/server/services/sceneService.js)

Refactor `createVideoJob`:
- Sekarang menerima `{ projectId, sceneId, videoInstruction, settings, scene, references, storyboardPanels, heroFrame, previousSceneVideoUrl }` dari frontend
- Memanggil pipeline: `sceneReferenceResolver` → `scenePromptPackageBuilder` → `videoPromptBuilder` → `videoPromptValidator` → `providerPayloadBuilder`
- Jika validation gagal, return error tanpa mengirim ke GrokPI
- Mengirim full prompt + referenceImages ke GrokPI

Refactor `runBackgroundVideoGeneration`:
- Menerima full prompt dari pipeline, bukan raw videoInstruction
- Mengirim `videoConfig` yang sudah diisi `referenceImages`

Tambah safe logging `[SceneVideo]`.

#### [MODIFY] [grokpiClient.js](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/server/services/grokpiClient.js)

Update `grokpiVideoGeneration` agar mendukung parameter `referenceImages`:
- Jika provider API mendukung image-to-video atau multi-reference, kirimkan reference URLs
- Minimal: gabungkan reference descriptions ke dalam prompt text

> [!NOTE]
> GrokPI `grok-imagine-1.0-video` **mendukung** native image-to-video references. Per api.md §8.5, gambar pertama di block `image_url` pada message user digunakan sebagai `reference_image`. Reference images dikirim sebagai `image_url` blocks di multimodal content array — bukan hanya text enrichment.

#### [MODIFY] [sceneRoutes.js](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/server/routes/sceneRoutes.js)

Update `POST /api/scenes/:sceneId/video`:
- Terima body yang lebih kaya: `{ projectId, videoInstruction, settings, scene, references, storyboardPanels, heroFrame, previousSceneVideoUrl }`
- Return `{ jobId, status, scenePromptPackageId, validation }` sesuai knowledge file

---

### 3. Frontend — Modified Modules

#### [MODIFY] [sceneService.ts](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/src/services/sceneService.ts)

Update `generateSceneVideo` untuk mengirimkan full scene data:
- `projectId`, `videoInstruction`, `settings`
- `scene` (title, narration, summary, sceneNumber)
- `references` (all scene + project references)
- `storyboardPanels` (semua 5 panels dengan imageUrl)
- `heroFrame`
- `previousSceneVideoUrl` (dari scene sebelumnya)

#### [MODIFY] [sceneComposerStore.ts](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/src/stores/sceneComposerStore.ts)

Update `generateVideo` action:
- Kumpulkan semua scene artifacts (references, panels, hero frame, settings)
- Ambil `previousSceneVideoUrl` dari scene sebelumnya
- Kirim ke `sceneService.generateSceneVideo` dengan full payload
- Tambah validating status sebelum queued

#### [MODIFY] [SceneComposerPage.tsx](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/src/pages/SceneComposerPage.tsx)

- Hapus hardcoded fallback video `w3schools.com/html/mov_bbb.mp4` (line 551)
- Gunakan `activeScene.previewVideoUrl` atau `renderJobs[sceneId].videoUrl` sebagai src video
- Tambah failed state UI: "Video gagal dibuat. GrokPI belum mengembalikan video final. Coba generate ulang."
- Tambah checklist row: "Paket prompt video siap"
- Update progress states: Memvalidasi referensi → Menyusun paket prompt → Mengirim ke GrokPI → Menunggu hasil

#### [MODIFY] [types/index.ts](file:///c:/Users/Masjavas/Documents/APLIKASI MASJAVAS FILM V5/src/types/index.ts)

Tambah type baru:
- `SceneVideoGenerationState`
- `ProviderReferenceImage`
- `ScenePromptPackageValidation`

---

## Open Questions

> [!IMPORTANT]
> **GrokPI image-to-video support**: Apakah GrokPI `grok-imagine-1.0-video` sudah mendukung native reference image uploads (image-to-video)? Jika belum, reference images akan digunakan untuk enriching the text prompt saja, bukan sebagai binary image attachment ke provider API. Ini tetap valid karena prompt yang kaya dengan reference descriptions menghasilkan video yang jauh lebih akurat dibanding prompt kosong.

---

## Verification Plan

### Automated Tests
```bash
npx tsc --noEmit   # TypeScript compilation
npm run build       # Production build
```

### Manual Verification
1. Buat project baru → isi ide Roro Jonggrang → sampai Step 5
2. Klik Generate Video
3. Cek server logs: `[SceneVideo]` harus menampilkan reference count, storyboard panels present, prompt package validation
4. Video yang dihasilkan harus mengikuti storyboard Roro Jonggrang, bukan generic stock
5. Jika provider gagal, UI harus menampilkan failed state — BUKAN Big Buck Bunny
