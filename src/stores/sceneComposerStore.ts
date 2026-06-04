import { create } from "zustand";
import { SceneArtifact, ReferenceItem, StoryboardPanel, SceneVideoSettings, SceneChecklist, ScenePromptPackageValidation } from "../types";
import { sceneService, GenerateVideoPayload } from "../services/sceneService";
import { useProjectFlowStore } from "./projectFlowStore";
import { presetCards } from "../data/appData";

interface SceneComposerState {
  scenes: SceneArtifact[];
  activeSceneId: string;
  isGenerating: Record<string, boolean>;
  renderJobs: Record<string, {
    jobId: string;
    status: 'idle' | 'validating' | 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    videoUrl?: string;
    providerVideoUrl?: string;
    errorMessage?: string;
    scenePromptPackageId?: string;
    validation?: ScenePromptPackageValidation;
  }>;

  // Actions
  setActiveSceneId: (id: string) => void;
  updateSceneSummary: (sceneId: string, summary: string) => void;
  updateSceneNarration: (sceneId: string, narration: string) => void;
  updateSceneVideoSettings: (sceneId: string, settings: Partial<SceneVideoSettings>) => void;
  toggleChecklistItem: (sceneId: string, key: keyof SceneChecklist) => void;
  addReferenceToScene: (sceneId: string, ref: ReferenceItem) => void;
  removeReferenceFromScene: (sceneId: string, refId: string) => void;
  updateStoryboardPanel: (sceneId: string, panelId: string, panel: Partial<StoryboardPanel>) => void;
  updateVideoInstruction: (sceneId: string, text: string) => void;
  generateVideo: (sceneId: string, projectId: string, projectReferences: ReferenceItem[]) => Promise<void>;
  generateSceneVideo: (sceneId: string) => Promise<void>; // auto-resolves projectId & refs
  generateStoryboard: (sceneId: string, mode?: "scratch" | "resume" | "fallback_only") => Promise<void>;
  useSuggestedInstruction: (sceneId: string, keyword: string) => void;
  setScenes: (scenes: SceneArtifact[]) => void;
  resetStore: () => void;
}

export const initialStoryboardPanels = (sceneNum: number): StoryboardPanel[] => [
  {
    id: `sb-${sceneNum}-1`,
    panelNumber: 1,
    timeCode: "0.0–2.0s",
    shotType: "Wide shot",
    action: "Visual pembuka memperkenalkan suasana dan latar tempat adegan.",
    dialogue: undefined,
    sfx: "Suara latar suasana (ambient sound)",
    transition: "CUT",
    imageUrl: "",
    label: "Hook Visual"
  },
  {
    id: `sb-${sceneNum}-2`,
    panelNumber: 2,
    timeCode: "2.0–5.5s",
    shotType: "Medium shot",
    action: "Karakter utama terlihat mulai berinteraksi dengan lingkungannya.",
    dialogue: undefined,
    sfx: "Suara aksi/narasi mulai masuk",
    transition: "CUT",
    imageUrl: "",
    label: "Narasi Mulai"
  },
  {
    id: `sb-${sceneNum}-3`,
    panelNumber: 3,
    timeCode: "5.5–7.0s",
    shotType: "Close-up",
    action: "Fokus pada dialog atau aksi kunci yang menjadi konflik adegan.",
    dialogue: "Dialog utama...",
    sfx: "Suara dialog dan efek suara aksi",
    transition: "CUT",
    imageUrl: "",
    label: "Aksi / Dialog"
  },
  {
    id: `sb-${sceneNum}-4`,
    panelNumber: 4,
    timeCode: "7.0–8.8s",
    shotType: "Close-up",
    action: "Menyoroti ekspresi emosi karakter merespons kejadian sebelumnya.",
    dialogue: undefined,
    sfx: "Efek suara dramatis/fokus emosi",
    transition: "MATCH CUT",
    imageUrl: "",
    label: "Detail Emosi"
  },
  {
    id: `sb-${sceneNum}-5`,
    panelNumber: 5,
    timeCode: "8.8–10.0s",
    shotType: "Wide tracking shot",
    action: "Karakter bergerak atau kamera bergeser untuk transisi ke adegan berikutnya.",
    dialogue: undefined,
    sfx: "Suara latar meredup (fade out)",
    transition: "CUT TO NEXT SCENE",
    imageUrl: "",
    label: "Transisi"
  }
];

