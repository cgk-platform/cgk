/**
 * @cgk-platform/video-editor - Type definitions
 *
 * All types for video editor projects, scenes, captions, renders, and activity.
 * These are client-safe and contain no server-side dependencies.
 */

// ============================================================================
// Enums & Union Types
// ============================================================================

export type ProjectStatus =
  | 'draft'
  | 'storyboarding'
  | 'producing'
  | 'rendering'
  | 'rendered'
  | 'delivered'
  | 'archived'

export type ProjectMode = 'original' | 'clone'

export type ActivitySource = 'agent' | 'user'

// ============================================================================
// Constants
// ============================================================================

export const PROJECT_STATUSES: ProjectStatus[] = [
  'draft',
  'storyboarding',
  'producing',
  'rendering',
  'rendered',
  'delivered',
  'archived',
]

export const ACTIVITY_ACTIONS = {
  PROJECT_CREATED: 'project_created',
  STORYBOARD_SET: 'storyboard_set',
  VOICE_SELECTED: 'voice_selected',
  VOICEOVER_GENERATED: 'voiceover_generated',
  FOOTAGE_SOURCED: 'footage_sourced',
  CAPTIONS_GENERATED: 'captions_generated',
  MUSIC_SELECTED: 'music_selected',
  RENDER_STARTED: 'render_started',
  RENDER_COMPLETED: 'render_completed',
  RENDER_FAILED: 'render_failed',
  QC_PASSED: 'qc_passed',
  QC_FAILED: 'qc_failed',
  DELIVERED: 'delivered',
  SCENE_REORDERED: 'scene_reordered',
  SCENE_CLIP_CHANGED: 'scene_clip_changed',
  CAPTION_EDITED: 'caption_edited',
  VOICE_CHANGED: 'voice_changed',
  CAPTION_STYLE_CHANGED: 'caption_style_changed',
} as const

// ============================================================================
// Embedded JSON Shapes
// ============================================================================

export interface TextOverlay {
  text: string
  position: 'top' | 'center' | 'bottom'
  startTime?: number
  endTime?: number
  style?: Record<string, unknown>
}

export interface RenderVariant {
  suffix: string
  url: string
  captionStyle?: string
  voiceName?: string
}

export interface QCResult {
  name: string
  status: 'PASS' | 'WARN' | 'FAIL'
  message: string
  fixHint?: string
}

// ============================================================================
// Core Entity Types
// ============================================================================

