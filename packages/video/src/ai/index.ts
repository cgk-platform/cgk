/**
 * @cgk/video/ai - AI Content Generation Module
 *
 * Provides:
 * - Title generation from transcripts
 * - Summary generation
 * - Action item extraction
 * - Chapter enhancement/generation
 *
 * Uses Claude Haiku for cost-efficient generation
 *
 * @ai-pattern ai-module
 */

// Client
export { getClaudeClient, generateCompletion, isClaudeAvailable, type GenerateOptions } from './client'

// Title generation
export { generateAITitle, generateTitleSuggestions } from './title'

// Summary generation
export { generateAISummary, generateDetailedSummary } from './summary'

// Task extraction
export { extractTasks, extractTasksWithSpeakers, categorizeTask } from './tasks'

// Chapter generation
export { enhanceChapters, generateChapters, generateChapterTitles } from './chapters'
