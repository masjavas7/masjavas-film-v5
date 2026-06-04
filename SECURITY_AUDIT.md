# Security Audit — MASJAVAS Film V5

**Tanggal:** 2026-06-04  
**Versi:** 1.0.0  
**Auditor:** Automated + manual review (release preparation)

## Ringkasan

| Severity | Jumlah | Status |
|----------|--------|--------|
| Critical | 2 | Mitigated |
| High | 3 | Mitigated |
| Medium | 4 | Mitigated / documented |
| Low | 2 | Accepted risk (desktop local) |

## Ruang lingkup audit

- `server/`, `src/`, `desktop/`, `scratch/`
- `.env`, `.env.*`, `server/config.json`
- `docs/`, `backup/`, `logs/` (jika ada)
- Riwayat Git remote: https://github.com/masjavas7/masjavas-film-v5

## Temuan & tindakan

### CRITICAL-01: Kunci API di file lokal

| Lokasi | Jenis |
|--------|--------|
| `server/.env` | GROKPI_API_KEY |
| `server/config.json` | geminiApiKey (lokal) |
| `server/temp/desktop_qa_userdata/config.json` | apiKey + geminiApiKey |

**Tindakan:**
- Semua path di atas ada di `.gitignore`
- `server/config.json` disanitasi (kunci dikosongkan)
- `server/config.json.example` dan `server/.env.example` sebagai template
- **Rotasi wajib** untuk kunci yang pernah ada di chat, docs, atau commit lama

### CRITICAL-02: Kunci di skrip QA (`scratch/*.ps1`)

**Sebelum:** hardcoded GCP/GrokPI keys  
**Sesudah:** `$env:GEMINI_API_KEY` / `$env:GROKPI_API_KEY`  
**Git history:** commit awal sudah dibersihkan sebelum push publik

### HIGH-01: Debug endpoints

**Risiko:** ekspos runtime path, buka folder logs  
**Mitigasi:** `server/middleware/localOnly.js` — hanya loopback

### HIGH-02: Upload file arbitrer

**Mitigasi:** filter MIME/extension gambar, max 10 MB, body JSON 2 MB

### HIGH-03: `open-logs` command injection

**Mitigasi:** `execFile` + validasi path di bawah `userDataDir`

### MEDIUM-01: CORS terbuka

**Konteks:** desktop lokal + dev; API tidak dirancang untuk internet publik tanpa reverse proxy + auth  
**Rekomendasi produksi:** batasi origin di reverse proxy (nginx)

### MEDIUM-02: File `docs/api key default aplikasi.txt`

**Status:** dihapus, pola di `.gitignore`

### MEDIUM-03: Laporan internal menyebut prefix kunci

**Status:** `provider_evidence_report.md` dimask

### MEDIUM-04: Token GitHub di chat

**Tindakan:** revoke token, gunakan GitHub Secrets untuk CI

## Pola yang dipindai

```
API_KEY, TOKEN, SECRET, PASSWORD, GITHUB_TOKEN,
GEMINI_API_KEY, GROKPI_API_KEY, GROK_API_KEY,
gf-*, sk-*, ghp_*, AIza*, AQ.Ab*
```

## `.gitignore` (secrets & runtime)

```
.env, .env.*, server/.env, server/config.json
backup/, **/logs/, credentials.json, *.pem
docs/**/*api*key*, server/temp/, server/uploads/
```

## Checklist rotasi secret

- [ ] GrokPI API key (panel masjavas)
- [ ] Gemini API key (Google AI Studio)
- [ ] GitHub PAT (jika pernah dibagikan)
- [ ] Regenerasi `server/.env` dari `.env.example`

## Verifikasi history Git

```bash
git log --all -S "gf-fc8e" --oneline
git log --all -S "AQ.Ab8" --oneline
```

Jika ada hash di remote, gunakan `git filter-repo` atau commit baru tanpa secret (sudah dilakukan untuk branch `main` publik).

## Rekomendasi lanjutan

1. GitHub Secret Scanning + Dependabot (aktif di repo publik)
2. Pre-commit hook: `gitleaks` / `trufflehog`
3. Jangan commit `server/data/projects/*.json` produksi (pertimbangkan gitignore untuk data QA)