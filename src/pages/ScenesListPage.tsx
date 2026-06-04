import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Clapperboard, Play, CheckCircle2, ChevronRight, Video,
  AlertTriangle, RefreshCcw, Zap, Loader2, RotateCcw, TrendingUp
} from "lucide-react";
import { Card, Pill } from "../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../components/ui/Button";
import { Stepper } from "../components/ui/Stepper";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { useSceneComposerStore } from "../stores/sceneComposerStore";
import { projectService } from "../services/projectService";
import { durationPresets, tonePresets, presetCards } from "../data/appData";
import { AIProgressPanel } from "../components/shared/AIProgressPanel";
import { cn } from "../utils";

// ── Types ─────────────────────────────────────────────────────────────────

type SceneRenderStatus = 'idle' | 'queued' | 'generating_storyboard' | 'rendering_video' | 'completed' | 'failed';

interface SceneRenderJob {
  sceneId: string;
  status: SceneRenderStatus;
  progress: number;
  attempts: number;
  errorMessage: string | null;
}

// ── Main Component ─────────────────────────────────────────────────────────

export const ScenesListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    scenes = [],
    projectContentHash,
    activeProjectId,
    reviewNarration,
    storyDraft,
    narration,
    durationPresetIndex,
    tonePresetIndex,
    selectedPreset,
    createScenesFromNarration,
    setStep,
    loadingStates,
    errorMessages,
    setScenesStatus,
    setScenes
  } = useProjectFlowStore();

  const [activeProgressStep, setActiveProgressStep] = React.useState(0);

  // Sync scenes on mount
  React.useEffect(() => {
    const loadProject = async () => {
      try {
        console.log(`[ScenesListPage] Loading active scenes from database for project ${activeProjectId}...`);
        const proj = await projectService.getProject(activeProjectId);
        if (proj && proj.scenes) {
          setScenes(proj.scenes);
        }
      } catch (err) {
        console.error("Gagal meload project scenes di step 6:", err);
      }
    };
    loadProject();
  }, [activeProjectId]);

  // Render Queue state
  const [renderJobs, setRenderJobs] = React.useState<Map<string, SceneRenderJob>>(new Map());
  const [isQueueRunning, setIsQueueRunning] = React.useState(false);
  const [queueAbortRef] = React.useState({ aborted: false });

  // ── Scene navigation ─────────────────────────────────────────────────────

  const handleOpenScene = (id: string) => {
    navigate(`/scenes/${id}`);
  };

  const handleNext = () => {
    setStep(6);
    navigate("/preview");
  };

  const handleBack = () => {
    setStep(4);
    navigate("/audio-prep");
  };

  // ── Scene Division ────────────────────────────────────────────────────────

  const handleGenerateScenes = async () => {
    setScenesStatus("loading");
    setActiveProgressStep(0);
    try {
      const durationText = durationPresets[durationPresetIndex] || durationPresets[0];
      const toneText = tonePresets[tonePresetIndex] || tonePresets[0];
      const styleText = selectedPreset !== null ? presetCards[selectedPreset]?.title : "Sinematik";

      await new Promise((r) => setTimeout(r, 600));
      setActiveProgressStep(1);

      const generated = await projectService.generateProjectScenes(activeProjectId, {
        narration: reviewNarration || narration || "",
        storyDraft,
        selectedDuration: durationText,
        selectedStyle: styleText,
        selectedTone: toneText
      });

      setActiveProgressStep(2);
      await new Promise((r) => setTimeout(r, 500));
      setActiveProgressStep(3);
      await new Promise((r) => setTimeout(r, 500));

      createScenesFromNarration(generated);

      if (generated && generated.length > 0) {
        const firstSceneId = generated[0].id;
        useSceneComposerStore.getState().generateStoryboard(firstSceneId);
        generated.slice(1).forEach((s: any) => {
          useSceneComposerStore.getState().generateStoryboard(s.id);
        });
      }

      setScenesStatus("success");
    } catch (err) {
      console.error("[Scene Division Failure Details]:", err);
      setScenesStatus("error", "Gagal membagi cerita menjadi adegan karena kendala jaringan atau limit kapasitas AI. Silakan coba lagi.");
    }
  };

  // ── Multi-Scene Render Queue ──────────────────────────────────────────────

  const scenesNeedingVideo = React.useMemo(() => {
    return scenes.filter(s =>
      s.status !== "Sudah digenerate" &&
      s.status !== "Disetujui"
    );
  }, [scenes]);

  const completedCount = React.useMemo(() => {
    return scenes.filter(s => s.status === "Sudah digenerate" || s.status === "Disetujui").length;
  }, [scenes]);

  const totalCount = scenes.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const updateRenderJob = (sceneId: string, updates: Partial<SceneRenderJob>) => {
    setRenderJobs(prev => {
      const next = new Map(prev);
      const existing = next.get(sceneId) || {
        sceneId,
        status: 'idle',
        progress: 0,
        attempts: 0,
        errorMessage: null
      };
      next.set(sceneId, { ...existing, ...updates } as SceneRenderJob);
      return next;
    });
  };

  const handleGenerateAll = async () => {
    if (isQueueRunning) {
      // Pause / abort request
      queueAbortRef.aborted = true;
      setIsQueueRunning(false);
      return;
    }

    const scenesToProcess = scenesNeedingVideo;
    if (scenesToProcess.length === 0) {
      return;
    }

    // Initialize all items as queued
    const initialMap = new Map<string, SceneRenderJob>();
    for (const scene of scenesToProcess) {
      initialMap.set(scene.id, {
        sceneId: scene.id,
        status: 'queued',
        progress: 0,
        attempts: 0,
        errorMessage: null
      });
    }
    setRenderJobs(initialMap);
    setIsQueueRunning(true);
    queueAbortRef.aborted = false;

    const composerStore = useSceneComposerStore.getState();
    const concurrencyLimit = 5;
    let activeIndex = 0;

    const worker = async () => {
      while (activeIndex < scenesToProcess.length && !queueAbortRef.aborted) {
        const currentIndex = activeIndex++;
        if (currentIndex >= scenesToProcess.length) break;

        const scene = scenesToProcess[currentIndex];

        // Step 1: Generate storyboard if needed
        if (scene.storyboardStatus !== "Siap dicek") {
          updateRenderJob(scene.id, { status: 'generating_storyboard', progress: 10 });
          try {
            await composerStore.generateStoryboard(scene.id);
            updateRenderJob(scene.id, { progress: 40 });
            // Wait a moment for storyboard to settle
            await new Promise(r => setTimeout(r, 2000));
          } catch (err: any) {
            console.warn(`[RenderQueue] Storyboard gen failed for ${scene.id}:`, err.message);
          }
        }

        if (queueAbortRef.aborted) break;

        // Step 2: Generate video
        updateRenderJob(scene.id, { status: 'rendering_video', progress: 50 });
        try {
          // Trigger video generation via composer store
          await composerStore.generateSceneVideo(scene.id);
          updateRenderJob(scene.id, { status: 'completed', progress: 100 });
        } catch (err: any) {
          console.error(`[RenderQueue] Video gen failed for ${scene.id}:`, err.message);
          setRenderJobs(prev => {
            const next = new Map(prev);
            const existing = next.get(scene.id) || {
              sceneId: scene.id,
              status: 'idle',
              progress: 0,
              attempts: 0,
              errorMessage: null
            };
            next.set(scene.id, {
              ...existing,
              status: 'failed',
              progress: 0,
              errorMessage: err.message || 'Gagal generate video. Coba lagi.',
              attempts: existing.attempts + 1
            });
            return next;
          });
        }
      }
    };

    // Spawn workers in parallel
    const workers = [];
    const numWorkers = Math.min(concurrencyLimit, scenesToProcess.length);
    for (let w = 0; w < numWorkers; w++) {
      workers.push(worker());
    }

    // Wait for all active parallel workers to finish
    await Promise.all(workers);

    setIsQueueRunning(false);
  };

  const handleRetryScene = async (sceneId: string) => {
    const composerStore = useSceneComposerStore.getState();
    updateRenderJob(sceneId, { status: 'rendering_video', progress: 50, errorMessage: null });
    try {
      await composerStore.generateSceneVideo(sceneId);
      updateRenderJob(sceneId, { status: 'completed', progress: 100 });
    } catch (err: any) {
      const prevAttempts = renderJobs.get(sceneId)?.attempts || 0;
      updateRenderJob(sceneId, {
        status: 'failed',
        errorMessage: err.message || 'Gagal. Coba lagi.',
        attempts: prevAttempts + 1
      });
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const status = loadingStates?.scenes || "idle";
  const errorMsg = errorMessages?.scenes;

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <Stepper current={5} />
        <AIProgressPanel
          title="AI sedang menyusun daftar adegan"
          description="Membagi cerita menjadi adegan 10 detik..."
          estimatedTime="Biasanya selesai dalam 15–40 detik."
          steps={["Membaca cerita", "Menganalisis alur", "Membagi adegan", "Menyimpan draf adegan"]}
          activeStep={activeProgressStep}
          status="loading"
        />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-6">
        <Stepper current={5} />
        <AIProgressPanel
          title="AI sedang menyusun daftar adegan"
          description="Membagi cerita menjadi adegan 10 detik..."
          steps={["Membaca cerita", "Menganalisis alur", "Membagi adegan", "Menyimpan draf adegan"]}
          activeStep={activeProgressStep}
          status="error"
          errorMessage={errorMsg || "Daftar adegan gagal dibuat. Coba lagi."}
          onRetry={handleGenerateScenes}
        />
      </div>
    );
  }

  const isEmpty = (scenes || []).length === 0;
  const isStale = (scenes || []).length > 0 && scenes[0]?.contentHash !== projectContentHash;
  const anyStaleAudio = (scenes || []).some(s => (s.status === 'stale' || !s.ttsNarration || s.status === 'failed') && s.status !== 'skipped');
  const hasSkippedAudio = (scenes || []).some(s => s.status === 'skipped');

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <Stepper current={5} />
        <ScreenHeader
          badge="Langkah 6 dari 8"
          title="Daftar adegan cerita"
          desc="Belum ada adegan yang dibuat untuk cerita ini."
          onBack={handleBack}
          backLabel="Kembali"
        />
        <Card className="bg-white/[0.05] p-8 text-center max-w-md mx-auto space-y-6">
          <Clapperboard className="h-12 w-12 text-slate-500 mx-auto animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-white">Belum ada adegan untuk cerita ini</h3>
            <p className="text-sm text-slate-400 mt-2">Gunakan tombol di bawah untuk meminta AI menyusun daftar adegan.</p>
          </div>
          <PrimaryButton icon={Play} onClick={handleGenerateScenes}>
            Generate
          </PrimaryButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper current={5} />
      <ScreenHeader
        badge="Langkah 6 dari 8"
        title="Daftar adegan cerita"
        desc="Berikut adalah ringkasan adegan yang telah dipecah AI. Buka detail adegan untuk mengatur storyboard, referensi gambar, dan men-generate video."
        cta="Lanjut"
        onBack={handleBack}
        onNext={handleNext}
        backLabel="Kembali"
        disabled={anyStaleAudio}
      />

      {/* Warning skipped audio callout */}
      {!isStale && hasSkippedAudio && (
        <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 flex gap-3 items-center">
          <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-white">Ada audio narator yang dilewati sementara.</h4>
            <p className="text-xs text-slate-400 mt-1">
              Adegan tertentu dilewati sementara. Ekspor final premium akan dibatasi sebelum semua audio dilengkapi.
            </p>
          </div>
        </div>
      )}

      {/* Warning stale audio callout */}
      {!isStale && anyStaleAudio && (
        <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 text-rose-500 shrink-0 animate-pulse" />
            <div>
              <h4 className="text-sm font-bold text-white">Peringatan: Narasi Audio Belum Siap</h4>
              <p className="text-xs text-slate-400 mt-1">Ada adegan dengan naskah berubah, gagal, atau belum memiliki audio valid. Silakan kembali ke tahap Narasi Audio.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate("/audio-prep")}
            className="flex items-center gap-1.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 text-xs font-bold transition active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Perbaiki Narasi Audio
          </button>
        </div>
      )}

      {/* ── Progress bar panel ─────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">
                    Progres Pembuatan Video Proyek
                  </span>
                </div>
                <span className="text-sm font-bold text-white">
                  {completedCount}/{totalCount} Selesai
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-700",
                    progressPercent === 100
                      ? "bg-gradient-to-r from-emerald-500 to-green-400"
                      : isQueueRunning
                      ? "bg-gradient-to-r from-blue-500 to-violet-500 animate-pulse"
                      : "bg-gradient-to-r from-blue-500 to-indigo-400"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {progressPercent === 100
                  ? "Semua video adegan sudah selesai digenerate!"
                  : isQueueRunning
                  ? "Antrean render aktif — memproses adegan secara otomatis..."
                  : `${totalCount - completedCount} adegan belum memiliki video.`}
              </p>
            </div>

            {/* Generate All CTA */}
            <div className="flex gap-2 shrink-0">
              {scenesNeedingVideo.length > 0 && (
                <button
                  id="generate-all-scenes-btn"
                  onClick={handleGenerateAll}
                  disabled={progressPercent === 100}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition active:scale-[0.98]",
                    isQueueRunning
                      ? "bg-amber-600 hover:bg-amber-500"
                      : progressPercent === 100
                      ? "bg-emerald-600/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500"
                  )}
                >
                  {isQueueRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Hentikan Antrean
                    </>
                  ) : progressPercent === 100 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Semua Selesai
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Generate Semua Adegan
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning stale state guard callout */}
      {isStale && (
        <div className="mb-5 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">Peringatan: Adegan Kedaluwarsa (Stale)</h4>
              <p className="text-xs text-slate-400 mt-1">Daftar adegan ini berasal dari ide cerita lama dan tidak cocok dengan cerita aktif saat ini.</p>
            </div>
          </div>
          <PrimaryButton icon={RefreshCcw} onClick={handleGenerateScenes}>
            Regenerate Daftar Adegan
          </PrimaryButton>
        </div>
      )}

      {/* Start Checklist callout */}
      {!isStale && scenesNeedingVideo.length > 0 && !isQueueRunning && (
        <div className="mb-2 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white">Langkah Berikutnya: Cek Adegan</h4>
            <p className="text-xs text-slate-400 mt-1">
              Klik "Generate Semua Adegan" untuk memproses semua video sekaligus, atau buka adegan satu per satu.
            </p>
          </div>
          <PrimaryButton icon={Play} onClick={() => handleOpenScene(scenes[0]?.id)}>
            Mulai Cek Adegan 1
          </PrimaryButton>
        </div>
      )}

      {/* Scenes list */}
      <div className="grid gap-4">
        {scenes.map((scene) => {
          const renderJob = renderJobs.get(scene.id);


          const getStatusTone = (status: typeof scene.status) => {
            if (status === "Draft") return "default";
            if (status === "Siap dicek") return "blue";
            if (status === "Perlu revisi") return "amber";
            if (status === "Sudah digenerate") return "green";
            return "purple"; // Disetujui
          };

          const getQueueBadge = () => {
            if (!renderJob || renderJob.status === 'idle') return null;
            switch (renderJob.status) {
              case 'queued':
                return (
                  <span className="rounded-full bg-slate-500/20 border border-slate-500/30 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    Dalam Antrean
                  </span>
                );
              case 'generating_storyboard':
                return (
                  <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-300 animate-pulse">
                    Membuat Storyboard...
                  </span>
                );
              case 'rendering_video':
                return (
                  <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-300 animate-pulse">
                    Render Video...
                  </span>
                );
              case 'completed':
                return (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    ✓ Selesai
                  </span>
                );
              case 'failed':
                return (
                  <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    ✕ Gagal
                  </span>
                );
              default:
                return null;
            }
          };

          const getCTA = () => {
            // Show retry button for failed scenes
            if (renderJob?.status === 'failed') {
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetryScene(scene.id);
                  }}
                  title={renderJob.errorMessage || 'Gagal render'}
                  className="flex items-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Coba lagi
                </button>
              );
            }

            // Show loader for rendering scenes
            if (renderJob?.status === 'rendering_video' || renderJob?.status === 'generating_storyboard') {
              return (
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  <span className="text-xs text-slate-400">
                    {renderJob.progress}%
                  </span>
                </div>
              );
            }

            if (scene.status === "Sudah digenerate") {
              return (
                <SecondaryButton icon={Play} onClick={(e) => { e.stopPropagation(); handleOpenScene(scene.id); }}>
                  Tonton Hasil
                </SecondaryButton>
              );
            }
            if (scene.status === "Siap dicek") {
              return (
                <PrimaryButton icon={Video} onClick={(e) => { e.stopPropagation(); handleOpenScene(scene.id); }}>
                  Cek Adegan
                </PrimaryButton>
              );
            }
            if (scene.status === "Perlu revisi") {
              return (
                <PrimaryButton icon={Video} onClick={(e) => { e.stopPropagation(); handleOpenScene(scene.id); }}>
                  Revisi
                </PrimaryButton>
              );
            }
            if (scene.status === "Disetujui") {
              return (
                <SecondaryButton onClick={(e) => { e.stopPropagation(); handleOpenScene(scene.id); }}>
                  Lanjut
                </SecondaryButton>
              );
            }
            return (
              <PrimaryButton icon={Video} onClick={(e) => { e.stopPropagation(); handleOpenScene(scene.id); }}>
                Atur Adegan
              </PrimaryButton>
            );
          };

          return (
            <Card
              key={scene.id}
              className={cn(
                "bg-white/[0.05] hover:bg-white/[0.08] transition border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer",
                renderJob?.status === 'rendering_video' && "border-violet-500/20 bg-violet-500/[0.03]",
                renderJob?.status === 'failed' && "border-rose-500/20 bg-rose-500/[0.03]",
                renderJob?.status === 'completed' && "border-emerald-500/20 bg-emerald-500/[0.03]"
              )}
              onClick={() => handleOpenScene(scene.id)}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                  renderJob?.status === 'rendering_video' || renderJob?.status === 'generating_storyboard'
                    ? "bg-violet-500/10 border-violet-500/20 text-violet-300"
                    : renderJob?.status === 'failed'
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    : renderJob?.status === 'completed'
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-200"
                )}>
                  {(renderJob?.status === 'rendering_video' || renderJob?.status === 'generating_storyboard')
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <Clapperboard className="h-6 w-6" />
                  }
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-white">
                      Adegan {scene.sceneNumber} — {scene.title}
                    </h3>
                    <Pill tone={getStatusTone(scene.status)}>
                      {scene.status === "Sudah digenerate" && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                      {scene.status}
                    </Pill>
                    <span className="rounded bg-white/[0.08] border border-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {scene.aspectRatio || "16:9"}
                    </span>
                    <span className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-semibold border",
                      scene.storyboardStatus === "Siap dicek" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
                      scene.storyboardStatus === "Sedang dibuat" ? "bg-blue-500/10 text-blue-300 border-blue-500/20 animate-pulse" :
                      scene.storyboardStatus === "Gagal, coba lagi" ? "bg-rose-500/10 text-rose-300 border-rose-500/20" :
                      "bg-white/[0.04] text-slate-400 border-white/5"
                    )}>
                      Storyboard: {scene.storyboardStatus || "Sedang dibuat"}
                    </span>
                    {getQueueBadge()}
                  </div>
                  <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
                    {scene.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>Rasio video: {scene.videoSettings?.aspectRatio || "16:9 Widescreen"}</span>
                    <span>•</span>
                    <span>Durasi: {scene.videoSettings?.duration || 10}s</span>
                    <span>•</span>
                    <span>Kualitas video: {scene.videoSettings?.quality || "Tinggi"}</span>
                  </div>

                  {/* Progress bar for active render */}
                  {(renderJob?.status === 'rendering_video' || renderJob?.status === 'generating_storyboard') && (
                    <div className="mt-3">
                      <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden w-full max-w-xs">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-violet-500 transition-all duration-500 animate-pulse"
                          style={{ width: `${renderJob.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error message for failed scenes */}
                  {renderJob?.status === 'failed' && renderJob.errorMessage && (
                    <p className="mt-2 text-xs text-rose-400 max-w-sm">
                      ⚠ {renderJob.errorMessage}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                {getCTA()}
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
