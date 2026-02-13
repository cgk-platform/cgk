'use client'

/**
 * TranscriptSearch Component
 *
 * Search within transcript with:
 * - Real-time search as you type
 * - Highlighted results
 * - Click to seek to match
 * - Match count display
 *
 * @ai-pattern editorial-studio
 */

import { useState, useMemo, useCallback } from 'react'
import { Input, Card, CardContent, CardHeader, CardTitle, Badge } from '@cgk-platform/ui'

export interface TranscriptionWord {
  text: string
  startMs: number
  endMs: number
  confidence: number
  speaker?: string
  isFiller?: boolean
}

interface TranscriptSearchProps {
  words: TranscriptionWord[]
  onSeek?: (timeMs: number) => void
  className?: string
}

interface SearchMatch {
  wordIndex: number
  word: TranscriptionWord
  context: string
  contextStart: number
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function TranscriptSearch({
  words,
  onSeek,
  className = '',
}: TranscriptSearchProps) {
  const [query, setQuery] = useState('')

  // Find matches
  const matches = useMemo(() => {
    if (!query.trim() || words.length === 0) return []

    const searchTerm = query.toLowerCase().trim()
    const results: SearchMatch[] = []

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      if (!word) continue
      if (word.text.toLowerCase().includes(searchTerm)) {
        // Build context (5 words before and after)
        const contextStart = Math.max(0, i - 5)
        const contextEnd = Math.min(words.length, i + 6)
        const contextWords = words.slice(contextStart, contextEnd)
        const context = contextWords.map((w) => w.text).join(' ')

        results.push({
          wordIndex: i,
          word: word as TranscriptionWord,
          context,
          contextStart,
        })
      }
    }

    return results
  }, [words, query])

  const handleClear = useCallback(() => {
    setQuery('')
  }, [])

  const handleMatchClick = useCallback(
    (match: SearchMatch) => {
      if (onSeek) {
        onSeek(match.word.startMs)
      }
    },
    [onSeek]
  )

  // Highlight search term in text
  const highlightText = useCallback(
    (text: string) => {
      if (!query.trim()) return text

      const searchTerm = query.toLowerCase().trim()
      const parts: (string | { highlighted: boolean; text: string })[] = []
      let lastIndex = 0

      const lowerText = text.toLowerCase()
      let index = lowerText.indexOf(searchTerm, lastIndex)

      while (index !== -1) {
        if (index > lastIndex) {
          parts.push(text.slice(lastIndex, index))
        }
        parts.push({
          highlighted: true,
          text: text.slice(index, index + searchTerm.length),
        })
        lastIndex = index + searchTerm.length
        index = lowerText.indexOf(searchTerm, lastIndex)
      }

      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
      }

      return parts.map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <mark
            key={i}
            className="bg-amber-200 dark:bg-amber-700/50 text-amber-900 dark:text-amber-100 px-0.5 rounded"
          >
            {part.text}
          </mark>
        )
      )
    },
    [query]
  )

  if (words.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <CardTitle className="text-sm font-medium font-mono uppercase tracking-wide text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
          <SearchIcon className="h-4 w-4" />
          Search Transcript
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Search input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search transcript..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-20 font-mono text-sm"
          />
          {query && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="font-mono text-xs px-2 py-0.5"
              >
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </Badge>
              <button
                type="button"
                onClick={handleClear}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <ClearIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {query && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {matches.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                No matches found for &quot;{query}&quot;
              </p>
            ) : (
              matches.slice(0, 50).map((match, index) => (
                <button
                  key={`${match.wordIndex}-${index}`}
                  type="button"
                  onClick={() => handleMatchClick(match)}
                  disabled={!onSeek}
                  className={`
                    w-full text-left p-3 rounded-lg border border-zinc-200 dark:border-zinc-700
                    hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors
                    ${!onSeek ? '' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className="shrink-0 font-mono text-xs bg-zinc-50 dark:bg-zinc-800"
                    >
                      {formatTime(match.word.startMs)}
                    </Badge>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {match.contextStart > 0 && (
                        <span className="text-zinc-400">...</span>
                      )}
                      {highlightText(match.context)}
                      {match.wordIndex + 5 < words.length && (
                        <span className="text-zinc-400">...</span>
                      )}
                    </p>
                  </div>
                  {match.word.speaker && (
                    <p className="text-xs text-zinc-500 mt-1 ml-[60px]">
                      {match.word.speaker}
                    </p>
                  )}
                </button>
              ))
            )}
            {matches.length > 50 && (
              <p className="text-xs text-zinc-500 text-center py-2">
                Showing first 50 of {matches.length} matches
              </p>
            )}
          </div>
        )}

        {/* Empty state when no search */}
        {!query && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-2">
            Type to search through {words.length.toLocaleString()} words
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default TranscriptSearch
