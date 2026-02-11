'use client'

import { RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

import { SEONav } from '@/components/admin/seo/SEONav'
import { SchemaValidation, SchemaValidationSummary } from '@/components/admin/seo/SchemaValidation'
import type { SchemaValidationResult } from '@/lib/seo/types'

export default function SchemaPage() {
  const [results, setResults] = useState<SchemaValidationResult[]>([])
  const [summary, setSummary] = useState<{
    totalPosts: number
    averageScore: number
    postsWithErrors: number
    postsWithWarnings: number
    postsWithSuggestions: number
    perfectPosts: number
    issueBreakdown: Record<string, number>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'all' | 'issues'>('all')

  const fetchResults = async () => {
    setIsLoading(true)
    try {
      // Fetch summary
      const summaryRes = await fetch('/api/admin/seo/schema-validation?view=summary')
      const summaryData = await summaryRes.json()
      if (summaryRes.ok) {
        setSummary(summaryData.summary)
      }

      // Fetch results based on view
      const resultsRes = await fetch(`/api/admin/seo/schema-validation?view=${view}`)
      const resultsData = await resultsRes.json()
      if (resultsRes.ok) {
        setResults(resultsData.results)
      }
    } catch (err) {
      console.error('Failed to fetch schema validation:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [view])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schema Validation</h1>
        <p className="text-muted-foreground">
          Validate JSON-LD structured data for all blog posts
        </p>
      </div>

      <SEONav />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {summary && <SchemaValidationSummary summary={summary} />}

          <div className="flex gap-2">
            <button
              onClick={() => setView('all')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                view === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              All Posts ({summary?.totalPosts || 0})
            </button>
            <button
              onClick={() => setView('issues')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                view === 'issues' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              Issues Only ({(summary?.postsWithErrors || 0) + (summary?.postsWithWarnings || 0)})
            </button>
          </div>

          <SchemaValidation results={results} />
        </>
      )}
    </div>
  )
}
