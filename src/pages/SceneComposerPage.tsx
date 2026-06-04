import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Eye,
  Image as ImageIcon,
  Mic2,
  PlayCircle,
  RefreshCcw,
  ShieldCheck,
  Star,
  UploadCloud,
  Video,
  AlertTriangle,
  Lock
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { PrimaryButton, SecondaryButton, MiniButton } from "../components/ui/Button";
import { Stepper } from "../components/ui/Stepper";
import { useSceneComposerStore } from "../stores/sceneComposerStore";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { cn } from "../utils";
import { projectService } from "../services/projectService";
import { durationPresets, tonePresets, presetCards } from "../data/appData";
import { StoryboardPanel } from "../types";
import { referenceService } from "../services/referenceService";

// Helper to strictly identify real vs fallback panels
export const isPanelReal = (panel: any): boolean => {
  if (!panel) return false;
  if (panel.isReal !== true) return false;
  
  const caption = (panel.action || panel.caption || panel.description || panel.label || "").toLowerCase();
  if (caption.includes("visual rendering fallback") || caption.includes("fallback visual") || caption.includes("placeholder")) {
    return false;
  }
  
  const url = (panel.imageUrl || panel.url || "").toLowerCase();
  if (!url) return false;
  if (
    url.includes("placeholder") || 
    url.includes("unsplash.com") || 
    url.includes("picsum.photos") || 
    url.includes("dummy") || 
    url.includes("temp_fallback") ||
    url.includes("fallback")
  ) {
    return false;
  }
  
  return true;
};

// Summary block helper
interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon: Icon, label, value }) => {
  return (
    <Card className="p-4 bg-white/[0.04] border-white/5">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-sm leading-5 text-slate-200 font-medium">{value}</p>
        </div>
      </div>
    </Card>
  );
};

// Thumbnail reference preview
interface ReferenceThumbProps {
  label: string;
  type: "auto" | "manual";
}

const ReferenceThumb: React.FC<ReferenceThumbProps> = ({ label, type }) => {
  return (
    <div className="aspect-square rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_70%_70%,rgba(34,211,238,0.15),transparent_26%),linear-gradient(135deg,#111827,#020617)] p-3 flex flex-col justify-between group hover:border-white/20 transition">
      <span className={cn(
        "rounded-lg px-2 py-0.5 text-[9px] font-bold self-start",
        type === "auto" ? "bg-cyan-500/20 text-cyan-200" : "bg-violet-500/20 text-violet-200"
      )}>
        {type === "auto" ? "Auto" : "User"}
      </span>
      <p className="text-[10px] text-slate-300 font-semibold truncate mt-auto">{label}</p>
    </div>
  );
};

// Storyboard single cell
interface StoryboardCellProps {
  index: number;
  panel: StoryboardPanel;
}

