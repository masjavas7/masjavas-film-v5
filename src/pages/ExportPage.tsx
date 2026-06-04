import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, FolderOpen, Video, AlertTriangle, Loader2,
  CheckCircle2, XCircle, Layers, RefreshCcw
} from "lucide-react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { Stepper } from "../components/ui/Stepper";
import { DownloadCard } from "../components/shared/PrimitiveBlocks";
import { MediaHandlingModal } from "../components/shared/MediaHandlingModal";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { useSceneComposerStore } from "../stores/sceneComposerStore";
import { exportService, ExportJob, MediaHandlingStrategy } from "../services/exportService";
import { cn } from "../utils";

// ── Step labels for progress UI ───────────────────────────────────────────

const EXPORT_STEPS: Record<string, { label: string; index: number }> = {
  checking:      { label: "Memeriksa FFmpeg", index: 0 },
  downloading:   { label: "Mengunduh Video Adegan", index: 1 },
  subtitles:     { label: "Membuat Subtitle", index: 2 },
  transcoding:   { label: "Transkoding & Ratio-Fit", index: 3 },
  concatenating: { label: "Menggabungkan Adegan", index: 4 },
  muxing:        { label: "Normalisasi Audio", index: 5 },
  packaging:     { label: "Mempaketkan Aset", index: 6 },
  done:          { label: "Ekspor Selesai!", index: 7 }
};

const STEP_ICONS = ["🔍", "⬇️", "📝", "🎬", "🔗", "🔊", "📦", "✅"];

// ── ExportPage ────────────────────────────────────────────────────────────

