# MASJAVAS AI Slicing Bundle

Frontend slicing untuk mockup MASJAVAS AI: beginner-friendly cinematic video creation app.

## Stack
- React
- Vite
- Tailwind CSS
- lucide-react
- clsx + tailwind-merge

## Fitur UI
- Homepage / start project
- Wizard 7 langkah
- Tulis ide
- Pilih preset
- Referensi otomatis + upload manual opsional
- Review cerita
- Scene Composer / Scene Artifact Panel
- Storyboard otomatis per scene
- Pengaturan video sederhana
- Checklist sebelum generate
- Preview
- Export / download
- Proyek Saya
- Bantuan AI
- Pengaturan

## Cara menjalankan

```bash
npm install
npm run dev
```

## Struktur

```txt
src/
  components/
    ui/
    layout/
    navigation/
    shared/
  features/
    home/
    onboarding/
    references/
    scenes/
    preview/
    export/
    library/
    assistant/
    settings/
  data/
  styles/
```

## Catatan implementasi

UI ini masih slicing statis. Integrasikan state nyata, API, upload handler, dan generator backend di layer service/store sesuai codebase production.
