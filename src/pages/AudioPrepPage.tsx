import * as React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mic2, PlayCircle, PauseCircle, RefreshCcw, 
  AlertTriangle, Volume2, Save, FileText, Sparkles, Check, 
  ArrowRight, Undo2, Play, Pause, AlertCircle, RefreshCw
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { Stepper } from "../components/ui/Stepper";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { ttsService, TtsJobState } from "../services/ttsService";
import { projectService } from "../services/projectService";
import { sceneDraftService } from "../services/sceneDraftService";

const AVAILABLE_VOICES = [
  {
    voiceName: 'Charon',
    gender: 'Laki-laki',
    style: 'Tegas',
    suitableFor: 'Kisah sejarah, narasi heroik',
    description: 'Charon — laki-laki, dalam, tegas, cocok untuk sejarah dan narasi heroik.'
  },
  {
    voiceName: 'Aoede',
    gender: 'Perempuan',
    style: 'Lembut',
    suitableFor: 'Legenda dan drama emosional',
    description: 'Aoede — perempuan, lembut dan ekspresif, cocok untuk legenda dan drama emosional.'
  },
  {
    voiceName: 'Zephyr',
    gender: 'Netral',
    style: 'Sinematik',
    suitableFor: 'Drama emosional, monolog, dokumenter',
    description: 'Zephyr — netral, tenang, mengalir, cocok untuk drama emosional dan monolog.'
  },
  {
    voiceName: 'Kore',
    gender: 'Perempuan',
    style: 'Hangat',
    suitableFor: 'Motivasi dan edukasi',
    description: 'Kore — perempuan, hangat dan berenergi, cocok untuk motivasi dan edukasi.'
  },
  {
    voiceName: 'Fenrir',
    gender: 'Laki-laki',
    style: 'Misterius',
    suitableFor: 'Horor dan thriller',
    description: 'Fenrir — laki-laki, berat, berbisik, cocok untuk horor dan cerita misterius.'
  },
  {
    voiceName: 'Puck',
    gender: 'Netral',
    style: 'Hangat/Ekspresif',
    suitableFor: 'Edukasi dan petualangan',
    description: 'Puck — netral, ceria dan bersahabat, cocok untuk edukasi dan video petualangan.'
  },
  {
    voiceName: 'Leda',
    gender: 'Perempuan',
    style: 'Dramatis',
    suitableFor: 'Drama emosional, narasi',
    description: 'Leda — perempuan, berwibawa dan penuh penghayatan, cocok untuk drama emosional.'
  },
  {
    voiceName: 'Orus',
    gender: 'Laki-laki',
    style: 'Heroik',
    suitableFor: 'Aksi dan petualangan megah',
    description: 'Orus — laki-laki, gagah, bertenaga, cocok untuk aksi dan petualangan megah.'
  }
];

