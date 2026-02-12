/**
 * AI Task Extraction
 *
 * Uses Claude to extract action items from video transcripts
 *
 * @ai-pattern task-extraction
 */

import { generateCompletion } from './client'
import type { AITask } from '../transcription/types'

/**
 * Extract action items/tasks from the transcript
 *
 * Returns an array of task objects with optional timestamps
 */
export async function extractTasks(transcript: string): Promise<AITask[]> {
  const maxChars = 10000
  const truncatedTranscript =
    transcript.length > maxChars ? transcript.slice(0, maxChars) + '...' : transcript

  const prompt = `You are a helpful assistant that extracts action items from video transcripts.

Given the following video transcript, identify any action items, tasks, or to-dos mentioned. Return them as a JSON array.

If no action items are found, return an empty array: []

Format each task as:
{"text": "the action item", "completed": false}

Only include clear, actionable items. Do not invent tasks that aren't mentioned.

Transcript:
${truncatedTranscript}

Return only valid JSON array:`

  const response = await generateCompletion(prompt, {
    maxTokens: 512,
    temperature: 0.3,
  })

  try {
    // Parse the JSON response
    const tasks = JSON.parse(response)
    if (!Array.isArray(tasks)) {
      return []
    }
    return tasks
      .map((t: Record<string, unknown>) => ({
        text: String(t.text || ''),
        completed: Boolean(t.completed),
        timestampSeconds: typeof t.timestampSeconds === 'number' ? t.timestampSeconds : undefined,
      }))
      .filter((t) => t.text.length > 0)
  } catch {
    console.error('[AI Tasks] Failed to parse tasks response:', response)
    return []
  }
}

/**
 * Extract action items with speaker attribution
 *
 * Returns tasks with who mentioned them
 */
export async function extractTasksWithSpeakers(
  transcript: string,
  speakers: string[]
): Promise<Array<AITask & { speaker?: string }>> {
  const maxChars = 10000
  const truncatedTranscript =
    transcript.length > maxChars ? transcript.slice(0, maxChars) + '...' : transcript

  const speakerList = speakers.length > 0 ? speakers.join(', ') : 'Unknown'

  const prompt = `You are a helpful assistant that extracts action items from video transcripts.

This video has the following speakers: ${speakerList}

Given the transcript, identify any action items, tasks, or to-dos mentioned. Return them as a JSON array.

If no action items are found, return an empty array: []

Format each task as:
{"text": "the action item", "speaker": "Speaker A", "completed": false}

Only include clear, actionable items. Do not invent tasks that aren't mentioned.

Transcript:
${truncatedTranscript}

Return only valid JSON array:`

  const response = await generateCompletion(prompt, {
    maxTokens: 512,
    temperature: 0.3,
  })

  try {
    const tasks = JSON.parse(response)
    if (!Array.isArray(tasks)) {
      return []
    }
    return tasks
      .map((t: Record<string, unknown>) => ({
        text: String(t.text || ''),
        completed: Boolean(t.completed),
        speaker: typeof t.speaker === 'string' ? t.speaker : undefined,
        timestampSeconds: typeof t.timestampSeconds === 'number' ? t.timestampSeconds : undefined,
      }))
      .filter((t) => t.text.length > 0)
  } catch {
    console.error('[AI Tasks] Failed to parse tasks response:', response)
    return []
  }
}

/**
 * Categorize tasks by type
 */
export async function categorizeTask(
  taskText: string
): Promise<{
  category: 'follow-up' | 'decision' | 'research' | 'communication' | 'other'
  priority: 'high' | 'medium' | 'low'
}> {
  const prompt = `Categorize this action item:
"${taskText}"

Return JSON with:
- category: one of "follow-up", "decision", "research", "communication", "other"
- priority: one of "high", "medium", "low"

JSON only:`

  const response = await generateCompletion(prompt, {
    maxTokens: 64,
    temperature: 0.2,
  })

  try {
    const result = JSON.parse(response)
    return {
      category: result.category || 'other',
      priority: result.priority || 'medium',
    }
  } catch {
    return { category: 'other', priority: 'medium' }
  }
}
