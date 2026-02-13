'use client'

import { Badge, Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { CheckCircle, XCircle, AlertTriangle, Info, FileCode } from 'lucide-react'
import { useState } from 'react'

import type { SchemaValidationResult, SchemaIssue } from '@/lib/seo/types'

interface SchemaValidationProps {
  results: SchemaValidationResult[]
}

export function SchemaValidation({ results }: SchemaValidationProps) {
  const [expandedPost, setExpandedPost] = useState<string | null>(null)

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileCode className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No published posts to validate</p>
          <p className="text-muted-foreground">
            Publish blog posts to see schema validation results
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <Card key={result.postId}>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setExpandedPost(
              expandedPost === result.postId ? null : result.postId
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ScoreCircle score={result.overallScore} />
                <div>
                  <h3 className="font-medium">{result.postTitle}</h3>
                  <p className="text-sm text-muted-foreground">/{result.postSlug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.hasArticleSchema && (
                  <Badge variant="outline">Article</Badge>
                )}
                {result.hasBreadcrumbSchema && (
                  <Badge variant="outline">Breadcrumb</Badge>
                )}
                {result.hasAuthorSchema && (
                  <Badge variant="outline">Author</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          {expandedPost === result.postId && (
            <CardContent className="border-t pt-4">
              {/* Issues List */}
              {result.issues.length > 0 ? (
                <div className="space-y-2">
                  {result.issues.map((issue, idx) => (
                    <IssueRow key={idx} issue={issue} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>All schema checks passed</span>
                </div>
              )}

              {/* Generated Schema Preview */}
              <div className="mt-4 rounded-md bg-muted p-4">
                <h4 className="mb-2 text-sm font-medium">Generated Schema (Preview)</h4>
                <pre className="overflow-x-auto text-xs">
                  {JSON.stringify(result.generatedSchema.article, null, 2)}
                </pre>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-green-600 bg-green-100' :
    score >= 70 ? 'text-yellow-600 bg-yellow-100' :
    'text-red-600 bg-red-100'

  return (
    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
      <span className="text-lg font-bold">{score}</span>
    </div>
  )
}

function IssueRow({ issue }: { issue: SchemaIssue }) {
  const config = {
    error: { icon: XCircle, color: 'text-red-600 bg-red-50' },
    warning: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
    suggestion: { icon: Info, color: 'text-blue-600 bg-blue-50' },
  }

  const { icon: Icon, color } = config[issue.type]

  return (
    <div className={`flex items-start gap-2 rounded-md p-2 ${color}`}>
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <span className="font-medium">{issue.field}:</span> {issue.message}
      </div>
    </div>
  )
}

interface SchemaValidationSummaryProps {
  summary: {
    totalPosts: number
    averageScore: number
    postsWithErrors: number
    postsWithWarnings: number
    postsWithSuggestions: number
    perfectPosts: number
    issueBreakdown: Record<string, number>
  }
}

export function SchemaValidationSummary({ summary }: SchemaValidationSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Average Score</p>
          <p className="text-3xl font-bold">{summary.averageScore}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Perfect Posts</p>
          <p className="text-3xl font-bold text-green-600">{summary.perfectPosts}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Posts with Errors</p>
          <p className="text-3xl font-bold text-red-600">{summary.postsWithErrors}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Posts with Warnings</p>
          <p className="text-3xl font-bold text-yellow-600">{summary.postsWithWarnings}</p>
        </CardContent>
      </Card>

      {Object.keys(summary.issueBreakdown).length > 0 && (
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardHeader>
            <h3 className="font-semibold">Issue Breakdown</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.issueBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([field, count]) => (
                  <Badge key={field} variant="secondary">
                    {field}: {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