export const AudioPrepPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeProjectId,
    scenes = [],
    setStep,
    setScenes
  } = useProjectFlowStore();

  const [jobState, setJobState] = React.useState<TtsJobState>({
    status: "idle",
    progress: 0,
    current: 0,
    total: scenes.length,
    error: null
  });

  const [editingTexts, setEditingTexts] = React.useState<Record<string, string>>({});
  const [isSavingMap, setIsSavingMap] = React.useState<Record<string, boolean>>({});
  const [isCompressingMap, setIsCompressingMap] = React.useState<Record<string, boolean>>({});
  const [playingSceneId, setPlayingSceneId] = React.useState<string | null>(null);
  const [audioElement, setAudioElement] = React.useState<HTMLAudioElement | null>(null);
  const [isRegeneratingMap, setIsRegeneratingMap] = React.useState<Record<string, boolean>>({});
  
  // Voice selection states
  const [projectVoice, setProjectVoice] = React.useState<any>(null);
  const [playingPreviewVoiceName, setPlayingPreviewVoiceName] = React.useState<string | null>(null);
  const [loadingPreviewVoiceName, setLoadingPreviewVoiceName] = React.useState<string | null>(null);
  const [previewAudioElement, setPreviewAudioElement] = React.useState<HTMLAudioElement | null>(null);
  const [showVoiceChangeConfirm, setShowVoiceChangeConfirm] = React.useState(false);
  const [targetVoiceToSelect, setTargetVoiceToSelect] = React.useState<string | null>(null);
  const [showAdvancedActions, setShowAdvancedActions] = React.useState(false);

  const [isEnsuringDrafts, setIsEnsuringDrafts] = React.useState(false);
  const [ensuringError, setEnsuringError] = React.useState<string | null>(null);

  // New states for error display instead of blocking popups
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [previewError, setPreviewError] = React.useState<{ voiceName: string; message: string } | null>(null);

  // Poll project details and job status
  const fetchProjectInfo = async () => {
    try {
      const proj = await projectService.getProject(activeProjectId);
      if (proj) {
        setScenes(proj.scenes || []);
        if (proj.ttsSettings) {
          setProjectVoice(proj.ttsSettings);
        } else if (proj.lockedVoice) {
          setProjectVoice(proj.lockedVoice);
        }
      }
    } catch (err) {
      console.error("Gagal memuat detail proyek:", err);
    }
  };

  const checkJobStatus = async () => {
    try {
      const job = await ttsService.getProjectTtsStatus(activeProjectId);
      setJobState(job || { status: "idle", progress: 0, current: 0, total: scenes.length, error: null });
      
      if (job && job.status === "completed") {
        await fetchProjectInfo();
      }
    } catch (err) {
      console.error("Gagal memeriksa status job TTS:", err);
    }
  };

  React.useEffect(() => {
    fetchProjectInfo();
    checkJobStatus();
  }, [activeProjectId]);

  // Synchronize initial texts for editing textareas
  React.useEffect(() => {
    const texts: Record<string, string> = {};
    scenes.forEach(s => {
      texts[s.id] = s.narrationText || s.narration || "";
    });
    setEditingTexts(prev => {
      const next = { ...texts, ...prev };
      // Cleanup deleted scenes if any
      Object.keys(next).forEach(key => {
        if (!texts[key]) delete next[key];
      });
      return next;
    });
  }, [scenes]);

  // Polling interval for batch job
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (jobState.status === "processing") {
      interval = setInterval(() => {
        checkJobStatus();
        fetchProjectInfo(); // Reload scene statuses real-time
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobState.status]);

  // Clean up audio elements on unmount
  React.useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
      if (previewAudioElement) {
        previewAudioElement.pause();
      }
    };
  }, [audioElement, previewAudioElement]);

  const handlePlayPreview = async (voiceName: string) => {
    if (playingPreviewVoiceName === voiceName && previewAudioElement) {
      previewAudioElement.pause();
      setPlayingPreviewVoiceName(null);
      return;
    }

    if (previewAudioElement) {
      previewAudioElement.pause();
    }

    setLoadingPreviewVoiceName(voiceName);
    setPreviewError(null);
    try {
      const sampleText = "Ini adalah contoh suara narator untuk film sinematik Anda.";
      const res = await ttsService.generateVoicePreview(activeProjectId, voiceName, sampleText);
      if (res && res.audioUrl) {
        const audio = new Audio(res.audioUrl);
        audio.play();
        setPreviewAudioElement(audio);
        setPlayingPreviewVoiceName(voiceName);

        audio.onended = () => {
          setPlayingPreviewVoiceName(null);
        };
      }
      if (res && res.ok === false) {
        setPreviewError({
          voiceName,
          message: res.message || "Contoh suara belum bisa dibuat sekarang. Kamu tetap bisa memilih suara ini."
        });
      }
    } catch (err: any) {
      console.error(err);
      setPreviewError({
        voiceName,
        message: "Contoh suara belum bisa dibuat sekarang. Kamu tetap bisa memilih suara ini."
      });
    } finally {
      setLoadingPreviewVoiceName(null);
    }
  };

  const handleSelectVoice = async (voiceName: string) => {
    const hasAudio = scenes.some(s => s.ttsNarration && s.ttsNarration.audioUrl);
    if (hasAudio) {
      setTargetVoiceToSelect(voiceName);
      setShowVoiceChangeConfirm(true);
    } else {
      await performSelectVoice(voiceName);
    }
  };

  const performSelectVoice = async (voiceName: string) => {
    setErrorMessage(null);
    try {
      await ttsService.selectProjectVoice(activeProjectId, voiceName);
      await fetchProjectInfo();
      setShowVoiceChangeConfirm(false);
      setTargetVoiceToSelect(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal memilih suara: ${err.message || err}`);
    }
  };

  const handleCreateSceneDrafts = async () => {
    setIsEnsuringDrafts(true);
    setEnsuringError(null);
    setErrorMessage(null);
    try {
      console.log("[AudioPrepPage] Generating scene drafts from Story Review...");
      const drafts = await sceneDraftService.ensureSceneDrafts(activeProjectId, true);
      setScenes(drafts);
      await fetchProjectInfo();
    } catch (err: any) {
      console.error("Gagal membuat adegan draft:", err);
      setEnsuringError("Gagal membuat daftar adegan. Silakan coba lagi.");
    } finally {
      setIsEnsuringDrafts(false);
    }
  };

  const handleSaveNarrationText = async (sceneId: string) => {
    const text = editingTexts[sceneId] || "";
    setIsSavingMap(prev => ({ ...prev, [sceneId]: true }));
    setErrorMessage(null);
    try {
      console.log(`[AudioPrepPage] Saving narration text for scene ${sceneId}:`, text);
      const res = await ttsService.updateSceneTextAndMarkStale(activeProjectId, sceneId, text);
      if (res && res.success) {
        await fetchProjectInfo();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal menyimpan teks: ${err.message || err}`);
    } finally {
      setIsSavingMap(prev => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleRollbackText = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    setErrorMessage(null);
    if (scene && scene.ttsNarration && scene.ttsNarration.originalText) {
      const originalText = scene.ttsNarration.originalText;
      setEditingTexts(prev => ({ ...prev, [sceneId]: originalText }));
      try {
        await ttsService.updateSceneTextAndMarkStale(activeProjectId, sceneId, originalText);
        await fetchProjectInfo();
      } catch (err: any) {
        console.error(err);
        setErrorMessage(`Gagal membatalkan perubahan: ${err.message || err}`);
      }
    }
  };

  const handleAutoShorten = async (sceneId: string) => {
    const text = editingTexts[sceneId] || "";
    setIsCompressingMap(prev => ({ ...prev, [sceneId]: true }));
    setErrorMessage(null);
    try {
      console.log(`[AudioPrepPage] Requesting auto-shorten for scene ${sceneId}...`);
      const res = await ttsService.updateSceneTextAndMarkStale(activeProjectId, sceneId, text);
      if (res && res.success) {
        const updatedProj = await projectService.getProject(activeProjectId);
        if (updatedProj) {
          const updatedScene = updatedProj.scenes.find((s: any) => s.id === sceneId);
          if (updatedScene) {
            setEditingTexts(prev => ({ ...prev, [sceneId]: updatedScene.narrationText || updatedScene.narration }));
          }
          setScenes(updatedProj.scenes || []);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal mempersingkat teks: ${err.message || err}`);
    } finally {
      setIsCompressingMap(prev => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleStartTts = async (mode: "all" | "missing_only" | "failed_only" | "stale_only" | "resume" = "all") => {
    setErrorMessage(null);
    try {
      // First, save all modified texts to backend
      for (const scene of scenes) {
        const currentEdit = editingTexts[scene.id];
        const originalText = scene.narrationText || scene.narration || "";
        if (currentEdit !== undefined && currentEdit !== originalText) {
          console.log(`[AudioPrepPage] Auto-saving text changes for scene ${scene.id} before batch run...`);
          await ttsService.updateSceneTextAndMarkStale(activeProjectId, scene.id, currentEdit);
        }
      }

      setJobState(prev => ({ ...prev, status: "processing", progress: 0, error: null }));
      await ttsService.generateProjectTts(activeProjectId, mode, 1);
      setTimeout(checkJobStatus, 200);
    } catch (err: any) {
      setJobState(prev => ({
        ...prev,
        status: "failed",
        error: err.message || "Gagal memulai pembuatan audio narator."
      }));
    }
  };

  const handlePlayAudio = (sceneId: string, url: string) => {
    if (playingSceneId === sceneId && audioElement) {
      audioElement.pause();
      setPlayingSceneId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.play();
    setAudioElement(audio);
    setPlayingSceneId(sceneId);

    audio.onended = () => {
      setPlayingSceneId(null);
    };
  };

  const handleRegenerateScene = async (sceneId: string) => {
    setIsRegeneratingMap(prev => ({ ...prev, [sceneId]: true }));
    setErrorMessage(null);
    try {
      const currentEdit = editingTexts[sceneId];
      const originalText = scenes.find(s => s.id === sceneId)?.narrationText || "";
      if (currentEdit !== undefined && currentEdit !== originalText) {
        console.log(`[AudioPrepPage] Saving narration text before single regeneration:`, currentEdit);
        await ttsService.updateSceneTextAndMarkStale(activeProjectId, sceneId, currentEdit);
      }

      const res = await ttsService.regenerateSceneTts(activeProjectId, sceneId);
      if (res && res.success) {
        await fetchProjectInfo();
      } else {
        setErrorMessage("Gagal membuat suara.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal membuat suara: ${err.message || err}`);
    } finally {
      setIsRegeneratingMap(prev => ({ ...prev, [sceneId]: false }));
    }
  };

  // @ts-ignore - kept for advanced mode use
  const handleResetStatus = async (sceneId: string) => {
    setErrorMessage(null);
    try {
      await ttsService.resetSceneStatus(activeProjectId, sceneId);
      await fetchProjectInfo();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal mereset status adegan: ${err.message || err}`);
    }
  };

  const handleSkipScene = async (sceneId: string) => {
    setErrorMessage(null);
    try {
      await ttsService.skipScene(activeProjectId, sceneId);
      await fetchProjectInfo();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal melewati adegan: ${err.message || err}`);
    }
  };

  const handleUnskipScene = async (sceneId: string) => {
    setErrorMessage(null);
    try {
      await ttsService.unskipScene(activeProjectId, sceneId);
      await fetchProjectInfo();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal membatalkan lewati adegan: ${err.message || err}`);
    }
  };

  const handleCancelTts = async () => {
    setErrorMessage(null);
    try {
      await ttsService.cancelProjectTts(activeProjectId);
      await checkJobStatus();
      await fetchProjectInfo();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal menghentikan antrean: ${err.message || err}`);
    }
  };

  const handleNext = () => {
    setStep(5); // Go to Cek Adegan (index 5)
    navigate("/scenes");
  };

  const handleBack = () => {
    setStep(3); // Go to Review Cerita (index 3)
    navigate("/review");
  };

  // E2E Gate Validation checks
  const validateCanProceed = () => {
    if (scenes.length === 0) return false;

    const lockedVoiceName = projectVoice?.voiceName;
    if (!lockedVoiceName) return false;

    return scenes.every(s => {
      if (s.status === "skipped" || s.audioArtifact?.status === "skipped") return true;
      const tts = s.ttsNarration;
      if (!s.narrationText && !s.narration) return false;
      if (s.status === "stale" || s.status === "failed" || s.status === "generating_audio") return false;
      if (!tts || !tts.audioUrl || !tts.audioPath) return false;
      if (tts.actualAudioDurationSec <= 1.0 || tts.actualAudioDurationSec > 10.05) return false;
      if (tts.voiceName !== lockedVoiceName) return false;
      if (tts.cutoffDetected) return false;
      return true;
    });
  };

  const canProceed = validateCanProceed();
  const anyCutoff = scenes.some(s => s.ttsNarration?.cutoffDetected);

  // Statistics
  const totalScenes = scenes.length;
  const readyScenes = scenes.filter(s => {
    if (s.status === 'skipped' || s.audioArtifact?.status === 'skipped') return false;
    const tts = s.ttsNarration;
    return s.status === 'ready' || (tts && tts.audioUrl && tts.audioPath && s.status !== 'stale' && s.status !== 'failed' && tts.actualAudioDurationSec > 1.0 && tts.actualAudioDurationSec <= 10.05 && !tts.cutoffDetected && tts.voiceName === projectVoice?.voiceName);
  }).length;
  const failedScenes = scenes.filter(s => s.status === 'failed').length;
  const staleScenes = scenes.filter(s => s.status === 'stale').length;
  const generatingScenes = scenes.filter(s => s.status === 'generating_audio').length;
  const skippedScenes = scenes.filter(s => s.status === 'skipped' || s.audioArtifact?.status === 'skipped').length;
  const waitingScenes = totalScenes - readyScenes - failedScenes - staleScenes - generatingScenes - skippedScenes;

  // Split Scene status label mappings
  const getTeksStatus = (scene: any, currentText: string) => {
    const wordCount = currentText.trim().split(/\s+/).filter(Boolean).length;
    const charCount = currentText.length;
    const isTooLong = wordCount > 28 || charCount > 180;
    const hasUnsavedChanges = currentText !== (scene.narrationText || scene.narration || "");

    if (isTooLong) {
      return {
        label: "Terlalu Panjang",
        className: "bg-rose-500/20 text-rose-300 border-rose-500/30"
      };
    }
    if (scene.status === 'stale' || scene.audioArtifact?.status === 'stale') {
      return {
        label: "Stale (Teks Berubah)",
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
      };
    }
    if (hasUnsavedChanges) {
      return {
        label: "Perlu Review",
        className: "bg-amber-500/25 text-amber-300 border-amber-500/30"
      };
    }
    return {
      label: "Siap (Durasi Aman)",
      className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    };
  };

  const getAudioStatus = (scene: any) => {
    const tts = scene.ttsNarration;
    const status = scene.audioArtifact?.status || scene.status;

    if (status === 'skipped') {
      return {
        label: "Dilewati Sementara",
        className: "bg-slate-700/35 text-slate-400 border-slate-700/40"
      };
    }
    if (status === 'generating_audio' || status === 'generating' || status === 'queued') {
      return {
        label: "Sedang Dibuat",
        className: "bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse"
      };
    }
    if (status === 'ready' && tts && tts.audioUrl && tts.audioPath) {
      if (tts.cutoffDetected) {
        return {
          label: "Gagal — Terpotong",
          className: "bg-rose-500/20 text-rose-300 border-rose-500/30"
        };
      }
      if (tts.actualAudioDurationSec > 10.05) {
        return {
          label: `Gagal — Terlalu Panjang (${tts.actualAudioDurationSec}s)`,
          className: "bg-rose-500/20 text-rose-300 border-rose-500/30"
        };
      }
      return {
        label: `Siap Diputar (${tts.actualAudioDurationSec}s)`,
        className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      };
    }
    if (status === 'failed') {
      const errMsg = scene.audioArtifact?.lastError || tts?.message || "File audio tidak terbentuk.";
      return {
        label: `Gagal — ${errMsg}`,
        className: "bg-rose-500/20 text-rose-300 border-rose-500/30"
      };
    }
    if (status === 'stale') {
      return {
        label: "Perlu Dibuat Ulang",
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30"
      };
    }
    if (status === 'rate_limited') {
      return {
        label: "Tertunda (Rate Limited)",
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
      };
    }
    return {
      label: "Belum Dibuat",
      className: "bg-slate-500/20 text-slate-400 border-slate-500/30"
    };
  };

  return (
    <div className="space-y-6">
      <Stepper current={4} />
      
      <ScreenHeader
        badge="Langkah 5 dari 8"
        title="Siapkan Suara Narator"
        desc="Pilih suara narator, periksa teks setiap adegan, lalu buat audio yang pas 10 detik dan tidak terpotong."
        cta="Lanjut"
        onBack={handleBack}
        onNext={handleNext}
        backLabel="Kembali"
        disabled={!canProceed || jobState.status === "processing"}
      />

      {/* Voice selection panel */}
      <Card className="bg-white/[0.05] p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-blue-400" />
            Pilih Suara Project
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Suara ini akan dipakai untuk semua adegan agar film terasa konsisten.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {AVAILABLE_VOICES.map((v) => {
            const isSelected = projectVoice?.voiceName === v.voiceName;
            const isPlaying = playingPreviewVoiceName === v.voiceName;
            const isLoading = loadingPreviewVoiceName === v.voiceName;

            return (
              <div 
                key={v.voiceName} 
                className={`rounded-2xl border p-4 transition relative flex flex-col justify-between ${
                  isSelected 
                    ? "bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10" 
                    : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{v.voiceName}</span>
                    <span className="text-[10px] bg-white/[0.08] text-slate-300 px-2 py-0.5 rounded-full">
                      {v.gender}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-1">
                    <span>Gaya: <b className="text-slate-300">{v.style}</b></span>
                    <span>•</span>
                    <span>Cocok: <b className="text-slate-300">{v.suitableFor}</b></span>
                  </div>
                  <p className="text-xs text-slate-400 italic line-clamp-2 leading-relaxed">
                    "{v.description.split(" — ").pop()}"
                  </p>

                  {/* Inline Preview Error Info */}
                  {previewError && previewError.voiceName === v.voiceName && (
                    <div className="mt-2 text-[10px] bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 text-amber-300 flex items-start gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{previewError.message}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      disabled={isLoading}
                      onClick={() => handlePlayPreview(v.voiceName)}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold border transition ${
                        isPlaying 
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30" 
                          : "bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/[0.1]"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" /> Memuat...
                        </>
                      ) : isPlaying ? (
                        <>
                          <Pause className="h-3 w-3" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" /> Contoh
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSelectVoice(v.voiceName)}
                      className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-bold transition ${
                        isSelected 
                          ? "bg-emerald-600 text-white cursor-default" 
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3 w-3" /> Terpilih
                        </>
                      ) : (
                        "Gunakan"
                      )}
                    </button>
                  </div>

                  {!isSelected && (
                    <button
                      onClick={() => handleSelectVoice(v.voiceName)}
                      className="w-full text-center py-1 text-[10px] text-slate-400 hover:text-slate-200 hover:underline transition"
                    >
                      Gunakan Tanpa Preview
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Voice change confirmation modal */}
      {showVoiceChangeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="bg-slate-900 border-white/10 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white">Ganti Suara Narator?</h4>
                <p className="text-sm text-slate-300 mt-2">
                  Mengganti suara narator akan membuat semua audio perlu dibuat ulang agar konsisten. Audio lama akan ditandai perlu dibuat ulang.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <SecondaryButton onClick={() => { setShowVoiceChangeConfirm(false); setTargetVoiceToSelect(null); }}>
                Kembali
              </SecondaryButton>
              <PrimaryButton 
                onClick={() => targetVoiceToSelect && performSelectVoice(targetVoiceToSelect)}
              >
                Ganti Suara & Reset
              </PrimaryButton>
            </div>
          </Card>
        </div>
      )}

      {/* Empty State CTA Panel */}
      {scenes.length === 0 && (
        <Card className="bg-white/[0.05] p-8 text-center max-w-lg mx-auto space-y-6 flex flex-col items-center">
          <FileText className="h-12 w-12 text-slate-500 animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-white">Daftar adegan masih kosong</h3>
            <p className="text-sm text-slate-400 mt-2">AI perlu membagi cerita hasil review Anda ke adegan-adegan terlebih dahulu sebelum audio dibuat.</p>
          </div>
          {ensuringError && (
            <p className="text-xs text-rose-300 font-semibold">{ensuringError}</p>
          )}
          <PrimaryButton 
            icon={Sparkles} 
            onClick={handleCreateSceneDrafts} 
            disabled={isEnsuringDrafts}
          >
            {isEnsuringDrafts ? "Membagi cerita..." : "Buat daftar adegan dari cerita"}
          </PrimaryButton>
        </Card>
      )}

      {scenes.length > 0 && (
        <>
          {/* Status and Bulk Action controls */}
          <Card className="bg-white/[0.05] p-6 space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-white/10 pb-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Buat Suara Semua Adegan</h3>
                
                {/* Stats */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    {totalScenes} adegan
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    {readyScenes} siap
                  </span>
                  {failedScenes > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      {failedScenes} gagal
                    </span>
                  )}
                  {staleScenes > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      {staleScenes} perlu dibuat ulang
                    </span>
                  )}
                  {waitingScenes > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                      {waitingScenes} belum dibuat
                    </span>
                  )}
                </div>
              </div>

              {/* Simplified Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {jobState.status === "processing" ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-2xl px-4 py-2 text-sm font-semibold">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                      Sedang Diproses ({jobState.current}/{jobState.total})
                    </div>
                    <button
                      onClick={handleCancelTts}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 text-xs font-bold transition"
                    >
                      Hentikan
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Primary action: depends on scene states */}
                    {readyScenes === totalScenes ? (
                      <PrimaryButton icon={Check} onClick={handleNext}>
                        Semua Siap — Lanjut
                      </PrimaryButton>
                    ) : failedScenes > 0 && waitingScenes === 0 ? (
                      <PrimaryButton icon={RefreshCcw} onClick={() => handleStartTts("failed_only")}>
                        Buat Ulang yang Gagal ({failedScenes})
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton icon={Mic2} onClick={() => handleStartTts("resume")}>
                        Buat Suara Semua Adegan
                      </PrimaryButton>
                    )}

                    {/* Secondary: show only if there's something to fix */}
                    {failedScenes > 0 && waitingScenes > 0 && (
                      <SecondaryButton icon={RefreshCcw} onClick={() => handleStartTts("failed_only")}>
                        Buat Ulang Gagal ({failedScenes})
                      </SecondaryButton>
                    )}

                    {/* Advanced actions toggle */}
                    <button
                      onClick={() => setShowAdvancedActions(!showAdvancedActions)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition underline underline-offset-2"
                    >
                      {showAdvancedActions ? "Sembunyikan opsi lanjutan" : "Opsi lanjutan..."}
                    </button>
                  </>
                )}
              </div>

              {/* Advanced actions (collapsed by default) */}
              {showAdvancedActions && jobState.status !== "processing" && (
                <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-white/5">
                  <button
                    onClick={() => handleStartTts("all")}
                    className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border border-white/10 px-3 py-1.5 text-[10px] font-bold transition"
                  >
                    <RefreshCcw className="h-3 w-3" /> Buat Ulang Semua
                  </button>
                  {staleScenes > 0 && (
                    <button
                      onClick={() => handleStartTts("stale_only")}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 px-3 py-1.5 text-[10px] font-bold transition"
                    >
                      <RefreshCcw className="h-3 w-3" /> Buat Ulang Teks Berubah ({staleScenes})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Batch Progress display */}
            {jobState.status === "processing" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-semibold">
                  <span>Membuat file audio narasi...</span>
                  <span>{jobState.progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${jobState.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error alerts */}
            {jobState.error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 flex gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                <p>{jobState.error}</p>
              </div>
            )}

            {/* Cutoff alerts */}
            {anyCutoff && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-300 flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Peringatan: Suara Terpotong (Cutoff)</p>
                  <p className="mt-1 text-slate-400">
                    Beberapa adegan memiliki narasi yang terlalu panjang untuk jendela 10 detik. Silakan klik tombol <b>Persingkat Otomatis</b> atau sunting teks secara manual, lalu klik <b>Buat Ulang</b>.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Interactive Scene Workspace Cards */}
          <div className="space-y-6">
            {errorMessage && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 flex justify-between items-start gap-2">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
                <button 
                  onClick={() => setErrorMessage(null)} 
                  className="text-slate-400 hover:text-white font-bold animate-pulse"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-white">Daftar Narasi Adegan ({scenes.length})</h4>
              {!canProceed && (
                <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Suara adegan belum lengkap
                </span>
              )}
            </div>

            {scenes.map((scene) => {
              const tts = scene.ttsNarration;
              const isRegenerating = isRegeneratingMap[scene.id] || false;
              const isSaving = isSavingMap[scene.id] || false;
              const isCompressing = isCompressingMap[scene.id] || false;
              
              const currentText = editingTexts[scene.id] || "";
              const wordCount = currentText.trim().split(/\s+/).filter(Boolean).length;
              const charCount = currentText.length;
              
              const isTooLong = wordCount > 28 || charCount > 180;
              const hasUnsavedChanges = currentText !== (scene.narrationText || scene.narration || "");
              // Validate if audio generated corresponds to the original text
              const isStale = scene.status === "stale";
              const isFailed = scene.status === "failed";
              const isGenerating = scene.status === "generating_audio";
              const isAudioValid = !!(
                tts && 
                tts.audioUrl && 
                tts.audioPath && 
                !isStale && 
                !isFailed && 
                !isGenerating && 
                scene.status !== 'skipped' && 
                scene.audioArtifact?.status !== 'skipped' && 
                tts.actualAudioDurationSec && 
                tts.actualAudioDurationSec > 1.0
              );

              return (
                <Card 
                  key={scene.id} 
                  className={`bg-white/[0.03] border-white/5 hover:border-white/10 transition p-6 space-y-4 ${
                    isTooLong ? "border-amber-500/20 shadow-lg shadow-amber-500/[0.02]" : ""
                  } ${
                    isStale ? "border-amber-600/30 bg-amber-950/[0.03]" : ""
                  } ${
                    isFailed ? "border-rose-600/30 bg-rose-950/[0.03]" : ""
                  } ${
                    scene.status === "skipped" || scene.audioArtifact?.status === "skipped" ? "opacity-60 border-dashed border-slate-700" : ""
                  }`}
                >
                  <div className="flex flex-col xl:flex-row justify-between gap-6">
                    {/* Scene Metadata & Narration Textarea */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                            Adegan {scene.sceneNumber}
                          </span>
                          <h5 className="text-sm font-bold text-white">{scene.title}</h5>
                        </div>
                        
                        {/* Two Columns Separated status tags */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Teks:</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getTeksStatus(scene, currentText).className}`}>
                              {getTeksStatus(scene, currentText).label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Audio:</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getAudioStatus(scene).className}`}>
                              {getAudioStatus(scene).label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info & emotion tags */}
                      <div className="flex gap-4 text-xs text-slate-400">
                        <p>Durasi target: <span className="text-white font-bold">10 detik</span></p>
                        {scene.emotion && (
                          <p>Emosi: <span className="text-cyan-400 capitalize">{scene.emotion}</span></p>
                        )}
                      </div>

                      {/* Editable Textarea */}
                      <div className="relative">
                        <textarea
                          id={`narration-textarea-${scene.id}`}
                          rows={3}
                          value={currentText}
                          onChange={(e) => setEditingTexts(prev => ({ ...prev, [scene.id]: e.target.value }))}
                          placeholder="Tulis naskah narasi di sini..."
                          className={`w-full rounded-2xl bg-black/45 border p-4 text-sm text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isTooLong ? "border-amber-500/40 focus:ring-amber-500" : "border-white/5"
                          }`}
                        />
                        {hasUnsavedChanges && (
                          <span className="absolute top-2 right-2 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 font-bold">
                            Teks Belum Disimpan
                          </span>
                        )}
                      </div>

                      {/* Length indicators and fitting warnings */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-4">
                          <span className={`${wordCount > 28 ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                            Kata: {wordCount} / 28
                          </span>
                          <span className={`${charCount > 180 ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                            Karakter: {charCount} / 180
                          </span>
                        </div>

                        {/* Status Label */}
                        <div>
                          {isTooLong ? (
                            <span className="text-amber-400 font-semibold flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" /> Terlalu panjang (Wajib dipersingkat)
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Durasi aman
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Text stale warning alert */}
                      {isStale && (
                        <div className="text-xs bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1.5 flex-1">
                            <p>
                              Teks berubah. Buat ulang suara agar sesuai narasi terbaru.
                            </p>
                            {tts && tts.originalText && (
                              <button
                                onClick={() => handleRollbackText(scene.id)}
                                className="flex items-center gap-1 text-[10px] text-amber-200 hover:text-white font-bold bg-amber-500/25 border border-amber-500/30 px-2 py-1 rounded-lg transition"
                              >
                                <Undo2 className="h-3 w-3" /> Batalkan perubahan teks
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Display fitted text warning details */}
                      {tts && tts.fittedText && tts.fittedText !== currentText && !isStale && (
                        <div className="text-xs bg-cyan-950/20 border border-cyan-500/10 rounded-xl p-3 text-cyan-300 flex gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <p>
                            <span className="font-bold">Penyesuaian AI aktif:</span> "{tts.fittedText}"
                          </p>
                        </div>
                      )}

                      {/* Display validation error details */}
                      {tts && tts.message && (isFailed || tts.fitStatus === 'failed_fit') && (
                        <div className="text-xs bg-rose-950/20 border border-rose-500/15 rounded-xl p-3 text-rose-300 flex gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <p>
                            <span className="font-bold">Detail kesalahan:</span> {tts.message}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Simplified Action Panel — Progressive Disclosure */}
                    <div className="flex flex-col justify-end xl:justify-start items-center gap-2.5 shrink-0 self-center xl:self-start w-full xl:w-48">
                      {/* Primary action depends on scene state */}
                      {scene.status === 'skipped' || scene.audioArtifact?.status === 'skipped' ? (
                        /* SKIPPED: show unskip */
                        <button
                          onClick={() => handleUnskipScene(scene.id)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 px-4 py-2 text-xs font-bold border border-white/5 transition"
                        >
                          <Undo2 className="h-3.5 w-3.5" /> Batalkan Lewati
                        </button>
                      ) : isFailed || isStale || !tts ? (
                        /* FAILED / STALE / NEW: show primary generate button */
                        <button
                          disabled={isRegenerating || jobState.status === "processing"}
                          onClick={() => handleRegenerateScene(scene.id)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-bold transition shadow-lg shadow-blue-500/10"
                        >
                          <RefreshCcw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                          {isRegenerating ? "Memproses..." : isStale ? "Buat Ulang (teks berubah)" : isFailed ? "Buat Ulang Suara" : "Buat Suara"}
                        </button>
                      ) : isAudioValid && tts?.audioUrl ? (
                        /* READY: show play button as primary */
                        <button
                          onClick={() => handlePlayAudio(scene.id, tts?.audioUrl ?? '')}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white px-4 py-2.5 text-xs font-bold transition shadow-lg shadow-emerald-500/10"
                        >
                          {playingSceneId === scene.id ? (
                            <><PauseCircle className="h-4 w-4" /> Hentikan</>
                          ) : (
                            <><PlayCircle className="h-4 w-4" /> Dengarkan Hasil</>
                          )}
                        </button>
                      ) : null}

                      {/* Text edit actions (shown for non-skipped scenes) */}
                      {scene.status !== 'skipped' && scene.audioArtifact?.status !== 'skipped' && (
                        <>
                          {hasUnsavedChanges && (
                            <SecondaryButton 
                              icon={Save}
                              disabled={isSaving}
                              onClick={() => handleSaveNarrationText(scene.id)}
                              className="w-full text-center"
                            >
                              {isSaving ? "Menyimpan..." : "Simpan Teks"}
                            </SecondaryButton>
                          )}

                          {isTooLong && (
                            <SecondaryButton
                              icon={Sparkles}
                              disabled={isCompressing}
                              onClick={() => handleAutoShorten(scene.id)}
                              className="w-full text-center"
                            >
                              {isCompressing ? "Mempersingkat..." : "Persingkat Otomatis"}
                            </SecondaryButton>
                          )}

                          {/* Secondary: Regen if ready (subtle), Skip (subtle) */}
                          {isAudioValid && tts && (
                            <button
                              disabled={isRegenerating || jobState.status === "processing"}
                              onClick={() => handleRegenerateScene(scene.id)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border border-white/10 px-3 py-1.5 text-[10px] font-bold transition"
                            >
                              <RefreshCcw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                              Buat Ulang
                            </button>
                          )}

                          {!isAudioValid && !isFailed && !isStale && tts && (
                            <button
                              onClick={() => handleSkipScene(scene.id)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] text-slate-500 border border-white/5 px-3 py-1.5 text-[10px] font-bold transition"
                            >
                              Lewati Sementara
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Validation Bottom Checklist Bar */}
          <Card className="bg-white/[0.02] border-white/5 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-white">Kriteria Kelayakan Narasi</h5>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-2">
                <p className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${scenes.every(s => s.ttsNarration && s.status !== 'stale' && s.status !== 'failed') ? "bg-emerald-500" : "bg-slate-500"}`} />
                  Semua adegan memiliki audio
                </p>
                <p className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${!anyCutoff ? "bg-emerald-500" : "bg-slate-500"}`} />
                  Suara tidak terpotong (max 10s)
                </p>
                <p className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${canProceed ? "bg-emerald-500" : "bg-slate-500"}`} />
                  Karakter suara seragam
                </p>
              </div>
            </div>

            <button
              disabled={!canProceed || jobState.status === "processing"}
              onClick={handleNext}
              className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-bold text-sm transition ${
                canProceed 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white cursor-pointer shadow-lg shadow-blue-500/20" 
                  : "bg-white/[0.05] border border-white/5 text-slate-500 cursor-not-allowed"
              }`}
            >
              Lanjut ke Cek Adegan <ArrowRight className="w-4 h-4" />
            </button>
          </Card>
        </>
      )}
    </div>
  );
};

export default AudioPrepPage;
