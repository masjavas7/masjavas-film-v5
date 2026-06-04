# Bug Report — MASJAVAS Film V5 v1.0.0

## Status ringkas

| Area | Ditemukan | Diperbaiki | Terbuka |
|------|-----------|------------|---------|
| Frontend | 4 | 3 | 1 |
| Backend | 3 | 3 | 0 |
| Security | 5 | 5 | 0 |

## Frontend

### BUG-F01: Bundle awal besar (semua halaman di-import statis)

**Severity:** Medium  
**Status:** Fixed (v1.0.0)  
**Fix:** `React.lazy` + `Suspense` di `src/App.tsx`

### BUG-F02: Video preview tanpa `preload`

**Severity:** Low  
**Status:** Fixed  
**Fix:** `preload="metadata"` + `playsInline` di `PreviewPage.tsx`

### BUG-F03: Mobile sidebar

**Severity:** Low  
**Status:** Open (minor)  
**Catatan:** `AppShell` sudah punya `isMobileOpen`; uji manual di viewport < 768px disarankan

### BUG-F04: HashRouter deep link

**Severity:** Info  
**Status:** Accepted  
**Catatan:** By design untuk Electron `file://` compatibility

## Backend

### BUG-B01: Health endpoint tidak standar

**Status:** Fixed — `GET /health` mengembalikan `status`, `database`, `version`

### BUG-B02: `listProjects` baca disk setiap request

**Status:** Fixed — cache TTL 5 detik + invalidasi pada save

### BUG-B03: Server exit tanpa API key di dev

**Status:** Mitigated — `NODE_ENV=test` / desktop mode tidak hard-exit

## Cara melaporkan bug baru

Gunakan template di `MASJAVAS_AI_RC1_INTERNAL_TEST/BUG_REPORT_TEMPLATE.md`.