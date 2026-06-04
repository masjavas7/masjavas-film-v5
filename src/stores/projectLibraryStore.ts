import { create } from "zustand";
import { projectService, ProjectMetadata } from "../services/projectService";
import { useProjectFlowStore } from "./projectFlowStore";
import { useSceneComposerStore } from "./sceneComposerStore";

interface ProjectLibraryState {
  projects: ProjectMetadata[];
  activeProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  localDraftToSync: any | null;

  loadProjects: () => Promise<void>;
  createNewProject: (title: string, topic: string) => Promise<string>;
  openProject: (projectId: string) => Promise<string>;
  saveActiveProjectSnapshot: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setActiveProjectId: (id: string | null) => void;
  setAutosaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  checkLocalDraftSync: () => void;
  syncLocalDraftToServer: () => Promise<void>;
  discardLocalDraft: () => void;
  duplicateProject: (projectId: string) => Promise<string>;
  renameProject: (projectId: string, newTitle: string) => Promise<void>;
  restoreBackup: (projectId: string) => Promise<void>;
}

const LOCAL_ACTIVE_DRAFT_KEY = "masjavas-active-project-draft";
const LOCAL_LIST_CACHE_KEY = "masjavas-project-list-cache";

// Continue Flow path mapper
const getContinuePath = (p: any): string => {
  const ideaText = p.story?.ideaText || p.ideaText || '';
  if (!ideaText || ideaText.trim().length === 0) {
    return "/idea";
  }

  // Check if presets are fully selected
  // selectedPreset refers to the index of presetCards.
  // If selectedPreset is null, go to presets
  if (p.selectedPreset === null || p.selectedPreset === undefined) {
    return "/presets";
  }

  // Check if references are present
  const refs = p.references || [];
  const manualRefs = p.manualReferences || [];
  if (refs.length === 0 && manualRefs.length === 0) {
    return "/references";
  }

  // Check if narration has been generated/approved
  const narration = p.story?.narration || p.narration || '';
  if (!narration || narration.trim().length === 0) {
    return "/review";
  }

  const scenes = p.scenes || [];
  if (scenes.length === 0) {
    return "/scenes";
  }

  // Check if at least 1 video scene is generated or previewable
  const hasVideo = scenes.some((s: any) => s.isGenerated || s.previewVideoUrl);
  if (hasVideo) {
    // Check if all scenes are approved/disetujui
    const allApproved = scenes.every((s: any) => s.status === 'Disetujui' || s.status === 'Sudah digenerate');
    if (allApproved) {
      return "/export";
    }
    return "/preview";
  }

  return "/scenes";
};

