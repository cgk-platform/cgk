/**
 * AI Summary Generation
 *
 * Uses Claude to generate video summaries from transcripts
 *
 * @ai-pattern summary-generation
 */

import { generateCompletion } from './client'

/**
 * Generate a summary of the video transcript
 *
 * Returns a concise 2-3 sentence executive summary
 */
export async function generateAISummary(transcript: string): Promise<string> {
  // Truncate very long transcripts to avoid token limits
  const maxChars = 10000
  const truncatedTranscript =
    transcript.length > maxChars ? transcript.slice(0, maxChars) + '...' : transcript

  const prompt = `You are a helpful assistant that summarizes video transcripts.

Given the following video transcript, write a concise summary (2-3 sentences) that captures the main topic and key points. Be direct and informative.

Transcript:
${truncatedTranscript}

Summary:`

  const summary = await generateCompletion(prompt, {
    maxTokens: 256,
    temperature: 0.5,
  })

  return summary
}

/**
 * Generate a detailed summary with bullet points
 *
 * Returns a more comprehensive summary with key takeaways
 */
export async function generateDetailedSummary(transcript: string): Promise<{
  overview: string
  keyPoints: string[]
}> {
  const maxChars = 10000
  const truncatedTranscript =
    transcript.length > maxChars ? transcript.slice(0, maxChars) + '...' : transcript

  const prompt = `You are a helpful assistant that summarizes video transcripts.

Given the following video transcript, provide:
1. A one-sentence overview
2. 3-5 key points as bullet points

Format your response as:
OVERVIEW: [one sentence overview]
KEY POINTS:
- [point 1]
- [point 2]
- [point 3]
...

Transcript:
${truncatedTranscript}

Response:`

  const response = await generateCompletion(prompt, {
    maxTokens: 512,
    temperature: 0.5,
  })

  // Parse the response
  const overviewMatch = response.match(/OVERVIEW:\s*(.+?)(?=KEY POINTS:|$)/s)
  const keyPointsMatch = response.match(/KEY POINTS:([\s\S]+)$/i)

  const firstLine = response.split('\n')[0]
  const overview = overviewMatch?.[1]?.trim() ?? firstLine ?? ''

  const keyPoints = keyPointsMatch?.[1]
    ? keyPointsMatch[1]
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter((line) => line.length > 0)
    : []

  return { overview, keyPoints }
}
