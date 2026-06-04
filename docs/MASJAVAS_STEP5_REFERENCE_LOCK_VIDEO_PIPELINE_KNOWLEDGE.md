# MASJAVAS AI — Step 5 Reference-Locked Video Generation Knowledge

**Status:** wajib diperbaiki  
**Area:** Step 5 / Cek Adegan / Generate Video / GrokPI Video Pipeline  
**Bug utama:** video dihasilkan hanya dari teks `Instruksi Video`, bukan dari paket artefak scene lengkap: storyboard, reference image, narasi scene, beat map, setting video, dan continuity.

---

## 1. Problem Statement

Pada Step 5, UI sudah menampilkan artefak lengkap:

- Storyboard hero frame.
- Storyboard 5 beat panel.
- Referensi gambar.
- Narasi scene.
- Instruksi video.
- Pengaturan video.
- Checklist sebelum generate.

Namun hasil video masih terlihat generik/template dan tidak mengikuti storyboard maupun referensi image. Ini berarti proses backend/frontend kemungkinan masih menjalankan:

```txt
videoInstruction → GrokPI video generation
```

Padahal seharusnya:

```txt
scene + storyboard + references + videoInstruction + settings
→ ScenePromptPackage
→ validated provider payload
→ GrokPI video generation
```

Step 5 bukan text-to-video biasa. Step 5 adalah **scene production gate**.

---

## 2. Non-Negotiable Rule

```txt
NO REFERENCE VALIDATION → NO VIDEO PROMPT
NO STORYBOARD PACKAGE → NO VIDEO GENERATION
NO PROVIDER VIDEO URL → NO GENERATED RESULT
```

Jika storyboard atau reference image belum valid, tombol Generate boleh terlihat, tetapi harus gagal di validation dengan pesan yang jelas, bukan tetap generate video generik.

---

## 3. Correct Workflow Step 5

```txt
Active Scene
→ Scene Reference Resolver
→ Storyboard Resolver
→ Scene Prompt Package Builder
→ Video Prompt Builder
→ Video Prompt Validator
→ Provider Payload Builder
→ GrokPI Video Adapter
→ Async Job Poller
→ Real Provider Video URL
→ Scene Asset Manager
→ UI Preview
```

---

## 4. ScenePromptPackage Schema

```ts
type ScenePromptPackage = {
  projectId: string;
  sceneId: string;
  sceneNumber: number;
  contentHash: string;

  scene: {
    title: string;
    narration: string;
    storyAction: string;
    durationSec: 10;
    emotion?: string;
    goal?: string;
  };

  storyboard: {
    storyboardImageUrl?: string;
    heroFrame?: {
      imageUrl?: string;
      description: string;
    };
    panels: StoryboardPanel[];
  };

  references: {
    storyboardRef?: ReferenceAsset;
    characterRefs: ReferenceAsset[];
    environmentRefs: ReferenceAsset[];
    propRefs: ReferenceAsset[];
    creatureRefs: ReferenceAsset[];
    manualRefs: ReferenceAsset[];
    previousVideoRef?: {
      sceneId: string;
      videoUrl: string;
    };
  };

  videoInstruction: string;

  settings: {
    mode: "video" | "agent";
    durationSec: 10;
    quality: "draft" | "standard" | "high";
    aspectRatio: "2:3" | "3:2" | "1:1" | "9:16" | "16:9";
  };

  videoPrompt: string;

  providerPayload: {
    prompt: string;
    durationSec: 10;
    aspectRatio: string;
    quality: string;
    referenceImages: ProviderReferenceImage[];
    previousVideoUrl?: string;
  };

  validation: {
    narrationReady: boolean;
    storyboardReady: boolean;
    referencesReady: boolean;
    promptReady: boolean;
    providerPayloadReady: boolean;
    warnings: string[];
    errors: string[];
  };
};
```

---

## 5. Reference Role System

### Storyboard Reference

