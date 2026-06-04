import { getApiBaseUrl } from "./apiBase";

export const sceneDraftService = {
  /**
   * Calls the backend to ensure scene drafts are generated and saved.
   */
  ensureSceneDrafts: async (projectId: string, force = false): Promise<any[]> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/scenes/ensure-drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in ensureSceneDrafts:", error);
      throw error;
    }
  },

  /**
   * Fetches scenes for the active project from the database.
   */
  getProjectScenes: async (projectId: string): Promise<any[]> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/scenes`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in getProjectScenes:", error);
      throw error;
    }
  },

  /**
   * Updates narrationText for a scene and updates fitting on the backend.
   */
  updateSceneNarration: async (projectId: string, sceneId: string, narrationText: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/scenes/${sceneId}/narration/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrationText })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in updateSceneNarration:", error);
      throw error;
    }
  }
};

export default sceneDraftService;