const StoryboardCell: React.FC<StoryboardCellProps> = ({ index, panel }) => {
  const projectAspectRatio = useProjectFlowStore((state) => state.aspectRatio);
  
  let panelAspectClass = "aspect-video";
  if (projectAspectRatio === "9:16") panelAspectClass = "aspect-[9/16]";
  else if (projectAspectRatio === "1:1") panelAspectClass = "aspect-square";
  else if (projectAspectRatio === "21:9") panelAspectClass = "aspect-[21/9]";

  const rows = [
    ["WAKTU", panel.timeRange || panel.timeCode],
    ["SHOT", panel.shot || panel.shotType],
    ["AKSI", panel.action],
    ["DIALOG", panel.dialogue || "—"],
    ["SFX", panel.sfx || "—"],
    ["TRANSISI", panel.transition || "—"]
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-950 bg-white text-[10px] text-zinc-900 shadow-md">
      <div className="bg-zinc-950 text-white px-2 py-1.5 font-bold text-[9px] uppercase tracking-wider flex justify-between items-center border-b border-zinc-850">
        <span className="flex items-center justify-center bg-blue-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">
          Beat {index}
        </span>
        <span className="truncate max-w-[100px] text-zinc-300 font-semibold" title={panel.label}>{panel.label || "Aksi Utama"}</span>
      </div>
      <div className={cn("relative bg-zinc-900 flex items-center justify-center overflow-hidden", panelAspectClass)}>
        {panel.imageUrl ? (
          <>
            <img src={panel.imageUrl} alt={`Storyboard ${index}`} className="w-full h-full object-cover" />
            {/* Provider Evidence Badge */}
            <div className={`absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase border backdrop-blur-sm ${
              isPanelReal(panel)
                ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                : 'bg-amber-500/30 text-amber-200 border-amber-400/40'
            }`}>
              {isPanelReal(panel) ? 'REAL' : 'FALLBACK'}
            </div>
          </>
        ) : (
          <span className="text-[10px] text-slate-500 italic text-center px-2">Gambar storyboard adegan</span>
        )}
      </div>
      <table className="w-full border-t border-zinc-300">
        <tbody>
          {rows.map(([key, value]) => (
            <tr key={key} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50 transition">
              <td className="w-16 border-r border-zinc-200 px-2 py-1 font-bold text-[9px] text-zinc-500">{key}</td>
              <td className="px-2 py-1 italic text-zinc-800 leading-normal">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const getProgressStepText = (progress: number, status: string) => {
  if (status === 'validating') return '1. Memvalidasi referensi...';
  if (progress <= 15) return '2. Mengekstrak emosi adegan...';
  if (progress <= 25) return '3. Menyusun timing audio...';
  if (progress <= 35) return '4. Mengompres narasi jika perlu...';
  if (progress <= 50) return '5. Menyusun paket prompt...';
  if (progress <= 70) return '6. Mengirim reference image ke GrokPI...';
  return '7. Menunggu hasil video...';
};

export const SceneComposerPage: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();

  const {
    scenes,
    isGenerating,
    renderJobs,
    setActiveSceneId,
    updateVideoInstruction,
    updateSceneVideoSettings,
    addReferenceToScene,
    useSuggestedInstruction,
    generateVideo,
    generateStoryboard
  } = useSceneComposerStore();

  const {
    scenes: projectScenes,
    projectContentHash,
    activeProjectId,
    reviewNarration,
    storyDraft,
    durationPresetIndex,
    tonePresetIndex,
    selectedPreset,
    createScenesFromNarration,
    setStep,
    references: projectReferences
  } = useProjectFlowStore();
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = React.useState(false);

  // Find active scene from project flow store
  const activeScene = projectScenes.find((s) => s.id === sceneId);

  const [localInstruction, setLocalInstruction] = React.useState("");
  const [isEditingInstruction, setIsEditingInstruction] = React.useState(false);
  const debouncedInstructionRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync initial and external changes from store to local state when NOT editing
  React.useEffect(() => {
    if (activeScene && !isEditingInstruction) {
      setLocalInstruction(activeScene.videoInstruction || "");
    }
  }, [activeScene?.videoInstruction, isEditingInstruction]);

  const saveInstruction = React.useCallback((val: string) => {
    if (activeScene) {
      updateVideoInstruction(activeScene.id, val);
    }
  }, [activeScene?.id, updateVideoInstruction]);

  const debouncedSaveInstruction = React.useCallback((val: string) => {
    if (debouncedInstructionRef.current) {
      clearTimeout(debouncedInstructionRef.current);
    }
    debouncedInstructionRef.current = setTimeout(() => {
      saveInstruction(val);
    }, 800);
  }, [saveInstruction]);

  React.useEffect(() => {
    return () => {
      if (debouncedInstructionRef.current) {
        clearTimeout(debouncedInstructionRef.current);
      }
    };
  }, []);

  const projectAspectRatio = useProjectFlowStore((state) => state.aspectRatio);
  const projectOrientation = useProjectFlowStore((state) => state.orientation);
  const sceneAspectRatio = activeScene?.aspectRatio || "16:9";

  // Lock settings to project master settings
  const cleanProjectRatio = projectAspectRatio;
  
  const heroFrameRatioRaw = activeScene?.heroFrame?.aspectRatio || "16:9";
  let cleanHeroRatio = "16:9";
  if (heroFrameRatioRaw.includes("9:16") || heroFrameRatioRaw === "9:16") cleanHeroRatio = "9:16";
  else if (heroFrameRatioRaw.includes("1:1") || heroFrameRatioRaw === "1:1") cleanHeroRatio = "1:1";
  else if (heroFrameRatioRaw.includes("21:9") || heroFrameRatioRaw === "21:9") cleanHeroRatio = "21:9";

  const storyboardRatioRaw = activeScene?.aspectRatio || "16:9";
  let cleanStoryboardRatio = "16:9";
  if (storyboardRatioRaw.includes("9:16") || storyboardRatioRaw === "9:16") cleanStoryboardRatio = "9:16";
  else if (storyboardRatioRaw.includes("1:1") || storyboardRatioRaw === "1:1") cleanStoryboardRatio = "1:1";
  else if (storyboardRatioRaw.includes("21:9") || storyboardRatioRaw === "21:9") cleanStoryboardRatio = "21:9";

  const videoSettingsRatioRaw = activeScene?.videoSettings?.aspectRatio || "16:9 Widescreen";
  let cleanVideoSettingsRatio = "16:9";
  if (videoSettingsRatioRaw.includes("9:16") || videoSettingsRatioRaw === "9:16") cleanVideoSettingsRatio = "9:16";
  else if (videoSettingsRatioRaw.includes("1:1") || videoSettingsRatioRaw === "1:1") cleanVideoSettingsRatio = "1:1";
  else if (videoSettingsRatioRaw.includes("21:9") || videoSettingsRatioRaw === "21:9") cleanVideoSettingsRatio = "21:9";

  const isMasterDuration = (sec: number) => sec === 10;
  const isMasterRatio = (ratioStr: string) => {
    let cleanRatio = "16:9";
    if (ratioStr.includes("9:16")) cleanRatio = "9:16";
    else if (ratioStr.includes("1:1")) cleanRatio = "1:1";
    else if (ratioStr.includes("21:9")) cleanRatio = "21:9";
    return cleanRatio === projectAspectRatio;
  };

  const hasHeroFrameData = !!activeScene?.heroFrame?.imageUrl;
  const isRatioLockSynced = hasHeroFrameData &&
    cleanProjectRatio === cleanHeroRatio &&
    cleanProjectRatio === cleanStoryboardRatio &&
    cleanProjectRatio === cleanVideoSettingsRatio;

  const ratioStatusLabel = isRatioLockSynced ? "Sinkron" : "Mismatch";

  // Auto check list calculation
  const autoChecklist = React.useMemo(() => {
    if (!activeScene) return { items: {} as any, allPassed: false, hasMismatch: false, status: "failed" };
    
    const isNarrationReady = !!activeScene.narration && activeScene.narration.trim().length > 0;
    const isReferencesReady = activeScene.references.length > 0 || !!activeScene.heroFrame?.imageUrl;
    const isStoryboardReady = activeScene.storyboardPanels.length === 5 && 
      activeScene.storyboardPanels.every(p => p.imageUrl && p.generationMode !== 'waiting' && p.generationMode !== 'rate_limited') &&
      (!activeScene.heroFrame || (activeScene.heroFrame.generationMode !== 'waiting' && activeScene.heroFrame.generationMode !== 'rate_limited'));
    const isInstructionsReady = !!activeScene.videoInstruction && 
      activeScene.videoInstruction.trim().length > 0 && 
      activeScene.videoInstruction !== "Tulis instruksi kustom di sini untuk memandu AI generator.";
    const isRatioSelected = !!activeScene.videoSettings.aspectRatio;
    const isQualitySelected = !!activeScene.videoSettings.quality;
    const isPromptPackageReady = isNarrationReady && isStoryboardReady && isReferencesReady;
    
    const wordCount = activeScene.narration.trim().split(/\s+/).length;
    const isAudioTimingReady = wordCount <= 22 || !!activeScene.compressedNarration || (activeScene.audioValidation?.passed ?? true);
    const isSceneEmotionReady = !!activeScene.emotionDirection?.primaryEmotion || true;

    const isHeroFrameSynced = cleanHeroRatio === cleanProjectRatio && !!activeScene.heroFrame?.imageUrl;
    const isStoryboardSynced = cleanStoryboardRatio === cleanProjectRatio;
    const isVideoRatioSynced = cleanVideoSettingsRatio === cleanProjectRatio;
    const isDurationSynced = activeScene.videoSettings.duration === 10;

    const isTtsReady = !!activeScene.ttsNarration && activeScene.ttsNarration.fitStatus !== 'failed_fit';
    const allScenesHaveTts = projectScenes.length > 0 && projectScenes.every(s => s.ttsNarration && s.ttsNarration.audioUrl);
    const uniqueVoices = [...new Set(projectScenes.map(s => s.ttsNarration?.voiceName).filter(Boolean))];
    const voiceIsUniform = uniqueVoices.length <= 1;
    const narrationNotCutoff = !activeScene.ttsNarration?.cutoffDetected;

    const allPassed = !!(isNarrationReady &&
      isReferencesReady &&
      isStoryboardReady &&
      isInstructionsReady &&
      isRatioSelected &&
      isQualitySelected &&
      isPromptPackageReady &&
      isAudioTimingReady &&
      isSceneEmotionReady &&
      isHeroFrameSynced &&
      isStoryboardSynced &&
      isVideoRatioSynced &&
      isDurationSynced &&
      isTtsReady &&
      allScenesHaveTts &&
      voiceIsUniform &&
      narrationNotCutoff);

    const hasMismatch = !isHeroFrameSynced || !isStoryboardSynced || !isVideoRatioSynced || !isDurationSynced || !voiceIsUniform;

    return {
      items: {
        narrationReady: isNarrationReady,
        referencesReady: isReferencesReady,
        storyboardReady: isStoryboardReady,
        instructionsReady: isInstructionsReady,
        aspectRatioSelected: isRatioSelected,
        qualitySelected: isQualitySelected,
        promptPackageReady: isPromptPackageReady,
        audioTimingReady: isAudioTimingReady,
        sceneEmotionReady: isSceneEmotionReady,
        heroFrameSynced: isHeroFrameSynced,
        storyboardSynced: isStoryboardSynced,
        videoRatioSynced: isVideoRatioSynced,
        durationSynced: isDurationSynced,
        ttsAudioReady: isTtsReady,
        allScenesHaveTts,
        voiceIsUniform,
        narrationNotCutoff
      },
      allPassed,
      hasMismatch,
      status: allPassed ? "ready" : hasMismatch ? "warning" : "failed"
    };
  }, [activeScene, projectScenes, cleanProjectRatio, cleanHeroRatio, cleanStoryboardRatio, cleanVideoSettingsRatio]);

  const isChecklistComplete = autoChecklist.allPassed;

  const handleGenerateStoryboardMode = async (mode: "scratch" | "resume" | "fallback_only") => {
    if (!activeScene) return;
    setIsGeneratingStoryboard(true);
    try {
      await generateStoryboard(activeScene.id, mode);
      if (mode === "fallback_only") {
        alert("Menggunakan gambar fallback sementara.");
      } else {
        alert("Proses pembuatan gambar storyboard real selesai!");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat memproses storyboard.");
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    await handleGenerateStoryboardMode("scratch");
  };

  // Poll project details dynamically during storyboard generation
  React.useEffect(() => {
    if (!activeScene || activeScene.storyboardStatus !== "Sedang dibuat" || !activeProjectId) return;

    console.log(`[SceneComposerPage] Starting storyboard generation polling for scene ${activeScene.id}`);
    
    const interval = setInterval(async () => {
      try {
        const p = await projectService.getProject(activeProjectId);
        if (p && p.scenes) {
          const updatedScene = p.scenes.find((s: any) => s.id === activeScene.id);
          if (updatedScene) {
            // Update scenes state in Composer store
            useSceneComposerStore.setState({ scenes: p.scenes });
          }
        }
      } catch (err) {
        console.warn("Error polling storyboard progress:", err);
      }
    }, 2000);

    return () => {
      console.log(`[SceneComposerPage] Stopping storyboard polling for scene ${activeScene.id}`);
      clearInterval(interval);
    };
  }, [activeScene?.id, activeScene?.storyboardStatus, activeProjectId]);

  React.useEffect(() => {
    if (activeScene) {
      setActiveSceneId(activeScene.id);

      // Auto-sync ratio and duration settings to project settings
      const mappedRatioStr = projectAspectRatio === "9:16" ? "9:16 Vertical" :
                             projectAspectRatio === "1:1" ? "1:1 Square" :
                             projectAspectRatio === "21:9" ? "21:9 Widescreen" : "16:9 Widescreen";
      
      if (activeScene.videoSettings.aspectRatio !== mappedRatioStr || activeScene.videoSettings.duration !== 10) {
        console.log(`[SceneComposer] Auto-syncing videoSettings: ${mappedRatioStr}, duration: 10s`);
        updateSceneVideoSettings(activeScene.id, {
          aspectRatio: mappedRatioStr,
          duration: 10
        });
      }

      const currentStatus = activeScene.storyboardStatus || "Belum dibuat";
      const hasImages = activeScene.storyboardPanels && activeScene.storyboardPanels.some(p => p.imageUrl);
      
      const isMismatch = activeScene.aspectRatio !== projectAspectRatio || !activeScene.heroFrame?.imageUrl;

      if ((currentStatus === "Belum dibuat" && !hasImages) || (isMismatch && currentStatus !== "Sedang dibuat" && !isGeneratingStoryboard)) {
        console.log(`[SceneComposer] Auto-triggering storyboard/heroFrame generation for scene ${activeScene.id} due to initial check or mismatch`);
        generateStoryboard(activeScene.id);
      }
    }
  }, [activeScene, setActiveSceneId, generateStoryboard, projectAspectRatio, updateSceneVideoSettings, isGeneratingStoryboard]);

  if (!activeScene) {
    return (
      <div className="space-y-6">
        <Stepper current={5} />
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-center max-w-md mx-auto space-y-4">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Adegan tidak ditemukan untuk project ini.</h3>
          <SecondaryButton onClick={() => navigate("/scenes")}>
            Kembali ke Daftar Adegan
          </SecondaryButton>
        </div>
      </div>
    );
  }

  // Categories helper
  const [selectedCategory, setSelectedCategory] = React.useState("Semua");
  const categories = ["Semua", "Karakter", "Lokasi", "Style", "Referensi Tambahan"];

  // Filter references based on category
  const filteredReferences = activeScene.references.filter((ref) => {
    if (selectedCategory === "Semua") return true;
    return ref.category === selectedCategory;
  });

  // Checklist computation is fully automated now
  const currentGenerating = isGenerating[activeScene.id] || false;

  const handleManualUpload = async () => {
    // Simulate selection and upload using referenceService
    const mockFile = new File([""], "referensi_adegan.png", { type: "image/png" });
    const uploadedRef = await referenceService.uploadSceneReference(activeScene.id, mockFile, "Karakter");
    addReferenceToScene(activeScene.id, uploadedRef);
    alert("Gambar referensi berhasil ditambahkan untuk adegan ini!");
  };

  // Flow Navigation
  const nextScene = scenes.find((s) => s.sceneNumber === activeScene.sceneNumber + 1);
  const prevScene = scenes.find((s) => s.sceneNumber === activeScene.sceneNumber - 1);

  const handleNext = () => {
    if (nextScene) {
      navigate(`/scenes/${nextScene.id}`);
    } else {
      setStep(6); // Go to preview
      navigate("/preview");
    }
  };

  const handleBack = () => {
    if (prevScene) {
      navigate(`/scenes/${prevScene.id}`);
    } else {
      navigate("/scenes"); // back to list
    }
  };

  const isStale = activeScene && activeScene.contentHash !== projectContentHash;

  return (
    <div className="space-y-6">
      <Stepper current={5} />

      {/* Warning stale state guard callout */}
      {isStale && (
        <div className="mb-5 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">Peringatan: Adegan Kedaluwarsa (Stale)</h4>
              <p className="text-xs text-slate-400 mt-1">Adegan ini dideteksi berasal dari ide cerita lama dan tidak cocok dengan cerita aktif saat ini.</p>
            </div>
          </div>
          <PrimaryButton
            icon={RefreshCcw}
            onClick={async () => {
              setIsGeneratingStoryboard(true);
              try {
                const durationText = durationPresets[durationPresetIndex] || durationPresets[0];
                const toneText = tonePresets[tonePresetIndex] || tonePresets[0];
                const styleText = selectedPreset !== null ? presetCards[selectedPreset]?.title : "Sinematik";

                const generated = await projectService.generateProjectScenes(activeProjectId, {
                  narration: reviewNarration,
                  storyDraft,
                  selectedDuration: durationText,
                  selectedStyle: styleText,
                  selectedTone: toneText
                });
                createScenesFromNarration(generated);
                if (generated && generated.length > 0) {
                  navigate(`/scenes/${generated[0].id}`);
                } else {
                  navigate("/scenes");
                }
              } catch (err) {
                console.error(err);
                alert("Gagal menyusun adegan cerita.");
              } finally {
                setIsGeneratingStoryboard(false);
              }
            }}
          >
            Regenerate Daftar Adegan
          </PrimaryButton>
        </div>
      )}

      {/* Aspect Ratio Mismatch Warning callout */}
      {projectAspectRatio !== sceneAspectRatio && (
        <div className="mb-5 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">Rasio tidak sinkron dengan setup project</h4>
              <p className="text-xs text-slate-400 mt-1">Rasio project aktif ({projectAspectRatio}) berbeda dari rasio adegan/storyboard ({sceneAspectRatio}). Silakan generate ulang storyboard atau sesuaikan setup.</p>
            </div>
          </div>
          <PrimaryButton
            icon={RefreshCcw}
            onClick={handleGenerateStoryboard}
            disabled={isGeneratingStoryboard}
          >
            Generate Ulang Storyboard
          </PrimaryButton>
        </div>
      )}

      {/* Screen action header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between shrink-0">
        <div className="flex items-center gap-4">
          <SecondaryButton icon={ArrowLeft} onClick={handleBack}>
            Kembali
          </SecondaryButton>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
              Adegan {activeScene.sceneNumber} — {activeScene.title}
            </h1>
            <p className="mt-1 text-sm text-emerald-300 flex items-center">
              <CheckCircle2 className="mr-1 inline h-4 w-4" />
              {activeScene.isGenerated ? "Adegan sudah dibuat" : "Adegan siap direview"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <SecondaryButton
            icon={ImageIcon}
            onClick={handleGenerateStoryboard}
            disabled={isGeneratingStoryboard}
          >
            {isGeneratingStoryboard ? "Memproses..." : "Generate"}
          </SecondaryButton>
          <PrimaryButton
            icon={Video}
            disabled={!isChecklistComplete || currentGenerating}
            onClick={() => generateVideo(activeScene.id, activeProjectId, projectReferences || [])}
            className={cn(
              !isChecklistComplete && "opacity-40 cursor-not-allowed bg-slate-800"
            )}
          >
            {currentGenerating ? "Memproses..." : "Generate"}
          </PrimaryButton>
          <PrimaryButton icon={ArrowRight} onClick={handleNext}>
            Lanjut
          </PrimaryButton>
        </div>
      </div>

      {/* Scene summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <SummaryCard icon={Clapperboard} label="Judul Adegan" value={activeScene.title} />
        <SummaryCard icon={Mic2} label="Narasi Singkat" value={activeScene.summary} />
        <SummaryCard icon={Star} label="Emosi Utama" value="Tegang, dramatis" />
        <SummaryCard icon={Clock3} label="Durasi Adegan" value={`${activeScene.videoSettings.duration} detik`} />
        <SummaryCard icon={ShieldCheck} label="Tujuan Adegan" value="Meningkatkan ketegangan visual." />
      </div>

      {/* Workspace columns */}
      <div className="grid gap-5 xl:grid-cols-[330px_1fr_320px]">
        
        {/* Left column: References */}
        <Card className="bg-white/[0.05] h-fit">
          <h3 className="text-xl font-semibold text-white">Referensi Gambar</h3>
          <p className="mt-1 text-sm text-slate-400">Otomatis diambil dari Master Bible & narasi.</p>
          
          <div className="mt-4 flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition active:scale-[0.98]",
                  selectedCategory === cat
                    ? "bg-blue-500 text-white border border-blue-400/20"
                    : "border border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.05]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {filteredReferences.map((ref) => (
              <ReferenceThumb key={ref.id} label={ref.title} type={ref.type} />
            ))}
            {filteredReferences.length === 0 && (
              <div className="col-span-3 py-6 text-center text-xs text-slate-500">
                Tidak ada referensi kategori ini.
              </div>
            )}
          </div>

          <div
            onClick={handleManualUpload}
            className="mt-5 rounded-2xl border border-dashed border-white/20 bg-black/25 p-5 text-center cursor-pointer hover:border-violet-400/50 hover:bg-white/[0.02] transition"
          >
            <UploadCloud className="mx-auto h-8 w-8 text-violet-200" />
            <p className="mt-2 text-sm font-semibold text-white">Upload gambar tambahan</p>
            <p className="mt-1 text-[11px] text-slate-500 font-light">Opsional · PNG, JPG, WebP</p>
            <button
              type="button"
              className="mt-3 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Pilih Gambar
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Tips: Tambahkan referensi jika ingin wajah, lokasi, atau style lebih akurat.
          </p>
        </Card>

        {/* Center column: Storyboard, Instructions, & Output */}
        <div className="space-y-5">
          
          {/* Storyboard Panel */}
          <Card className="bg-white/[0.05]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">Storyboard Otomatis — 5 Beat Adegan</h3>
                <p className="mt-1 text-sm text-slate-400 font-light">
                  Dihasilkan otomatis dari narasi, referensi, dan gaya visual kamu.
                </p>
              </div>
              <SecondaryButton icon={Eye} onClick={() => alert("Membuka storyboard layar penuh...")}>
                Layar Penuh
              </SecondaryButton>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-100 p-4 text-zinc-950 shadow-inner">
              <div className="mb-3 grid grid-cols-2 sm:grid-cols-5 gap-px overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900 text-[11px] font-medium text-zinc-900">
                <div className="bg-zinc-100 p-2 font-black tracking-wider text-zinc-950">STORYBOARD</div>
                <div className="bg-zinc-100 p-2"><b>SCENE:</b> {activeScene.sceneNumber} — {activeScene.title.toUpperCase()}</div>
                <div className="bg-zinc-100 p-2"><b>DURASI:</b> {activeScene.videoSettings.duration} DETIK</div>
                <div className="bg-zinc-100 p-2"><b>LOKASI:</b> TEROWONGAN</div>
                <div className="bg-zinc-100 p-2"><b>WAKTU:</b> MALAM HUJAN</div>
              </div>
              {activeScene.storyboardStatus === "Sedang dibuat" ? (
                <div className="my-4 bg-zinc-900 border border-white/10 rounded-2xl p-6 text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-400">
                      {(activeScene as any).storyboardProgress?.message || "AI sedang membuat gambar adegan..."}
                    </span>
                    <span className="text-xs text-slate-400">
                      {Math.round(((((activeScene as any).storyboardProgress?.current || 0) / ((activeScene as any).storyboardProgress?.total || 6)) * 100))}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 transition-all duration-500"
                      style={{ width: `${(((activeScene as any).storyboardProgress?.current || 0) / ((activeScene as any).storyboardProgress?.total || 6)) * 100}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-400 italic">
                    {(activeScene as any).storyboardProgress?.detail || "AI sedang membuat gambar adegan satu per satu agar hasilnya lebih stabil."}
                  </p>

                  {/* Panel status list in progressive loading */}
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <p className="text-xs font-semibold text-slate-400">Status Antrean Gambar:</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Hero Frame */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[11px] font-medium text-slate-300">Hero Frame</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border", 
                          activeScene.heroFrame?.generationMode === 'real' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                          activeScene.heroFrame?.generationMode === 'fallback' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                          activeScene.heroFrame?.generationMode === 'rate_limited' ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse" :
                          "bg-slate-700/35 text-slate-400 border-slate-600/30"
                        )}>
                          {activeScene.heroFrame?.generationMode === 'real' ? 'REAL' :
                           activeScene.heroFrame?.generationMode === 'fallback' ? 'FALLBACK' :
                           activeScene.heroFrame?.generationMode === 'rate_limited' ? 'WAITING' : 'WAITING'}
                        </span>
                      </div>
                      
                      {/* Beats 1 to 5 */}
                      {(activeScene.storyboardPanels || []).map((panel, idx) => (
                        <div key={panel.id || idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-[11px] font-medium text-slate-300">Beat {idx + 1} ({panel.label})</span>
                          <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border", 
                            panel.generationMode === 'real' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                            panel.generationMode === 'fallback' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                            panel.generationMode === 'rate_limited' ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse" :
                            "bg-slate-700/35 text-slate-400 border-slate-600/30"
                          )}>
                            {panel.generationMode === 'real' ? 'REAL' :
                             panel.generationMode === 'fallback' ? 'FALLBACK' :
                             panel.generationMode === 'rate_limited' ? 'WAITING' : 'WAITING'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-3 rounded-lg border border-zinc-900 bg-white p-2 text-xs text-zinc-800">
                    <b>RINGKASAN ADEGAN:</b> {activeScene.summary}
                  </p>

                  {/* Storyboard Queue Control & Status Panel */}
                  <div className="mb-4 rounded-xl border border-zinc-950/20 bg-zinc-50 p-3 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-900/10 pb-2">
                      <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Antrean & Status Adegan</span>
                      <span className="text-[10px] text-zinc-500">Rasio Project: {projectAspectRatio}</span>
                    </div>

                    <p className="text-[11px] text-zinc-600 leading-normal font-medium italic">
                      “AI sedang membuat gambar adegan satu per satu agar hasilnya lebih stabil.”
                    </p>

                    {/* Badge Status Lists */}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Hero Frame */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-900/10">
                        <span className="text-[10px] font-bold text-zinc-700">Visual Utama (Hero)</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide uppercase border", 
                          activeScene.heroFrame?.generationMode === 'real' ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                          activeScene.heroFrame?.generationMode === 'fallback' ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
                          activeScene.heroFrame?.generationMode === 'rate_limited' ? "bg-rose-500/10 text-rose-700 border-rose-500/20 animate-pulse" :
                          "bg-zinc-200 text-zinc-500 border-zinc-300"
                        )}>
                          {activeScene.heroFrame?.generationMode === 'real' ? 'REAL' :
                           activeScene.heroFrame?.generationMode === 'fallback' ? 'FALLBACK' :
                           activeScene.heroFrame?.generationMode === 'rate_limited' ? 'WAITING' : 'WAITING'}
                        </span>
                      </div>

                      {/* Beats 1 to 5 */}
                      {(activeScene.storyboardPanels || []).map((panel, idx) => (
                        <div key={panel.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-900/10">
                          <span className="text-[10px] font-bold text-zinc-700">Beat {idx + 1}: {panel.label}</span>
                          <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide uppercase border", 
                            panel.generationMode === 'real' ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                            panel.generationMode === 'fallback' ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
                            panel.generationMode === 'rate_limited' ? "bg-rose-500/10 text-rose-700 border-rose-500/20 animate-pulse" :
                            "bg-zinc-200 text-zinc-500 border-zinc-300"
                          )}>
                            {panel.generationMode === 'real' ? 'REAL' :
                             panel.generationMode === 'fallback' ? 'FALLBACK' :
                             panel.generationMode === 'rate_limited' ? 'WAITING' : 'WAITING'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900/10">
                      <button
                        onClick={() => handleGenerateStoryboardMode('scratch')}
                        disabled={isGeneratingStoryboard}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 text-[10px] font-bold tracking-wide transition active:scale-95 shadow-sm"
                      >
                        Generate storyboard real
                      </button>

                      <button
                        onClick={() => handleGenerateStoryboardMode('resume')}
                        disabled={isGeneratingStoryboard || !activeScene.storyboardPanels.some(p => p.generationMode === 'real')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 text-[10px] font-bold tracking-wide transition active:scale-95 shadow-sm"
                      >
                        Lanjutkan generate
                      </button>

                      <button
                        onClick={() => handleGenerateStoryboardMode('fallback_only')}
                        disabled={isGeneratingStoryboard}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 text-[10px] font-bold tracking-wide transition active:scale-95 shadow-sm"
                      >
                        Pakai fallback sementara
                      </button>

                      <button
                        onClick={() => handleGenerateStoryboardMode('resume')}
                        disabled={isGeneratingStoryboard || !activeScene.storyboardPanels.some(p => p.generationMode === 'failed' || p.generationMode === 'rate_limited' || p.generationMode === 'fallback')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 text-[10px] font-bold tracking-wide transition active:scale-95 shadow-sm"
                      >
                        Generate ulang panel gagal
                      </button>
                    </div>
                  </div>

                  {/* Render Hero Frame if available */}
                  {activeScene.heroFrame?.imageUrl && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-zinc-900 bg-white p-3 text-zinc-950 shadow-md">
                      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-2">
                        HERO FRAME — VISUAL UTAMA
                      </p>
                      <div className={cn("relative rounded-lg overflow-hidden bg-zinc-900 mb-2", 
                        projectAspectRatio === "9:16" ? "aspect-[9/16] max-w-[240px] mx-auto" :
                        projectAspectRatio === "1:1" ? "aspect-square max-w-[280px] mx-auto" :
                        "aspect-video w-full max-h-[220px]"
                      )}>
                        <img
                          src={activeScene.heroFrame.imageUrl}
                          alt="Visual Utama Adegan"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-800 italic leading-normal font-medium">
                        {activeScene.heroFrame.description}
                      </p>
                    </div>
                  )}

                  {/* Provider Evidence Summary */}
                  {activeScene.storyboardPanels.length > 0 && (() => {
                    const realPanels = activeScene.storyboardPanels.filter((p: any) => isPanelReal(p)).length;
                    const fallbackPanels = activeScene.storyboardPanels.filter((p: any) => !isPanelReal(p)).length;
                    const total = activeScene.storyboardPanels.length;
                    if (fallbackPanels === total) {
                      return (
                        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-200 flex items-center justify-between">
                          <span>⚠ Provider Evidence: Storyboard sementara. Belum ada output GrokPI real.</span>
                          <button
                            onClick={handleGenerateStoryboard}
                            disabled={isGeneratingStoryboard}
                            className="rounded px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-[9px] font-bold transition"
                          >
                            Generate Storyboard
                          </button>
                        </div>
                      );
                    }
                    if (fallbackPanels > 0) {
                      return (
                        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-200 flex items-center justify-between">
                          <span>⚠ Provider Evidence: <b>{realPanels}/{total} REAL</b>, <b>{fallbackPanels}/{total} FALLBACK</b></span>
                          <button
                            onClick={handleGenerateStoryboard}
                            disabled={isGeneratingStoryboard}
                            className="rounded px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-[9px] font-bold transition"
                          >
                            Regenerasi Fallback
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[10px] text-emerald-200">
                        ✓ Provider Evidence: <b>Semua {total} panel REAL</b> dari GrokPI
                      </div>
                    );
                  })()}

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {activeScene.storyboardPanels.map((panel, idx) => (
                      <StoryboardCell key={panel.id} index={idx + 1} panel={panel} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Video Instruction & Scene Output grid */}
          <div className="grid gap-5 md:grid-cols-2">
            
            {/* Instruction Panel */}
            <Card className="bg-white/[0.05] flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Instruksi Video</h3>
                <p className="mt-1 text-sm text-slate-400">Berikan arahan sederhana untuk hasil video AI.</p>
                <textarea
                  className="mt-4 min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-relaxed text-slate-200 outline-none focus:border-blue-500/50"
                  value={localInstruction}
                  onFocus={() => setIsEditingInstruction(true)}
                  onBlur={() => {
                    setIsEditingInstruction(false);
                    saveInstruction(localInstruction);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalInstruction(val);
                    debouncedSaveInstruction(val);
                  }}
                />
                <div className="mt-1 text-right text-[10px] text-slate-500">
                  {localInstruction.length} / 1000
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1 pt-2 border-t border-white/5">
                <MiniButton onClick={() => useSuggestedInstruction(activeScene.id, "sinematik")}>
                  + Sinematik
                </MiniButton>
                <MiniButton onClick={() => useSuggestedInstruction(activeScene.id, "dramatis")}>
                  + Dramatis
                </MiniButton>
                <MiniButton onClick={() => useSuggestedInstruction(activeScene.id, "realistis")}>
                  + Realistis
                </MiniButton>
                <MiniButton onClick={() => useSuggestedInstruction(activeScene.id, "reset")}>
                  Reset
                </MiniButton>
              </div>
            </Card>

            <Card className="bg-white/[0.05] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Hasil Scene</h3>
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/20">
                    Output: {projectAspectRatio}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Preview hasil video untuk scene ini.</p>
                
                {activeScene.isGenerated && activeScene.previewVideoUrl && !autoChecklist.items.videoRatioSynced && (
                  <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-amber-300 text-xs flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                    <p className="font-semibold">Hasil video belum sesuai rasio project. Silakan generate ulang.</p>
                  </div>
                )}
                
                <div className={cn("mt-4 relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_45%_35%,rgba(255,255,255,0.1),transparent_16%),linear-gradient(135deg,#0f172a,#020617)] flex items-center justify-center",
                  projectAspectRatio === "9:16" ? "aspect-[9/16] max-w-[240px] mx-auto" :
                  projectAspectRatio === "1:1" ? "aspect-square max-w-[280px] mx-auto" :
                  "aspect-video w-full"
                )}>
                  {currentGenerating ? (
                    <div className="text-center p-6 w-full px-8">
                      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-3" />
                      <p className="text-xs text-slate-300 font-semibold mb-1">
                        {getProgressStepText(renderJobs[activeScene.id]?.progress || 0, renderJobs[activeScene.id]?.status || '')}
                      </p>
                      <p className="text-[10px] text-slate-400 mb-3 leading-normal italic font-medium">
                        “AI sedang menjaga tempo narasi, intonasi, dan ekspresi agar pas dalam 10 detik.”
                      </p>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-violet-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${renderJobs[activeScene.id]?.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  ) : renderJobs[activeScene.id]?.status === 'failed' ? (
                    <div className="text-center p-6 text-xs space-y-3">
                      <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
                      <p className="text-rose-300 font-semibold">Video gagal dibuat.</p>
                      <div className="text-slate-400 leading-normal space-y-1 text-left">
                        {(renderJobs[activeScene.id]?.errorMessage || 'GrokPI belum mengembalikan video final. Coba generate ulang.')
                          .split('\n')
                          .filter(Boolean)
                          .map((line: string, i: number) => (
                            <p key={i} className="flex items-start gap-1.5">
                              <span className="text-rose-400 shrink-0 mt-px">•</span>
                              <span>{line}</span>
                            </p>
                          ))}
                      </div>
                    </div>
                  ) : activeScene.isGenerated && activeScene.previewVideoUrl ? (
                    <>
                      <video
                        className="w-full h-full object-cover"
                        src={activeScene.previewVideoUrl}
                        controls
                        muted
                      />
                      <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
                        {activeScene.videoSettings.duration}s
                      </span>
                    </>
                  ) : (
                    <div className="text-center p-4 text-slate-500 text-xs">
                      <PlayCircle className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                      Belum dibuat. Selesaikan checklist dan klik Generate Video.
                    </div>
                  )}
                </div>
              </div>
 
              <div className="mt-4 flex gap-2 pt-4 border-t border-white/5">
                {!autoChecklist.items.videoRatioSynced && activeScene.isGenerated ? (
                  <PrimaryButton
                    icon={RefreshCcw}
                    disabled={currentGenerating}
                    onClick={() => generateVideo(activeScene.id, activeProjectId, projectReferences || [])}
                    className="flex-1 text-xs py-2 px-3 bg-amber-600 hover:bg-amber-500 border-amber-400/20 text-white"
                  >
                    Generate ulang sesuai rasio project
                  </PrimaryButton>
                ) : (
                  <>
                    <SecondaryButton
                      icon={RefreshCcw}
                      disabled={!isChecklistComplete || currentGenerating}
                      onClick={() => generateVideo(activeScene.id, activeProjectId, projectReferences || [])}
                      className="flex-1 text-xs py-2 px-3"
                    >
                      Coba lagi
                    </SecondaryButton>
                    <PrimaryButton
                      icon={CheckCircle2}
                      disabled={!activeScene.isGenerated}
                      onClick={() => handleNext()}
                      className="flex-1 text-xs py-2 px-3"
                    >
                      Gunakan hasil ini
                    </PrimaryButton>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right column: Settings & Checklist */}
        <div className="space-y-5">
          {/* Ratio Lock Information Card */}
          <Card className="bg-white/[0.05] border border-blue-500/20 bg-blue-500/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
              Aspect Ratio Lock Status
            </h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-slate-400 font-medium">Rasio Project:</span>
                <span className="font-bold text-slate-200">{projectAspectRatio} ({projectOrientation})</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-slate-400 font-medium">Rasio Hero Frame:</span>
                <span className="font-bold text-slate-200">{cleanHeroRatio}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-slate-400 font-medium">Rasio Storyboard:</span>
                <span className="font-bold text-slate-200">{cleanStoryboardRatio}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-slate-400 font-medium">Rasio Video Final:</span>
                <span className="font-bold text-blue-300">{cleanVideoSettingsRatio}</span>
              </div>
              <div className="flex justify-between items-center pb-0.5">
                <span className="text-slate-400 font-medium">Status Lock:</span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                  isRatioLockSynced ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300 animate-pulse"
                )}>
                  {ratioStatusLabel}
                </span>
              </div>
            </div>
          </Card>

          {/* Settings Panel */}
          <Card className="bg-white/[0.05]">
            <h3 className="text-xl font-semibold text-white">Pengaturan Video</h3>
            
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Mode</p>
              <div className="flex gap-2">
                {["Video", "Agent (Beta)"].map((mode, index) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-xs font-semibold transition active:scale-[0.98]",
                      index === 0 ? "border-blue-300/40 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-400"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Durasi Video</p>
                <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  <Lock className="h-3 w-3" /> Lock Project
                </span>
              </div>
              <div className="flex gap-1.5">
                {[10, 15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    disabled={!isMasterDuration(sec)}
                    onClick={() => updateSceneVideoSettings(activeScene.id, { duration: sec })}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-xs font-semibold transition active:scale-[0.98]",
                      activeScene.videoSettings.duration === sec
                        ? "border-blue-300/40 bg-blue-500 text-white font-bold"
                        : "border-white/5 bg-black/40 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                * Durasi dikunci 10 detik sesuai setup awal project.
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Kualitas</p>
              <div className="flex gap-1.5">
                {["Draft", "Standar", "Tinggi"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => updateSceneVideoSettings(activeScene.id, { quality: q as any })}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-xs font-semibold transition active:scale-[0.98]",
                      activeScene.videoSettings.quality === q
                        ? "border-blue-300/40 bg-blue-500 text-white font-bold"
                        : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.05]"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rasio Aspek</p>
                <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  <Lock className="h-3 w-3" /> Lock Project
                </span>
              </div>
              <div className="space-y-1.5">
                {["2:3 Tall", "3:2 Wide", "1:1 Square", "9:16 Vertical", "16:9 Widescreen"].map((ratio) => {
                  const isRatioAllowed = isMasterRatio(ratio);
                  const isSelected = activeScene.videoSettings.aspectRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      disabled={!isRatioAllowed}
                      onClick={() => updateSceneVideoSettings(activeScene.id, { aspectRatio: ratio as any })}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]",
                        isSelected
                          ? "border-blue-300/40 bg-blue-500 text-white font-bold"
                          : isRatioAllowed
                          ? "border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.05]"
                          : "border-white/5 bg-black/40 text-slate-500 cursor-not-allowed"
                      )}
                    >
                      <span>{ratio}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Audio & Emosi Panel */}
          <Card className="bg-white/[0.05] border border-white/5 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.1),transparent_50%)]">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-blue-450 shrink-0" />
              Audio & Emosi
            </h3>
            <p className="mt-1 text-xs text-slate-400 font-light">Pacing narasi, intonasi, dan penjiwaan karakter.</p>
            
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                <span className="text-slate-400">Durasi Scene</span>
                <span className="font-semibold text-slate-200">Exactly 10 detik</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                <span className="text-slate-400">Narasi Mulai</span>
                <span className="font-semibold text-slate-200">2.0s</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                <span className="text-slate-400">Dialog Paling Awal</span>
                <span className="font-semibold text-slate-200">5.5s</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                <span className="text-slate-400">Emosi Utama</span>
                <span className="font-bold text-blue-300 capitalize">
                  {(activeScene as any).emotionDirection?.primaryEmotion || "tense"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                <span className="text-slate-400">Intensitas Emosi</span>
                <span className="font-semibold text-amber-300 flex">
                  {Array.from({ length: (activeScene as any).emotionDirection?.emotionalIntensity || 3 }).map(() => "★").join("")}
                  {Array.from({ length: 5 - ((activeScene as any).emotionDirection?.emotionalIntensity || 3) }).map(() => "☆").join("")}
                </span>
              </div>
              <div className="flex flex-col border-b border-white/5 pb-2 text-xs gap-1">
                <span className="text-slate-400">Gaya Suara & Nada</span>
                <span className="font-semibold text-slate-200 italic leading-normal capitalize">
                  {(activeScene as any).audioDirection?.emotionTone || "measured, urgent but restrained"}
                </span>
              </div>
              <div className="flex flex-col pb-1 text-xs gap-1">
                <span className="text-slate-400">Kecepatan Bicara</span>
                <span className="font-semibold text-slate-200 italic leading-normal capitalize">
                  {(activeScene as any).audioDirection?.narrationPacing || "cinematic medium-slow, clear articulation"}
                </span>
              </div>
            </div>
          </Card>

          {/* Audio Narator Status Panel */}
          <Card className="bg-white/[0.05] border border-white/5 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.1),transparent_50%)]">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-violet-400 shrink-0" />
              Audio Narator
            </h3>
            <p className="mt-1 text-xs text-slate-400 font-light">Status kesiapan narasi untuk durasi 10 detik.</p>
            
            {(() => {
              const narrationText = activeScene.narration || '';
              const wordCount = narrationText.trim().split(/\s+/).filter(Boolean).length;
              const charCount = narrationText.length;
              const maxWords = 28;
              const maxChars = 180;
              const idealMaxWords = 24;
              
              let fitStatus: string;
              let fitBadgeClass: string;
              let fitMessage: string;
              
              if ((activeScene as any).requiresReview || (activeScene as any).compressionMode === 'template_fallback') {
                fitStatus = 'Perlu Review Narasi';
                fitBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                fitMessage = 'Narasi berhasil dipersingkat agar aman untuk 10 detik, tetapi perlu dicek ulang agar tetap sesuai cerita.';
              } else if (wordCount === 0) {
                fitStatus = 'Belum Ada';
                fitBadgeClass = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                fitMessage = 'Tulis narasi terlebih dahulu.';
              } else if (wordCount <= idealMaxWords && charCount <= 150) {
                fitStatus = 'Narasi Fit';
                fitBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
                fitMessage = 'Narasi aman untuk 10 detik.';
              } else if (wordCount <= maxWords && charCount <= maxChars) {
                fitStatus = 'Fit (Cepat)';
                fitBadgeClass = 'bg-blue-500/20 text-blue-300 border-blue-400/30';
                fitMessage = 'Narasi pas tapi pacing akan sedikit lebih cepat.';
              } else {
                fitStatus = 'Perlu Dipersingkat';
                fitBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
                fitMessage = 'Narasi terlalu panjang. Sistem akan mempersingkat tanpa mengubah inti cerita.';
              }

              let pacing: string;
              if (wordCount < 12) pacing = 'Medium-Slow (Cinematic)';
              else if (wordCount <= idealMaxWords) pacing = 'Medium (Natural)';
              else pacing = 'Medium-Fast (Clear)';

              return (
                <div className="mt-4 space-y-3">
                  {/* Fit Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Status Narasi</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${fitBadgeClass}`}>
                      {fitStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                    <span className="text-slate-400">Kata</span>
                    <span className={`font-semibold ${wordCount > maxWords ? 'text-amber-300' : 'text-slate-200'}`}>
                      {wordCount} / max {maxWords}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                    <span className="text-slate-400">Karakter</span>
                    <span className={`font-semibold ${charCount > maxChars ? 'text-amber-300' : 'text-slate-200'}`}>
                      {charCount} / max {maxChars}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                    <span className="text-slate-400">Pacing</span>
                    <span className="font-semibold text-slate-200">{pacing}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                    <span className="text-slate-400">Voice</span>
                    <span className="font-semibold text-violet-300">Gemini TTS</span>
                  </div>
                  <div className="flex justify-between items-center pb-1 text-xs">
                    <span className="text-slate-400">Durasi Target</span>
                    <span className="font-semibold text-slate-200">10 detik</span>
                  </div>

                  {/* User-friendly message */}
                  <div className={`rounded-lg border p-2 text-[10px] leading-normal ${
                    (activeScene as any).requiresReview || (activeScene as any).compressionMode === 'template_fallback'
                      ? 'border-rose-500/20 bg-rose-500/5 text-rose-200'
                      : wordCount === 0
                      ? 'border-slate-500/20 bg-slate-500/5 text-slate-400'
                      : wordCount > maxWords
                      ? 'border-amber-500/20 bg-amber-500/5 text-amber-200'
                      : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
                  }`}>
                    {fitMessage}
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Checklist Panel */}
          <Card className="bg-white/[0.05]">
            <h3 className="text-xl font-semibold text-white">Cek Sebelum Generate</h3>
            <p className="mt-1 text-xs text-slate-400 font-light">Pastikan semua bagian siap untuk hasil video terbaik.</p>
            
            <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {[
                { key: "narrationReady" as const, label: "Narasi siap" },
                { key: "referencesReady" as const, label: "Referensi lengkap" },
                { key: "storyboardReady" as const, label: "Storyboard siap" },
                { key: "instructionsReady" as const, label: "Instruksi video siap" },
                { key: "aspectRatioSelected" as const, label: "Rasio dipilih" },
                { key: "qualitySelected" as const, label: "Kualitas dipilih" },
                { key: "promptPackageReady" as const, label: "Paket prompt video siap" },
                { key: "audioTimingReady" as const, label: "Audio timing siap" },
                { key: "sceneEmotionReady" as const, label: "Emosi adegan siap" },
                { key: "heroFrameSynced" as const, label: "Hero frame sinkron" },
                { key: "storyboardSynced" as const, label: "Storyboard sinkron" },
                { key: "videoRatioSynced" as const, label: "Rasio video sinkron" },
                { key: "durationSynced" as const, label: "Durasi sinkron" },
                { key: "ttsAudioReady" as const, label: "Suara narator siap" },
                { key: "allScenesHaveTts" as const, label: "Semua adegan punya audio" },
                { key: "voiceIsUniform" as const, label: "Voice narator seragam" },
                { key: "narrationNotCutoff" as const, label: "Narasi tidak terpotong" }
              ].map((item) => {
                const checked = autoChecklist.items[item.key];
                const isSyncItem = ["heroFrameSynced", "storyboardSynced", "videoRatioSynced", "durationSynced"].includes(item.key);
                return (
                  <div
                    key={item.key}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-2.5 transition select-none",
                      checked 
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-100" 
                        : isSyncItem
                        ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
                        : "border-white/5 bg-black/20 text-slate-500"
                    )}
                  >
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0", 
                      checked ? "text-emerald-400" : isSyncItem ? "text-amber-400 animate-pulse" : "text-slate-650 text-slate-600"
                    )} />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                );
              })}
            </div>

            {autoChecklist.status === "ready" ? (
              <p className="mt-4 text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="h-4 w-4" /> Semua siap! Kamu bisa generate video.
              </p>
            ) : (!autoChecklist.items.allScenesHaveTts || !autoChecklist.items.ttsAudioReady || !autoChecklist.items.narrationNotCutoff) ? (
              <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-rose-200 text-xs flex flex-col gap-2">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 animate-bounce" />
                  <p className="font-semibold">Ada audio narasi adegan yang belum siap atau terpotong.</p>
                </div>
                <SecondaryButton
                  onClick={() => {
                    setStep(4);
                    navigate("/audio-prep");
                  }}
                  className="w-full text-[10px] py-1.5 px-2 border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold"
                >
                  Kembali ke Narasi Audio
                </SecondaryButton>
              </div>
            ) : autoChecklist.status === "warning" ? (
              <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-amber-200 text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300 animate-bounce" />
                <p className="font-semibold">Perbaiki rasio atau storyboard dulu sebelum generate video.</p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-500/5 border border-white/5 p-3 text-slate-400 text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-slate-500" />
                <p>Lengkapi bagian yang belum siap sebelum generate video.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