export interface VideoEditorProject {
  id: string
  tenantId: string
  openclawSessionId: string | null
  openclawProfile: string | null
  title: string
  status: ProjectStatus
  mode: ProjectMode | null
  aspectRatio: string
  templateId: string | null
  storyboard: Record<string, unknown> | null
  voiceId: string | null
  voiceName: string | null
  voiceoverScript: string | null
  voiceoverUrl: string | null
  captionStyle: string | null
  captionConfig: Record<string, unknown> | null
  musicUrl: string | null
  musicAttribution: string | null
  musicVolume: number
  renderUrl: string | null
  renderVariants: RenderVariant[]
  qcResults: QCResult[] | null
  brandDefaults: Record<string, unknown> | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VideoEditorScene {
  id: string
  tenantId: string
  projectId: string
  sceneNumber: number
  role: string | null
  duration: number | null
  clipAssetId: string | null
  clipSegmentId: string | null
  clipStart: number | null
  clipEnd: number | null
  transition: string
  textOverlays: TextOverlay[]
  footageHint: string | null
  sourceType: string | null
  sourceReference: string | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface VideoEditorCaption {
  id: string
  tenantId: string
  projectId: string
  word: string
  startTime: number
  endTime: number
  sortOrder: number
  isEdited: boolean
  createdAt: Date
}

export interface VideoEditorRender {
  id: string
  tenantId: string
  projectId: string
  variantSuffix: string | null
  renderUrl: string
  thumbnailUrl: string | null
  durationSeconds: number | null
  fileSizeBytes: number | null
  captionStyle: string | null
  voiceName: string | null
  qcResults: QCResult[] | null
  renderedAt: Date
}

export interface VideoEditorActivity {
  id: string
  tenantId: string
  projectId: string
  source: ActivitySource
  action: string
  data: Record<string, unknown> | null
  createdAt: Date
}

// ============================================================================
// Clip Resolution Result
// ============================================================================

export interface ResolvedClip {
  assetId: string
  fileUrl: string
  thumbnailUrl: string | null
  durationSeconds: number | null
  muxPlaybackId: string | null
  segmentId: string | null
  segmentStart: number | null
  segmentEnd: number | null
  segmentDescription: string | null
}

// ============================================================================
// Input Types — Projects
// ============================================================================

export interface CreateProjectInput {
  title: string
  openclawSessionId?: string
  openclawProfile?: string
  mode?: ProjectMode
  aspectRatio?: string
  templateId?: string
}

export interface UpdateProjectInput {
  title?: string
  status?: ProjectStatus
  storyboard?: Record<string, unknown>
  voiceId?: string
  voiceName?: string
  voiceoverScript?: string
  voiceoverUrl?: string
  captionStyle?: string
  captionConfig?: Record<string, unknown>
  musicUrl?: string
  musicAttribution?: string
  musicVolume?: number
  renderUrl?: string
  qcResults?: QCResult[]
}

export interface SyncProjectInput {
  openclawSessionId: string
  openclawProfile: string
  title: string
  status: ProjectStatus
  storyboard?: Record<string, unknown>
  scenes?: SyncSceneInput[]
  captions?: SyncCaptionInput[]
  voiceId?: string
  voiceName?: string
  voiceoverScript?: string
  voiceoverUrl?: string
  captionStyle?: string
  captionConfig?: Record<string, unknown>
  musicUrl?: string
  musicAttribution?: string
  musicVolume?: number
  aspectRatio?: string
  templateId?: string
  mode?: ProjectMode
  renderUrl?: string
  qcResults?: QCResult[]
  brandDefaults?: Record<string, unknown>
}

// ============================================================================
// Input Types — Scenes
// ============================================================================

export interface SyncSceneInput {
  sceneNumber: number
  role?: string
  duration?: number
  clipAssetId?: string
  clipSegmentId?: string
  clipStart?: number
  clipEnd?: number
  transition?: string
  textOverlays?: TextOverlay[]
  footageHint?: string
  sourceType?: string
  sourceReference?: string
}

export interface CreateSceneInput {
  sceneNumber: number
  role?: string
  duration?: number
  clipAssetId?: string
  clipSegmentId?: string
  clipStart?: number
  clipEnd?: number
  transition?: string
  textOverlays?: TextOverlay[]
  footageHint?: string
  sourceType?: string
  sourceReference?: string
}

export interface UpdateSceneInput {
  role?: string
  duration?: number
  clipAssetId?: string
  clipSegmentId?: string
  clipStart?: number
  clipEnd?: number
  transition?: string
  textOverlays?: TextOverlay[]
  footageHint?: string
  sourceType?: string
  sourceReference?: string
}

// ============================================================================
// Input Types — Captions
// ============================================================================

export interface SyncCaptionInput {
  word: string
  startTime: number
  endTime: number
}

export interface UpdateCaptionInput {
  id: string
  word?: string
  startTime?: number
  endTime?: number
}

// ============================================================================
// Input Types — Activity
// ============================================================================

export interface LogActivityInput {
  source: ActivitySource
  action: string
  data?: Record<string, unknown>
}

// ============================================================================
// List Options
// ============================================================================

export interface ProjectListOptions {
  limit?: number
  offset?: number
  status?: ProjectStatus
  search?: string
  sort?: 'created_at' | 'updated_at' | 'title'
  dir?: 'asc' | 'desc'
}
