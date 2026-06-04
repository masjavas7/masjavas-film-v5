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

  it('creates, updates, touches, duplicates, restores, and deletes', () => {
    const id = `proj-crud-${Date.now()}`;
    const created = projectRepository.createProject({ id, title: 'CRUD Film', topic: 'test' });
    expect(created.id).toBe(id);
    expect(projectRepository.projectExists(id)).toBe(true);

    projectRepository.updateProject(id, { title: 'CRUD Updated' });
    const loaded = projectRepository.getProject(id);
    expect(loaded.title).toBe('CRUD Updated');

    projectRepository.touchProject(id);
    projectRepository.saveProjectSnapshot(id, { scenes: [{ id: 's1', status: 'draft' }] });
    expect(projectRepository.backupExists(id)).toBe(true);
    expect(projectRepository.getBackupTime(id)).toBeTruthy();

    const dup = projectRepository.duplicateProject(id);
    expect(dup.id).not.toBe(id);
    expect(projectRepository.projectExists(dup.id)).toBe(true);

    projectRepository.restoreBackup(id);
    projectRepository.deleteProject(dup.id);
    projectRepository.deleteProject(id);
    expect(projectRepository.projectExists(id)).toBe(false);
  });

  it('throws when project is missing', () => {
    expect(() => projectRepository.getProject('missing-proj-xyz')).toThrow();
    expect(() => projectRepository.deleteProject('missing-proj-xyz')).toThrow();
  });
});