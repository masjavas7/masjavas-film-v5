# AI Features — MASJAVAS Film V5 v1.1.0

## Fitur yang tersedia

| Fitur | Endpoint / UI | Metode |
|-------|---------------|--------|
| Rekomendasi film/proyek | `GET /api/ai/recommendations`, Library | Scoring progress + recency |
| Pencarian natural language | `GET /api/ai/search`, Library `cari: ...` | Token matching pada narasi/judul |
| Ringkasan film | `GET /api/ai/projects/:id/summary`, Assistant | Ekstrak narasi + stat adegan |
| Klasifikasi genre | `GET /api/ai/projects/:id/genre` | Keyword heuristic 8 genre |
| Asisten chat | `POST /api/ai/chat`, `/assistant` | Intent routing |

## Contoh perintah asisten

- `rekomendasi proyek`
- `ringkas film ini` (perlu proyek aktif)
- `klasifikasi genre`
- `cari legenda jawa`

## Perluasan v1.2 (opsional)

- Integrasi GrokPI LLM untuk chat generatif penuh
- Embedding vector search (pgvector / sqlite-vec)
- Rekomendasi berbasis collaborative filtering