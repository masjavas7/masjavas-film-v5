import { getApiBaseUrl } from "./apiBase";

export interface ProjectMetadata {
  id: string;
  title: string;
  status: 'draft' | 'in_progress' | 'ready_to_export' | 'exported';
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  aspectRatio: string;
  sceneCount: number;
  completedScenes: number;
  thumbnailUrl: string | null;
}

export const projectService = {
  /**
   * Fetches the complete list of projects with their metadata.
   */
  listProjects: async (): Promise<ProjectMetadata[]> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in listProjects:", error);
      throw error;
    }
  },

  /**
   * Creates a new project entity on the server.
   */
  createProject: async (payload: { id: string; title: string; topic: string }): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error in createProject:", error);
      throw error;
    }
  },

  getProject: async (id: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        const err = new Error(errPayload.error || `HTTP ${response.status}`) as any;
        err.status = response.status;
        err.hasBackup = errPayload.hasBackup;
        err.backupTime = errPayload.backupTime;
        throw err;
      }
      return await response.json();
    } catch (error) {
      console.error(`Error in getProject for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Duplicates an existing project.
   */
  duplicateProject: async (id: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error in duplicateProject for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Restores a project from its .backup.json file.
   */
  restoreBackup: async (id: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}/restore-backup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error in restoreBackup for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Updates a project's lightweight settings or metadata.
   */
  updateProject: async (id: string, patch: any): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error in updateProject for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Persists a full JSON snapshot of the project workspace.
   */
  saveProjectSnapshot: async (id: string, snapshot: any): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error in saveProjectSnapshot for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a project from the server.
   */
  deleteProject: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error in deleteProject for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Touches a project, updating its last opened timestamp.
   */
  touchProject: async (id: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}/touch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error in touchProject for ${id}:`, error);
      return null;
    }
  },

  /**
   * Generates story narration based on user idea and preferences.
   */
  generateProjectNarration: async (id: string, ideaText: string): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}/narration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaText })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in generateProjectNarration:", error);
      throw new Error("Narasi gagal dibuat. Coba lagi.");
    }
  },

  /**
   * Generates a structured list of scenes from the narration.
   */
  generateProjectScenes: async (id: string, payload: {
    narration: string;
    storyDraft: any;
    selectedDuration: string;
    selectedStyle: string;
    selectedTone: string;
  }): Promise<any> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${id}/scenes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.scenes;
    } catch (error) {
      console.error("Error in generateProjectScenes:", error);
      throw new Error("Daftar adegan gagal dibuat. Coba lagi.");
    }
  }
};
