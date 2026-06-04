import { getApiBaseUrl } from "./apiBase";

export interface ExportJob {
  jobId: string;
  projectId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';
  progress: number;
  currentStep: string | null;
  stepDetails: string | null;
  errorDetails: string | null;
  mp4Url: string | null;
  subtitleUrl: string | null;
  packageZipUrl: string | null;
  manifestUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ExportJobStarted {
  jobId: string;
  projectId: string;
  status: string;
  progress: number;
  createdAt: string;
}

export type MediaHandlingStrategy = 'fit_blur' | 'crop_center' | 'letterbox';

export const exportService = {

  /**
   * Mulai export job baru secara asinkron.
   * @param projectId
   * @param approvedSceneIds
   * @param strategy - Strategi penanganan ratio mismatch
   * @returns ExportJobStarted
   */
  startExportJob: async (
    projectId: string,
    approvedSceneIds: string[],
    strategy: MediaHandlingStrategy = 'fit_blur'
  ): Promise<ExportJobStarted> => {
    const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/export/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedSceneIds, strategy, includeSubtitle: true })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Export gagal dimulai (HTTP ${response.status})`);
    }

    return await response.json();
  },

  /**
   * Pantau status export job.
   * @param projectId
   * @param jobId
   * @returns ExportJob
   */
  getJobStatus: async (projectId: string, jobId: string): Promise<ExportJob> => {
    const response = await fetch(
      `${getApiBaseUrl()}/api/projects/${projectId}/export/jobs/${jobId}`
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Gagal mendapatkan status job (HTTP ${response.status})`);
    }

    return await response.json();
  },

  /**
   * Batalkan export job yang sedang berjalan.
   * @param projectId
   * @param jobId
   */
  cancelJob: async (projectId: string, jobId: string): Promise<{ status: string; message: string }> => {
    const response = await fetch(
      `${getApiBaseUrl()}/api/projects/${projectId}/export/jobs/${jobId}/cancel`,
      { method: "POST" }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Gagal membatalkan job (HTTP ${response.status})`);
    }

    return await response.json();
  },

  /**
   * Dapatkan URL download setelah job selesai.
   * @param projectId
   * @param jobId
   */
  getDownloadUrls: async (projectId: string, jobId: string): Promise<{
    mp4Url: string;
    subtitleUrl: string;
    packageZipUrl: string;
    manifestUrl: string;
    downloadUrl: string;
  }> => {
    const response = await fetch(
      `${getApiBaseUrl()}/api/projects/${projectId}/export/jobs/${jobId}/downloads`
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Download URLs tidak tersedia (HTTP ${response.status})`);
    }

    return await response.json();
  },

  /**
   * Polling helper — poll status sampai selesai atau gagal.
   * @param projectId
   * @param jobId
   * @param onProgress - callback setiap update progress
   * @param intervalMs - interval polling dalam ms (default 2000)
   * @returns ExportJob final
   */
  pollJobUntilDone: async (
    projectId: string,
    jobId: string,
    onProgress?: (job: ExportJob) => void,
    intervalMs = 2000
  ): Promise<ExportJob> => {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await exportService.getJobStatus(projectId, jobId);
          if (onProgress) onProgress(job);

          if (job.status === 'completed') {
            return resolve(job);
          }
          if (job.status === 'failed') {
            return reject(new Error(job.errorDetails || 'Export gagal'));
          }
          if (job.status === 'canceled') {
            return reject(new Error('Export dibatalkan'));
          }

          // Still running — poll again
          setTimeout(poll, intervalMs);
        } catch (err) {
          reject(err);
        }
      };
      poll();
    });
  },

  /**
   * Mendapatkan daftar semua export jobs untuk suatu project.
   * @param projectId
   * @returns {Promise<{ jobs: ExportJob[] }>}
   */
  getJobs: async (projectId: string): Promise<{ jobs: ExportJob[] }> => {
    const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/export/jobs`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Gagal mengambil daftar pekerjaan ekspor (HTTP ${response.status})`);
    }
    return await response.json();
  },

  /**
   * Bersihkan folder pekerjaan ekspor yang gagal atau dibatalkan.
   * @param projectId
   * @returns {Promise<{ success: boolean; message: string }>}
   */
  cleanupJobs: async (projectId: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/export/cleanup`, {
      method: "POST"
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Gagal membersihkan folder ekspor (HTTP ${response.status})`);
    }
    return await response.json();
  },

  // ── Legacy API (backward compatibility) ──────────────────────────────────
  
  exportProjectVideo: async (
    projectId: string,
    approvedSceneIds: string[]
  ): Promise<{ mp4Url: string; subtitleUrl: string; packageZipUrl: string; manifestUrl: string }> => {
    const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedSceneIds, includeSubtitle: true, includeEditPackage: true })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Export gagal (HTTP ${response.status})`);
    }

    return await response.json();
  },

  getExportStatus: async (projectId: string): Promise<{ progress: number; downloadUrl?: string }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/export/status`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in getExportStatus:", error);
      return { progress: 100 };
    }
  }
};
