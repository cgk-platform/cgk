/**
 * Caption/Subtitle Generation
 *
 * Generate VTT and SRT caption files from transcription words
 *
 * @ai-pattern caption-generation
 */

import type { TranscriptionWord, CaptionFormat, CaptionExportOptions } from './types'

/**
 * Format milliseconds to VTT timestamp (HH:MM:SS.mmm)
 */
function formatVttTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':') + '.' + milliseconds.toString().padStart(3, '0')
}

/**
 * Format milliseconds to SRT timestamp (HH:MM:SS,mmm)
 */
function formatSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':') + ',' + milliseconds.toString().padStart(3, '0')
}

/**
 * Split text into lines respecting max length
 */
function splitIntoLines(text: string, maxLength: number, maxLines: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxLength) {
      currentLine = currentLine ? `${currentLine} ${word}` : word
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  // Limit to max lines
  return lines.slice(0, maxLines)
}

/**
 * Caption cue structure
 */
interface CaptionCue {
  index: number
  startMs: number
  endMs: number
  text: string
}

/**
 * Group words into caption cues
 * Groups by sentence boundaries and timing constraints
 */
function groupWordsIntoCues(
  words: TranscriptionWord[],
  maxLineLength: number,
  maxLines: number
): CaptionCue[] {
  const cues: CaptionCue[] = []
  let currentWords: TranscriptionWord[] = []
  let currentText = ''

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (!word) continue

    const newText = currentText ? `${currentText} ${word.text}` : word.text
    const lastWord = currentWords[currentWords.length - 1]

    // Check if we should start a new cue
    const shouldBreak =
      // Text too long
      newText.length > maxLineLength * maxLines ||
      // Sentence boundary (ends with . ! ?)
      /[.!?]$/.test(word.text) ||
      // Pause longer than 1 second between words
      (currentWords.length > 0 && lastWord && word.startMs - lastWord.endMs > 1000)

    if (shouldBreak && currentWords.length > 0) {
      const firstWord = currentWords[0]
      const lastCurrentWord = currentWords[currentWords.length - 1]
      if (firstWord && lastCurrentWord) {
        cues.push({
          index: cues.length + 1,
          startMs: firstWord.startMs,
          endMs: lastCurrentWord.endMs,
          text: currentText,
        })
      }
      currentWords = [word]
      currentText = word.text
    } else {
      currentWords.push(word)
      currentText = newText
    }
  }

  // Add final cue
  if (currentWords.length > 0) {
    const firstWord = currentWords[0]
    const lastWord = currentWords[currentWords.length - 1]
    if (firstWord && lastWord) {
      cues.push({
        index: cues.length + 1,
        startMs: firstWord.startMs,
        endMs: lastWord.endMs,
        text: currentText,
      })
    }
  }

  return cues
}

/**
 * Generate VTT caption file content
 */
export function generateVtt(
  words: TranscriptionWord[],
  options: CaptionExportOptions = {}
): string {
  const { maxLineLength = 42, maxLines = 2 } = options

  // Filter out filler words for cleaner captions
  const cleanWords = words.filter((w) => !w.isFiller)
  const cues = groupWordsIntoCues(cleanWords, maxLineLength, maxLines)

  const lines = ['WEBVTT', '']

  for (const cue of cues) {
    const startTime = formatVttTime(cue.startMs)
    const endTime = formatVttTime(cue.endMs)
    const textLines = splitIntoLines(cue.text, maxLineLength, maxLines)

    lines.push(`${startTime} --> ${endTime}`)
    lines.push(...textLines)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate SRT caption file content
 */
export function generateSrt(
  words: TranscriptionWord[],
  options: CaptionExportOptions = {}
): string {
  const { maxLineLength = 42, maxLines = 2 } = options

  // Filter out filler words for cleaner captions
  const cleanWords = words.filter((w) => !w.isFiller)
  const cues = groupWordsIntoCues(cleanWords, maxLineLength, maxLines)

  const lines: string[] = []

  for (const cue of cues) {
    const startTime = formatSrtTime(cue.startMs)
    const endTime = formatSrtTime(cue.endMs)
    const textLines = splitIntoLines(cue.text, maxLineLength, maxLines)

    lines.push(String(cue.index))
    lines.push(`${startTime} --> ${endTime}`)
    lines.push(...textLines)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate captions in specified format
 */
export function generateCaptions(
  words: TranscriptionWord[],
  options: CaptionExportOptions = {}
): string {
  const { format = 'vtt' } = options

  if (format === 'srt') {
    return generateSrt(words, options)
  }

  return generateVtt(words, options)
}

/**
 * Get content type for caption format
 */
export function getCaptionContentType(format: CaptionFormat): string {
  switch (format) {
    case 'srt':
      return 'application/x-subrip'
    case 'vtt':
    default:
      return 'text/vtt'
  }
}

/**
 * Get file extension for caption format
 */
export function getCaptionExtension(format: CaptionFormat): string {
  return `.${format}`
}
