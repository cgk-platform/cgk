'use client'

import Link from 'next/link'
import { AlertTriangle, ExternalLink } from 'lucide-react'

import { Badge, Card, CardHeader, CardContent, cn } from '@cgk/ui'

import type { ABTest } from '@/lib/ab-tests/types'

interface QualityIssuesListProps {
  testsWithIssues: Array<{
    test: ABTest
    issues: string[]
  }>
}

export function QualityIssuesList({ testsWithIssues }: QualityIssuesListProps) {
  if (testsWithIssues.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Tests Requiring Attention</h2>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-emerald-600">
            <div className="rounded-full bg-emerald-100 p-2">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="font-medium">All tests are healthy</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Tests Requiring Attention
          </h2>
          <Badge variant="destructive" className="text-xs">
            {testsWithIssues.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {testsWithIssues.map(({ test, issues }) => (
            <div
              key={test.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <Link
                    href={`/admin/ab-tests/${test.id}`}
                    className="font-medium text-slate-900 hover:text-cyan-600"
                  >
                    {test.name}
                  </Link>
                  <div className="mt-1 flex gap-2">
                    {issues.map((issue, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-700 text-xs"
                      >
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                href={`/admin/ab-tests/${test.id}`}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-cyan-600"
              >
                View
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
