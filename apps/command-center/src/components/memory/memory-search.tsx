'use client'

import { Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface SearchMatch {
  line: number
  text: string
}

interface SearchResult {
  date: string
  matches: SearchMatch[]
}

interface MemorySearchProps {
  profile: string
  onSelectDate: (date: string) => void
}

export function MemorySearch({ profile, onSelectDate }: MemorySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/openclaw/${profile}/memory/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }, [profile])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  function highlightMatch(text: string, q: string): React.ReactNode {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-gold/20 px-0.5 text-foreground">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memory files..."
          className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            searching...
          </span>
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.date}
              onClick={() => onSelectDate(result.date)}
              className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
            >
              <p className="mb-1 text-xs font-medium">{result.date}</p>
              {result.matches.slice(0, 3).map((m) => (
                <p key={m.line} className="truncate text-xs text-muted-foreground">
                  <span className="font-mono text-muted-foreground/60">L{m.line}:</span>{' '}
                  {highlightMatch(m.text, query)}
                </p>
              ))}
              {result.matches.length > 3 && (
                <p className="mt-1 text-xs text-muted-foreground/60">
                  +{result.matches.length - 3} more matches
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">No results found</p>
      )}
    </div>
  )
}
