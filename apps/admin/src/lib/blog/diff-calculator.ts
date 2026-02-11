/**
 * Diff calculator for AI content tracking
 * Calculates human edit percentage using Levenshtein distance
 */

/**
 * Calculate Levenshtein distance between two strings
 * This is the minimum number of single-character edits needed to change one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  // Use a more memory-efficient approach for long strings
  if (len1 === 0) return len2
  if (len2 === 0) return len1

  // Limit for very long strings to prevent memory issues
  const MAX_LENGTH = 50000
  const s1 = str1.length > MAX_LENGTH ? str1.slice(0, MAX_LENGTH) : str1
  const s2 = str2.length > MAX_LENGTH ? str2.slice(0, MAX_LENGTH) : str2
  const l1 = s1.length
  const l2 = s2.length

  // Use two rows instead of full matrix for memory efficiency
  let prevRow = new Array(l2 + 1)
  let currRow = new Array(l2 + 1)

  // Initialize first row
  for (let j = 0; j <= l2; j++) {
    prevRow[j] = j
  }

  for (let i = 1; i <= l1; i++) {
    currRow[0] = i

    for (let j = 1; j <= l2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1

      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      )
    }

    // Swap rows
    ;[prevRow, currRow] = [currRow, prevRow]
  }

  return prevRow[l2]
}

/**
 * Normalize text for comparison
 * - Removes extra whitespace
 * - Normalizes line endings
 * - Lowercases (optional)
 */
function normalizeText(text: string, lowercase: boolean = false): string {
  let normalized = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, ' ') // Convert tabs to spaces
    .replace(/[ ]+/g, ' ') // Collapse multiple spaces
    .replace(/\n[ ]+/g, '\n') // Remove leading spaces on lines
    .replace(/[ ]+\n/g, '\n') // Remove trailing spaces on lines
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple blank lines
    .trim()

  if (lowercase) {
    normalized = normalized.toLowerCase()
  }

  return normalized
}

/**
 * Calculate the human edit percentage between original and current content
 *
 * @param originalContent - The original AI-generated content
 * @param currentContent - The current content after human edits
 * @returns The percentage of content that has been edited (0-100)
 */
export function calculateHumanEditPercentage(
  originalContent: string,
  currentContent: string
): number {
  if (!originalContent || !currentContent) {
    return 0
  }

  // Normalize both strings
  const original = normalizeText(originalContent)
  const current = normalizeText(currentContent)

  // If strings are identical, no edits were made
  if (original === current) {
    return 0
  }

  // If original is empty, 100% is "new" content
  if (original.length === 0) {
    return 100
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(original, current)

  // Calculate percentage based on the longer string
  // This ensures meaningful results for both additions and deletions
  const maxLength = Math.max(original.length, current.length)
  const percentage = (distance / maxLength) * 100

  // Round to 2 decimal places and cap at 100
  return Math.min(100, Math.round(percentage * 100) / 100)
}

/**
 * Get the edit percentage category for display
 */
export function getEditPercentageCategory(
  percentage: number
): 'blocked' | 'acceptable' | 'good' {
  if (percentage < 20) return 'blocked'
  if (percentage < 40) return 'acceptable'
  return 'good'
}

/**
 * Get the edit percentage badge color
 */
export function getEditPercentageColor(
  percentage: number
): 'red' | 'yellow' | 'green' {
  if (percentage < 20) return 'red'
  if (percentage < 40) return 'yellow'
  return 'green'
}

/**
 * Check if publishing is blocked due to low human edit percentage
 */
export function isPublishBlocked(
  isAiGenerated: boolean,
  humanEditPercentage: number | null
): boolean {
  if (!isAiGenerated) return false
  if (humanEditPercentage === null) return false
  return humanEditPercentage < 20
}

/**
 * Get the block reason if publishing is blocked
 */
export function getBlockReason(
  isAiGenerated: boolean,
  humanEditPercentage: number | null
): string | null {
  if (!isPublishBlocked(isAiGenerated, humanEditPercentage)) {
    return null
  }
  return `AI-generated content requires at least 20% human edits. Current: ${humanEditPercentage?.toFixed(1)}%`
}

/**
 * Calculate word-level diff statistics for more granular analysis
 */
export function calculateWordDiffStats(
  originalContent: string,
  currentContent: string
): {
  originalWordCount: number
  currentWordCount: number
  addedWords: number
  removedWords: number
  changedPercentage: number
} {
  const getWords = (text: string) =>
    normalizeText(text)
      .split(/\s+/)
      .filter((w) => w.length > 0)

  const originalWords = getWords(originalContent)
  const currentWords = getWords(currentContent)

  const originalSet = new Set(originalWords)
  const currentSet = new Set(currentWords)

  // Count words that are in original but not in current (removed)
  let removedWords = 0
  for (const word of originalSet) {
    if (!currentSet.has(word)) {
      removedWords++
    }
  }

  // Count words that are in current but not in original (added)
  let addedWords = 0
  for (const word of currentSet) {
    if (!originalSet.has(word)) {
      addedWords++
    }
  }

  const totalChanges = addedWords + removedWords
  const totalUniqueWords = new Set([...originalWords, ...currentWords]).size
  const changedPercentage =
    totalUniqueWords > 0
      ? Math.round((totalChanges / totalUniqueWords) * 100 * 100) / 100
      : 0

  return {
    originalWordCount: originalWords.length,
    currentWordCount: currentWords.length,
    addedWords,
    removedWords,
    changedPercentage,
  }
}
