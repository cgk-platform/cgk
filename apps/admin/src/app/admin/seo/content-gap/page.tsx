'use client'

import { Button } from '@cgk-platform/ui'
import { RefreshCw, X } from 'lucide-react'
import { useState, useEffect } from 'react'

import { SEONav } from '@/components/admin/seo/SEONav'
import { ContentGapTable, ContentGapSummary } from '@/components/admin/seo/ContentGapTable'
import type { ContentGap } from '@/lib/seo/types'

export default function ContentGapPage() {
  const [gaps, setGaps] = useState<ContentGap[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGaps = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/seo/content-gap')
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setGaps(data.gaps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content gaps')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGaps()
  }, [])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/seo/content-gap', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setGaps(data.gaps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const noContentCount = gaps.filter((g) => g.gap_type === 'no_content').length
  const weakContentCount = gaps.filter((g) => g.gap_type === 'weak_content').length
  const noDedicatedCount = gaps.filter((g) => g.gap_type === 'no_dedicated_page').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Gap Analysis</h1>
          <p className="text-muted-foreground">
            Identify keywords without adequate content coverage
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      <SEONav />

      {error && (
        <div className="flex items-center justify-between rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ContentGapSummary
            noContent={noContentCount}
            weakContent={weakContentCount}
            noDedicatedPage={noDedicatedCount}
          />

          <ContentGapTable
            gaps={gaps}
            onRefresh={handleAnalyze}
            isLoading={isAnalyzing}
          />
        </>
      )}
    </div>
  )
}
