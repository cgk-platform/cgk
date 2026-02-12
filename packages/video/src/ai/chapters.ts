/**
 * AI Chapter Enhancement
 *
 * Uses Claude to enhance or generate video chapters
 *
 * @ai-pattern chapter-generation
 */

import { generateCompletion } from './client'
import type { TranscriptionChapter } from '../transcription/types'

/**
 * Enhance existing chapters with better titles and summaries
 */
export async function enhanceChapters(
  chapters: TranscriptionChapter[],
  transcript: string
): Promise<TranscriptionChapter[]> {
  if (chapters.length === 0) {
    return []
  }

  const maxChars = 10000
  const truncatedTranscript =
    transcript.length > maxChars ? transcript.slice(0, maxChars) + '...' : transcript

  const chaptersJson = JSON.stringify(
    chapters.map((c) => ({
      headline: c.headline,
      summary: c.summary,
      startMs: c.startMs,
      endMs: c.endMs,
    }))
  )

  const prompt = `You are a helpful assistant that improves video chapter titles and summaries.

Given these auto-generated chapters and the transcript, improve the headlines and summaries to be more engaging and descriptive.

Current chapters:
${chaptersJson}

Transcript:
${truncatedTranscript}

Return the improved chapters as a JSON array with the same structure (headline, summary, startMs, endMs).
Keep the timestamps exactly the same, only improve the text.

JSON array only:`

  const response = await generateCompletion(prompt, {
    maxTokens: 1024,
    temperature: 0.6,
  })

  try {
    const enhanced = JSON.parse(response)
    if (!Array.isArray(enhanced)) {
      return chapters
    }

    // Merge enhanced titles with original timestamps
    return chapters.map((original, index) => ({
      ...original,
      headline: enhanced[index]?.headline || original.headline,
      summary: enhanced[index]?.summary || original.summary,
    }))
  } catch {
    console.error('[AI Chapters] Failed to parse enhanced chapters:', response)
    return chapters
  }
}

/**
 * Generate chapters from transcript if none exist
 */
export async function generateChapters(
  transcript: string,
  durationMs: number
): Promise<TranscriptionChapter[]> {
  const maxChars = 10000
  const truncatedTranscript =
    transcript.length > maxChars ? transcript.slice(0, maxChars) + '...' : transcript

  const prompt = `You are a helpful assistant that creates video chapter markers.

Given this transcript from a video that is ${Math.round(durationMs / 1000)} seconds long, create 3-6 logical chapters.

Each chapter should:
- Have a clear, concise headline (3-6 words)
- Have a brief summary (1 sentence)
- Cover a distinct topic or section

Return as a JSON array with these fields:
- headline: chapter title
- summary: brief description
- startMs: start time in milliseconds (estimate based on content position)
- endMs: end time in milliseconds

Transcript:
${truncatedTranscript}

JSON array only:`

  const response = await generateCompletion(prompt, {
    maxTokens: 1024,
    temperature: 0.5,
  })

  try {
    const chapters = JSON.parse(response)
    if (!Array.isArray(chapters)) {
      return []
    }

    return chapters
      .map((c: Record<string, unknown>) => ({
        headline: String(c.headline || ''),
        summary: String(c.summary || ''),
        startMs: typeof c.startMs === 'number' ? c.startMs : 0,
        endMs: typeof c.endMs === 'number' ? c.endMs : durationMs,
      }))
      .filter((c) => c.headline.length > 0)
  } catch {
    console.error('[AI Chapters] Failed to parse generated chapters:', response)
    return []
  }
}

/**
 * Generate chapter titles in a specific style
 */
export async function generateChapterTitles(
  chapters: TranscriptionChapter[],
  style: 'professional' | 'casual' | 'educational' | 'marketing'
): Promise<string[]> {
  const styleDescriptions: Record<typeof style, string> = {
    professional: 'clear, formal, and business-appropriate',
    casual: 'friendly, conversational, and approachable',
    educational: 'informative, structured, and learning-focused',
    marketing: 'engaging, benefit-focused, and compelling',
  }

  const currentTitles = chapters.map((c) => c.headline).join('\n')

  const prompt = `Rewrite these chapter titles in a ${styleDescriptions[style]} style:

${currentTitles}

Return one title per line, matching the original order:`

  const response = await generateCompletion(prompt, {
    maxTokens: 256,
    temperature: 0.6,
  })

  return response
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, chapters.length)
}
