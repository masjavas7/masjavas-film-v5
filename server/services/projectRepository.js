import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/safeError.js';
import { getRuntimePaths } from '../utils/runtimePaths.js';

const getProjectsDir = () => getRuntimePaths().projectsDir;

// Helper to ensure the database directory exists
function ensureProjectsDir() {
  if (!fs.existsSync(getProjectsDir())) {
    fs.mkdirSync(getProjectsDir(), { recursive: true });
  }
}

export const projectRepository = {
  /**
   * Lists all projects in the workspace database.
   * Reads each JSON file and extracts metadata for the library view.
   * @returns {Array<object>} list of projects with metadata, sorted by lastOpenedAt/updatedAt desc
   */
  listProjects: () => {
    ensureProjectsDir();
    try {
      const files = fs.readdirSync(getProjectsDir()).filter(f => f.endsWith('.json') && !f.endsWith('.backup.json'));
      const projects = [];

      for (const file of files) {
        try {
          const filePath = path.join(getProjectsDir(), file);
          const rawData = fs.readFileSync(filePath, 'utf8');
          const p = JSON.parse(rawData);

          const scenes = p.scenes || [];
          const completedScenesCount = scenes.filter(s => s.status === 'Sudah digenerate' || s.status === 'Disetujui' || s.isGenerated).length;

          // Build a lightweight metadata summary for list views
          projects.push({
            id: p.id,
            title: p.title || p.projectName || 'Proyek Tanpa Nama',
            status: p.status || 'draft',
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
            lastOpenedAt: p.lastOpenedAt || p.updatedAt || new Date().toISOString(),
            aspectRatio: p.settings?.aspectRatio || p.aspectRatio || '16:9',
            sceneCount: scenes.length,
            completedScenes: completedScenesCount,
            thumbnailUrl: p.exportResult?.mp4Url || p.scenes?.[0]?.storyboardPanels?.[2]?.imageUrl || p.scenes?.[0]?.storyboardPanels?.[0]?.imageUrl || null
          });
        } catch (parseErr) {
          console.error(`[ProjectRepository] Failed to read or parse file ${file}:`, parseErr.message);
        }
      }

      // Sort by lastOpenedAt descending
      return projects.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());
    } catch (err) {
      console.error('[ProjectRepository] listProjects failed:', err);
      return [];
    }
  },

  /**
   * Retrieves a full project snapshot by ID.
   * @param {string} projectId 
   * @returns {object} full project JSON
   */
  getProject: (projectId) => {
    ensureProjectsDir();
    const filePath = path.join(getProjectsDir(), `${projectId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new AppError(`Project dengan ID ${projectId} tidak ditemukan.`, 404);
    }
    let rawData;
    try {
      rawData = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error(`[ProjectRepository] getProject failed for ${projectId}:`, err);
      throw new AppError('Gagal membaca data project dari server.', 500);
    }
    try {
      return JSON.parse(rawData);
    } catch (err) {
      console.error(`[ProjectRepository] JSON.parse failed for project ${projectId}:`, err);
      throw new AppError('Project tidak bisa dibuka. File project rusak atau belum lengkap.', 422);
    }
  },

  /**
   * Creates a new project entity with default settings.
   * @param {object} payload id, title, topic
   * @returns {object} newly created project
   */
  createProject: (payload) => {
    ensureProjectsDir();
    const { id, title, topic } = payload;
    if (!id) {
      throw new AppError('ID project diperlukan.', 400);
    }

    const newProject = {
      id,
      title: title || 'Proyek Cinematic Baru',
      topic: topic || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      settings: {
        aspectRatio: '16:9',
        orientation: 'landscape',
        resolutionPreset: '1920x1080',
        tone: 'Sinematik',
        style: 'Sinematik',
        platform: 'YouTube 16:9',
        totalScenes: 6,
        durationPerSceneSec: 10
      },
      story: {
        ideaText: topic || '',
        storyDraft: null,
        narration: '',
        opener: '',
        core: '',
        ending: '',
        projectContentHash: ''
      },
      references: [],
      manualReferences: [],
      scenes: [],
      exportResult: null
    };

    const filePath = path.join(getProjectsDir(), `${id}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(newProject, null, 2), 'utf8');
      console.log(`[ProjectRepository] Project created successfully: ${id}`);
      return newProject;
    } catch (err) {
      console.error('[ProjectRepository] createProject failed:', err);
      throw new AppError('Gagal membuat data project baru di server.', 500);
    }
  },

  /**
   * Updates light project parameters or metadata.
   * @param {string} projectId 
   * @param {object} patch 
   * @returns {object} updated project
   */
  updateProject: (projectId, patch) => {
    const project = projectRepository.getProject(projectId);
    const updated = {
      ...project,
      ...patch,
      title: patch.title || patch.projectName || project.title,
      updatedAt: new Date().toISOString()
    };

    const filePath = path.join(getProjectsDir(), `${projectId}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
      return updated;
    } catch (err) {
      console.error(`[ProjectRepository] updateProject failed for ${projectId}:`, err);
      throw new AppError('Gagal menyimpan pembaruan project.', 500);
    }
  },

  /**
   * Persists a complete JSON snapshot of the project flow and composer store state.
   * @param {string} projectId 
   * @param {object} snapshot 
   * @returns {object} saved snapshot
   */
  saveProjectSnapshot: (projectId, snapshot) => {
    ensureProjectsDir();
    const filePath = path.join(getProjectsDir(), `${projectId}.json`);
    const backupPath = path.join(getProjectsDir(), `${projectId}.backup.json`);

    // Tambahkan backup snapshot sebelum overwrite
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, backupPath);
        console.log(`[ProjectRepository] Backup created successfully: ${projectId}.backup.json`);
      } catch (backupErr) {
        console.error(`[ProjectRepository] Failed to create backup for ${projectId}:`, backupErr.message);
      }
    }

    // Ambil basis data yang sudah ada secara aman (corruption guard saat penulisan ulang)
    let project = { id: projectId, createdAt: new Date().toISOString() };
    if (fs.existsSync(filePath)) {
      try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        project = JSON.parse(rawData);
      } catch (err) {
        console.warn(`[ProjectRepository] Berkas proyek utama ${projectId}.json rusak/kosong saat snapshot. Timpa secara aman.`, err.message);
      }
    }

    const merged = {
      ...project,
      ...snapshot,
      id: projectId,
      updatedAt: new Date().toISOString()
    };

    // Ensure titles are mapped properly
    if (snapshot.projectName) {
      merged.title = snapshot.projectName;
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
      console.log(`[ProjectRepository] Snapshot saved successfully for project ${projectId}`);
      return merged;
    } catch (err) {
      console.error(`[ProjectRepository] saveProjectSnapshot failed for ${projectId}:`, err);
      throw new AppError('Gagal menulis snapshot project ke disk.', 500);
    }
  },

  /**
   * Physically deletes a project file from disk.
   * @param {string} projectId 
   * @returns {boolean} true if deleted
   */
  deleteProject: (projectId) => {
    ensureProjectsDir();
    const filePath = path.join(getProjectsDir(), `${projectId}.json`);
    const backupPath = path.join(getProjectsDir(), `${projectId}.backup.json`);
    if (!fs.existsSync(filePath)) {
      throw new AppError(`Project dengan ID ${projectId} tidak ditemukan.`, 404);
    }
    try {
      fs.unlinkSync(filePath);
      console.log(`[ProjectRepository] Project deleted from server: ${projectId}`);
      
      // Hapus juga file cadangan (backup) jika ada
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        console.log(`[ProjectRepository] Backup file deleted for project: ${projectId}`);
      }
      return true;
    } catch (err) {
      console.error(`[ProjectRepository] deleteProject failed for ${projectId}:`, err);
      throw new AppError('Gagal menghapus project dari server.', 500);
    }
  },

  /**
   * Updates lastOpenedAt timestamp.
   * @param {string} projectId 
   */
  touchProject: (projectId) => {
    ensureProjectsDir();
    try {
      const project = projectRepository.getProject(projectId);
      project.lastOpenedAt = new Date().toISOString();
      const filePath = path.join(getProjectsDir(), `${projectId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf8');
      console.log(`[ProjectRepository] Touched project ${projectId}`);
    } catch (err) {
      console.error(`[ProjectRepository] touchProject failed for ${projectId}:`, err);
    }
  },

  /**
   * Checks if a project file exists on disk.
   * @param {string} projectId 
   * @returns {boolean}
   */
  projectExists: (projectId) => {
    ensureProjectsDir();
    const filePath = path.join(getProjectsDir(), `${projectId}.json`);
    return fs.existsSync(filePath);
  },

  /**
   * Checks if a backup file exists on disk.
   * @param {string} projectId 
   * @returns {boolean}
   */
  backupExists: (projectId) => {
    ensureProjectsDir();
    const backupPath = path.join(getProjectsDir(), `${projectId}.backup.json`);
    return fs.existsSync(backupPath);
  },

  /**
   * Gets the last modified time of the backup file.
   * @param {string} projectId 
   * @returns {string|null} ISO timestamp or null
   */
  getBackupTime: (projectId) => {
    ensureProjectsDir();
    const backupPath = path.join(getProjectsDir(), `${projectId}.backup.json`);
    if (fs.existsSync(backupPath)) {
      try {
        return fs.statSync(backupPath).mtime.toISOString();
      } catch (err) {
        console.error(`[ProjectRepository] getBackupTime failed for ${projectId}:`, err);
        return null;
      }
    }
    return null;
  },

  /**
   * Restores a project from its .backup.json file.
   * @param {string} projectId 
   * @returns {object} restored project
   */
  restoreBackup: (projectId) => {
    ensureProjectsDir();
    const backupPath = path.join(getProjectsDir(), `${projectId}.backup.json`);
    const mainPath = path.join(getProjectsDir(), `${projectId}.json`);

    if (!fs.existsSync(backupPath)) {
      throw new AppError(`Berkas cadangan untuk proyek ${projectId} tidak ditemukan.`, 404);
    }

    try {
      fs.copyFileSync(backupPath, mainPath);
      console.log(`[ProjectRepository] Project restored from backup: ${projectId}`);
      // Load restored project
      const rawData = fs.readFileSync(mainPath, 'utf8');
      return JSON.parse(rawData);
    } catch (err) {
      console.error(`[ProjectRepository] restoreBackup failed for ${projectId}:`, err);
      throw new AppError('Gagal memulihkan berkas project dari backup.', 500);
    }
  },

  /**
   * Duplicates an existing project.
   * @param {string} projectId 
   * @returns {object} duplicated project
   */
  duplicateProject: (projectId) => {
    ensureProjectsDir();
    const project = projectRepository.getProject(projectId);
    const newId = `proj-${Date.now()}-${Math.round(Math.random() * 1e9).toString(36)}`;
    
    // Copy scenes and reset renderJobs/processing states
    const duplicatedScenes = (project.scenes || []).map(s => ({
      ...s,
      projectId: newId,
      isGenerated: false,
      previewVideoUrl: null,
      status: s.status === 'Sudah digenerate' || s.status === 'Disetujui' ? 'Siap dicek' : s.status
    }));

    // Suffix nomor duplikasi dinamis agar tidak bertabrakan
    const existing = projectRepository.listProjects();
    const baseTitle = project.title.replace(/\s\(Salinan(\s\d+)?\)$/, '');
    let dupIndex = 1;
    let newTitle = `${baseTitle} (Salinan)`;
    
    while (existing.some(p => p.title === newTitle)) {
      dupIndex++;
      newTitle = `${baseTitle} (Salinan ${dupIndex})`;
    }

    const duplicated = {
      ...project,
      id: newId,
      title: newTitle,
      projectName: newTitle,
      scenes: duplicatedScenes,
      exportResult: null, // Reset status ekspor agar user mengekspor ulang secara aman
      status: 'in_progress', // Revert status ke in_progress demi konsistensi workspace
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString()
    };

    const filePath = path.join(getProjectsDir(), `${newId}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(duplicated, null, 2), 'utf8');
      console.log(`[ProjectRepository] Project duplicated successfully: ${projectId} -> ${newId} (Title: ${newTitle})`);
      return duplicated;
    } catch (err) {
      console.error(`[ProjectRepository] duplicateProject failed for ${projectId}:`, err);
      throw new AppError('Gagal menduplikasi project.', 500);
    }
  }
};
