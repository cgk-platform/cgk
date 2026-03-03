/**
 * @cgk-platform/video-editor - Video Editor Package (Client-Safe Exports)
 *
 * This module contains client-safe exports:
 * - Type definitions
 * - Constants
 *
 * For server-side operations (DB operations), use:
 * import { ... } from '@cgk-platform/video-editor/server'
 *
 * @ai-pattern video-editor-package
 * @ai-pattern client-safe
 */

// ============================================================================
// TYPES - All type exports are client-safe
// ============================================================================

export type {
  ProjectStatus,
  ProjectMode,
  ActivitySource,
  TextOverlay,
  RenderVariant,
  QCResult,
  VideoEditorProject,
  VideoEditorScene,
  VideoEditorCaption,
  VideoEditorRender,
  VideoEditorActivity,
  ResolvedClip,
  CreateProjectInput,
  UpdateProjectInput,
  SyncProjectInput,
  SyncSceneInput,
  SyncCaptionInput,
  CreateSceneInput,
  UpdateSceneInput,
  UpdateCaptionInput,
  LogActivityInput,
  ProjectListOptions,
} from './types.js'

// ============================================================================
// CONSTANTS - Client-safe values
// ============================================================================

export { PROJECT_STATUSES, ACTIVITY_ACTIONS } from './types.js'
