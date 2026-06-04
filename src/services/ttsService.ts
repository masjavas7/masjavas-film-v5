import { getApiBaseUrl } from "./apiBase";

export interface TtsJobState {
  status: "idle" | "processing" | "completed" | "failed";
  progress: number;
  current: number;
  total: number;
  error: string | null;
  message?: string | null;
}

export interface NarratorVoice {
  voiceName: string;
  gender: string;
  style: string;
  suitableFor: string;
  description: string;
}

export const ttsService = {
  /**
   * Mengambil daftar voice narator yang tersedia.
   */
  getVoices: async (projectId: string): Promise<NarratorVoice[]> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/voices`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error("Error in getVoices:", error);
      throw error;
    }
  },

  /**
   * Menghasilkan audio preview untuk suatu voice.
   */
  generateVoicePreview: async (
    projectId: string,
    voiceName: string,
    sampleText?: string
  ): Promise<{ ok: boolean; voiceName: string; audioUrl: string | null; durationSec: number; message?: string; voicePreview?: any }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/voice-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceName, sampleText })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in generateVoicePreview:", error);
      throw error;
    }
  },

  /**
   * Mengunci voice project secara manual.
   */
  selectProjectVoice: async (projectId: string, voiceName: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/select-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceName })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in selectProjectVoice:", error);
      throw error;
    }
  },

  /**
   * Memulai pengerjaan batch TTS untuk seluruh adegan proyek dengan mode dan concurrency tertentu.
   */
  generateProjectTts: async (
    projectId: string,
    mode: "missing_only" | "failed_only" | "all" | "stale_only" | "resume" = "all",
    concurrency = 2
  ): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, concurrency })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in generateProjectTts:", error);
      throw error;
    }
  },

  /**
   * Mengambil status pengerjaan batch TTS untuk suatu project.
   */
  getProjectTtsStatus: async (projectId: string): Promise<TtsJobState> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.job;
    } catch (error) {
      console.error("Error in getProjectTtsStatus:", error);
      throw error;
    }
  },

  /**
   * Meregenerasi audio TTS untuk adegan tertentu.
   */
  regenerateSceneTts: async (projectId: string, sceneId: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/scenes/${sceneId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in regenerateSceneTts:", error);
      throw error;
    }
  },

  /**
   * Menyimpan teks adegan dan menandai audio stale.
   */
  updateSceneTextAndMarkStale: async (
    projectId: string,
    sceneId: string,
    narrationText: string
  ): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/scenes/${sceneId}/update-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrationText })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in updateSceneTextAndMarkStale:", error);
      throw error;
    }
  },

  resetSceneStatus: async (projectId: string, sceneId: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/scenes/${sceneId}/reset-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in resetSceneStatus:", error);
      throw error;
    }
  },

  skipScene: async (projectId: string, sceneId: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/scenes/${sceneId}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in skipScene:", error);
      throw error;
    }
  },

  unskipScene: async (projectId: string, sceneId: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/scenes/${sceneId}/unskip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in unskipScene:", error);
      throw error;
    }
  },

  cancelProjectTts: async (projectId: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/tts/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in cancelProjectTts:", error);
      throw error;
    }
  },

  // Aliases for compatibility
  generateProjectNarrationAudio: async (projectId: string): Promise<any> => {
    return ttsService.generateProjectTts(projectId, "all", 2);
  },
  regenerateSceneNarration: async (projectId: string, sceneId: string): Promise<any> => {
    return ttsService.regenerateSceneTts(projectId, sceneId);
  }
};

export default ttsService;