export const useProjectLibraryStore = create<ProjectLibraryState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  isLoading: false,
  error: null,
  autosaveStatus: 'idle',
  localDraftToSync: null,

  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setAutosaveStatus: (status) => set({ autosaveStatus: status }),

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const list = await projectService.listProjects();
      set({ projects: list, isLoading: false });
      localStorage.setItem(LOCAL_LIST_CACHE_KEY, JSON.stringify(list));
      get().checkLocalDraftSync();
    } catch (err) {
      console.warn("[projectLibraryStore] Server offline, loading local projects cache...", err);
      const cached = localStorage.getItem(LOCAL_LIST_CACHE_KEY);
      if (cached) {
        set({ projects: JSON.parse(cached), isLoading: false });
        get().checkLocalDraftSync();
      } else {
        set({ projects: [], isLoading: false, error: "Gagal memuat daftar project dari server." });
      }
    }
  },

  createNewProject: async (title, topic) => {
    set({ isLoading: true, error: null });
    const projectId = `proj-${Date.now()}-${Math.round(Math.random() * 1e9).toString(36)}`;
    try {
      await projectService.createProject({ id: projectId, title, topic });
      set({ activeProjectId: projectId, isLoading: false });

      // 1. Reset all stores to fresh defaults
      useProjectFlowStore.getState().resetProjectArtifacts();
      useSceneComposerStore.getState().resetStore();

      // 2. Set newly initialized parameters in project flow store
      useProjectFlowStore.setState({
        activeProjectId: projectId,
        projectName: title,
        ideaText: topic,
        activeStep: 1
      });

      // Pemicu save snapshot instan
      await get().saveActiveProjectSnapshot();

      return projectId;
    } catch (err) {
      console.error("[projectLibraryStore] Failed to create new project:", err);
      // Fallback local-only creation
      set({ activeProjectId: projectId, isLoading: false });
      useProjectFlowStore.getState().resetProjectArtifacts();
      useSceneComposerStore.getState().resetStore();
      useProjectFlowStore.setState({
        activeProjectId: projectId,
        projectName: title,
        ideaText: topic,
        activeStep: 1
      });
      
      // Save draft into localStorage
      get().saveActiveProjectSnapshot();
      return projectId;
    }
  },

  openProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      // Touch project in background
      projectService.touchProject(projectId).catch(() => {});

      const p = await projectService.getProject(projectId);
      set({ activeProjectId: projectId, isLoading: false });

      // Reset and Hydrate flow store
      useProjectFlowStore.getState().resetProjectArtifacts();
      useProjectFlowStore.setState({
        activeProjectId: p.id,
        projectName: p.title || p.projectName || "Proyek Tanpa Nama",
        ideaText: p.story?.ideaText || p.ideaText || "",
        selectedPreset: p.selectedPreset !== undefined ? p.selectedPreset : null,
        aspectRatioIndex: p.aspectRatioIndex !== undefined ? p.aspectRatioIndex : 4,
        aspectRatio: p.settings?.aspectRatio || p.aspectRatio || "16:9",
        orientation: p.settings?.orientation || p.orientation || "landscape",
        resolutionPreset: p.settings?.resolutionPreset || p.resolutionPreset || "1920x1080",
        durationPresetIndex: p.durationPresetIndex !== undefined ? p.durationPresetIndex : 0,
        tonePresetIndex: p.tonePresetIndex !== undefined ? p.tonePresetIndex : 0,
        references: p.references || [],
        manualReferences: p.manualReferences || [],
        reviewNarration: p.story?.narration || p.narration || "",
        narration: p.story?.narration || p.narration || "",
        opener: p.story?.opener || p.opener || "",
        core: p.story?.core || p.core || "",
        ending: p.story?.ending || p.ending || "",
        projectContentHash: p.story?.projectContentHash || p.projectContentHash || "",
        scenes: p.scenes || [],
        exportResult: p.exportResult || null
      });

      // Hydrate composer store
      // Convert processing renders to queued so they re-poll
      const scenes = p.scenes || [];
      const renderJobs: Record<string, any> = {};
      scenes.forEach((s: any) => {
        if (s.isGenerated && s.previewVideoUrl) {
          renderJobs[s.id] = {
            sceneId: s.id,
            status: "completed",
            progress: 100,
            videoUrl: s.previewVideoUrl
          };
        }
      });

      useSceneComposerStore.setState({
        scenes: scenes,
        activeSceneId: scenes[0]?.id || "",
        renderJobs: renderJobs
      });


      // Map to correct navigations path
      const targetPath = getContinuePath(p);
      console.log(`[projectLibraryStore] Opening project ${projectId}. Routing to next step: ${targetPath}`);
      return targetPath;
    } catch (err) {
      console.error(`[projectLibraryStore] Failed to open project ${projectId}:`, err);
      // Fallback local localStorage check
      const cachedDraftStr = localStorage.getItem(LOCAL_ACTIVE_DRAFT_KEY);
      if (cachedDraftStr) {
        try {
          const cached = JSON.parse(cachedDraftStr);
          if (cached.activeProjectId === projectId) {
            console.log("[projectLibraryStore] Hydrating from local storage cache fallback...");
            set({ activeProjectId: projectId, isLoading: false });
            
            useProjectFlowStore.setState(cached.projectFlow);
            useSceneComposerStore.setState(cached.sceneComposer);
            
            return getContinuePath(cached);
          }
        } catch (e) {
          console.error("Local draft hydration error:", e);
        }
      }

      set({ isLoading: false, error: "Gagal memuat detail project dari server." });
      throw err;
    }
  },

  saveActiveProjectSnapshot: async () => {
    const id = get().activeProjectId || useProjectFlowStore.getState().activeProjectId;
    if (!id) return;

    set({ autosaveStatus: 'saving' });

    const flowState = useProjectFlowStore.getState();
    const composerState = useSceneComposerStore.getState();

    // Map state to database entity structure
    const snapshot = {
      id: id,
      projectName: flowState.projectName,
      title: flowState.projectName,
      topic: flowState.ideaText,
      status: flowState.scenes.length > 0 && flowState.scenes.every(s => s.status === 'Disetujui' || s.status === 'Sudah digenerate') ? 'ready_to_export' : 'in_progress',
      aspectRatioIndex: flowState.aspectRatioIndex,
      selectedPreset: flowState.selectedPreset,
      durationPresetIndex: flowState.durationPresetIndex,
      tonePresetIndex: flowState.tonePresetIndex,
      aspectRatio: flowState.aspectRatio,
      orientation: flowState.orientation,
      resolutionPreset: flowState.resolutionPreset,
      ideaText: flowState.ideaText,
      story: {
        ideaText: flowState.ideaText,
        narration: flowState.narration,
        opener: flowState.opener,
        core: flowState.core,
        ending: flowState.ending,
        projectContentHash: flowState.projectContentHash
      },
      narration: flowState.narration,
      opener: flowState.opener,
      core: flowState.core,
      ending: flowState.ending,
      projectContentHash: flowState.projectContentHash,
      references: flowState.references,
      manualReferences: flowState.manualReferences,
      scenes: composerState.scenes,
      exportResult: flowState.exportResult,
      settings: {
        aspectRatio: flowState.aspectRatio,
        orientation: flowState.orientation,
        resolutionPreset: flowState.resolutionPreset,
        tone: tonePresets[flowState.tonePresetIndex] || 'Sinematik',
        style: flowState.selectedPreset !== null ? presetCards[flowState.selectedPreset]?.title : 'Sinematik',
        totalScenes: flowState.scenes.length || 6,
        durationPerSceneSec: 10
      }
    };

    try {
      // 1. Try to post snapshot to the server database
      await projectService.saveProjectSnapshot(id, snapshot);
      set({ autosaveStatus: 'saved' });

      // Save in local active draft as backup too
      localStorage.setItem(LOCAL_ACTIVE_DRAFT_KEY, JSON.stringify({
        activeProjectId: id,
        updatedAt: new Date().toISOString(),
        projectFlow: {
          activeProjectId: flowState.activeProjectId,
          projectName: flowState.projectName,
          ideaText: flowState.ideaText,
          selectedPreset: flowState.selectedPreset,
          aspectRatioIndex: flowState.aspectRatioIndex,
          aspectRatio: flowState.aspectRatio,
          orientation: flowState.orientation,
          resolutionPreset: flowState.resolutionPreset,
          durationPresetIndex: flowState.durationPresetIndex,
          tonePresetIndex: flowState.tonePresetIndex,
          references: flowState.references,
          manualReferences: flowState.manualReferences,
          reviewNarration: flowState.reviewNarration,
          narration: flowState.narration,
          opener: flowState.opener,
          core: flowState.core,
          ending: flowState.ending,
          projectContentHash: flowState.projectContentHash,
          scenes: flowState.scenes,
          exportResult: flowState.exportResult
        },
        sceneComposer: {
          scenes: composerState.scenes
        }
      }));
    } catch (err) {
      console.warn(`[projectLibraryStore] Server offline, caching draft in localStorage for projectId: ${id}`);
      set({ autosaveStatus: 'error' });

      // Enforce local draft persistence so nothing is lost
      localStorage.setItem(LOCAL_ACTIVE_DRAFT_KEY, JSON.stringify({
        activeProjectId: id,
        updatedAt: new Date().toISOString(),
        projectFlow: {
          activeProjectId: flowState.activeProjectId,
          projectName: flowState.projectName,
          ideaText: flowState.ideaText,
          selectedPreset: flowState.selectedPreset,
          aspectRatioIndex: flowState.aspectRatioIndex,
          aspectRatio: flowState.aspectRatio,
          orientation: flowState.orientation,
          resolutionPreset: flowState.resolutionPreset,
          durationPresetIndex: flowState.durationPresetIndex,
          tonePresetIndex: flowState.tonePresetIndex,
          references: flowState.references,
          manualReferences: flowState.manualReferences,
          reviewNarration: flowState.reviewNarration,
          narration: flowState.narration,
          opener: flowState.opener,
          core: flowState.core,
          ending: flowState.ending,
          projectContentHash: flowState.projectContentHash,
          scenes: flowState.scenes,
          exportResult: flowState.exportResult
        },
        sceneComposer: {
          scenes: composerState.scenes
        }
      }));
    }
  },

  deleteProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      await projectService.deleteProject(projectId);
      
      // Update list locally
      set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId),
        isLoading: false
      }));

      // Update localStorage cache list
      const cached = localStorage.getItem(LOCAL_LIST_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        localStorage.setItem(LOCAL_LIST_CACHE_KEY, JSON.stringify(parsed.filter((p: any) => p.id !== projectId)));
      }

      // Reset aman jika menghapus project aktif
      if (get().activeProjectId === projectId || useProjectFlowStore.getState().activeProjectId === projectId) {
        set({ activeProjectId: null });
        useProjectFlowStore.getState().resetProjectArtifacts();
        useSceneComposerStore.getState().resetStore();
        localStorage.removeItem(LOCAL_ACTIVE_DRAFT_KEY);
        if (get().localDraftToSync?.activeProjectId === projectId) {
          set({ localDraftToSync: null });
        }
      }
    } catch (err) {
      console.error(`[projectLibraryStore] Failed to delete project ${projectId}:`, err);
      set({ isLoading: false, error: "Gagal menghapus project dari server." });
      throw err;
    }
  },

  checkLocalDraftSync: () => {
    const draftStr = localStorage.getItem(LOCAL_ACTIVE_DRAFT_KEY);
    if (!draftStr) {
      set({ localDraftToSync: null });
      return;
    }
    try {
      const draft = JSON.parse(draftStr);
      const draftId = draft.activeProjectId;
      if (!draftId) {
        set({ localDraftToSync: null });
        return;
      }

      // Cocokkan dengan metadata server yang termuat
      const serverProj = get().projects.find(p => p.id === draftId);
      if (!serverProj) {
        // Draft baru di lokal (tidak ada di daftar server), tawarkan sinkronisasi
        set({ localDraftToSync: draft });
        return;
      }

      const serverUpdatedAt = new Date(serverProj.updatedAt).getTime();
      const draftUpdatedAt = draft.updatedAt ? new Date(draft.updatedAt).getTime() : 0;

      // Jika draf lokal lebih baru, tampilkan tawaran sinkronisasi
      if (draftUpdatedAt > serverUpdatedAt) {
        console.log(`[projectLibraryStore] Draf lokal lebih baru dari server (${draft.updatedAt} > ${serverProj.updatedAt}). Menampilkan banner.`);
        set({ localDraftToSync: draft });
      } else {
        set({ localDraftToSync: null });
      }
    } catch (e) {
      console.error("[projectLibraryStore] checkLocalDraftSync failed:", e);
      set({ localDraftToSync: null });
    }
  },

  syncLocalDraftToServer: async () => {
    const draft = get().localDraftToSync;
    if (!draft) return;

    set({ isLoading: true, error: null });
    try {
      const id = draft.activeProjectId;

      // Hidrasikan store lokal secara instan
      useProjectFlowStore.getState().resetProjectArtifacts();
      useProjectFlowStore.setState(draft.projectFlow);
      if (draft.sceneComposer) {
        useSceneComposerStore.setState(draft.sceneComposer);
      }
      set({ activeProjectId: id });

      // Simpan langsung ke server
      await get().saveActiveProjectSnapshot();
      set({ localDraftToSync: null, isLoading: false });

      // Muat ulang daftar project untuk sinkronisasi metadata terbaru
      await get().loadProjects();
    } catch (err) {
      console.error("[projectLibraryStore] syncLocalDraftToServer failed:", err);
      set({ isLoading: false, error: "Gagal menyinkronkan draf lokal ke server." });
    }
  },

  discardLocalDraft: () => {
    localStorage.removeItem(LOCAL_ACTIVE_DRAFT_KEY);
    set({ localDraftToSync: null });
  },

  duplicateProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const duplicated = await projectService.duplicateProject(projectId);
      set({ isLoading: false });
      await get().loadProjects(); // Reload list
      return duplicated.id;
    } catch (err) {
      console.error("[projectLibraryStore] duplicateProject failed:", err);
      set({ isLoading: false, error: "Gagal menduplikasi proyek." });
      throw err;
    }
  },

  renameProject: async (projectId, newTitle) => {
    set({ isLoading: true, error: null });
    try {
      await projectService.updateProject(projectId, { title: newTitle });
      set({ isLoading: false });
      
      // Update list
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, title: newTitle, updatedAt: new Date().toISOString() } : p
        )
      }));

      // Update cache
      const cached = localStorage.getItem(LOCAL_LIST_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const updated = parsed.map((p: any) =>
          p.id === projectId ? { ...p, title: newTitle, updatedAt: new Date().toISOString() } : p
        );
        localStorage.setItem(LOCAL_LIST_CACHE_KEY, JSON.stringify(updated));
      }

      // Sync active flow store
      if (get().activeProjectId === projectId || useProjectFlowStore.getState().activeProjectId === projectId) {
        useProjectFlowStore.setState({ projectName: newTitle });
      }
    } catch (err) {
      console.error("[projectLibraryStore] renameProject failed:", err);
      set({ isLoading: false, error: "Gagal mengubah nama proyek." });
      throw err;
    }
  },

  restoreBackup: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      await projectService.restoreBackup(projectId);
      set({ isLoading: false });
      await get().loadProjects(); // Reload list
    } catch (err) {
      console.error("[projectLibraryStore] restoreBackup failed:", err);
      set({ isLoading: false, error: "Gagal memulihkan proyek dari backup." });
      throw err;
    }
  }
}));

const tonePresets = ["Sinematik", "Misterius", "Inspiratif", "Premium", "Komedi ringan"];
const presetCards = [
  { title: "Dokumenter Sinematik", desc: "Cocok untuk YouTube, sejarah, misteri, edukasi.", tag: "Paling aman" },
  { title: "Shorts Cepat", desc: "Hook kuat, tempo cepat, cocok TikTok/Reels/Shorts.", tag: "Viral" },
  { title: "Storytelling Emosional", desc: "Narasi hangat, dramatis ringan, cocok kisah manusia.", tag: "Human touch" },
  { title: "Produk / Brand", desc: "Untuk promo produk, campaign, dan video komersial.", tag: "Bisnis" },
];
