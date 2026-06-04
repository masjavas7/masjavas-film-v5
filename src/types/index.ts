export interface ProjectStep {
  id: string;
  name: string;
  description: string;
  route: string;
  isCompleted: boolean;
}

export type ProviderSource = 'grokpi_real' | 'gemini_real' | 'fallback_placeholder' | 'user_upload';
export type ProviderStatus = 'SUCCESS_REAL' | 'FALLBACK_UX' | 'PENDING' | 'FAILED';

export interface LockedVoice {
  modelName: string;
  voiceName: string;
  castReason: string;
}

export interface ReferenceItem {
  id: string;
  title: string;
  imageUrl: string;
  type: 'auto' | 'manual';
  category: 'Karakter' | 'Lokasi' | 'Mood' | 'Style' | 'Referensi Tambahan';
  description?: string;
  isReal?: boolean;
  providerSource?: ProviderSource;
}

export interface StoryboardPanel {
  id: string;
  panelNumber: number;
  timeCode: string;
  shotType: string;
  action: string;
  dialogue?: string;
  sfx?: string;
  transition?: string;
  imageUrl?: string;
  label?: string;      // Beat label (e.g. Hook Visual)
  timeRange?: string;  // Normalised range
  shot?: string;       // Shot alias
  isReal?: boolean;
  providerSource?: ProviderSource;
  generationMode?: 'real' | 'fallback' | 'mock' | 'waiting' | 'rate_limited' | 'failed';
}

export interface SceneVideoSettings {
  duration: number; // in seconds, default 10
  quality: 'Rendah' | 'Sedang' | 'Tinggi'; // default 'Tinggi'
  aspectRatio: string; // supports 16:9 Widescreen, 9:16 Vertical, 1:1 Square, etc.
}

export interface TtsNarrationMetadata {
  provider: string;
  model: string;
  voiceName: string;
  fittedText: string;
  originalText?: string;
  originalWordCount: number;
  fittedWordCount: number;
  actualAudioDurationSec: number;
  audioPath: string;
  audioUrl?: string;
  fitStatus: string;
  cutoffDetected: boolean;
  message?: string;
}

export interface SceneChecklist {
  narrationReady: boolean;
  referencesReady: boolean;
  storyboardReady: boolean;
  instructionsReady: boolean;
  aspectRatioSelected: boolean;
  qualitySelected: boolean;
  promptPackageReady: boolean;
  audioTimingReady: boolean;
  sceneEmotionReady: boolean;
  ttsAudioReady: boolean;
}

export interface SceneArtifact {
  id: string;
  projectId?: string;
  contentHash?: string;
  aspectRatio?: string;
  orientation?: string;
  resolutionPreset?: string;
  durationSec?: number;
  storyboardStatus?: 'Belum dibuat' | 'Sedang dibuat' | 'Siap dicek' | 'Siap (Partial Fallback)' | 'Gagal, coba lagi';
  isStaleRatio?: boolean;
  sceneNumber: number;
  title: string;
  summary: string;
  narration: string;
  narrationText?: string;
  emotion?: string;
  location?: string;
  goal?: string;
  videoInstruction: string;
  videoSettings: SceneVideoSettings;
  checklist: SceneChecklist;
  references: ReferenceItem[];
  storyboardPanels: StoryboardPanel[];
  previewVideoUrl?: string;
  isGenerated: boolean;
  status: 'Draft' | 'Siap dicek' | 'Perlu revisi' | 'Sudah digenerate' | 'Disetujui' | 'draft' | 'waiting' | 'fitting_text' | 'generating_audio' | 'validating_duration' | 'ready' | 'failed' | 'stale' | 'requires_review' | 'skipped';
  storyboardImageUrl?: string;
  heroFrame?: {
    imageUrl: string;
    description: string;
    aspectRatio?: string;
    orientation?: string;
    width?: number;
    height?: number;
    isReal?: boolean;
    providerSource?: ProviderSource;
    generationMode?: 'real' | 'fallback' | 'mock' | 'waiting' | 'rate_limited' | 'failed';
  };
  audioDirection?: {
    narrationStartSec: number;
    narrationEndSec: number;
    dialogueEarliestStartSec: number;
    dialogueLatestEndSec: number;
    narrationPacing: string;
    wordsPerSecondTarget: number;
    emotionTone: string;
    pauseDirection: string;
    sfxDirection: string;
    musicDirection: string;
  };
  emotionDirection?: {
    primaryEmotion: string;
    secondaryEmotion?: string;
    emotionalIntensity: number;
    expressionDirection: string;
    bodyLanguageDirection: string;
    voiceToneDirection: string;
  };
  compressedNarration?: string;
  audioValidation?: {
    passed: boolean;
    warnings: string[];
    errors: string[];
  };
  compressionMode?: 'llm' | 'heuristic' | 'template_fallback';
  qualityLevel?: 'high_quality' | 'good_quality' | 'safe_but_generic';
  requiresReview?: boolean;
  lockedVoice?: LockedVoice;
  ttsNarration?: TtsNarrationMetadata;
  audioArtifact?: any;
}

export interface ProjectCard {
  id: string;
  title: string;
  duration: string;
  scenesCount: number;
  lastUpdated: string;
  thumbnailUrl: string;
}

export interface PresetItem {
  id: string;
  name: string;
  style: string;
  description: string;
  imageUrl: string;
}

// --- Step 5: Reference-Locked Video Pipeline Types ---

export type ReferenceRole =
  | 'storyboard_structure'
  | 'character_identity'
  | 'environment_lock'
  | 'prop_lock'
  | 'creature_lock'
  | 'manual_user_reference';

export interface ProviderReferenceImage {
  id: string;
  role: ReferenceRole;
  imageUrl: string;
  weight: number;
  usageRule: string;
}

export interface ScenePromptPackageValidation {
  passed: boolean;
  warnings: string[];
  errors: string[];
}

export interface SceneVideoGenerationState {
  sceneId: string;
  status: 'idle' | 'validating' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  validation?: ScenePromptPackageValidation;
  jobId?: string;
  scenePromptPackageId?: string;
  videoUrl?: string;
  providerVideoUrl?: string;
  errorMessage?: string;
}
