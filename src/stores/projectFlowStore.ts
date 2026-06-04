import { create } from "zustand";
import { ReferenceItem, ProjectStep, SceneArtifact } from "../types";
import { steps } from "../data/appData";
import { useSceneComposerStore, initialStoryboardPanels } from "./sceneComposerStore";
import { useProjectLibraryStore } from "./projectLibraryStore";


interface ProjectFlowState {
  activeStep: number; // 0-indexed corresponding to the steps array
  steps: ProjectStep[];
  projectName: string;
  ideaText: string;
  selectedPreset: number | null; // index of presetCards
  aspectRatioIndex: number; // index of aspect ratios
  aspectRatio: string; // "16:9" | "9:16" | "1:1" | "21:9"
  orientation: string; // "landscape" | "vertical" | "square"
  resolutionPreset: string; // "1920x1080" | "1080x1920" | "1080x1080"
  durationPresetIndex: number; // index of durationPresets
  tonePresetIndex: number; // index of tonePresets
  references: ReferenceItem[];
  manualReferences: ReferenceItem[];
  reviewNarration: string;

  // New States
  activeProjectId: string;
  storyDraft: { opener: string; core: string; ending: string } | null;
  narration: string;
  opener: string;
  core: string;
  ending: string;
  scenes: SceneArtifact[];
  projectContentHash: string;
  generatedAt: string | null;
  source: string | null;
  exportResult: { mp4Url: string; subtitleUrl: string; packageZipUrl: string; manifestUrl: string } | null;


  loadingStates: {
    narration: "idle" | "loading" | "success" | "error";
    references: "idle" | "loading" | "success" | "error";
    scenes: "idle" | "loading" | "success" | "error";
  };
  errorMessages: {
    narration: string | null;
    references: string | null;
    scenes: string | null;
  };

