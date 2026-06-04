import { SceneArtifact, ReferenceItem, StoryboardPanel, ScenePromptPackageValidation } from "../types";

import { getApiBaseUrl } from "./apiBase";

/** Payload sent to backend for full ScenePromptPackage-based video generation */
export interface GenerateVideoPayload {
  projectId: string;
  videoInstruction: string;
  settings: {
    durationSec: number;
    quality: string;
    aspectRatio: string;
  };
  scene: {
    sceneNumber: number;
    title: string;
    narration: string;
    summary: string;
  };
  references: ReferenceItem[];
  storyboardPanels: StoryboardPanel[];
  heroFrame?: {
    imageUrl: string;
    description: string;
  } | null;
  storyboardImageUrl?: string | null;
  previousSceneVideoUrl?: string | null;
}

/** Response from POST /api/scenes/:sceneId/video */
export interface GenerateVideoResponse {
  jobId: string;
  status: string;
  scenePromptPackageId?: string;
  validation?: ScenePromptPackageValidation;
}

/** Video job status from GET /api/scenes/video/jobs/:jobId */
export interface VideoJobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoUrl?: string;
  providerVideoUrl?: string;
  errorMessage?: string;
  scenePromptPackageId?: string;
  providerPayloadSummary?: {
    model: string;
    video_config: { aspect_ratio: string; video_length: number; resolution_name: string; preset: string };
    contentBlockCount: number;
    imageUrlCount: number;
    imageUrlCountSent?: number;
    skippedLocalCount?: number;
    convertedBase64Count?: number;
    imageUrlSource?: string;
    firstImageRole: string | null;
    roleList: string[];
    roleCounts: Record<string, number>;
    promptLength: number;
    nativeImageToVideo: boolean;
  };
}

/** Blocklist of known placeholder video URLs that must never be shown as generated output */
const PLACEHOLDER_VIDEO_BLOCKLIST = [
  "w3schools.com",
  "mov_bbb.mp4",
  "big_buck_bunny",
  "sample-videos.com",
  "placeholder",
  "template"
];

function isPlaceholderVideo(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_VIDEO_BLOCKLIST.some(blocked => lower.includes(blocked));
}

export const sceneService = {
  getScenes: async (_projectId: string): Promise<SceneArtifact[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [];
  },

  updateSceneSettings: async (sceneId: string, settings: any): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    console.log(`Updated settings for scene ${sceneId}:`, settings);
  },

  generateSceneStoryboard: async (sceneId: string, payload: any): Promise<any> => {
    try {
      const body = typeof payload === "string" ? { narration: payload } : payload;
      const response = await fetch(`${getApiBaseUrl()}/api/scenes/${sceneId}/storyboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to generate storyboard:", error);
      throw new Error("Storyboard gagal dibuat. Buat ulang storyboard.");
    }
  },

  /**
   * Sends a full ScenePromptPackage payload for video generation.
   * Backend will resolve references, build prompt, validate, and send to GrokPI.
   */
  generateSceneVideo: async (sceneId: string, payload: GenerateVideoPayload): Promise<GenerateVideoResponse> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/scenes/${sceneId}/video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `API error: ${response.status}`);
      }

      const data: GenerateVideoResponse = await response.json();

      // If validation failed, throw with user-friendly message
      if (data.validation && !data.validation.passed) {
        const errorDetails = data.validation.errors.join('\n');
        console.warn("[sceneService] Validation failed:", errorDetails);
        throw new Error(errorDetails);
      }

      return data;
    } catch (error: any) {
      console.error("[sceneService] generateSceneVideo error:", error);
      throw new Error(error.message || "Video gagal dibuat. Coba generate ulang.");
    }
  },

  /**
   * Checks the status of a video generation job.
   * Filters out placeholder video URLs — only returns real provider results.
   */
  checkVideoGenerationStatus: async (jobId: string): Promise<VideoJobStatus> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/scenes/video/jobs/${jobId}`, {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: VideoJobStatus = await response.json();

      // Block placeholder videos from being shown as generated output
      if (data.status === 'completed' && isPlaceholderVideo(data.videoUrl)) {
        console.warn("[sceneService] Blocked placeholder video URL:", data.videoUrl);
        return {
          ...data,
          status: 'failed',
          videoUrl: undefined,
          errorMessage: 'Video gagal dibuat. GrokPI belum mengembalikan video final. Coba generate ulang.'
        };
      }

      return data;
    } catch (error) {
      console.error("Error checking video status:", error);
      return { status: "failed", errorMessage: "Gagal memantau status rendering." };
    }
  }
};