export const ExportPage: React.FC = () => {
  const navigate = useNavigate();
  const { setStep, activeProjectId, exportResult, setExportResult } = useProjectFlowStore();
  const { scenes } = useSceneComposerStore();

  const projectAspectRatio = useProjectFlowStore((state) => state.aspectRatio);
  const resolutionPreset = useProjectFlowStore((state) => state.resolutionPreset);

  // ── Local state ──────────────────────────────────────────────────────────

  const [activeJob, setActiveJob] = React.useState<ExportJob | null>(null);
  const [isStarting, setIsStarting] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [showMediaModal, setShowMediaModal] = React.useState(false);
  const [pollingRef] = React.useState<{ intervalId: any }>({ intervalId: null });
  const [isLoadingJobs, setIsLoadingJobs] = React.useState(true);
  const [jobHistory, setJobHistory] = React.useState<ExportJob[]>([]);
  const [isCleaning, setIsCleaning] = React.useState(false);

  // ── Derived state ────────────────────────────────────────────────────────

  const mapRatio = (ar: string) => {
    if (!ar) return "16:9";
    const match = ar.match(/(\d+:\d+)/);
    if (match) return match[1];
    const normalized = ar.toLowerCase().trim();
    if (normalized.includes("widescreen") || normalized.includes("landscape")) return "16:9";
    if (normalized.includes("vertical") || normalized.includes("vertikal") || normalized.includes("portrait")) return "9:16";
    if (normalized.includes("square") || normalized.includes("kotak")) return "1:1";
    return "16:9";
  };

  const projectRatioClean = mapRatio(projectAspectRatio);

  const allApproved =
    scenes.length > 0 &&
    scenes.every((s) => s.status === "Sudah digenerate" || s.status === "Disetujui");

  const hasSceneRatioMismatch = scenes.some((s) => {
    const sceneRatio = mapRatio(s.aspectRatio || s.videoSettings?.aspectRatio || "16:9");
    const videoRatio = mapRatio(s.videoSettings?.aspectRatio || "16:9");
    return sceneRatio !== projectRatioClean || videoRatio !== projectRatioClean;
  });

  const hasReviewWarning = scenes.some(
    (s) => s.requiresReview || s.compressionMode === "template_fallback"
  );

  const hasSkippedAudio = React.useMemo(() => {
    return scenes.some((s) => s.status === "skipped" || s.audioArtifact?.status === "skipped");
  }, [scenes]);

  const totalDuration = scenes.length * 10;

  const isJobActive = activeJob?.status === "queued" || activeJob?.status === "processing";
  const isJobDone = activeJob?.status === "completed";
  const isJobFailed = activeJob?.status === "failed";
  const isJobCanceled = activeJob?.status === "canceled";

  const currentStepInfo = activeJob?.currentStep
    ? EXPORT_STEPS[activeJob.currentStep] ?? { label: activeJob.currentStep, index: 0 }
    : null;

  // ── Polling effect ───────────────────────────────────────────────────────

  const startPolling = React.useCallback((projectId: string, jobId: string) => {
    if (pollingRef.intervalId) clearInterval(pollingRef.intervalId);

    pollingRef.intervalId = setInterval(async () => {
      try {
        const job = await exportService.getJobStatus(projectId, jobId);
        setActiveJob(job);

        if (job.status === "completed") {
          clearInterval(pollingRef.intervalId);
          pollingRef.intervalId = null;
          // Sync export result to global store
          if (job.mp4Url) {
            setExportResult({
              mp4Url: job.mp4Url,
              subtitleUrl: job.subtitleUrl || "",
              packageZipUrl: job.packageZipUrl || "",
              manifestUrl: job.manifestUrl || ""
            });
          }
          // Refresh job list
          const { jobs } = await exportService.getJobs(projectId);
          setJobHistory(jobs);
        } else if (job.status === "failed" || job.status === "canceled") {
          clearInterval(pollingRef.intervalId);
          pollingRef.intervalId = null;
          if (job.status === "failed") {
            setExportError(job.errorDetails || "Ekspor gagal. Silakan coba lagi.");
          }
          // Refresh job list
          const { jobs } = await exportService.getJobs(projectId);
          setJobHistory(jobs);
        }
      } catch (err) {
        console.error("[ExportPage] Polling error:", err);
      }
    }, 2000); // Poll every 2 seconds
  }, [pollingRef, setExportResult]);

  // Load persisted job history and resume polling if necessary
  React.useEffect(() => {
    const loadJobs = async () => {
      if (!activeProjectId) return;
      try {
        setIsLoadingJobs(true);
        const { jobs } = await exportService.getJobs(activeProjectId);
        setJobHistory(jobs);

        // Find the latest job
        const latestJob = jobs[0] || null; // API returns sorted by createdAt desc
        if (latestJob) {
          setActiveJob(latestJob);

          if (latestJob.status === "queued" || latestJob.status === "processing") {
            startPolling(activeProjectId, latestJob.jobId);
          } else if (latestJob.status === "completed") {
            if (latestJob.mp4Url) {
              setExportResult({
                mp4Url: latestJob.mp4Url,
                subtitleUrl: latestJob.subtitleUrl || "",
                packageZipUrl: latestJob.packageZipUrl || "",
                manifestUrl: latestJob.manifestUrl || ""
              });
            }
          } else if (latestJob.status === "failed") {
            setExportError(latestJob.errorDetails || "Ekspor gagal atau terputus.");
          }
        }
      } catch (err: any) {
        console.error("[ExportPage] Gagal memuat daftar pekerjaan ekspor:", err);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    loadJobs();
  }, [activeProjectId, startPolling, setExportResult]);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingRef.intervalId) {
        clearInterval(pollingRef.intervalId);
      }
    };
  }, [pollingRef]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStartExport = async (strategy: MediaHandlingStrategy = "fit_blur") => {
    setShowMediaModal(false);
    setIsStarting(true);
    setExportError(null);
    setActiveJob(null);

    try {
      const approvedIds = scenes
        .filter((s) => s.status === "Sudah digenerate" || s.status === "Disetujui")
        .map((s) => s.id);

      const started = await exportService.startExportJob(activeProjectId, approvedIds, strategy);
      
      // Create initial job state
      const initialJob: ExportJob = {
        jobId: started.jobId,
        projectId: started.projectId,
        status: "queued",
        progress: 0,
        currentStep: null,
        stepDetails: null,
        errorDetails: null,
        mp4Url: null,
        subtitleUrl: null,
        packageZipUrl: null,
        manifestUrl: null,
        createdAt: started.createdAt,
        completedAt: null
      };
      setActiveJob(initialJob);

      // Refresh job history
      try {
        const { jobs } = await exportService.getJobs(activeProjectId);
        setJobHistory(jobs);
      } catch (err) {
        // ignore error refreshing history
      }

      startPolling(activeProjectId, started.jobId);
    } catch (err: any) {
      setExportError(err.message || "Gagal memulai ekspor. Coba lagi.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelExport = async () => {
    if (!activeJob || !isJobActive) return;
    setIsCanceling(true);
    try {
      await exportService.cancelJob(activeProjectId, activeJob.jobId);
      setActiveJob(prev => prev ? { ...prev, status: "canceled" } : null);
      if (pollingRef.intervalId) {
        clearInterval(pollingRef.intervalId);
        pollingRef.intervalId = null;
      }
      // Refresh job list
      const { jobs } = await exportService.getJobs(activeProjectId);
      setJobHistory(jobs);
    } catch (err: any) {
      console.error("[ExportPage] Cancel failed:", err.message);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCleanup = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus data dan folder untuk semua ekspor yang gagal atau dibatalkan?")) {
      return;
    }
    setIsCleaning(true);
    try {
      const res = await exportService.cleanupJobs(activeProjectId);
      alert(res.message);
      // Reload jobs
      const { jobs } = await exportService.getJobs(activeProjectId);
      setJobHistory(jobs);
      // Reset active job if it was failed or canceled since it is now deleted from db
      if (activeJob && (activeJob.status === "failed" || activeJob.status === "canceled")) {
        setActiveJob(null);
        setExportError(null);
      }
    } catch (err: any) {
      alert(err.message || "Gagal membersihkan folder ekspor.");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleOpenExportModal = () => {
    if (!allApproved) {
      alert("Masih ada adegan yang belum disetujui atau belum memiliki video.");
      return;
    }
    if (hasSceneRatioMismatch) {
      // Show media handling modal to choose strategy
      setShowMediaModal(true);
    } else {
      // No mismatch — skip modal, use fit_blur as default
      handleStartExport("fit_blur");
    }
  };

  // Auto-trigger export if all approved and no active job/history on first load
  const hasTriggeredRef = React.useRef(false);
  React.useEffect(() => {
    if (isLoadingJobs) return;
    if (
      allApproved &&
      !hasSceneRatioMismatch &&
      !activeJob &&
      !isStarting &&
      !exportResult &&
      !hasTriggeredRef.current
    ) {
      hasTriggeredRef.current = true;
      handleStartExport("fit_blur");
    }
  }, [isLoadingJobs, allApproved, hasSceneRatioMismatch, activeJob, isStarting, exportResult]);

  // ── Download handlers ─────────────────────────────────────────────────────

  const getUrls = () => {
    if (activeJob?.status === "completed") {
      return {
        mp4: activeJob.mp4Url,
        srt: activeJob.subtitleUrl,
        zip: activeJob.packageZipUrl
      };
    }
    if (exportResult) {
      return {
        mp4: exportResult.mp4Url,
        srt: exportResult.subtitleUrl,
        zip: exportResult.packageZipUrl
      };
    }
    return { mp4: null, srt: null, zip: null };
  };

  const urls = getUrls();
  const hasDownloads = !!(urls.mp4 || urls.srt || urls.zip);

  const handleDownloadMp4 = () => urls.mp4 && window.open(urls.mp4, "_blank");
  const handleDownloadSrt = () => urls.srt && window.open(urls.srt, "_blank");
  const handleDownloadBundle = () => urls.zip && window.open(urls.zip, "_blank");

  const handleNext = () => { setStep(0); navigate("/"); };
  const handleBack = () => { setStep(6); navigate("/preview"); };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Stepper current={7} />
      <ScreenHeader
        badge="Langkah 8 dari 8"
        title="Video siap diunduh"
        desc="Pipeline ekspor FFmpeg aktif. Semua adegan digabung sesuai rasio project."
        cta="Lanjut"
        onBack={handleBack}
        onNext={handleNext}
        backLabel="Kembali"
      />

      {/* Media Handling Modal */}
      <MediaHandlingModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onConfirm={handleStartExport}
        projectRatio={projectRatioClean}
        isExporting={isStarting}
      />

      {scenes.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center max-w-md mx-auto space-y-6">
          <AlertTriangle className="h-12 w-12 text-slate-500 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white">Belum ada adegan yang dibuat</h3>
            <p className="text-sm text-slate-400 mt-2">Buat proyek cerita baru terlebih dahulu untuk memproses ekspor.</p>
          </div>
          <button
            onClick={() => { setStep(0); navigate("/idea"); }}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            Mulai Buat Proyek
          </button>
        </div>
      ) : (
        <>
          {/* Metadata cards */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-6 mb-6">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Rasio Export</p>
              <p className="mt-1.5 text-sm font-bold text-white leading-none">
                {projectAspectRatio === "9:16" ? "9:16 Vertical" :
                 projectAspectRatio === "1:1"  ? "1:1 Square"   : "16:9 Widescreen"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Resolusi Export</p>
              <p className="mt-1.5 text-sm font-bold text-white leading-none">{resolutionPreset}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Durasi</p>
              <p className="mt-1.5 text-sm font-bold text-white leading-none">{totalDuration} detik</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Jumlah Scene</p>
              <p className="mt-1.5 text-sm font-bold text-white leading-none">{scenes.length} Adegan</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status Sinkronisasi</p>
              <span className={cn(
                "inline-block mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                hasSceneRatioMismatch
                  ? "bg-amber-500/20 text-amber-300 animate-pulse border border-amber-500/10"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/10"
              )}>
                {hasSceneRatioMismatch ? "Mismatch" : "Sinkron"}
              </span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Kesiapan Ekspor</p>
              <span className={cn(
                "inline-block mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                hasSkippedAudio
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/10"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/10"
              )}>
                {hasSkippedAudio ? "DRAFT ONLY" : "FINAL PREMIUM"}
              </span>
            </div>
          </div>

          {/* Not approved warning */}
          {!allApproved && (
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200 text-sm flex items-center gap-3 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-ping" />
              <p className="font-semibold">Masih ada adegan yang belum disetujui atau belum selesai dibuat videonya.</p>
            </div>
          )}

          {/* Skipped narration audio warning */}
          {hasSkippedAudio && (
            <div className="mb-6 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 animate-pulse" />
                <div>
                  <h4 className="text-sm font-bold text-white">Peringatan: Mode Final Premium Dibatasi (draft_allowed)</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Ada audio narator yang dilewati sementara di Step 5. Video final akan dihasilkan tanpa suara narasi untuk adegan tersebut. Ekspor premium diblokir sampai semua audio diselesaikan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/audio-prep")}
                className="rounded-2xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white transition active:scale-[0.98] shrink-0"
              >
                Lengkapi Audio Narator
              </button>
            </div>
          )}

          {/* Ratio mismatch warning */}
          {hasSceneRatioMismatch && (
            <div className="mb-6 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">Ada video adegan yang belum sesuai rasio project</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    FFmpeg akan menyesuaikan rasio video secara otomatis sesuai strategi yang Anda pilih.
                    Pilih strategi saat tombol ekspor ditekan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/scenes")}
                className="rounded-2xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white transition active:scale-[0.98] shrink-0"
              >
                Generate ulang scene yang belum sinkron
              </button>
            </div>
          )}

          {/* Fallback Narration Review Warning */}
          {hasReviewWarning && (
            <div className="mb-6 rounded-3xl border border-rose-500/25 bg-rose-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-6 w-6 text-rose-450 text-rose-400 shrink-0 animate-pulse" />
                <div>
                  <h4 className="text-sm font-bold text-white">Ada narasi yang dipersingkat secara aman, tetapi perlu dicek ulang agar tetap sesuai cerita.</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Ekspor boleh dilanjutkan sebagai draft, namun disarankan untuk melakukan QA ulang pada adegan yang bersangkutan untuk kualitas premium terbaik.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Export Job Progress Panel ─────────────────────────────── */}
          {(isJobActive || activeJob) && (
            <div className={cn(
              "rounded-3xl border p-6 mb-4",
              isJobDone
                ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                : isJobFailed
                ? "border-rose-500/20 bg-rose-500/[0.05]"
                : isJobCanceled
                ? "border-slate-500/20 bg-slate-500/[0.05]"
                : "border-blue-500/20 bg-blue-500/[0.05]"
            )}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  {isJobDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : isJobFailed ? (
                    <XCircle className="h-5 w-5 text-rose-400" />
                  ) : isJobCanceled ? (
                    <XCircle className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-white">
                      {isJobDone ? "Ekspor Berhasil!" :
                       isJobFailed ? "Ekspor Gagal" :
                       isJobCanceled ? "Ekspor Dibatalkan" :
                       "Ekspor sedang berjalan..."}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {currentStepInfo?.label || activeJob?.stepDetails || "Memproses..."}
                      {activeJob?.stepDetails && currentStepInfo && ` — ${activeJob.stepDetails}`}
                    </p>
                  </div>
                </div>
                {isJobActive && (
                  <button
                    onClick={handleCancelExport}
                    disabled={isCanceling}
                    className="flex items-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 transition"
                  >
                    {isCanceling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Batal Ekspor
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative h-3 rounded-full bg-white/5 overflow-hidden mb-3">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-700",
                    isJobDone
                      ? "bg-gradient-to-r from-emerald-500 to-green-400"
                      : isJobFailed || isJobCanceled
                      ? "bg-slate-600"
                      : "bg-gradient-to-r from-blue-500 to-violet-500"
                  )}
                  style={{ width: `${activeJob?.progress ?? 0}%` }}
                />
                {isJobActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {activeJob?.progress ?? 0}% selesai
                </span>
                {isJobActive && activeJob?.jobId && (
                  <span className="text-[10px] text-slate-600 font-mono">
                    Job: {activeJob.jobId.slice(0, 20)}...
                  </span>
                )}
              </div>

              {/* Step pipeline visual */}
              {isJobActive && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(EXPORT_STEPS).slice(0, -1).map(([key, { label, index }]) => {
                    const currentIdx = currentStepInfo?.index ?? -1;
                    const isDone = index < currentIdx;
                    const isCurrent = index === currentIdx;
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border transition",
                          isDone
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            : isCurrent
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-200 animate-pulse"
                            : "bg-white/[0.03] border-white/5 text-slate-600"
                        )}
                      >
                        <span>{STEP_ICONS[index]}</span>
                        {label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Export error */}
          {exportError && (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-300 text-sm flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <p className="font-semibold">{exportError}</p>
            </div>
          )}

          {/* ── Start / Re-Export CTA ─────────────────────────────────── */}
          {allApproved && !isJobActive && (
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button
                  id="start-export-btn"
                  onClick={handleOpenExportModal}
                  disabled={isStarting}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl px-6 py-3 text-sm font-bold text-white transition active:scale-[0.98]",
                    isStarting
                      ? "bg-violet-700/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/20"
                  )}
                >
                  {isStarting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Memulai Ekspor...</>
                  ) : isJobDone ? (
                    <><RefreshCcw className="h-4 w-4" /> Ekspor Ulang</>
                  ) : isJobFailed ? (
                    <><RefreshCcw className="h-4 w-4" /> Coba Lagi Ekspor</>
                  ) : hasSkippedAudio ? (
                    <><Layers className="h-4 w-4" /> Mulai Ekspor Video (Mode Draf)</>
                  ) : (
                    <><Layers className="h-4 w-4" /> Mulai Ekspor Video (Premium)</>
                  )}
                </button>
                {isJobDone && (
                  <span className="text-xs text-emerald-400 font-semibold">
                    ✓ Video sudah tersedia untuk diunduh di bawah
                  </span>
                )}
                {isJobFailed && (
                  <span className="text-xs text-rose-400 font-semibold">
                    ⚠ Ekspor terputus/gagal. Silakan coba lagi.
                  </span>
                )}
              </div>

              {jobHistory.some((job) => job.status === "failed" || job.status === "canceled") && (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleCleanup}
                    disabled={isCleaning}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 text-xs font-bold text-slate-300 transition shrink-0"
                  >
                    {isCleaning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    ) : (
                      "🧹"
                    )}
                    Bersihkan File Sampah Ekspor
                  </button>
                  <span className="text-xs text-slate-500">
                    Menghapus data folder & log ekspor sebelumnya yang gagal/batal untuk menghemat ruang disk.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Download cards ───────────────────────────────────────── */}
          <div className={cn(
            "grid gap-6 md:grid-cols-2 xl:grid-cols-3",
            !hasDownloads && "opacity-40 pointer-events-none"
          )}>
            <DownloadCard
              icon={Video}
              title="Video MP4"
              text="File final siap upload. Semua adegan digabung dengan rasio terkunci."
              cta="Download"
              onDownload={handleDownloadMp4}
            />
            <DownloadCard
              icon={FileText}
              title="Subtitle SRT"
              text="Subtitle sinkron dengan durasi setiap adegan. Format SRT universal."
              cta="Download"
              onDownload={handleDownloadSrt}
            />
            <DownloadCard
              icon={FolderOpen}
              title="Paket Edit"
              text="ZIP berisi video final, subtitle, dan manifest metadata lengkap."
              cta="Download"
              onDownload={handleDownloadBundle}
            />
          </div>
        </>
      )}
    </div>
  );
};
