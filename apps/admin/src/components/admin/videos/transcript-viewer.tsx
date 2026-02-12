'use client'

/**
 * TranscriptViewer Component
 *
 * Interactive transcript display with:
 * - Word-level timestamps and click-to-seek
 * - Speaker labels with color coding
 * - Filler word highlighting (reduced opacity)
 * - Current word tracking during playback
 *
 * @ai-pattern editorial-studio
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'

export interface TranscriptionWord {
  text: string
  startMs: number
  endMs: number
  confidence: number
  speaker?: string
  isFiller?: boolean
}

interface TranscriptViewerProps {
  words: TranscriptionWord[]
  currentTimeMs?: number
  onSeek?: (timeMs: number) => void
  className?: string
  showSpeakers?: boolean
  highlightFillers?: boolean
}

// Speaker colors - professional palette
const SPEAKER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
  },
  B: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
  },
  C: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
  },
  D: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
  },
  E: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700',
  },
}

function getSpeakerColor(speaker: string | undefined): { bg: string; text: string; border: string } {
  if (!speaker) return SPEAKER_COLORS.A!
  // Extract letter from "Speaker A", "Speaker B", etc.
  const letter = speaker.replace(/[^A-Z]/gi, '').charAt(0).toUpperCase()
  return SPEAKER_COLORS[letter] ?? SPEAKER_COLORS.A!
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function TranscriptViewer({
  words,
  currentTimeMs = 0,
  onSeek,
  className = '',
  showSpeakers = true,
  highlightFillers = true,
}: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentWordRef = useRef<HTMLSpanElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Find current word index
  const currentWordIndex = words.findIndex(
    (w) => currentTimeMs >= w.startMs && currentTimeMs <= w.endMs
  )

  // Group words by speaker for display
  const wordGroups = groupWordsBySpeaker(words)

  // Auto-scroll to current word
  useEffect(() => {
    if (autoScroll && currentWordRef.current && containerRef.current) {
      const container = containerRef.current
      const word = currentWordRef.current

      const containerRect = container.getBoundingClientRect()
      const wordRect = word.getBoundingClientRect()

      // Check if word is outside visible area
      if (wordRect.top < containerRect.top || wordRect.bottom > containerRect.bottom) {
        word.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentWordIndex, autoScroll])

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    // Re-enable auto-scroll after a delay of no manual scrolling
    setAutoScroll(false)
    const timer = setTimeout(() => setAutoScroll(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleWordClick = (word: TranscriptionWord) => {
    if (onSeek) {
      onSeek(word.startMs)
    }
  }

  if (words.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            <TranscriptIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No transcript available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium font-mono uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            Transcript
          </CardTitle>
          <span className="text-xs text-zinc-500 dark:text-zinc-500 font-mono">
            {words.length.toLocaleString()} words
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="max-h-[400px] overflow-y-auto p-4 scroll-smooth"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(161 161 170) transparent',
          }}
        >
          {wordGroups.map((group, groupIndex) => {
            const speakerColor = getSpeakerColor(group.speaker)

            return (
              <div
                key={groupIndex}
                className={`mb-4 last:mb-0 ${showSpeakers && group.speaker ? 'pl-4 border-l-2 ' + speakerColor.border : ''}`}
              >
                {showSpeakers && group.speaker && group.words[0] && (
                  <div className={`text-xs font-mono mb-1.5 ${speakerColor.text}`}>
                    {group.speaker}
                    <span className="ml-2 text-zinc-400 dark:text-zinc-600">
                      {formatTime(group.words[0].startMs)}
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">
                  {group.words.map((word, wordIndex) => {
                    const globalIndex = words.indexOf(word)
                    const isCurrentWord = globalIndex === currentWordIndex
                    const isFiller = highlightFillers && word.isFiller

                    return (
                      <span
                        key={wordIndex}
                        ref={isCurrentWord ? currentWordRef : undefined}
                        onClick={() => handleWordClick(word)}
                        className={`
                          cursor-pointer transition-all duration-150 rounded px-0.5 -mx-0.5
                          ${isCurrentWord
                            ? 'bg-amber-200 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 font-medium'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }
                          ${isFiller ? 'opacity-50 italic' : ''}
                        `}
                        title={`${formatTime(word.startMs)} - Confidence: ${Math.round(word.confidence * 100)}%`}
                      >
                        {word.text}
                      </span>
                    )
                  })}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Group consecutive words by the same speaker
function groupWordsBySpeaker(words: TranscriptionWord[]) {
  const groups: { speaker: string | undefined; words: TranscriptionWord[] }[] = []
  let currentGroup: { speaker: string | undefined; words: TranscriptionWord[] } | null = null

  for (const word of words) {
    if (!currentGroup || currentGroup.speaker !== word.speaker) {
      currentGroup = { speaker: word.speaker, words: [word] }
      groups.push(currentGroup)
    } else {
      currentGroup.words.push(word)
    }
  }

  return groups
}

function TranscriptIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  )
}

export default TranscriptViewer