export const useSceneComposerStore = create<SceneComposerState>((set, get) => ({
  scenes: [],
  activeSceneId: "",
  isGenerating: {},
  renderJobs: {},

  setActiveSceneId: (id) => set({ activeSceneId: id }),

  updateSceneSummary: (sceneId, summary) => set((state) => ({
    scenes: state.scenes.map((s) => s.id === sceneId ? { ...s, summary } : s)
  })),

  updateSceneNarration: (sceneId, narration) => set((state) => ({
    scenes: state.scenes.map((s) => s.id === sceneId ? { ...s, narration } : s)
  })),

  updateSceneVideoSettings: (sceneId, settings) => set((state) => ({
    scenes: state.scenes.map((s) =>
      s.id === sceneId
        ? { ...s, videoSettings: { ...s.videoSettings, ...settings } }
        : s
    )
  })),

  toggleChecklistItem: (sceneId, key) => set((state) => ({
    scenes: state.scenes.map((s) => {
      if (s.id === sceneId) {
        const nextChecklist = { ...s.checklist, [key]: !s.checklist[key] };
        return { ...s, checklist: nextChecklist };
      }
      return s;
    })
  })),

  addReferenceToScene: (sceneId, ref) => set((state) => ({
    scenes: state.scenes.map((s) =>
      s.id === sceneId ? { ...s, references: [...s.references, ref] } : s
    )
  })),

  removeReferenceFromScene: (sceneId, refId) => set((state) => ({
    scenes: state.scenes.map((s) =>
      s.id === sceneId ? { ...s, references: s.references.filter((r) => r.id !== refId) } : s
    )
  })),

  updateStoryboardPanel: (sceneId, panelId, panelUpdates) => set((state) => ({
    scenes: state.scenes.map((s) =>
      s.id === sceneId
        ? {
            ...s,
            storyboardPanels: s.storyboardPanels.map((p) =>
              p.id === panelId ? { ...p, ...panelUpdates } : p
            )
          }
        : s
    )
  })),

  updateVideoInstruction: (sceneId, videoInstruction) => set((state) => ({
    scenes: state.scenes.map((s) => s.id === sceneId ? { ...s, videoInstruction } : s)
  })),

  useSuggestedInstruction: (sceneId, keyword) => set((state) => ({
    scenes: state.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      let extra = "";
      if (keyword === "sinematik") extra = " Buat visual cinematic, anamorphic lens, lighting neon remang-remang.";
      if (keyword === "dramatis") extra = " Berikan efek dramatis tinggi, kontras warna tajam, slow motion pada cipratan air.";
      if (keyword === "realistis") extra = " Pastikan detail ultra realistis, bayangan aspal basah nyata, pantulan lampu depan detail.";
      if (keyword === "reset") {
        return {
          ...s,
          videoInstruction: "Tulis instruksi kustom di sini untuk memandu AI generator."
        };
      }
      return {
        ...s,
        videoInstruction: s.videoInstruction + extra
      };
    })
  })),

  /**
   * Generates video for a scene using the full ScenePromptPackage pipeline.
   * Collects ALL scene artifacts: references, storyboard panels, hero frame,
   * settings, narration, and previous scene video URL.
   */
  generateVideo: async (sceneId, projectId, projectReferences) => {
    const activeState = useSceneComposerStore.getState();
    const scene = activeState.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // 1. Set validating status
    set((state) => ({
      isGenerating: { ...state.isGenerating, [sceneId]: true },
      renderJobs: {
        ...state.renderJobs,
        [sceneId]: {
          jobId: '',
          status: 'validating',
          progress: 5
        }
      }
    }));

    try {
      // 2. Collect all references: scene-level + project-level
      const allReferences = [
        ...scene.references,
        ...(projectReferences || [])
      ];

      // 3. Find previous scene's video URL for continuity
      const sortedScenes = [...activeState.scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
      const prevScene = sortedScenes.find((s) => s.sceneNumber === scene.sceneNumber - 1);
      const previousSceneVideoUrl = prevScene?.previewVideoUrl || null;

      // 4. Build full payload
      const payload: GenerateVideoPayload = {
        projectId,
        videoInstruction: scene.videoInstruction,
        settings: {
          durationSec: scene.videoSettings.duration,
          quality: scene.videoSettings.quality,
          aspectRatio: scene.videoSettings.aspectRatio
        },
        scene: {
          sceneNumber: scene.sceneNumber,
          title: scene.title,
          narration: scene.narration,
          summary: scene.summary
        },
        references: allReferences,
        storyboardPanels: scene.storyboardPanels,
        heroFrame: scene.heroFrame || null,
        storyboardImageUrl: scene.storyboardImageUrl || null,
        previousSceneVideoUrl
      };

      console.log(`[SceneComposer] Generating video for scene ${sceneId}`, {
        referencesCount: allReferences.length,
        panelsCount: scene.storyboardPanels.length,
        hasHeroFrame: !!scene.heroFrame?.imageUrl,
        hasPreviousVideo: !!previousSceneVideoUrl
      });

      // 5. Send to backend — backend handles full pipeline
      const response = (await sceneService.generateSceneVideo(sceneId, payload)) as any;

      // 6. Set queued status with validation info and store audio/emotion details in scene
      set((state) => ({
        scenes: state.scenes.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                audioDirection: response.audioDirection || s.audioDirection,
                emotionDirection: response.emotionDirection || s.emotionDirection,
                compressedNarration: response.compressedNarration || s.compressedNarration,
                audioValidation: response.audioValidation || s.audioValidation
              }
            : s
        ),
        renderJobs: {
          ...state.renderJobs,
          [sceneId]: {
            jobId: response.jobId,
            status: 'queued',
            progress: 15,
            scenePromptPackageId: response.scenePromptPackageId,
            validation: response.validation
          }
        }
      }));

      // 7. Polling loop
      let currentProgress = 15;
      const pollInterval = setInterval(async () => {
        try {
          const check = await sceneService.checkVideoGenerationStatus(response.jobId);

          if (check.status === 'completed' && check.videoUrl) {
            clearInterval(pollInterval);
            set((state) => ({
              isGenerating: { ...state.isGenerating, [sceneId]: false },
              renderJobs: {
                ...state.renderJobs,
                [sceneId]: {
                  ...state.renderJobs[sceneId],
                  status: 'completed',
                  progress: 100,
                  videoUrl: check.videoUrl,
                  providerVideoUrl: check.providerVideoUrl
                }
              },
              scenes: state.scenes.map((s) =>
                s.id === sceneId
                  ? {
                      ...s,
                      isGenerated: true,
                      status: 'Sudah digenerate',
                      previewVideoUrl: check.videoUrl
                    }
                  : s
              )
            }));
          } else if (check.status === 'failed') {
            clearInterval(pollInterval);
            set((state) => ({
              isGenerating: { ...state.isGenerating, [sceneId]: false },
              renderJobs: {
                ...state.renderJobs,
                [sceneId]: {
                  ...state.renderJobs[sceneId],
                  status: 'failed',
                  progress: 0,
                  errorMessage: check.errorMessage || 'Video gagal dibuat. GrokPI belum mengembalikan video final. Coba generate ulang.'
                }
              }
            }));
          } else {
            // Update status (queued / processing) and increment progress gradually corresponding to steps
            currentProgress = Math.min(currentProgress + 10, 95);
            set((state) => ({
              renderJobs: {
                ...state.renderJobs,
                [sceneId]: {
                  ...state.renderJobs[sceneId],
                  status: check.status as any,
                  progress: currentProgress
                }
              }
            }));
          }
        } catch (pollErr) {
          console.error("[SceneComposer] Error during status polling:", pollErr);
        }
      }, 3000);

    } catch (err: any) {
      console.error("[SceneComposer] Gagal memulai pembuatan video:", err);
      set((state) => ({
        isGenerating: { ...state.isGenerating, [sceneId]: false },
        renderJobs: {
          ...state.renderJobs,
          [sceneId]: {
            jobId: '',
            status: 'failed',
            progress: 0,
            errorMessage: err.message || 'Video gagal dibuat. Coba generate ulang.'
          }
        }
      }));
    }
  },

  /**
   * Convenient wrapper: generate video for a scene using project context from projectFlowStore.
   * Used by ScenesListPage render queue without needing to pass explicit projectId/references.
   */
  generateSceneVideo: async (sceneId: string) => {
    const projectState = useProjectFlowStore.getState();
    const projectId = projectState.activeProjectId;
    const projectReferences = [
      ...(projectState.references || []),
      ...(projectState.manualReferences || [])
    ];
    return get().generateVideo(sceneId, projectId, projectReferences);
  },

  generateStoryboard: async (sceneId, mode = "scratch") => {
    const scene = get().scenes.find((s: SceneArtifact) => s.id === sceneId);
    if (!scene) return;

    // Set storyboard status to "Sedang dibuat"
    set((state) => ({
      scenes: state.scenes.map((s: SceneArtifact) =>
        s.id === sceneId ? { ...s, storyboardStatus: "Sedang dibuat" as const } : s
      )
    }));

    try {
      const projectState = useProjectFlowStore.getState();
      const styleText = presetCards[projectState.selectedPreset || 0]?.title || "Sinematik";

      console.log(`[sceneComposerStore] generateStoryboard: sceneId=${sceneId} ratio=${projectState.aspectRatio} mode=${mode}`);

      const result = await sceneService.generateSceneStoryboard(sceneId, {
        projectId: projectState.activeProjectId,
        sceneId,
        aspectRatio: projectState.aspectRatio,
        orientation: projectState.orientation,
        resolutionPreset: projectState.resolutionPreset,
        narration: scene.narration,
        references: scene.references || [],
        visualStyle: styleText,
        durationSec: 10,
        mode
      });

      // Update store state with generated storyboard panels and hero frame
      set((state) => ({
        scenes: state.scenes.map((s: SceneArtifact) => {
          if (s.id === sceneId) {
            const panels = result.panels || [];
            const nextPanels = s.storyboardPanels.map((sp: StoryboardPanel) => {
              const p = panels.find((x: any) => x.order === sp.panelNumber || x.panelNumber === sp.panelNumber) || {};
              return {
                ...sp,
                timeCode: p.timeRange || p.timeCode || sp.timeCode,
                shotType: p.shot || p.shotType || sp.shotType,
                action: p.action || sp.action,
                dialogue: p.dialogue,
                sfx: p.sfx || sp.sfx,
                transition: p.transition || sp.transition,
                imageUrl: p.imageUrl || sp.imageUrl,
                label: p.label || sp.label,
                timeRange: p.timeRange || p.timeCode || sp.timeRange,
                shot: p.shot || p.shotType || sp.shot
              };
            });
            return {
              ...s,
              aspectRatio: result.aspectRatio || s.aspectRatio,
              orientation: result.orientation || s.orientation,
              storyboardStatus: "Siap dicek" as const,
              storyboardImageUrl: result.storyboardImageUrl || s.storyboardImageUrl,
              heroFrame: result.heroFrame || s.heroFrame,
              storyboardPanels: nextPanels,
              checklist: { ...s.checklist, storyboardReady: true }
            };
          }
          return s;
        })
      }));
    } catch (err) {
      console.error("[SceneComposerStore] generateStoryboard error:", err);
      set((state) => ({
        scenes: state.scenes.map((s: SceneArtifact) =>
          s.id === sceneId ? { ...s, storyboardStatus: "Gagal, coba lagi" as const } : s
        )
      }));
    }
  },

  setScenes: (scenes) => set({
    scenes,
    activeSceneId: scenes[0]?.id || ""
  }),

  resetStore: () => set({
    scenes: [],
    activeSceneId: "",
    isGenerating: {},
    renderJobs: {}
  })
}));
