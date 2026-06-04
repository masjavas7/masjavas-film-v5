/**
 * exportQueueStore.js
 * In-memory store untuk melacak semua export jobs yang sedang berjalan.
 * Setiap job export berjalan secara asinkron di background.
 */

import { EventEmitter } from 'events';
import { projectRepository } from './projectRepository.js';

// Singleton store untuk semua active export jobs
const jobs = new Map(); // jobId -> JobState

export const exportQueueStore = new EventEmitter();

/**
 * Membuat job baru dan menyimpannya ke store serta project database.
 * @param {string} projectId
 * @returns {object} jobState awal
 */
exportQueueStore.createJob = (projectId) => {
  const jobId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const job = {
    jobId,
    projectId,
    status: 'queued',       // queued | processing | completed | failed | canceled
    progress: 0,            // 0-100
    currentStep: null,      // downloading | transcoding | concatenating | muxing | packaging
    stepDetails: null,
    errorDetails: null,
    mp4Url: null,
    subtitleUrl: null,
    packageZipUrl: null,
    manifestUrl: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    cancelRequested: false
  };
  jobs.set(jobId, job);

  // Persist to project JSON
  try {
    const project = projectRepository.getProject(projectId);
    const fileJobs = project.exportJobs || [];
    fileJobs.push(job);
    projectRepository.saveProjectSnapshot(projectId, { exportJobs: fileJobs });
  } catch (err) {
    console.warn(`[ExportQueue] Failed to persist new job ${jobId} to project storage:`, err.message);
  }

  console.log(`[ExportQueue] Job created: ${jobId} for project: ${projectId}`);
  return job;
};

/**
 * Mengambil job berdasarkan jobId, dengan opsi memuat dari project snapshot jika tidak ada di memori.
 * @param {string} jobId
 * @param {string} [projectId]
 * @returns {object|null}
 */
exportQueueStore.getJob = (jobId, projectId = null) => {
  if (jobs.has(jobId)) {
    return jobs.get(jobId);
  }

  if (projectId) {
    try {
      const project = projectRepository.getProject(projectId);
      const fileJobs = project.exportJobs || [];
      const foundJob = fileJobs.find(j => j.jobId === jobId);
      if (foundJob) {
        // Cek jika terinterupsi (server restart)
        if (foundJob.status === 'queued' || foundJob.status === 'processing') {
          foundJob.status = 'failed';
          foundJob.errorDetails = 'Ekspor terputus karena server di-restart (Interrupted).';
          foundJob.completedAt = new Date().toISOString();
          
          // Simpan kembali ke file
          projectRepository.saveProjectSnapshot(projectId, { exportJobs: fileJobs });
        }
        // Cache di memori
        jobs.set(jobId, foundJob);
        return foundJob;
      }
    } catch (err) {
      console.warn(`[ExportQueue] Failed to load job ${jobId} from project storage:`, err.message);
    }
  }

  return null;
};

/**
 * Mengambil semua jobs untuk suatu project dari database berkas.
 * @param {string} projectId
 * @returns {object[]}
 */
exportQueueStore.getJobsByProject = (projectId) => {
  let projectJobs = [];
  try {
    const project = projectRepository.getProject(projectId);
    projectJobs = project.exportJobs || [];

    // Deteksi job terinterupsi
    let hasUpdates = false;
    for (const job of projectJobs) {
      if ((job.status === 'queued' || job.status === 'processing') && !jobs.has(job.jobId)) {
        job.status = 'failed';
        job.errorDetails = 'Ekspor terputus karena server di-restart (Interrupted).';
        job.completedAt = new Date().toISOString();
        hasUpdates = true;
      }

      // Sync ke memory cache
      if (job.status === 'queued' || job.status === 'processing' || hasUpdates) {
        if (!jobs.has(job.jobId)) {
          jobs.set(job.jobId, job);
        }
      }
    }

    if (hasUpdates) {
      projectRepository.saveProjectSnapshot(projectId, { exportJobs: projectJobs });
    }
  } catch (err) {
    console.warn(`[ExportQueue] Failed to load jobs for project ${projectId} from storage:`, err.message);
  }

  // Gabungkan dengan data in-memory jika ada yang belum tercatat (fallback safety)
  for (const job of jobs.values()) {
    if (job.projectId === projectId && !projectJobs.some(pj => pj.jobId === job.jobId)) {
      projectJobs.push({ ...job });
    }
  }

  return projectJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Mengupdate state job di memori dan basis data berkas proyek.
 * @param {string} jobId
 * @param {object} updates
 */
exportQueueStore.updateJob = (jobId, updates) => {
  const existing = jobs.get(jobId);
  if (!existing) {
    console.warn(`[ExportQueue] Job not found for update: ${jobId}`);
    return null;
  }
  const updated = { ...existing, ...updates };
  jobs.set(jobId, updated);

  // Persist update to project JSON
  try {
    const project = projectRepository.getProject(updated.projectId);
    const fileJobs = project.exportJobs || [];
    const idx = fileJobs.findIndex(j => j.jobId === jobId);
    if (idx !== -1) {
      fileJobs[idx] = { ...fileJobs[idx], ...updates };
    } else {
      fileJobs.push(updated);
    }
    projectRepository.saveProjectSnapshot(updated.projectId, { exportJobs: fileJobs });
  } catch (err) {
    console.warn(`[ExportQueue] Failed to persist job update for ${jobId} to project storage:`, err.message);
  }

  exportQueueStore.emit('jobUpdate', updated);
  return updated;
};

/**
 * Menandai job sebagai processing dan update step serta progress.
 * @param {string} jobId
 * @param {string} step  
 * @param {number} progress
 * @param {string} [details]
 */
exportQueueStore.setProgress = (jobId, step, progress, details = null) => {
  return exportQueueStore.updateJob(jobId, {
    status: 'processing',
    currentStep: step,
    progress: Math.min(100, Math.max(0, progress)),
    stepDetails: details
  });
};

/**
 * Menandai job sebagai completed.
 * @param {string} jobId
 * @param {object} urls { mp4Url, subtitleUrl, packageZipUrl, manifestUrl }
 */
exportQueueStore.completeJob = (jobId, urls) => {
  return exportQueueStore.updateJob(jobId, {
    status: 'completed',
    progress: 100,
    currentStep: 'done',
    completedAt: new Date().toISOString(),
    ...urls
  });
};

/**
 * Menandai job sebagai failed.
 * @param {string} jobId
 * @param {string} errorDetails
 */
exportQueueStore.failJob = (jobId, errorDetails) => {
  return exportQueueStore.updateJob(jobId, {
    status: 'failed',
    errorDetails,
    completedAt: new Date().toISOString()
  });
};

/**
 * Meminta pembatalan job (cancel request flag).
 * Job worker harus cek flag ini dan berhenti jika true.
 * @param {string} jobId
 */
exportQueueStore.requestCancel = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return false;
  if (job.status === 'completed' || job.status === 'failed') return false;
  jobs.set(jobId, { ...job, cancelRequested: true });
  console.log(`[ExportQueue] Cancel requested for job: ${jobId}`);
  return true;
};

/**
 * Cek apakah cancel diminta untuk suatu job.
 * @param {string} jobId
 * @returns {boolean}
 */
exportQueueStore.isCancelRequested = (jobId) => {
  const job = jobs.get(jobId);
  return job ? job.cancelRequested : false;
};

/**
 * Hapus job dari store (cleanup setelah download).
 * @param {string} jobId
 */
exportQueueStore.removeJob = (jobId) => {
  jobs.delete(jobId);
};

export default exportQueueStore;