  // Actions
  setStep: (stepIndex: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setProjectName: (name: string) => void;
  setIdeaText: (text: string) => void;
  setSelectedPreset: (presetIndex: number | null) => void;
  setAspectRatioIndex: (index: number) => void;
  setDurationPresetIndex: (index: number) => void;
  setTonePresetIndex: (index: number) => void;
  addReference: (ref: ReferenceItem) => void;
  removeReference: (id: string) => void;
  setReferences: (refs: ReferenceItem[]) => void;
  setReviewNarration: (text: string) => void;
  resetProject: () => void;

  // New Actions
  setStoryDraft: (draft: any) => void;
  setNarration: (narration: string) => void;
  setScenes: (scenes: SceneArtifact[]) => void;
  resetScenes: () => void;
  resetProjectArtifacts: () => void;
  createScenesFromNarration: (scenes: SceneArtifact[]) => void;

  setNarrationStatus: (status: "idle" | "loading" | "success" | "error", error?: string | null) => void;
  setReferencesStatus: (status: "idle" | "loading" | "success" | "error", error?: string | null) => void;
  setScenesStatus: (status: "idle" | "loading" | "success" | "error", error?: string | null) => void;
  addManualReference: (ref: ReferenceItem) => void;
  clearErrors: () => void;
  setExportResult: (result: { mp4Url: string; subtitleUrl: string; packageZipUrl: string; manifestUrl: string } | null) => void;
}

const initialSteps: ProjectStep[] = steps.map((s) => ({
  id: s.id,
  name: s.label,
  description: s.helper,
  route: s.id === "audio" ? "/audio-prep" : s.id === "scenes" ? "/scenes" : `/${s.id}`,
  isCompleted: false
}));

const calculateHash = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

export const useProjectFlowStore = create<ProjectFlowState>((set, get) => ({
  activeStep: 0,
  steps: initialSteps,
  projectName: "Proyek Cinematic Baru",
  ideaText: "",
  selectedPreset: null,
  aspectRatioIndex: 4, // 16:9 Widescreen as default
  aspectRatio: "16:9",
  orientation: "landscape",
  resolutionPreset: "1920x1080",
  durationPresetIndex: 0, // 6 adegan as default
  tonePresetIndex: 0, // Sinematik as default
  references: [], // start empty
  manualReferences: [],
  reviewNarration: "",

  // New state values
  activeProjectId: "project-123",
  storyDraft: null,
  narration: "",
  opener: "",
  core: "",
  ending: "",
  scenes: [],
  projectContentHash: "",
  generatedAt: null,
  source: null,
  exportResult: null,


  loadingStates: {
    narration: "idle",
    references: "idle",
    scenes: "idle"
  },
  errorMessages: {
    narration: null,
    references: null,
    scenes: null
  },

  setStep: (stepIndex) => set({ activeStep: stepIndex }),
  nextStep: () => set((state) => ({ activeStep: Math.min(state.activeStep + 1, steps.length - 1) })),
  prevStep: () => set((state) => ({ activeStep: Math.max(state.activeStep - 0, 0) })),
  setProjectName: (name) => set({ projectName: name }),
  setIdeaText: (text) => set((state) => {
    const hashVal = calculateHash(text + state.narration);
    return { ideaText: text, projectContentHash: hashVal };
  }),
  setSelectedPreset: (presetIndex) => set({ selectedPreset: presetIndex }),
  setAspectRatioIndex: (index) => set((state) => {
    let aspectRatio = "16:9";
    let orientation = "landscape";
    let resolutionPreset = "1920x1080";
    if (index === 4) {
      aspectRatio = "16:9";
      orientation = "landscape";
      resolutionPreset = "1920x1080";
    } else if (index === 3) {
      aspectRatio = "9:16";
      orientation = "vertical";
      resolutionPreset = "1080x1920";
    } else if (index === 2) {
      aspectRatio = "1:1";
      orientation = "square";
      resolutionPreset = "1080x1080";
    } else if (index === 0) {
      aspectRatio = "21:9";
      orientation = "landscape";
      resolutionPreset = "2560x1080";
    }
    
    // Sync ratio stale warning if there are already scenes
    let nextScenes = state.scenes;
    if (state.scenes && state.scenes.length > 0 && state.aspectRatio !== aspectRatio) {
      console.log(`[projectFlowStore] Aspect ratio changed from ${state.aspectRatio} to ${aspectRatio}. Marking scenes as stale.`);
      nextScenes = state.scenes.map(s => ({
        ...s,
        isStaleRatio: true
      }));
      // Sync to composer store
      setTimeout(() => {
        useSceneComposerStore.getState().setScenes(nextScenes);
      }, 0);
    }

    return {
      aspectRatioIndex: index,
      aspectRatio,
      orientation,
      resolutionPreset,
      scenes: nextScenes
    };
  }),
  setDurationPresetIndex: (index) => set({ durationPresetIndex: index }),
  setTonePresetIndex: (index) => set({ tonePresetIndex: index }),
  addReference: (ref) => set((state) => ({ references: [...state.references, ref] })),
  removeReference: (id) => set((state) => ({ references: state.references.filter((r) => r.id !== id) })),
  setReferences: (refs) => set({ references: refs }),
  setReviewNarration: (text) => set({ reviewNarration: text }),

  // New Action implementations
  setStoryDraft: (draft) => set({
    storyDraft: draft,
    opener: draft?.opener || "",
    core: draft?.core || "",
    ending: draft?.ending || "",
    generatedAt: new Date().toISOString(),
    source: "ai"
  }),
  setNarration: (narration) => set((state) => {
    const hashVal = calculateHash(state.ideaText + narration);
    return { narration, projectContentHash: hashVal };
  }),
  setScenes: (scenes) => set({ scenes }),
  resetScenes: () => set({ scenes: [] }),
  
  createScenesFromNarration: (scenes) => set((state) => {
    let mappedRatioStr = "16:9 Widescreen";
    if (state.aspectRatio === "9:16") mappedRatioStr = "9:16 Vertical";
    else if (state.aspectRatio === "1:1") mappedRatioStr = "1:1 Square";

    const mapped = scenes.map((s) => ({
      ...s,
      projectId: state.activeProjectId,
      contentHash: state.projectContentHash,
      aspectRatio: state.aspectRatio,
      orientation: state.orientation,
      resolutionPreset: state.resolutionPreset,
      durationSec: s.durationSec || 10,
      storyboardStatus: "Sedang dibuat" as const,
      videoSettings: {
        ...s.videoSettings,
        aspectRatio: mappedRatioStr,
        duration: s.videoSettings?.duration || 10,
        quality: s.videoSettings?.quality || "Tinggi"
      },
      storyboardPanels: s.storyboardPanels && s.storyboardPanels.length > 0
        ? s.storyboardPanels.map((sp: any) => ({ ...sp, imageUrl: sp.imageUrl || "" }))
        : initialStoryboardPanels(s.sceneNumber)
    }));
    
    // Sync into sceneComposerStore immediately
    useSceneComposerStore.getState().setScenes(mapped);
    
    return { scenes: mapped };
  }),

  setNarrationStatus: (status, error = null) => set((state) => ({
    loadingStates: { ...state.loadingStates, narration: status },
    errorMessages: { ...state.errorMessages, narration: error }
  })),
  setReferencesStatus: (status, error = null) => set((state) => ({
    loadingStates: { ...state.loadingStates, references: status },
    errorMessages: { ...state.errorMessages, references: error }
  })),
  setScenesStatus: (status, error = null) => set((state) => ({
    loadingStates: { ...state.loadingStates, scenes: status },
    errorMessages: { ...state.errorMessages, scenes: error }
  })),
  addManualReference: (ref) => set((state) => ({
    manualReferences: [...state.manualReferences, ref]
  })),
  setExportResult: (result) => set({ exportResult: result }),
  clearErrors: () => set({

    errorMessages: {
      narration: null,
      references: null,
      scenes: null
    }
  }),

  resetProjectArtifacts: () => {
    const newProjectId = `proj-${Date.now()}-${Math.round(Math.random() * 1e9).toString(36)}`;
    
    // Sync with project library store
    useProjectLibraryStore.getState().setActiveProjectId(newProjectId);

    // 1. Clear project flow states
    set({
      activeProjectId: newProjectId,
      projectName: "Proyek Cinematic Baru",
      ideaText: "",
      selectedPreset: null,
      aspectRatioIndex: 4,
      aspectRatio: "16:9",
      orientation: "landscape",
      resolutionPreset: "1920x1080",
      durationPresetIndex: 0,
      tonePresetIndex: 0,
      references: [],
      manualReferences: [],
      reviewNarration: "",
      storyDraft: null,
      narration: "",
      opener: "",
      core: "",
      ending: "",
      scenes: [],
      generatedAt: null,
      source: null,
      exportResult: null,
      loadingStates: {
        narration: "idle",
        references: "idle",
        scenes: "idle"
      },
      errorMessages: {
        narration: null,
        references: null,
        scenes: null
      }
    });

    // 2. Clear scene composer store
    useSceneComposerStore.getState().resetStore();
  },

  resetProject: () => {
    get().resetProjectArtifacts();
    set({ activeStep: 0 });
  }
}));

// Set up automatic synchronization from useSceneComposerStore to useProjectFlowStore
useSceneComposerStore.subscribe((state) => {
  const currentProjectScenes = useProjectFlowStore.getState().scenes;
  // Deep comparison or simple reference comparison to prevent infinite loop
  if (state.scenes !== currentProjectScenes) {
    useProjectFlowStore.setState({ scenes: state.scenes });
  }
});

// Set up automatic synchronization from useProjectFlowStore to useSceneComposerStore
useProjectFlowStore.subscribe((state) => {
  const currentComposerScenes = useSceneComposerStore.getState().scenes;
  if (state.scenes !== currentComposerScenes) {
    useSceneComposerStore.setState({ scenes: state.scenes });
  }
});

// Debounced Autosave Subscription
let autosaveTimeout: any = null;
const triggerAutosave = () => {
  const activeProjectId = useProjectFlowStore.getState().activeProjectId;
  if (!activeProjectId) return;

  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
  }

