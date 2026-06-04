# SEO Report — MASJAVAS Film V5 v1.1.0

## Audit checklist

| Item | Status | Catatan |
|------|--------|---------|
| `<title>` | ✅ | MASJAVAS Film V5 — AI Cinematic Video Production |
| Meta description | ✅ | 150+ karakter, keyword relevan |
| Meta keywords | ✅ | |
| Open Graph | ✅ | og:title, description, image, locale |
| Twitter Card | ✅ | summary_large_image |
| Canonical | ✅ | GitHub repo (ganti domain produksi) |
| Structured data | ✅ | JSON-LD SoftwareApplication |
| robots.txt | ✅ | `public/robots.txt` |
| sitemap.xml | ✅ | `public/sitemap.xml` (HashRouter paths) |
| lang attribute | ✅ | `lang="id"` |
| Mobile viewport | ✅ | |

## Target score > 90

Aplikasi SPA/Electron — SEO penuh berlaku saat `SERVE_STATIC=true` + domain publik.

**Langkah verifikasi:**
1. `npm run build && npm run preview`
2. Lighthouse → SEO category
3. Ganti `canonical` & `og:url` ke domain produksi

## Rekomendasi

- Host landing marketing terpisah (Next.js) jika perlu SEO organik kuat
- Tambah `og:url` saat domain final tersedia
- Gambar OG 1200×630 di `public/og-image.png`