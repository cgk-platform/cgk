'use client'

import { RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

import { SEONav } from '@/components/admin/seo/SEONav'
import { SiteAuditResults } from '@/components/admin/seo/SiteAuditResults'
import type { SEOAudit, AuditSummary } from '@/lib/seo/types'

export default function AnalysisPage() {
  const [audit, setAudit] = useState<SEOAudit | null>(null)
  const [summary, setSummary] = useState<AuditSummary>({
    latestAudit: null,
    previousAudit: null,
    scoreChange: 0,
    totalAudits: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)

  const fetchAudit = async () => {
    setIsLoading(true)
    try {
      // Fetch latest audit
      const auditRes = await fetch('/api/admin/seo/analysis/site')
      const auditData = await auditRes.json()
      if (auditRes.ok) {
        setAudit(auditData.audit)
      }

      // Fetch summary
      const summaryRes = await fetch('/api/admin/seo/analysis/site?view=summary')
      const summaryData = await summaryRes.json()
      if (summaryRes.ok) {
        setSummary(summaryData.summary)
      }
    } catch (err) {
      console.error('Failed to fetch audit:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAudit()
  }, [])

  const handleRunAudit = async () => {
    setIsRunning(true)
    try {
      const res = await fetch('/api/admin/seo/analysis/site', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setAudit(data.audit)
      fetchAudit() // Refresh summary
    } catch (err) {
      console.error('Audit failed:', err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site SEO Audit</h1>
        <p className="text-muted-foreground">
          Analyze all pages for SEO issues with scoring
        </p>
      </div>

      <SEONav />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <SiteAuditResults
          audit={audit}
          summary={summary}
          onRunAudit={handleRunAudit}
          isLoading={isRunning}
        />
      )}
    </div>
  )
}
