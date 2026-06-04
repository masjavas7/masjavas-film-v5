/**
 * exportRoutes.js
 * 
 * Endpoint untuk sistem export asinkron berbasis job queue.
 * 
 * POST   /api/projects/:projectId/export/jobs       → Mulai export job baru
 * GET    /api/projects/:projectId/export/jobs/:jobId → Pantau status job
 * POST   /api/projects/:projectId/export/jobs/:jobId/cancel → Batalkan job
 * GET    /api/projects/:projectId/export/jobs/:jobId/downloads → URL download
 * 
 * Legacy:
 * POST   /api/projects/:projectId/export  → REAL-MVP sync export (tetap tersedia)
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { exportJobService } from '../services/exportJobService.js';
import { exportQueueStore } from '../services/exportQueueStore.js';
import { exportService } from '../services/exportService.js';
import { getRuntimePaths } from '../utils/runtimePaths.js';

const router = Router();

// ── Async Export Jobs API ──────────────────────────────────────────────────

/**
 * POST /api/projects/:projectId/export/jobs
 * Membuat dan memulai export job baru secara asinkron.
 * Body: { approvedSceneIds: string[], strategy?: string, includeSubtitle?: boolean }
 * Response: { jobId, status, progress, createdAt }
 */
router.post('/projects/:projectId/export/jobs', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      approvedSceneIds,
      strategy = 'fit_blur',
      includeSubtitle = true
    } = req.body;

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const job = exportJobService.startExportJob(
      projectId,
      { approvedSceneIds, strategy, includeSubtitle },
      baseUrl
    );

    res.status(202).json({
      jobId: job.jobId,
      projectId: job.projectId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/export/jobs/:jobId
 * Memantau status dan progres export job.
 * Response: { jobId, status, progress, currentStep, stepDetails, errorDetails, ... }
 */
router.get('/projects/:projectId/export/jobs/:jobId', async (req, res, next) => {
  try {
    const { projectId, jobId } = req.params;
    const job = exportQueueStore.getJob(jobId, projectId);

    if (!job) {
      return res.status(404).json({
        error: 'Export job tidak ditemukan.',
        jobId
      });
    }

    res.json({
      jobId: job.jobId,
      projectId: job.projectId,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      stepDetails: job.stepDetails,
      errorDetails: job.errorDetails,
      mp4Url: job.mp4Url,
      subtitleUrl: job.subtitleUrl,
      packageZipUrl: job.packageZipUrl,
      manifestUrl: job.manifestUrl,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/export/jobs/:jobId/cancel
 * Meminta pembatalan export job yang sedang berjalan.
 * Response: { status, jobId, message }
 */
router.post('/projects/:projectId/export/jobs/:jobId/cancel', async (req, res, next) => {
  try {
    const { projectId, jobId } = req.params;
    const job = exportQueueStore.getJob(jobId, projectId);

    if (!job) {
      return res.status(404).json({ error: 'Export job tidak ditemukan.', jobId });
    }

    if (job.status === 'completed' || job.status === 'canceled' || job.status === 'failed') {
      return res.json({
        status: job.status,
        jobId,
        message: `Job sudah dalam status ${job.status}, tidak bisa dibatalkan.`
      });
    }

    const requested = exportQueueStore.requestCancel(jobId);
    res.json({
      status: 'cancel_requested',
      jobId,
      message: requested
        ? 'Permintaan pembatalan berhasil dikirim. Job akan berhenti secepatnya.'
        : 'Gagal mengirim permintaan pembatalan.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/export/jobs/:jobId/downloads
 * Mendapatkan URL download aset setelah job selesai.
 * Response: { mp4Url, subtitleUrl, packageZipUrl, manifestUrl }
 */
router.get('/projects/:projectId/export/jobs/:jobId/downloads', async (req, res, next) => {
  try {
    const { projectId, jobId } = req.params;
    const job = exportQueueStore.getJob(jobId, projectId);

    if (!job) {
      return res.status(404).json({ error: 'Export job tidak ditemukan.', jobId });
    }

    if (job.status !== 'completed') {
      return res.status(409).json({
        error: `Job belum selesai. Status saat ini: ${job.status}`,
        status: job.status,
        progress: job.progress
      });
    }

    res.json({
      jobId: job.jobId,
      status: job.status,
      mp4Url: job.mp4Url,
      subtitleUrl: job.subtitleUrl,
      packageZipUrl: job.packageZipUrl,
      manifestUrl: job.manifestUrl,
      downloadUrl: job.mp4Url,
      completedAt: job.completedAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/export/jobs
 * Daftar semua export jobs untuk suatu project.
 */
router.get('/projects/:projectId/export/jobs', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const jobs = exportQueueStore.getJobsByProject(projectId);
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/export/cleanup
 * Membersihkan folder export dari job-job yang gagal/dibatalkan,
 * dan menghapus entri pekerjaan tersebut dari project snapshot.
 */
router.post('/projects/:projectId/export/cleanup', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const projectJobs = exportQueueStore.getJobsByProject(projectId);
    const keptJobs = [];
    let count = 0;

    for (const job of projectJobs) {
      if (job.status === 'failed' || job.status === 'canceled') {
        const exportsDir = path.join(getRuntimePaths().exportsDir, projectId, job.jobId);
        if (fs.existsSync(exportsDir)) {
          fs.rmSync(exportsDir, { recursive: true, force: true });
        }
        exportQueueStore.removeJob(job.jobId);
        count++;
      } else {
        keptJobs.push(job);
      }
    }

    // Update project snapshot
    const { projectRepository } = await import('../services/projectRepository.js');
    projectRepository.saveProjectSnapshot(projectId, { exportJobs: keptJobs });

    res.json({
      success: true,
      message: `Berhasil membersihkan ${count} pekerjaan ekspor yang gagal atau dibatalkan.`
    });
  } catch (error) {
    next(error);
  }
});

// ── Legacy Sync Export (backward compatibility) ────────────────────────────

/**
 * POST /api/projects/:projectId/export
 * Synchronous REAL-MVP export (backward compatible).
 */
router.post('/projects/:projectId/export', async (req, res, next) => {
  try {
    const approvedSceneIds = req.body.approvedSceneIds || ['scene-1', 'scene-2', 'scene-3'];
    const { includeSubtitle, includeEditPackage } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const result = await exportService.exportProject(req.params.projectId, {
      approvedSceneIds,
      includeSubtitle,
      includeEditPackage
    }, baseUrl);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/export/status
 * Status ekspor untuk backward compatibility.
 */
router.get('/projects/:projectId/export/status', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const jobs = exportQueueStore.getJobsByProject(projectId);
    const latestJob = jobs.length > 0 ? jobs[0] : null;

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      progress: latestJob?.progress ?? 100,
      status: latestJob?.status ?? 'idle',
      jobId: latestJob?.jobId,
      downloadUrl: latestJob?.mp4Url ?? `${baseUrl}/exports/${projectId}/final.mp4`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
