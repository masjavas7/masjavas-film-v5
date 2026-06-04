import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initRuntimePaths } from '../../server/utils/runtimePaths.js';
import { projectRepository, invalidateProjectListCache } from '../../server/services/projectRepository.js';

const testDir = path.join(os.tmpdir(), `masjavas-test-${Date.now()}`);

describe('projectRepository', () => {
  beforeAll(() => {
    initRuntimePaths(testDir);
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('lists projects with cache invalidation', () => {
    const id = `proj-test-${Date.now()}`;
    projectRepository.saveProjectSnapshot(id, {
      projectName: 'Test Film',
      scenes: []
    });
    invalidateProjectListCache();
    const list = projectRepository.listProjects();
    expect(list.some((p) => p.id === id)).toBe(true);
    const cached = projectRepository.listProjects();
    expect(cached).toEqual(list);
  });
});