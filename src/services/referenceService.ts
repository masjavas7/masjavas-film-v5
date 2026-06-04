import { ReferenceItem } from "../types";

import { getApiBaseUrl } from "./apiBase";

/**
 * Structured response from backend /references/auto
 */
export interface AutoRefResponse {
  status: 'success' | 'partial' | 'partial_with_fallback' | 'fallback_only' | 'error';
  references: ReferenceItem[];
  warnings: string[];
  errorMessage: string | null;
  errorCode?: string | null;
  httpStatus?: number;
}

/**
 * Maps HTTP status or error codes to specific user-friendly messages.
 * Only shows "network/capacity" when there is actual evidence.
 */
function mapErrorMessage(httpStatus?: number, rawMessage?: string | null, errorCode?: string | null): string {
  if (errorCode === 'MISSING_STORY_SOURCE') {
    return 'Belum ada ide cerita untuk dibuat referensi.';
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return 'Tolong cek API Key di Pengaturan.';
  }
  if (httpStatus === 429) {
    return 'Kapasitas AI sedang penuh. Coba lagi sebentar lagi.';
  }
  if (httpStatus === 503) {
    return 'Layanan AI sedang sibuk. Coba lagi sebentar lagi.';
  }
  if (httpStatus === 504 || rawMessage?.toLowerCase()?.includes('timeout') || rawMessage?.toLowerCase()?.includes('etimedout')) {
    return 'Proses referensi memakan waktu lebih lama. Coba lagi atau lewati dulu.';
  }
  if (rawMessage?.includes('format') || rawMessage?.includes('Gagal memformat') || rawMessage?.includes('schema')) {
    return 'Referensi berhasil diproses, tetapi format hasil belum sesuai.';
  }
  return rawMessage || 'Referensi gagal dibuat. Coba ulang.';
}

export const referenceService = {
  /**
   * Fetches auto-generated references from the backend.
   * Returns a structured AutoRefResponse with status, references, warnings, and mapped error messages.
   */
  getAutomaticReferences: async (
    projectId: string,
    payload: {
      narration?: string;
      ideaText?: string;
      storyDraft?: any;
      selectedStyle?: string;
      selectedTone?: string;
      aspectRatio?: string;
    }
  ): Promise<AutoRefResponse> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/references/auto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      // Parse response body — backend now always returns 200 with structured JSON
      const data = await response.json();

      // Handle legacy raw array format (backward compatibility)
      if (Array.isArray(data)) {
        console.log('[referenceService] Received legacy array format, wrapping...');
        return {
          status: data.length > 0 ? 'success' : 'error',
          references: data,
          warnings: [],
          errorMessage: data.length === 0 ? 'Tidak ada referensi yang dibuat.' : null
        };
      }

      // Structured response: { status, references, warnings, errorMessage, httpStatus, errorCode }
      const result: AutoRefResponse = {
        status: data.status || 'error',
        references: Array.isArray(data.references) ? data.references : [],
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        errorMessage: data.status === 'error' ? mapErrorMessage(data.httpStatus, data.errorMessage, data.errorCode) : null,
        errorCode: data.errorCode,
        httpStatus: data.httpStatus
      };

      console.log(`[referenceService] status=${result.status} refs=${result.references.length} warnings=${result.warnings.length}`);

      return result;
    } catch (error: any) {
      // True network errors (fetch itself failed — no internet, DNS, etc.)
      console.error("[referenceService] Network/fetch error:", error);
      return {
        status: 'error',
        references: [],
        warnings: [],
        errorMessage: 'Gagal menghubungi server. Periksa koneksi internet dan coba lagi.'
      };
    }
  },

  uploadProjectReference: async (projectId: string, file: File, category: string): Promise<ReferenceItem> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const response = await fetch(`${getApiBaseUrl()}/api/projects/${projectId}/references`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error in uploadProjectReference:", error);
      // Local URL fallback to maintain usability in offline demo testing
      const localUrl = URL.createObjectURL(file);
      return {
        id: `ref-project-${Date.now()}`,
        title: file.name.split('.')[0] || "Gambar Kustom Proyek",
        imageUrl: localUrl,
        type: "manual",
        category: category as any,
        description: "Gambar referensi level proyek yang diunggah oleh pengguna."
      };
    }
  },

  uploadSceneReference: async (sceneId: string, file: File, category: string): Promise<ReferenceItem> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const response = await fetch(`${getApiBaseUrl()}/api/scenes/${sceneId}/references`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error in uploadSceneReference:", error);
      const localUrl = URL.createObjectURL(file);
      return {
        id: `ref-scene-${Date.now()}`,
        title: file.name.split('.')[0] || "Gambar Kustom Adegan",
        imageUrl: localUrl,
        type: "manual",
        category: category as any,
        description: "Gambar referensi level adegan yang diunggah oleh pengguna."
      };
    }
  },

  replaceReference: async (refId: string, file: File): Promise<ReferenceItem> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${getApiBaseUrl()}/api/references/${refId}/replace`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error in replaceReference:", error);
      const localUrl = URL.createObjectURL(file);
      return {
        id: refId,
        title: file.name.split('.')[0] || "Gambar Referensi Pengganti",
        imageUrl: localUrl,
        type: "manual",
        category: "Style",
        description: "Gambar referensi pengganti yang diunggah oleh pengguna."
      };
    }
  },

  deleteReference: async (refId: string): Promise<void> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/references/${refId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error("Error in deleteReference:", error);
      throw new Error("Gagal menghapus referensi.");
    }
  }
};