  autosaveTimeout = setTimeout(() => {
    useProjectLibraryStore.getState().saveActiveProjectSnapshot();
  }, 1200); // 1.2s debounce
};

let previousState = { ...useProjectFlowStore.getState() };

useProjectFlowStore.subscribe((state) => {
  // Check if important values changed to avoid saving loops on transient steps/loading states
  const hasChanged =
    state.activeProjectId !== previousState.activeProjectId ||
    state.projectName !== previousState.projectName ||
    state.ideaText !== previousState.ideaText ||
    state.selectedPreset !== previousState.selectedPreset ||
    state.aspectRatioIndex !== previousState.aspectRatioIndex ||
    state.durationPresetIndex !== previousState.durationPresetIndex ||
    state.tonePresetIndex !== previousState.tonePresetIndex ||
    state.references !== previousState.references ||
    state.manualReferences !== previousState.manualReferences ||
    state.reviewNarration !== previousState.reviewNarration ||
    state.narration !== previousState.narration ||
    state.opener !== previousState.opener ||
    state.core !== previousState.core ||
    state.ending !== previousState.ending ||
    state.scenes !== previousState.scenes ||
    state.exportResult !== previousState.exportResult;

  previousState = { ...state };

  if (hasChanged) {
    triggerAutosave();
  }
});

