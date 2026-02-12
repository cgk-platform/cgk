/**
 * AI Title Generation
 *
 * Uses Claude to generate descriptive video titles from transcripts
 *
 * @ai-pattern title-generation
 */

import { generateCompletion } from './client'

/**
 * Generate an AI-improved title for the video
 *
 * Takes the transcript and optionally the current title as context
 * Returns a concise, descriptive title (5-10 words)
 */
export async function generateAITitle(
  transcript: string,
  currentTitle?: string
): Promise<string> {
  // Use first part of transcript for title generation
  const maxChars = 3000
  const truncatedTranscript =
    transcript.length > maxChars ? transcript.slice(0, maxChars) + '...' : transcript

  const titleContext = currentTitle ? `Current title: "${currentTitle}"\n\n` : ''

  const prompt = `You are a helpful assistant that creates concise, descriptive video titles.

${titleContext}Given the following video transcript, suggest a better, more descriptive title. The title should:
- Be concise (5-10 words max)
- Clearly describe what the video is about
- Be professional and engaging
- Not use clickbait or sensational language

Transcript:
${truncatedTranscript}

Improved title (just the title, no quotes or explanation):`

  const title = await generateCompletion(prompt, {
    maxTokens: 64,
    temperature: 0.6,
  })

  // Clean up the title - remove quotes if present
  return title.replace(/^["']|["']$/g, '').trim()
}

/**
 * Generate multiple title suggestions
 *
 * Returns an array of title options to choose from
 */
export async function generateTitleSuggestions(
  transcript: string,
  count = 3
): Promise<string[]> {
  const maxChars = 3000
  const truncatedTranscript =
    transcript.length > maxChars ? transcript.slice(0, maxChars) + '...' : transcript

  const prompt = `You are a helpful assistant that creates concise, descriptive video titles.

Given the following video transcript, suggest ${count} different titles. Each title should:
- Be concise (5-10 words max)
- Clearly describe what the video is about
- Be professional and engaging

Return each title on a new line, numbered 1-${count}.

Transcript:
${truncatedTranscript}

Titles:`

  const response = await generateCompletion(prompt, {
    maxTokens: 256,
    temperature: 0.7,
  })

  // Parse numbered list
  const titles = response
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim())
    .filter((line) => line.length > 0 && line.length < 100)
    .slice(0, count)

  return titles
}
