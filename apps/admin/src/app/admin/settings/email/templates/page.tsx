'use client'

import { Badge, Button, Card, CardContent, CardHeader, Input } from '@cgk/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface EmailTemplate {
  id: string
  notificationType: string
  templateKey: string
  category: 'transactional' | 'marketing'
  name: string
  description: string | null
  subject: string
  isActive: boolean
  isDefault: boolean
  version: number
  updatedAt: string
}

// Category labels for potential future use in template filtering display
const categoryLabels: Record<string, string> = {
  transactional: 'Transactional',
  marketing: 'Marketing',
}
void categoryLabels

const notificationTypeLabels: Record<string, string> = {
  review_request: 'Review Request',
  review_reminder: 'Review Reminder',
  review_thank_you: 'Review Thank You',
  creator_application_approved: 'Creator Approved',
  creator_application_rejected: 'Creator Rejected',
  creator_onboarding_reminder: 'Creator Onboarding',
  creator_project_assigned: 'Project Assigned',
  creator_revision_requested: 'Revision Requested',
  creator_payment_available: 'Payment Available',
  creator_monthly_summary: 'Monthly Summary',
  esign_signing_request: 'Signing Request',
  esign_reminder: 'E-Sign Reminder',
  esign_completed: 'Signing Completed',
  esign_void_notification: 'Document Voided',
  subscription_welcome: 'Subscription Welcome',
  subscription_payment_failed: 'Payment Failed',
  treasury_approval_request: 'Approval Request',
  team_invitation: 'Team Invitation',
  team_invitation_reminder: 'Invitation Reminder',
  password_reset: 'Password Reset',
  magic_link: 'Magic Link',
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (categoryFilter) params.set('category', categoryFilter)

        const response = await fetch(`/api/admin/settings/email/templates?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch templates')
        }

        setTemplates(data.templates)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch templates')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [categoryFilter])

  const fetchTemplatesForRefresh = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)

      const response = await fetch(`/api/admin/settings/email/templates?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates')
      }

      setTemplates(data.templates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDefaults = async () => {
    setSeeding(true)
    try {
      const response = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed templates')
      }

      await fetchTemplatesForRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed templates')
    } finally {
      setSeeding(false)
    }
  }

  const filteredTemplates = templates.filter((template) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower) ||
      template.subject.toLowerCase().includes(searchLower)
    )
  })

  // Group templates by notification type for better organization
  const groupedTemplates = filteredTemplates.reduce(
    (acc, template) => {
      const group = template.notificationType
      if (!acc[group]) acc[group] = []
      acc[group].push(template)
      return acc
    },
    {} as Record<string, EmailTemplate[]>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground">
            Customize email content for all notification types
          </p>
        </div>
        {templates.length === 0 && (
          <Button onClick={handleSeedDefaults} disabled={seeding}>
            {seeding ? 'Seeding...' : 'Seed Default Templates'}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          type="search"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          <option value="transactional">Transactional</option>
          <option value="marketing">Marketing</option>
        </select>
      </div>

      {/* Template List */}
      {Object.keys(groupedTemplates).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {templates.length === 0
                ? 'No email templates found. Seed default templates to get started.'
                : 'No templates match your search criteria.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <h3 className="font-medium">
                  {notificationTypeLabels[type] || type}
                </h3>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {typeTemplates.map((template) => (
                    <Link
                      key={template.id}
                      href={`/admin/settings/email/templates/${template.id}`}
                      className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-6 px-6 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                          {!template.isActive && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {template.subject}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">
                          v{template.version}
                        </span>
                        <svg
                          className="h-4 w-4 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
