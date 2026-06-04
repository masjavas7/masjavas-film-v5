import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initRuntimePaths } from '../../server/utils/runtimePaths.js';
import { projectRepository } from '../../server/services/projectRepository.js';
import {
  classifyGenre,
  summarizeFilm,
  naturalLanguageSearch,
  assistantReply,
  recommendFilms
} from '../../server/services/aiFeaturesService.js';

const testDir = path.join(os.tmpdir(), `masjavas-ai-${Date.now()}`);

describe('aiFeaturesService', () => {
  beforeAll(() => {
    initRuntimePaths(testDir);
    projectRepository.saveProjectSnapshot('ai-test-1', {
      projectName: 'Legenda Prambanan',
      ideaText: 'roro jonggrang legenda jawa kerajaan',
      narration: 'Di kerajaan kuno Prambanan...',
      scenes: [{ id: 's1', status: 'draft' }]
    });
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('classifies historical drama', () => {
    const p = projectRepository.getProject('ai-test-1');
    const g = classifyGenre(p);
    expect(g.genre).toBe('Drama Sejarah');
  });

  it('summarizes film metadata', () => {
    const p = projectRepository.getProject('ai-test-1');
    const s = summarizeFilm(p);
    expect(s.title).toContain('Legenda');
    expect(s.sceneCount).toBe(1);
  });

  it('natural language search finds project', () => {
    const results = naturalLanguageSearch('legenda jawa');
    expect(results.some((r) => r.id === 'ai-test-1')).toBe(true);
  });

  it('assistant handles recommendation intent', () => {
    const r = assistantReply('berikan rekomendasi proyek');
    expect(r.reply).toBeTruthy();
    expect(r.data?.recommendations).toBeDefined();
  });

  it('recommendFilms returns array', () => {
    const recs = recommendFilms(5);
    expect(Array.isArray(recs)).toBe(true);
  });

  it('assistant handles summary and genre with active project', () => {
    const summary = assistantReply('ringkas film ini', 'ai-test-1');
    expect(summary.data?.summary).toBeDefined();
    const genre = assistantReply('klasifikasi genre', 'ai-test-1');
    expect(genre.data?.classification?.genre).toBeTruthy();
  });

  it('assistant prompts when project missing for summary/genre', () => {
    const noSummary = assistantReply('ringkas film ini');
    expect(noSummary.reply).toContain('proyek');
    const noGenre = assistantReply('klasifikasi genre');
    expect(noGenre.reply).toContain('Pilih proyek');
  });

  it('assistant handles search and fallback intents', () => {
    const search = assistantReply('cari legenda jawa');
    expect(search.data?.results).toBeDefined();
    const storyboard = assistantReply('bantu storyboard');
    expect(storyboard.reply).toContain('Storyboard');
    const fallback = assistantReply('halo');
    expect(fallback.reply).toContain('rekomendasi');
  });
});