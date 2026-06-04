/**
 * sceneRenderQueueService.js
 * Backend service untuk multi-scene render queue.
 * Mengelola batch rendering video adegan secara paralel/sequential.
 */

// In-memory queue store per project
const projectQueues = new Map(); // projectId -> QueueState

/**
 * Status per scene dalam queue
 * @typedef {{ sceneId: string, status: string, progress: number, jobId: string|null, attempts: number, errorMessage: string|null }} SceneQueueItem
 */

export const sceneRenderQueueService = {

  /**
   * Membuat atau mendapatkan queue untuk suatu project.
   * @param {string} projectId
   * @returns {object} QueueState
   */
  getOrCreateQueue: (projectId) => {
    if (!projectQueues.has(projectId)) {
      projectQueues.set(projectId, {
        projectId,
        items: [],                     // SceneQueueItem[]
        status: 'idle',                // idle | running | paused | completed
        totalScenes: 0,
        completedScenes: 0,
        failedScenes: 0,
        startedAt: null,
        completedAt: null
      });
    }
    return projectQueues.get(projectId);
  },

  /**
   * Mengambil queue untuk suatu project.
   * @param {string} projectId
   * @returns {object|null}
   */
  getQueue: (projectId) => {
    return projectQueues.get(projectId) || null;
  },

  /**
   * Initialize atau reset queue dengan scene IDs baru.
   * @param {string} projectId
   * @param {string[]} sceneIds
   * @returns {object} QueueState baru
   */
  initQueue: (projectId, sceneIds) => {
    const queue = {
      projectId,
      items: sceneIds.map(sceneId => ({
        sceneId,
        status: 'queued',      // idle | queued | processing | completed | failed
        progress: 0,
        jobId: null,
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null
      })),
      status: 'running',
      totalScenes: sceneIds.length,
      completedScenes: 0,
      failedScenes: 0,
      startedAt: new Date().toISOString(),
      completedAt: null
    };
    projectQueues.set(projectId, queue);
    console.log(`[SceneRenderQueue] Queue initialized for project ${projectId}: ${sceneIds.length} scenes`);
    return queue;
  },

  /**
   * Update status item queue.
   * @param {string} projectId
   * @param {string} sceneId
   * @param {object} updates
   */
  updateItem: (projectId, sceneId, updates) => {
    const queue = projectQueues.get(projectId);
    if (!queue) return null;
    const item = queue.items.find(i => i.sceneId === sceneId);
    if (!item) return null;
    Object.assign(item, updates);

    // Recalculate totals
    queue.completedScenes = queue.items.filter(i => i.status === 'completed').length;
    queue.failedScenes = queue.items.filter(i => i.status === 'failed').length;

    const allDone = queue.completedScenes + queue.failedScenes === queue.totalScenes;
    if (allDone) {
      queue.status = queue.failedScenes > 0 ? 'completed_with_errors' : 'completed';
      queue.completedAt = new Date().toISOString();
    }

    return item;
  },

  /**
   * Tandai scene sebagai dimulai processing.
   * @param {string} projectId
   * @param {string} sceneId
   * @param {string} jobId
   */
  markProcessing: (projectId, sceneId, jobId = null) => {
    return sceneRenderQueueService.updateItem(projectId, sceneId, {
      status: 'processing',
      jobId,
      startedAt: new Date().toISOString()
    });
  },

  /**
   * Tandai scene sebagai completed.
   * @param {string} projectId
   * @param {string} sceneId
   */
  markCompleted: (projectId, sceneId) => {
    return sceneRenderQueueService.updateItem(projectId, sceneId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString()
    });
  },

  /**
   * Tandai scene sebagai failed.
   * @param {string} projectId
   * @param {string} sceneId
   * @param {string} errorMessage
   */
  markFailed: (projectId, sceneId, errorMessage) => {
    const queue = projectQueues.get(projectId);
    const item = queue?.items.find(i => i.sceneId === sceneId);
    const attempts = item ? item.attempts + 1 : 1;
    return sceneRenderQueueService.updateItem(projectId, sceneId, {
      status: 'failed',
      errorMessage,
      attempts,
      completedAt: new Date().toISOString()
    });
  },

  /**
   * Reset item yang failed untuk retry.
   * @param {string} projectId
   * @param {string} sceneId
   */
  retryItem: (projectId, sceneId) => {
    return sceneRenderQueueService.updateItem(projectId, sceneId, {
      status: 'queued',
      errorMessage: null,
      progress: 0
    });
  },

  /**
   * Hapus queue project.
   * @param {string} projectId
   */
  clearQueue: (projectId) => {
    projectQueues.delete(projectId);
  },

  /**
   * Hitung progres queue sebagai persentase.
   * @param {string} projectId
   * @returns {number} 0-100
   */
  getProgress: (projectId) => {
    const queue = projectQueues.get(projectId);
    if (!queue || queue.totalScenes === 0) return 0;
    return Math.round((queue.completedScenes / queue.totalScenes) * 100);
  }
};

export default sceneRenderQueueService;