```txt
Role: structure reference only.
Use for: story flow, framing, action order, emotional beat, transition.
Do not use for: visible storyboard grid, panel border, number, label, caption, arrow, poster layout.
```

### Character Reference

```txt
Role: identity and wardrobe lock.
Use for: face, skin tone, hair silhouette, body type, costume, posture, key props.
Do not use for: action scene composition or storyboard layout.
```

### Environment Reference

```txt
Role: location, lighting, material, mood lock.
Use for: architecture, spatial layout, lighting, color palette, material, atmosphere.
Do not use for: character identity or action order.
```

### Prop / Creature Reference

```txt
Role: object or creature identity lock.
Use for: shape, scale, color, material, affordance, recurring object continuity.
```

### Previous Video Reference

```txt
Role: continuity only.
Use for: continue naturally from previous scene, same lighting logic, same character state, same emotion.
Do not use for: restarting story.
```

---

## 6. ProviderReferenceImage Schema

```ts
type ProviderReferenceImage = {
  id: string;
  role:
    | "storyboard_structure"
    | "character_identity"
    | "environment_lock"
    | "prop_lock"
    | "creature_lock"
    | "manual_user_reference";
  imageUrl: string;
  weight: number;
  usageRule: string;
};
```

Recommended weighting:

```ts
const REFERENCE_WEIGHTS = {
  storyboard_structure: 0.35,
  character_identity: 0.30,
  environment_lock: 0.20,
  prop_lock: 0.10,
  manual_user_reference: 0.25
};
```

Backend must send `referenceImages[]` to provider adapter. If GrokPI uses a different field name for image-to-video/multi-image reference, keep it inside `grokpiVideoAdapter`, not scattered across app code.

---

## 7. Standard Video Prompt Formula

```txt
REFERENCE ROLE
+
10-SECOND AUDIO RULE
+
STORY ACTION
+
BEAT MAP
+
NARRATION
+
DIALOGUE
+
CAMERA
+
MOTION
+
STYLE
+
SOUND
+
NEGATIVE
```

---

## 8. Standard 10-Second Video Prompt Template

```txt
References:
@[Storyboard_Scene_{sceneNumber}] = scene structure only.
Use this only for story flow, framing, action order, emotional beats, camera rhythm, and transition.
Do not show storyboard grid, panel borders, numbers, labels, captions, arrows, or poster layout.

{characterReferenceLines}

{environmentReferenceLines}

{propReferenceLines}

{previousVideoReferenceLine}

Task:
Create Scene {sceneNumber} of the same cinematic short film.
Duration: 10 seconds.
Continue naturally from the previous scene if provided.
Do not restart the story.

Reference Use:
Use character references only to preserve face, skin tone, hairstyle, body type, wardrobe, posture, and key props.
Use environment references only to preserve location layout, lighting, color palette, materials, and atmosphere.
Use storyboard reference only for structure, shot flow, emotional beats, and transition.
Use previous video only for continuity.

Audio Timing:
0.0–2.0s visual only. No narration, no dialogue, no subtitles, no visible text.
Narration begins exactly at 2.0s.
Dialogue, if used, appears only after 5.5s.

Story Action:
{scene.storyAction}

Beat Map:
0.0–2.0s: {beat1}
2.0–5.5s: {beat2}
5.5–7.0s: {beat3}
7.0–8.8s: {beat4}
8.8–10.0s: {beat5}

Narration:
“{scene.narration}”

Dialogue:
{dialogueOrNone}

Camera:
{camera}

Motion:
{motion}

Style:
{projectVisualStyle}

Sound:
{soundCues}

Negative:
No storyboard grid, no panel borders, no labels, no captions, no subtitles, no visible text, no watermark, no logo, no face drift, no wardrobe drift, no environment drift, no unrelated genre, no generic stock footage, no template video.
```

---

## 9. Required Backend Modules

Create or refactor:

