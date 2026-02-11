/**
 * Readability analysis for blog content
 * Implements Flesch Reading Ease and other readability metrics
 */

import type { ReadabilityAnalysis } from './types'

/**
 * Count syllables in a word using a simplified algorithm
 * This is an approximation that works well for English text
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().trim()
  if (word.length <= 3) return 1

  // Remove trailing 'e' unless the word ends in 'le'
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')

  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

/**
 * Extract sentences from text
 */
function extractSentences(text: string): string[] {
  // Remove markdown formatting
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/#{1,6}\s+/g, '') // Remove heading markers
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // Remove bold/italic
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/>\s+/g, '') // Remove blockquotes

  // Split on sentence endings
  const sentences = cleanText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[a-zA-Z]/.test(s))

  return sentences
}

/**
 * Extract paragraphs from text
 */
function extractParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^#{1,6}\s/.test(p) && !/^```/.test(p))
}

/**
 * Extract words from text
 */
function extractWords(text: string): string[] {
  // Remove markdown formatting and extract words
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')

  return cleanText
    .split(/[\s\n]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9'-]/g, '').trim())
    .filter((w) => w.length > 0)
}

/**
 * Check if content has bullet points (unordered or ordered lists)
 */
function hasBulletPoints(text: string): boolean {
  const listPatterns = [
    /^\s*[-*+]\s+/m, // Unordered list
    /^\s*\d+\.\s+/m, // Ordered list
  ]
  return listPatterns.some((pattern) => pattern.test(text))
}

/**
 * Check if content has proper heading hierarchy (H2 before H3, etc.)
 */
function hasProperHeadingHierarchy(text: string): boolean {
  const headingMatches = text.matchAll(/^(#{1,6})\s+/gm)
  const levels: number[] = []

  for (const match of headingMatches) {
    if (match[1]) {
      levels.push(match[1].length)
    }
  }

  if (levels.length === 0) return true // No headings is acceptable

  // Check that we don't skip levels (e.g., H1 -> H3 without H2)
  for (let i = 1; i < levels.length; i++) {
    const prevLevel = levels[i - 1]
    const currentLevel = levels[i]
    // Skipping more than one level is bad (e.g., H2 -> H4)
    if (prevLevel !== undefined && currentLevel !== undefined && currentLevel > prevLevel + 1) {
      return false
    }
  }

  return true
}

/**
 * Calculate Flesch Reading Ease score
 * Score ranges:
 * - 90-100: Very easy (5th grade)
 * - 80-89: Easy (6th grade)
 * - 70-79: Fairly easy (7th grade)
 * - 60-69: Standard (8th-9th grade)
 * - 50-59: Fairly difficult (10th-12th grade)
 * - 30-49: Difficult (college)
 * - 0-29: Very difficult (college graduate)
 */
function calculateFleschReadingEase(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number
): number {
  if (sentenceCount === 0 || wordCount === 0) return 0

  const avgWordsPerSentence = wordCount / sentenceCount
  const avgSyllablesPerWord = syllableCount / wordCount

  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Analyze the readability of content
 */
export function analyzeReadability(content: string): ReadabilityAnalysis {
  const sentences = extractSentences(content)
  const paragraphs = extractParagraphs(content)
  const words = extractWords(content)

  const wordCount = words.length
  const sentenceCount = sentences.length
  const paragraphCount = paragraphs.length

  // Calculate average lengths
  const averageSentenceLength =
    sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0

  const avgSentencesPerParagraph =
    paragraphCount > 0 ? sentenceCount / paragraphCount : 0
  const averageParagraphLength = Math.round(avgSentencesPerParagraph * 10) / 10

  // Calculate total syllables
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0)

  // Calculate Flesch Reading Ease
  const fleschReadingEase = calculateFleschReadingEase(
    wordCount,
    sentenceCount,
    totalSyllables
  )

  return {
    fleschReadingEase,
    averageSentenceLength,
    averageParagraphLength,
    hasBulletPoints: hasBulletPoints(content),
    hasProperHeadingHierarchy: hasProperHeadingHierarchy(content),
    wordCount,
    sentenceCount,
    paragraphCount,
  }
}

/**
 * Get a description of the reading level based on Flesch score
 */
export function getReadingLevel(fleschScore: number): string {
  if (fleschScore >= 90) return 'Very Easy (5th grade)'
  if (fleschScore >= 80) return 'Easy (6th grade)'
  if (fleschScore >= 70) return 'Fairly Easy (7th grade)'
  if (fleschScore >= 60) return 'Standard (8th-9th grade)'
  if (fleschScore >= 50) return 'Fairly Difficult (10th-12th grade)'
  if (fleschScore >= 30) return 'Difficult (College)'
  return 'Very Difficult (Graduate)'
}
