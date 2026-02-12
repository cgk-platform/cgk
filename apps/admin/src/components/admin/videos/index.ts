/**
 * Video Creator Tools UI Components
 *
 * Export all video-related components including transcription,
 * teleprompter, trimming, CTAs, comments, reactions, and more.
 */

// Transcription
export { TranscriptionStatus, type TranscriptionStatusType } from './transcription-status'
export { TranscriptViewer, type TranscriptionWord } from './transcript-viewer'
export { AISummaryCard, type TranscriptionChapter } from './ai-summary-card'
export { AITasksList, type AITask } from './ai-tasks-list'
export { ChaptersTimeline } from './chapters-timeline'
export { TranscriptSearch } from './transcript-search'

// Teleprompter
export { Teleprompter, ScriptEditor } from './teleprompter'

// Trimming
export { TrimModal } from './trim-modal'

// CTA Editor
export { CTAEditor } from './cta-editor'

// Comments
export { CommentsSection, CommentInput } from './comments'

// Reactions
export { ReactionsBar, ReactionTimeline } from './reactions'

// Status
export { StatusIndicator, StatusBadge } from './status-indicator'

// Library
export { VideoLibrary } from './video-library'

// Recording Tips
export { RecordingTips, RecordingTipsCompact } from './recording-tips'