```txt
server/services/sceneReferenceResolver.js
server/services/scenePromptPackageBuilder.js
server/services/videoPromptBuilder.js
server/services/videoPromptValidator.js
server/services/providerPayloadBuilder.js
server/services/grokpiVideoAdapter.js
server/services/sceneAssetManager.js
```

### sceneReferenceResolver.js

Responsibilities:

```txt
Collect:
- storyboard hero frame
- storyboard panel images
- character references
- environment references
- prop/creature references
- manual uploaded references
- previous scene video
```

Return normalized:

```ts
type ReferenceAsset = {
  id: string;
  role: string;
  imageUrl: string;
  source: "auto" | "manual" | "storyboard" | "previousVideo";
  usageRule: string;
  directProviderReferenceAllowed: boolean;
};
```

### scenePromptPackageBuilder.js

Build full `ScenePromptPackage`. Do not continue silently if storyboard/reference data is missing.

### videoPromptBuilder.js

Generate final video prompt from the full package. It must include reference role instructions, 10-second timing, beat map, narration, camera, motion, sound, and negative rules.

### videoPromptValidator.js

Required checks:

```txt
durationSec === 10
narration exists
storyboard exists
references exist
referenceImages.length > 0
prompt mentions reference roles
prompt contains 10-second timing rule
prompt forbids storyboard grid/text
prompt is not generic
provider payload has referenceImages
```

### providerPayloadBuilder.js

Build provider-ready payload:

```ts
{
  prompt,
  durationSec: 10,
  aspectRatio,
  quality,
  referenceImages,
  previousVideoUrl
}
```

### grokpiVideoAdapter.js

Only backend calls GrokPI. No frontend secret. No fallback template video. Handles async job creation and polling.

### sceneAssetManager.js

Persist real scene video asset:

```txt
sceneId
jobId
status
providerVideoUrl
localVideoUrl if downloaded
generatedAt
promptPackageHash
referenceHash
```

---

## 10. Correct API Contract

### POST /api/scenes/:sceneId/video

Frontend may send:

```json
{
  "projectId": "project-123",
  "videoInstruction": "Tambahkan suasana sinematik...",
  "settings": {
    "durationSec": 10,
    "quality": "high",
    "aspectRatio": "16:9"
  }
}
```

Backend must internally resolve scene, storyboard, references, manual uploads, and previous video.

Response:

```json
{
  "jobId": "job_123",
  "status": "queued",
  "scenePromptPackageId": "spp_123",
  "validation": {
    "passed": true,
    "warnings": []
  }
}
```

### GET /api/scenes/video/jobs/:jobId

```json
{
  "jobId": "job_123",
  "sceneId": "scene-1",
  "status": "queued | processing | completed | failed",
  "progress": 80,
  "videoUrl": null,
  "providerVideoUrl": null,
  "errorMessage": null,
  "scenePromptPackageId": "spp_123"
}
```

Completed:

```json
{
  "status": "completed",
  "progress": 100,
  "videoUrl": "http://localhost:3000/videos/project-123/scene-1.mp4",
  "providerVideoUrl": "https://provider-url/video.mp4"
}
```

---

## 11. Frontend Store Requirements

```ts
type SceneVideoGenerationState = {
  sceneId: string;
  status: "idle" | "validating" | "queued" | "processing" | "completed" | "failed";
  progress: number;
  promptPackage?: ScenePromptPackage;
  validation?: {
    passed: boolean;
    warnings: string[];
    errors: string[];
  };
  jobId?: string;
  videoUrl?: string;
  providerVideoUrl?: string;
  errorMessage?: string;
};
```

Actions:

```ts
buildScenePromptPackage(sceneId)
validateScenePromptPackage(sceneId)
generateVideo(sceneId)
pollVideoJob(jobId)
setSceneVideoResult(sceneId, result)
```

---

## 12. UI Requirements for Scene Composer

Add checklist row:

```txt
Paket prompt video siap
```

When clicking Generate, show process states:

