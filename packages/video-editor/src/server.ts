/**
 * @cgk-platform/video-editor/server - Server-Only Video Editor Operations
 *
 * This module contains server-side operations that require database access.
 *
 * DO NOT import this in client components!
 * Use '@cgk-platform/video-editor' for client-safe exports (types, constants).
 *
 * @ai-pattern server-only
 * @ai-required All operations MUST use tenant context
 */

// Project operations
export {
  createProject,
  getProject,
  getProjects,
  updateProject,
  deleteProject,
} from './projects/crud.js'

export { syncProject } from './projects/sync.js'
export type { SyncProjectResult } from './projects/sync.js'

// Scene operations
export { createScene, getScenes, updateScene, deleteScene, reorderScenes } from './scenes/crud.js'

export { resolveClipForScene } from './scenes/clips.js'

// Caption operations
export { getCaptions, bulkUpdateCaptions, deleteCaptions } from './captions/crud.js'

export { recalculateCaptionTimings } from './captions/timing.js'

// Render operations
export { createRender, getRenders, getLatestRender } from './renders/crud.js'

export { createRenderRecord } from './renders/upload.js'
export type { UploadRenderInput, UploadRenderResult } from './renders/upload.js'

// Activity operations
export { logActivity, getActivityLog } from './activity/log.js'

export { createActivityStream } from './activity/stream.js'
