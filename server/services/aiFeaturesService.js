import { projectRepository } from './projectRepository.js';

const GENRE_KEYWORDS = {
  'Drama Sejarah': ['legenda', 'kerajaan', 'prambanan', 'sejarah', 'jawa', 'kuno', 'pangeran', 'putri'],
  'Fantasi': ['jin', 'sihir', 'gaib', 'dragon', 'magic', 'fantasi'],
  'Horor': ['hantu', 'seram', 'malam', 'kutukan', 'menakutkan'],
  'Komedi': ['lucu', 'humor', 'kocak'],
  'Aksi': ['perang', 'bertarung', 'kejar', 'aksi', 'battle'],
  'Romantis': ['cinta', 'romantis', 'hati', 'rindu'],
  'Dokumenter': ['fakta', 'edukasi', 'penjelasan', 'dokumenter'],
  'Sci-Fi': ['masa depan', 'robot', 'luar angkasa', 'sci-fi', 'teknologi']
};

function projectTextBlob(project) {
  return [
    project.title,
    project.projectName,
    project.topic,
    project.ideaText,
    project.narration,
    project.story?.ideaText,
    project.story?.narration
  ].filter(Boolean).join(' ').toLowerCase();
}

function completionScore(project) {
  const scenes = project.scenes || [];
  if (!scenes.length) return 0;
  const done = scenes.filter(
    (s) => s.isGenerated || s.status === 'Sudah digenerate' || s.status === 'Disetujui'
  ).length;
  return done / scenes.length;
}

export function classifyGenre(project) {
  const text = projectTextBlob(project);
  let best = { genre: 'Drama Umum', score: 0 };

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => (text.includes(kw) ? acc + 1 : acc), 0);
    if (score > best.score) best = { genre, score };
  }

  const confidence = best.score > 0 ? Math.min(0.95, 0.45 + best.score * 0.12) : 0.35;
  return { genre: best.genre, confidence: Number(confidence.toFixed(2)), method: 'keyword-heuristic' };
}

export function summarizeFilm(project) {
  const title = project.title || project.projectName || 'Proyek Tanpa Nama';
  const narration = project.narration || project.story?.narration || project.ideaText || '';
  const scenes = project.scenes || [];
  const genre = classifyGenre(project);
  const excerpt = narration.length > 280 ? `${narration.slice(0, 277)}...` : narration;

  return {
    title,
    genre: genre.genre,
    sceneCount: scenes.length,
    completionPercent: Math.round(completionScore(project) * 100),
    summary: excerpt || `Proyek "${title}" masih dalam tahap pengembangan narasi.`,
    bullets: [
      `Genre terdeteksi: ${genre.genre}`,
      `${scenes.length} adegan direncanakan`,
      `Progress generate: ${Math.round(completionScore(project) * 100)}%`
    ]
  };
}

export function recommendFilms(limit = 5) {
  const list = projectRepository.listProjects();
  const enriched = list.map((meta) => {
    let full = null;
    try {
      full = projectRepository.getProject(meta.id);
    } catch {
      full = null;
    }
    const completion = full ? completionScore(full) : meta.completedScenes / Math.max(meta.sceneCount, 1);
    const recency = new Date(meta.lastOpenedAt || meta.updatedAt).getTime();
    const score = completion * 0.5 + (recency / 1e13) * 0.3 + (meta.sceneCount > 0 ? 0.2 : 0);
    return { ...meta, score, genre: full ? classifyGenre(full).genre : 'Drama Umum' };
  });

  return enriched
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...rest }) => ({ ...rest, recommendationScore: Number(score.toFixed(3)) }));
}

export function naturalLanguageSearch(query, limit = 20) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  const list = projectRepository.listProjects();

  return list
    .map((meta) => {
      let full = null;
      try {
        full = projectRepository.getProject(meta.id);
      } catch {
        full = { title: meta.title };
      }
      const haystack = projectTextBlob(full) + ' ' + (meta.title || '').toLowerCase();
      const matches = tokens.filter((t) => haystack.includes(t)).length;
      const relevance = tokens.length ? matches / tokens.length : 0;
      return { ...meta, relevance, matchedTokens: matches };
    })
    .filter((p) => p.relevance > 0 || (q.length <= 2 && (p.title || '').toLowerCase().includes(q)))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

export function assistantReply(message, projectId = null) {
  const text = (message || '').trim().toLowerCase();
  let project = null;
  if (projectId) {
    try {
      project = projectRepository.getProject(projectId);
    } catch { /* ignore */ }
  }

  if (text.includes('rekomendasi') || text.includes('recommend')) {
    return {
      reply: 'Berikut proyek yang paling siap dilanjutkan berdasarkan progress dan aktivitas terakhir.',
      data: { recommendations: recommendFilms(3) }
    };
  }

  if (text.includes('ringkas') || text.includes('summary') || text.includes('sinopsis')) {
    if (!project) {
      return { reply: 'Buka atau pilih proyek aktif terlebih dahulu agar saya bisa membuat ringkasan.' };
    }
    const summary = summarizeFilm(project);
    return {
      reply: `Ringkasan "${summary.title}": ${summary.summary}`,
      data: { summary }
    };
  }

  if (text.includes('genre') || text.includes('klasifikasi')) {
    if (!project) {
      return { reply: 'Pilih proyek untuk klasifikasi genre otomatis.' };
    }
    const g = classifyGenre(project);
    return {
      reply: `Genre terdeteksi: ${g.genre} (confidence ${Math.round(g.confidence * 100)}%).`,
      data: { classification: g }
    };
  }

  if (text.includes('cari ') || text.startsWith('search ')) {
    const q = text.replace(/^(cari|search)\s+/, '');
    const results = naturalLanguageSearch(q, 5);
    return {
      reply: results.length
        ? `Ditemukan ${results.length} proyek yang relevan dengan "${q}".`
        : `Tidak ada proyek yang cocok dengan "${q}".`,
      data: { results }
    };
  }

  if (text.includes('storyboard')) {
    return {
      reply: 'Storyboard dibuat otomatis per adegan. Buka menu Adegan, selesaikan checklist, lalu generate video per adegan.'
    };
  }

  return {
    reply: 'Saya bisa membantu: rekomendasi proyek, ringkasan film, klasifikasi genre, atau pencarian natural (contoh: "cari legenda jawa"). Apa yang ingin Anda lakukan?'
  };
}

export const aiFeaturesService = {
  classifyGenre,
  summarizeFilm,
  recommendFilms,
  naturalLanguageSearch,
  assistantReply
};