```txt
Memvalidasi referensi...
Menyusun paket prompt video...
Mengirim ke GrokPI...
Menunggu hasil video...
```

If references are missing:

```txt
Referensi belum lengkap.
Tambahkan referensi atau gunakan referensi otomatis sebelum generate video.
```

If provider does not return real video:

```txt
Video gagal dibuat.
GrokPI belum mengembalikan video final.
Coba generate ulang.
```

---

## 13. No Generic Placeholder Rule

Remove all generic/template fallback from generated result.

Forbidden:

```txt
w3schools video
Big Buck Bunny
sample video
stock rabbit video
local placeholder mp4 shown as generated scene
```

Allowed only when clearly marked:

```txt
DEV_PLACEHOLDER_ONLY=true
```

But if user clicked real Generate:

```txt
Never show placeholder as generated output.
```

Known placeholder blocklist:

```ts
const PLACEHOLDER_VIDEO_BLOCKLIST = [
  "w3schools.com",
  "mov_bbb.mp4",
  "big_buck_bunny",
  "sample-videos.com",
  "placeholder",
  "template"
];
```

---

## 14. Backend Safe Logs

Required:

```txt
[SceneVideo] sceneId
[SceneVideo] reference count by role
[SceneVideo] storyboard image present
[SceneVideo] promptPackage validation pass/fail
[SceneVideo] provider payload referenceImages count
[SceneVideo] jobId
[SceneVideo] final videoUrl present
```

Do not log:

```txt
API key
Authorization header
full raw prompt if too long
binary image data
```

---

## 15. Acceptance Criteria

Bug is fixed only if:

1. Clicking Generate sends a scene prompt package, not only `videoInstruction`.
2. Provider payload contains `referenceImages[]`.
3. Storyboard hero/panel images are included as structure references.
4. Character/environment/manual references are included by role.
5. Prompt contains 10-second timing rule.
6. Prompt contains beat map.
7. Prompt forbids storyboard grid/labels/text.
8. Generic/template video is never shown as generated result.
9. Generated preview video URL comes from GrokPI/provider or a local copy of provider result.
10. If provider fails, UI shows failed state, not template video.
11. `npx tsc --noEmit` passes.
12. `npm run build` passes.
13. Manual QA with Roro Jonggrang shows video visually follows the Roro storyboard/reference, not generic stock animation.

---

## 16. Implementation Order

```txt
1. Remove template video fallback from SceneComposerPage and sceneService.
2. Add ScenePromptPackage schema/types.
3. Add sceneReferenceResolver.
4. Add scenePromptPackageBuilder.
5. Add videoPromptBuilder.
6. Add videoPromptValidator.
7. Add providerPayloadBuilder.
8. Update /api/scenes/:sceneId/video to use full package.
9. Update GrokPI adapter to send referenceImages / image-to-video provider fields.
10. Update job polling to return only real provider videoUrl.
11. Update SceneComposer checklist with “Paket prompt video siap”.
12. Add failed state if provider does not return real video.
13. Add safe logs.
14. Run QA with Roro Jonggrang scene.
```

---

## 17. QA Test Case: Roro Jonggrang

Expected video:

```txt
- Roro Jonggrang / Prambanan environment / moonlight / mystical mood.
- Movement follows 5 beat storyboard.
- No rabbit, no cartoon stock, no unrelated generic template.
- No storyboard grid visible.
- No subtitles or visible text.
- Duration 10 seconds.
```

Failure if:

```txt
- Video shows unrelated generic animation.
- Video ignores storyboard.
- Video ignores references.
- Video is generated from instruction text only.
- Result uses fallback sample mp4.
```

---

## 18. Final Principle

Step 5 is not a simple text-to-video form.

```txt
Scene artifacts
+ reference roles
+ storyboard structure
+ prompt package validation
+ GrokPI provider payload
+ async video result
= valid scene video
```

If any of these are missing:

```txt
Do not generate.
Show what is missing.
Let user fix it.
```
